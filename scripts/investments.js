'use strict';

window.Investments = {
	yahooYQL: 'https://query.yahooapis.com/v1/public/yql?q=',
	quoteURL: 'select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(',
	portfolio: {
		TSLA: {
			shares: 608,
			cost: 119287
		},
		AMBA: {
			shares: 100,
			cost: 10000
		},
		UA: {
			shares: 409,
			cost: 33508
		}
	},
	quotes: {

	},
	template: _.template('<div>' +
							'<div class="market-value"><span class="market-value__sign">$</span>22,000<span class="market-value__cents">.00</span></div>' +
							'<div class="day-gain">-2,000 (-10%) <span class="day-gain__span">TODAY</span></div>' +

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
									'<th>Market Value</th>' +
									'<th>Cost</th>' +
									'<th>P/L</th>' +
								'</tr>' +
								'<% _.each(quotes, function(quote) { %>' +
									'<tr>' +
										'<td class="symbol"><%= quote.symbol.toUpperCase() %><br><span class="num-shares"><%= portfolio[quote.symbol.toUpperCase()].shares %> SHARES</span></td>' + 
										'<td>$<%= quote.LastTradePriceOnly %></td>' + 
										'<td><%= quote.PercentChange %></td>' + 
										'<td>$<%= portfolio[quote.symbol.toUpperCase()].shares * parseInt(quote.LastTradePriceOnly).toFixed(2) %></td>' + 
										'<td>$<%= parseInt(portfolio[quote.symbol.toUpperCase()].cost).toFixed(2) %></td>' + 
										'<td>$<%= portfolio[quote.symbol.toUpperCase()].shares * parseInt(quote.LastTradePriceOnly).toFixed(2) - parseInt(portfolio[quote.symbol.toUpperCase()].cost).toFixed(2) %></td>' + 
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
		if(timeOfDay > '1300' || timeOfDay < '630') {
			$('article').css('background-color', '#020A11');
			console.log('market close');
		} else {
			$('article').css('background-color', '#FFF');
			console.log('market open');
		}
	},
	fetchQuotes: function() {
		var url = this.yahooYQL + this.quoteURL;
		var symbols = Object.keys(this.portfolio);
		url += "%22" + symbols.join("%22%2C%22") + "%22)&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=";
		if(this.quotes.length == undefined) {
			var that = this;
			$.ajax({
		    type: 'GET',
		    url: url,
		    success: function(data) {
		    	that.quotes = data.query.results.quote;
		    	that.render();
		    }});
		}
		return;
	},
	render: function() {
		$('article').html(this.template({ quotes: this.quotes, portfolio: this.portfolio }));
	}
};
$(document).ready(function() {
	window.Investments.init();
});