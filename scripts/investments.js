'use strict';

window.Investments = {
	yahooYQL: 'https://query.yahooapis.com/v1/public/yql?q=',
	quoteURL: 'select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(',
	historicalURL: 'select%20*%20from%20yahoo.finance.historicaldata%20where%20symbol%20%3D%20%22YHOO%22%20and%20startDate%20%3D%20%222009-09-11%22%20and%20endDate%20%3D%20%222010-03-10%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=',
	performance: {
		oneday: {
		},
		oneweek: {},
		onemonth: {},
		threemonths: {},
		oneyear: {},
		fiveyears: {},
		all: {}
	},
	portfolio: {
		TSLA: {
			shares: 1000,
			cost: 150000
			// shares: 608,
			// cost: 119287
		},
		AMBA: {
			shares: 2000,
			cost: 150000
			// shares: 1758,
			// cost: 200000
		},
		UA: {
			shares: 1000,
			cost: 60000
			// shares: 409,
			// cost: 33508
		}
	},
	quotes: {

	},
	template: _.template('<div>' +
							'<div class="market-value"><span class="market-value__sign">$</span><%= portfolioValue %><span class="market-value__cents">.00</span></div>' +
							'<div class="day-gain"><%= dayPL %> (<%= dayPercent %>%) <span class="day-gain__span">TODAY</span></div>' +

							'<table id="chart-list">' + 
								'<tr>' + 
									'<th>1 DAY</th>' +
									'<th>5 DAYS</th>' +
									'<th>1 MONTH</th>' +
									'<th>3 MONTHS</th>' +
									'<th>1 YEAR</th>' +
									'<th>5 YEARS</th>' +
									'<th>ALL</th>' +
								'</tr>' + 
							'</table>' +
							'<table id="watchlist">' +
								'<tr>' +
									'<th>Symbol</th>' +
									'<th>Price</th>' +
									'<th>% Change</th>' +
									'<th>Value Change</th>' +
									'<th>Market Value</th>' +
									'<th>Cost</th>' +
									'<th>P/L</th>' +
								'</tr>' +
								'<% _.each(quotes, function(quote) { %>' +
									'<tr>' +
										'<td class="symbol"><%= quote.Symbol %><br><span class="num-shares"><%= quote.Shares %> SHARES</span></td>' + 
										'<td>$<%= quote.LastTradePriceOnly %></td>' + 
										'<td><%= quote.PercentChange %></td>' + 
										'<td>$<%= quote.todayPL %></td>' + 
										'<td>$<%= quote.MarketValue %></td>' + 
										'<td>$<%= quote.Cost %></td>' + 
										'<td>$<%= quote.totalPL %></td>' + 
									'</tr>' +
								'<% }) %>' +
							'</table>' +
						 '</div>'),
	init: function() {
		this.setBackgroundColor();
		this.fetchQuotes();
	},

	setBackgroundColor: function() {
		var date = new Date(Date.now());
		var hour = date.getHours().toString();
		var minutes = date.getMinutes().toString();
		var timeOfDay = hour.concat(minutes);
		if(timeOfDay > '1300' || timeOfDay < '0630') {
			$('body').css('background-color', '#020A11');
			console.log('market close');
		} else {
			$('body').css('background-color', '#FFF');
			console.log('market open');
		}
	},
	fetchQuotes: function() {
		var url = this.yahooYQL + this.quoteURL;
		var symbols = Object.keys(this.portfolio);
		url += "%22" + symbols.join("%22%2C%22") + "%22)&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=";
		// if(this.quotes.length == undefined) {
			var that = this;
			$.ajax({
		    type: 'GET',
		    url: url,
		    success: function(data) {
		    	that.quotes = that.massageData(data.query.results.quote);
		    	that.render();
		    }});
		// }
		return;
	},
	massageData: function(quotes) {
		var sortedArr = [];
		var portfolio = this.portfolio;
		_.each(quotes, function(quote) {
			var sorted = {};
			// for table
			sorted['Symbol'] = quote.symbol.toUpperCase();
			sorted['Shares'] = portfolio[sorted['Symbol']].shares;
			sorted['LastTradePriceOnly'] = parseInt(quote.LastTradePriceOnly).toFixed(2);
			sorted['PercentChange'] = quote.PercentChange;
			sorted['todayPL'] = (quote.Change / sorted['LastTradePriceOnly'] * quote.PreviousClose * sorted['Shares']).toFixed(2);
			sorted['MarketValue'] = sorted['Shares'] * sorted['LastTradePriceOnly'];
			sorted['Cost'] = parseInt(portfolio[sorted['Symbol']].cost).toFixed(2);
			sorted['totalPL'] = sorted['MarketValue'] - sorted['Cost'];
			// extra
			sorted['Change'] = parseInt(quote.Change).toFixed(2);
			sorted['PreviousClose'] = parseInt(quote.PreviousClose).toFixed(2);
			sortedArr.push(sorted);
		});
		return sortedArr;
	},
	numberFormat: function(number, dec, dsep, tsep) {
		if(isNaN(number) || number == null) return '';

		number = number.toFixed(~~dec);
		tsep = typeof tsep == 'string' ? tsep : ',';

		var parts = number.split('.'),
			fnums = parts[0],
			decimals = parts[1] ? (dsep || '.') + parts[1] : '';

		return fnums.replace(/(\d)(?=(?:\d{3})+$)/g, '$1' + tsep) + decimals;
	},
	render: function() {
		var portfolioValue = 0;
		var dayPL = 0;
		var dayPercent = 0;
		_.each(this.quotes, function(quote) {
			portfolioValue += parseInt(quote.MarketValue);
			dayPL += parseFloat(quote.todayPL);
		});
		dayPercent = dayPL / (portfolioValue - dayPL) * 100;
		$('article').html(this.template({ 
			quotes: this.quotes, 
			portfolioValue: this.numberFormat(portfolioValue), 
			dayPL: this.numberFormat(dayPL, 2),
			dayPercent: this.numberFormat(dayPercent, 2)
		}));
	}
};
$(document).ready(function() {
	window.Investments.init();
});