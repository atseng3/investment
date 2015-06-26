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
							'<table style="width:100%;">' +
								'<tr>' +
									'<th>Symbol</th>' +
									'<th>Shares</th>' +
									'<th>Price</th>' +
									'<th>Cost</th>' +
									'<th>Market Value</th>' +
									'<th>P/L</th>' +
								'</tr>' +
								'<% _.each(quotes, function(quote) { %>' +
									'<tr>' +
										'<td><%= quote.symbol.toUpperCase() %></td>' + 
										'<td><%= portfolio[quote.symbol.toUpperCase()].shares %></td>' + 
										'<td><%= quote.LastTradePriceOnly %></td>' + 
										'<td>$<%= portfolio[quote.symbol.toUpperCase()].cost %></td>' + 
										'<td>$<%= portfolio[quote.symbol.toUpperCase()].shares * quote.LastTradePriceOnly %></td>' + 
										'<td><%= portfolio[quote.symbol.toUpperCase()].shares * quote.LastTradePriceOnly - portfolio[quote.symbol.toUpperCase()].cost %></td>' + 
									'</tr>' +
								'<% }) %>' +
							'</table>' +
						 '</div>'),
	init: function() {
		this.fetchQuotes();
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