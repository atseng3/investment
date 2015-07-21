Parse.Cloud.job('clearDailyQuotesTable', function(request, status) {
	var today = new Date();
	if(today.getDay() == 0 || today.getDay() == 6) {
		status.success('Today is not a weekday~');
	}
	var DailyQuotes = Parse.Object.extend("DailyQuotes");
	var query = new Parse.Query(DailyQuotes);
	query.descending('createdAt');
	query.limit(1000);

	query.find({
		success: function(entries) {
			entries.shift();
			Parse.Object.destroyAll(entries, {
				success: function(){
					status.success('clearing table was a success!');
				},
				error: function(error) {
					status.error('clearing table was a failure!');
				}
			});
		}
	});
});

Parse.Cloud.job('fetchQuotes', function(request, status) {
	// call yql api to fetch quotes of all owned stocks every minute
	// insert into daily quotes database
	var today = new Date();
	if(today.getDay() == 0 || today.getDay() == 6) {
		status.success('Today is not a weekday~');
	}
	var hour = today.getHours().toString();
	var minute = today.getMinutes() < 10 ? '0'+today.getMinutes() : today.getMinutes();
	var timeRightNow = hour + minute;
	console.log(timeRightNow);
	if(timeRightNow > 2020) {
		status.success('Market is closed~');
	}

	var DailyQuotes = Parse.Object.extend('DailyQuotes');
	var dailyQuote = new DailyQuotes();

	// get portfolio stocks
	var Portfolio = Parse.Object.extend('Portfolio');
	var query = new Parse.Query(Portfolio);
	query.equalTo('portfolioId', 1);
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

				dailyQuote.set('marketValue', marketValue);
				dailyQuote.set('portfolioId', 1);

				dailyQuote.save(null, {
					success: function(data) {
						status.success('Market Value is: '+marketValue);
					}
				});
			}, function(httpResponse) {
				status.error('Error is ' + httpResponse.status);
			});
		}
	});
});

Parse.Cloud.job('calculateMarketValue', function(request, status) {
	var today = new Date();
	if(today.getDay() == 0 || today.getDay() == 6) {
		// status.success('Today is not a weekday~');
	}
	var Portfolio = Parse.Object.extend('Portfolio');
	var query = new Parse.Query(Portfolio);
	query.exists('shares');
	// order of events
	// 1. find all stuff that has shares
	// 2. build map with shares, stock, portfolioId
	// 3. call yahoo api to get the current market price
	// 4. calculate PortfolioValue for each portfolio and save
	query.find().then(function(quotes) {
		// - build map
		// map structure:
		// [{ 
		// 	TSLA: { 
		// 		shares: 100, 
		// 		cost: 100000 
		// 	}, 
		// 	AAPL: { 
		// 		shares: 100, 
		// 		cost: 100000 
		// 	}, 
		// 	GOOG: { 
		// 		shares: 100, 
		// 		cost: 100000 
		// 	}
		//  }, { 
		//  	TSLA: { 
		//  		shares: 100, 
		//  		cost: 100000 
		//  	}
		//  }, {
		//  	GOOG: {
		//  		shares: 100, 
		//  		cost: 100000
		//  	}
		//  }];
		var symbols = {};
		var portfolio = {};
		var map = [];
		for(var i = 0; i < quotes.length; i++) {
			var quote = quotes[i];
			symbols[quote.get('symbol')] = null;
			if(map[quote.get('portfolioId')] == undefined) {
				map[quote.get('portfolioId')] = {};
			}

			map[quote.get('portfolioId')][quote.get('symbol')] = {
				shares: quote.get('shares'),
				cost: quote.get('cost')
			};
		}
		map.shift();
		symbols = Object.keys(symbols);
		var url = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(';
		url += "%22" + symbols.join("%22%2C%22") + "%22)&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=";
		return Parse.Promise.when(Parse.Cloud.httpRequest({
				  url: url,
				  headers: {
				    'Content-Type': 'application/json;charset=utf-8'
				  }
				}), map);
	}).then(function(httpResponse, map) {
		var data = httpResponse.data;
		var quotes = [];
				
    	var raw_quotes = data.query.results.quote;

    	for(var j = 0; j < raw_quotes.length; j++) {
    		var quote = raw_quotes[j];
    		quotes.push({ symbol: quote.symbol, price: quote.LastTradePriceOnly });
    	}

    	// for each entry inside of map we need to do the following
    	var portfolioValueObjects = [];
    	var marketValue = 0;
    	var PortfolioValues = Parse.Object.extend('PortfolioValues');

	

    	for(var i = 0; i < map.length; i++) {
    		marketValue = 0;
    		var portfolioValue = new PortfolioValues();
    		var portfolio = map[i];
			for(var k = 0; k < quotes.length; k++) {
				if(portfolio[quotes[k].symbol]) {
					marketValue += portfolio[quotes[k].symbol]['shares'] * quotes[k].price;
				}
	    	}
	    	portfolioValue.set('marketValue', parseFloat(marketValue.toFixed(2)));
	    	portfolioValue.set('portfolioId', i+1);
	    	portfolioValue.set('date', new Date());
	    	portfolioValueObjects.push(portfolioValue);
    	}

    	return Parse.Object.saveAll(portfolioValueObjects);

	}).then(function(list) {
		status.success('done!!');
	}, function(error) {
  		status.error('There was an error: '+error);
	});
});