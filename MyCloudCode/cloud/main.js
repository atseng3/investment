Parse.Cloud.job('calculateMarketValue', function(request, status) {
	var UserPortfolios = Parse.Object.extend('UserPortfolios');
	var userPortfolio = new UserPortfolios;

	// hard coded portfolioId
	userPortfolio.set('portfolioId', 1);
	userPortfolio.set('date', new Date());

	// get portfolio stocks
	var Portfolio = Parse.Object.extend('Portfolio');
	var query = new Parse.Query(Portfolio);
	query.exists('shares');
	query.find({
		success: function(quotes) {
			var symbols = [];
			var portfolio = {};
			for(var i = 0; i < quotes.length; i++) {
				var quote = quotes[i];
				portfolio[quote.get('symbol')] = {
					shares: quote.get('shares'),
					cost: quote.get('cost')
				};
			}
			symbols = Object.keys(portfolio);
			var url = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(';
			url += "%22" + symbols.join("%22%2C%22") + "%22)&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=";
			Parse.Cloud.httpRequest({
			  url: url,
			  headers: {
			    'Content-Type': 'application/json;charset=utf-8'
			  }
			}).then(function(httpResponse) {
				var data = httpResponse.data;
				var quotes = [];
				
	    	var raw_quotes = data.query.results.quote;

	    	for(var j = 0; j < raw_quotes.length; j++) {
	    		var quote = raw_quotes[j];
	    		quotes.push({ symbol: quote.symbol, price: quote.LastTradePriceOnly });
	    	}

	    	var marketValue = 0;

	    	for(var k = 0; k < quotes.length; k++) {
	    		marketValue += portfolio[quotes[k].symbol]['shares'] * quotes[k].price;
	    	}
	    	marketValue = parseFloat(marketValue.toFixed(2));
	    	userPortfolio.set('marketValue', marketValue);
	    	userPortfolio.save(null, {
					success: function(portfolio) {
						status.success('Market Value is: '+marketValue);
					}
				});
			}, function(httpResponse) {
				status.error('Error is ' + httpResponse.status);
			});
		}
	});
});