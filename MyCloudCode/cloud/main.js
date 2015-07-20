Parse.Cloud.job('calculateMarketValue', function(request, status) {
	var today = new Date();
	if(today.getDay() == 0 || today.getDay() == 6) {
		status.success('Today is not a weekday~');
	}
	var PortfolioValues = Parse.Object.extend('PortfolioValues');
	var portfolioValue = new PortfolioValues;

	portfolioValue.set('date', new Date());


	var UserPortfolios = Parse.Object.extend('UserPortfolios');
	var query = new Parse.Query(UserPortfolios);
	query.equalTo('portfolioId', 1);
	query.find({
		success: function(user_portfolio){
			portfolioValue.set('user', user_portfolio[0].get('user'));
		}
	})
	// get portfolio stocks
	var Portfolio = Parse.Object.extend('Portfolio');
	var query = new Parse.Query(Portfolio);
	// hardcode portfolioId
	query.equalTo('portfolioId', 1);
	query.exists('shares');
	query.find({
		success: function(quotes) {
			var symbols = [];
			var portfolio = {};
			var portfolioIdCount = 1;
			for(var i = 0; i < quotes.length; i++) {
				var quote = quotes[i];
				if(quote.get('portfolioId') > portfolioIdCount) {
					portfolioIdCount = quote.get('portfolioId');
				}
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
	    	// hardcode portfolioId
	    	portfolioValue.set('portfolioId', 1);
	    	portfolioValue.set('marketValue', marketValue);
	    	portfolioValue.save(null, {
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

// Parse.Cloud.job('fetchQuotes', function(request, status) {
// 	// call yql api to fetch quotes of all owned stocks every minute
// 	// insert into daily quotes database
// 	var today = new Date();
// 	if(today.getDay() == 0 || today.getDay() == 6) {
// 		// status.success('Today is not a weekday~');
// 	}
// 	var hour = today.getHours().toString();
// 	var minute = today.getMinutes() < 10 ? '0'+today.getMinutes() : today.getMinutes();
// 	var timeRightNow = hour + minute;
// 	console.log(timeRightNow);
// 	if(timeRightNow > 2020) {
// 		// status.success('Market is closed~');
// 	}

// 	var UserPortfolios = Parse.Object.extend('UserPortfolios');
// 	var query = new Parse.Query(UserPortfolios);
// 	query.descending('portfolioId');

// 	query.find({
// 		success: function(user_portfolios) {
// 			var promises = [];
// 			for(var i = 0; i < user_portfolios.length; i++) {
// 				// for each user_portfolio, get the portfolio id, fetch the portfolio with shares
// 				// and then do the calculation for marketValue
// 				var Portfolio = Parse.Object.extend('Portfolio');
// 				var query = new Parse.Query(Portfolio);
// 				query.equalTo('portfolioId', user_portfolios[i].get('portfolioId'));
// 				query.exists('shares');
// 				promises.push(query.find({
// 					success: function(quotes) {
// 						var DailyQuotes = Parse.Object.extend('DailyQuotes');
// 						var dailyQuote = new DailyQuotes();
// 						var symbols = [];
// 						var portfolio = {};
// 						for(var i = 0; i < quotes.length; i++) {
// 							var quote = quotes[i];
// 							portfolio[quote.get('symbol')] = {
// 								shares: quote.get('shares'),
// 								cost: quote.get('cost')
// 							};
// 						}
// 						symbols = Object.keys(portfolio);
// 						var url = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(';
// 						url += "%22" + symbols.join("%22%2C%22") + "%22)&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=";
// 						Parse.Cloud.httpRequest({
// 						  url: url,
// 						  headers: {
// 						    'Content-Type': 'application/json;charset=utf-8'
// 						  }
// 						}).then(function(httpResponse) {
// 							var data = httpResponse.data;
// 							var quotes = [];
							
// 					    	var raw_quotes = data.query.results.quote;

// 					    	for(var j = 0; j < raw_quotes.length; j++) {
// 					    		var quote = raw_quotes[j];
// 					    		quotes.push({ symbol: quote.symbol, price: quote.LastTradePriceOnly });
// 					    	}

// 					    	var marketValue = 0;

// 					    	for(var k = 0; k < quotes.length; k++) {
// 					    		marketValue += portfolio[quotes[k].symbol]['shares'] * quotes[k].price;
// 					    	}
// 					    	marketValue = parseFloat(marketValue.toFixed(2));

// 							dailyQuote.set('marketValue', marketValue);

// 							dailyQuote.save(null, {
// 								success: function(data) {
// 									console.log('marketValue is: '+marketValue);
// 									// user_portfolios_count -= 1;

// 								}
// 							});
// 						}, function(httpResponse) {

// 						});
// 					}
// 				}));
// 			}
// 			return Parse.Promise.when(promises);
// 		}
// 	}).then(function(){
// 		status.success('Stuff worked!!!');
// 	});
// });

