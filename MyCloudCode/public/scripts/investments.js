'use strict';

// "1d", interval: min 
// "1m", interval: day 30days 22workdays
// "3m", interval: day 90days 66workdays
// "6m", interval: day 
// "1y", interval: day 262days 
// "2y", interval: day 524days
// "5y" interval: week -> new Date().getDay == 1

// http://chartapi.finance.yahoo.com/instrument/1.0/TSLA/chartdata;type=quote;range=1m/json

window.Investments = {
	chartAPI: 'https://chartapi.finance.yahoo.com/instrument/1.0/',
	chartQuote: '/chartdata;type=quote;range=',
	yahooYQL: 'https://query.yahooapis.com/v1/public/yql?q=',
	quoteURL: 'select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(',

	historicalURL: 'select%20*%20from%20yahoo.finance.historicaldata%20where%20symbol%20%3D%20%22YHOO%22%20and%20startDate%20%3D%20%222009-09-11%22%20and%20endDate%20%3D%20%222010-03-10%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=',

	portfolioValueToday: 0,

	portfolio: {},
	quotes: {},

	template: _.template('<div>' +
							'<div class="market-value"><span class="market-value__sign">$ </span><%= portfolioValue %></div>' +
							'<div class="day-gain <%= dayPLClass %>"><%= dayPL %> (<%= dayPercent %>%) <span class="day-gain__span">TODAY</span></div>' +
							
								'<table id="chart-list">' + 
								'<div id="chart-container" style="width: 1000px;height: 500px;margin: auto;">' +
									'<svg id="chart" width="1000" height="500"></svg>' +
									'</div>' +
									'<tr class="<%= dayPLClass %>">' + 
										'<th class="chart-range" data-range="1d" data-charttype="oneDayPlot" data-text="TODAY">1 DAY</th>' +
										'<th class="chart-range" data-range="1m" data-charttype="longRangePlot" data-text="PAST MONTH" data-workdays="22">1 MONTH</th>' +
										'<th class="chart-range" data-range="3m" data-charttype="longRangePlot" data-text="PAST 3 MONTHS" data-workdays="66">3 MONTHS</th>' +
										'<th class="chart-range" data-range="1y" data-charttype="longRangePlot" data-text="PAST YEAR" data-workdays="262">1 YEAR</th>' +
										'<th class="chart-range" data-range="2y" data-charttype="longRangePlot" data-text="PAST 2 YEARS"  data-workdays="524">2 YEARS</th>' +
										'<th class="chart-range" data-range="5y" data-charttype="longRangePlot" data-text="PAST 5 YEARS">5 YEARS</th>' +
										'<th class="chart-range" data-range="all" data-charttype="longRangePlot" data-text="ALL">ALL</th>' +
									'</tr>' + 
								'</table>' +

							'<table id="watchlist">' +
								'<tr class="labels">' +
									'<th>Symbol</th>' +
									'<th>Price</th>' +
									'<th>% Change</th>' +
									'<th>Daily Change</th>' +
									'<th>Market Value</th>' +
									'<th>Cost</th>' +
									'<th>P/L</th>' +
								'</tr>' +
								'<% _.each(quotes, function(quote) { %>' +
									'<tr>' +
										'<td class="symbol <%= quote.Shares != 0 ? "symbol-position" : "" %>"><%= quote.Symbol %><br><span class="num-shares"><%= quote.Shares != 0 ? quote.Shares + " SHARES" : "WATCHLIST" %></span></td>' + 
										'<td class="<%= quote.Change >= 0 ? "positive" : "negative" %>">$<%= quote.LastTradePriceOnly %></td>' + 
										'<td class="<%= quote.Change >= 0 ? "positive" : "negative" %>"><%= quote.PercentChange %></td>' + 
										'<td class="<%= quote.Change >= 0 ? "positive" : "negative" %>">$<%= quote.todayPL %></td>' + 
										'<td class="<%= quote.totalPLClass %>">$<%= quote.MarketValue %></td>' + 
										'<td class="<%= quote.totalPLClass %>">$<%= quote.Cost %></td>' + 
										'<td class="<%= quote.totalPLClass %>"><%= quote.totalPL %></td>' + 
									'</tr>' +
								'<% }) %>' +
							'</table>' +
						 '</div>'),
	init: function() {
		Parse.initialize("2LZNpkBEtOWN6z6gkoyM5j9tl8XLsTggQb70O51b", "6U76pQ4YKLVKy3VOWhKk0V6l0qwhuzeAGQd7ycjf");
		this.checkLogin();
		this.fetchQuotes();
	},

	checkLogin: function() {
		if(!Parse.User.current()) {
			window.location.href = './login/index.html';
		}
		$('.welcome-text').html('Welcome ' + Parse.User.current().get('username').toUpperCase());
	},

	bindListeners: function() {
		var that = this;
		$('.btn-logout').click(function(event) {
			Parse.User.logOut();
			window.location.href = './login/index.html';
	    });
		_.each($('.chart-range'), function(range) {
			$(range).on('click', _.bind(that.loadChart, that));
		});
		$('th.chart-range[data-range="1d"]').click();
	},

	loadChart: function(event) {
		// toggle Tab
		var $target = $(event.target);
		if($target.hasClass('selected')) {
			return false;
		}
		this.toggleTab($target);
		// call api for data points
		this.fetchUserPlotData($target, $target.data('charttype'));
	},

	toggleTab: function($target) {
		$target.siblings().removeClass('selected');
		$target.addClass('selected');
	},

	parseCallbacks: {
		oneDayPlot: {
			table: 'DailyQuotes',
			ascending: 'createdAt',
			callback: function($target, data) {
				var today = new Date();
				if(today.getDay() == 0 || today.getDay() == 6) {
					today = data[data.length-1].createdAt;
				} else {
					today.setHours(13);
					today.setMinutes(0);
				}
				var portfolioValue = {
					previous_close: data[0].get('marketValue'),
					ranges: {
						close: {
							min: null,
							max: null
						},
						dates: {
							min: data[1].createdAt,
							max: today
						}
					},
					series: []
				};
				var allAvailableDates = [];
				var allMarketValues = [];

				data.shift();
				
				_.each(data, function(quote) {
					portfolioValue.series.push({ Date: quote.createdAt, close: quote.get('marketValue') });
					allMarketValues.push(quote.get('marketValue'));
				});

				allMarketValues.sort();

				portfolioValue.ranges.close.max = allMarketValues[allMarketValues.length-1];
				portfolioValue.ranges.close.min = allMarketValues[0];
				var range = '1d';
				var rangeText = $target.data('text');
				this.plotUserMarketValueChart(portfolioValue, range, rangeText);
			}
		},
		longRangePlot: {
			table: 'PortfolioValues',
			ascending: 'marketValue',
			callback: function($target, data) {
				var workdays = $target.data('workdays');
				var portfolioValue = {
					previous_close: null,
					ranges: {
						close: {
							min: data[0].get('marketValue'),
							max: data[data.length-1].get('marketValue')
						},
						dates: {
							min: null,
							max: null
						}
					},
					series: []
				};

				var temp = {};
				temp[moment().format('YYYYMMDD')] = this.portfolioValueToday;
				var allAvailableDates = [moment()];
				_.each(data, function(entry) {
					temp[moment(entry.get('date')).format('YYYYMMDD')] = entry.get('marketValue');
					allAvailableDates.push(moment(entry.get('date')));
				});

				portfolioValue.ranges.dates.max = moment.max(allAvailableDates).format('YYYYMMDD');

				var days = workdays;
				var date = moment();
				while (days > 0) {
					if(date.isoWeekday() !== 6 && date.isoWeekday() !== 7) {
						days -= 1;
						var formattedDate = date.format('YYYYMMDD');
						if(temp[formattedDate]) {
							portfolioValue.series.push({ Date: formattedDate, close: temp[formattedDate]});
						} else {
							var lastAvailableDate = moment.min(allAvailableDates);
							portfolioValue.series.push({ Date: date.format('YYYYMMDD'), close: temp[lastAvailableDate.format('YYYYMMDD')]});
						}
					}
					date = date.subtract(1, 'days');
				}
				portfolioValue.ranges.dates.min = formattedDate;
				portfolioValue.series.reverse();
				portfolioValue.previous_close = portfolioValue.series[0].close;

				var range = $target.data('range');

				var rangeText = $target.data('text');

				this.plotUserMarketValueChart(portfolioValue, range, rangeText);
			}
		}
	},

	fetchUserPlotData: function($target, chartType) {
		var parseCallback = this.parseCallbacks[chartType];
		var DataTable = Parse.Object.extend(parseCallback.table);
		var query = new Parse.Query(DataTable);
		if(parseCallback.table == 'PortfolioValues') {
			query.equalTo('user', Parse.User.current());
		}
		query.ascending(parseCallback.ascending);
		query.limit(1000);
		query.find({
			// pass in this and $target for context
			success: $.proxy(parseCallback.callback, this, $target)
		});
	},

	plotUserMarketValueChart: function(data, range, rangeText) {
		var parseDate = d3.time.format("%Y%m%d").parse;
		var xAxisMin = data.ranges.dates.min;
		var xAxisMax = data.ranges.dates.max;

		// set y axis min and max
		// price min and price max

		var marketValueMin = Math.min(data.ranges.close.min, data.previous_close);
		var marketValueMax = data.ranges.close.max;

		// set dataset
		var dataset = data.series;

		var vis = d3.select("#chart");
		vis.selectAll("*").remove();
	    var WIDTH = 1000,
	    HEIGHT = 500,
	    MARGINS = {
	        top: 20,
	        right: 0,
	        bottom: 20,
	        left: 0
	    },
	    // scaling
	    xScale = d3.scale.linear().range([MARGINS.left, WIDTH - MARGINS.right]).domain([xAxisMin, xAxisMax]),
	    yScale = d3.scale.linear().range([HEIGHT - MARGINS.top, MARGINS.bottom]).domain([marketValueMin, marketValueMax]);
	    // line
	    var lineGen = d3.svg.line()
		    .x(function(d) {
	    		return xScale(d.Date);
		    })
		    .y(function(d) {
		        return yScale(d.close);
		    });
		if(range == '1d') {
			lineGen.interpolate('basis');
		}
		var PLClass = data.series[data.series.length-1].close - data.previous_close > 0 ? 'positive' : 'negative';
		var color = PLClass == 'positive' ? '#21CE99' : '#F9523A';

		// set chart legends and PL
		$('#chart-list tr').removeClass().addClass(PLClass);
		$('.day-gain').removeClass('negative').removeClass('positive').addClass(PLClass);
		var PL = data.series[data.series.length-1].close - data.previous_close;
		var PLPercent = PL / data.previous_close * 100;
		$('.day-gain').html(this.numberFormat(PL, 2)+' ('+this.numberFormat(PLPercent, 2)+'%) <span class="day-gain__span">'+rangeText+'</span>');
		$('.day-gain__span').html(rangeText);

		vis.append('svg:path')
		.attr('d', lineGen(dataset))
		.attr('stroke', color)
		.attr('stroke-width', 2)
		.attr('fill', 'none');

		if(range == '1d') {
			vis.append("line")
		             .attr("x1", MARGINS.left)
		             .attr("y1", yScale(data.previous_close))
		             .attr("x2", WIDTH)
		             .attr("y2", yScale(data.previous_close))
		             .style('stroke-dasharray', ('4,4'))
		             .attr("stroke-width", 2)
		             .attr("stroke", "#ACB0B3");

		}
	},

// not used for now: for individual stock plot

	fetchPlotData: function($target) {
		var range = $target.data('range');
		var url = this.chartAPI + 'TSLA' + this.chartQuote + range + '/json';
		$.ajax({
	    type: 'GET',
	    dataType: 'jsonp',
	    url: url,
	    context: this,
	    success: function(data) {
	    	if(range == '1d') {
	    		var startPrice = data.meta.previous_close;
	    	} else {
	    		var startPrice = data.series[0].close;
	    	}
	    	var endPrice = data.series[data.series.length-1].close,
	    		priceDiff = (endPrice - startPrice).toFixed(2),
	    		percentageDiff = ((endPrice / startPrice - 1) * 100).toFixed(2),
	    		dayPLClass = priceDiff >= 0 ? 'positive' : 'negative';
	    	$('div.day-gain').html(priceDiff + ' (' + percentageDiff + '%) <span class="day-gain__span">'+$target.data('text')+'</span>').removeClass().addClass('day-gain ' + dayPLClass);
	    	$('#chart-list tr').removeClass().addClass(dayPLClass);
	    	this.plotChart(data, dayPLClass, range);
	    }
	  });
	},

	plotChart: function(data, PLClass, range) {
		var parseDate = d3.time.format("%Y%m%d").parse;
		if(data.Date) {
			var xAxisMin = parseDate(data.Date.min.toString()),
				xAxisMax = parseDate(data.Date.max.toString());
		} else {
			var xAxisMin = new Date(data.Timestamp.min * 1000),
				xAxisMax = new Date(data.Timestamp.max * 1000);
		}
		if(range == '1d') {
			var priceMin = Math.min(data.ranges.close.min, data.meta.previous_close);
		} else {
			var priceMin = data.ranges.close.min;

		}
		var	priceMax = data.ranges.close.max;
		var dataset = data.series;
		

		var vis = d3.select("#chart");
		vis.selectAll("*").remove();
	    var WIDTH = 1000,
	    HEIGHT = 500,
	    MARGINS = {
	        top: 20,
	        right: 20,
	        bottom: 20,
	        left: 50
	    },
	    // scaling
	    xScale = d3.scale.linear().range([MARGINS.left, WIDTH - MARGINS.right]).domain([xAxisMin, xAxisMax]),
	    yScale = d3.scale.linear().range([HEIGHT - MARGINS.top, MARGINS.bottom]).domain([priceMin, priceMax]);
	    
	    // axis
	 //var    xAxis = d3.svg.axis()
		//     .scale(xScale),
		  
		// yAxis = d3.svg.axis()
		//     .scale(yScale);
		// vis.append("svg:g")
		//     .attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
		//     .call(xAxis);

	 //   yAxis = d3.svg.axis()
		// 	.scale(yScale)
		// 	.orient("left");
		// vis.append("svg:g")
	 //    .attr("transform", "translate(" + (MARGINS.left) + ",0)")
	 //    .call(yAxis);

	    // line
	    var lineGen = d3.svg.line()
		    .x(function(d) {
		    	if(d.Date) {
		    		return xScale(parseDate(d.Date.toString()));
		    	} else {
		    		return xScale(new Date(d.Timestamp * 1000))
		    	}
		    })
		    .y(function(d) {
		        return yScale(d.close);
		    });
		 var color = PLClass == 'positive' ? '#21CE99' : '#F9523A';
		 vis.append('svg:path')
		  .attr('d', lineGen(dataset))
		  .attr('stroke', color)
		  .attr('stroke-width', 2)
		  .attr('fill', 'none');

		  if(range == '1d') {
		  	vis.append("line")
                         .attr("x1", MARGINS.left)
                         .attr("y1", yScale(data.meta.previous_close))
                         .attr("x2", WIDTH)
                         .attr("y2", yScale(data.meta.previous_close))
                         .style('stroke-dasharray', ('3, 3'))
                         .attr("stroke-width", 2)
                         .attr("stroke", "#ACB0B3");
		  }
	},

// end of individual stock plot

	setBackgroundColor: function() {
		var date = new Date();
		if(date.getDay() == 0 || date.getDay() == 6) {
			var timeOfDay = '000';
		} else {
			var hour = date.getHours().toString();
			var minutes = date.getMinutes() < 10 ? '0'+date.getMinutes() : date.getMinutes();
			var timeOfDay = parseInt(hour.concat(minutes));	
		}

		if(timeOfDay > 1300 || timeOfDay < 630) {
			$('.market-value').css('color', '#FFF');
			$('.symbol.symbol-position').css('color', '#FFF');
			$('body').css('background-color', '#020A11');
			console.log('market close');
			var element = document.getElementById("chart");
			element.setAttribute("class", "market-closed");
		} else {
			$('.market-value').css('color', '#000');
			$('.symbol.symbol-position').css('color', '#000');
			$('body').css('background-color', '#FFF');
			console.log('market open');
			var element = document.getElementById("chart");
			element.setAttribute("class", "market-open");
			// $('.selected').css('color', '#000');
		}
	},
	fetchQuotes: function() {
		var url = this.yahooYQL + this.quoteURL;
		var that = this;
		var Portfolio = Parse.Object.extend('Portfolio');
		var query = new Parse.Query(Portfolio);
		query.equalTo('user', Parse.User.current());
		query.descending('shares');
		query.addAscending('symbol');
		query.find({
			success: function() {

			},
			error: function(error) {

			}
		}).then(function(quotes) {
			var symbols = [];
			var portfolio = {};
			_.each(quotes, function(quote) {
				portfolio[quote.get('symbol')] = {
					shares: quote.get('shares'),
					cost: quote.get('cost')
				};
			});
			that.portfolio = portfolio;
			symbols = Object.keys(portfolio);
			url += "%22" + symbols.join("%22%2C%22") + "%22)&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=";
			$.ajax({
		    type: 'GET',
		    url: url,
		    success: function(data) {
		    	that.quotes = that.massageData(data.query.results.quote);
		    	that.render();
		    }});
		});
		return;
	},
	massageData: function(quotes) {
		var sortedArr = [];
		var portfolio = this.portfolio;
		var that = this;
		_.each(quotes, function(quote) {
			var sorted = {};
			// for table
			sorted['Symbol'] = quote.symbol.toUpperCase();
			sorted['LastTradePriceOnly'] = quote.LastTradePriceOnly;
			sorted['PercentChange'] = quote.PercentChange;
			if(portfolio[sorted['Symbol']].shares) {
				sorted['Shares'] = portfolio[sorted['Symbol']].shares;
				sorted['todayPL'] = (quote.Change / sorted['LastTradePriceOnly'] * quote.PreviousClose * sorted['Shares']).toFixed(2);
				sorted['MarketValue'] = parseFloat(sorted['Shares'] * sorted['LastTradePriceOnly']).toFixed(2);
				sorted['Cost'] = parseInt(portfolio[sorted['Symbol']].cost).toFixed(2);
				sorted['totalPL'] = that.numberFormat(sorted['MarketValue'] - sorted['Cost'], 2, true);
				sorted['totalPLClass'] = sorted['MarketValue'] - sorted['Cost'] >= 0 ? 'positive' : 'negative';				
			} else {
				sorted['Shares'] = 0;
				sorted['todayPL'] = '-';
				sorted['MarketValue'] = '-';
				sorted['Cost'] = '-';
				sorted['totalPL'] = '-';
				sorted['totalPLClass'] = '';
			}
			// extra
			sorted['Change'] = quote.Change;
			sorted['PreviousClose'] = parseInt(quote.PreviousClose).toFixed(2);
			sortedArr.push(sorted);
		});
		return sortedArr;
	},
	numberFormat: function(number, dec, money, dsep, tsep) {
		if(isNaN(number) || number == null) return '';

		number = number.toFixed(~~dec);
		tsep = typeof tsep == 'string' ? tsep : ',';

		var parts = number.split('.'),
			fnums = parts[0],
			decimals = parts[1] ? (dsep || '.') + parts[1] : '',
			money = money ? '$' : '';
		fnums = fnums.replace(/-/, '-&');
		fnums = fnums.split('&').join('$');

		return fnums.replace(/(\d)(?=(?:\d{3})+$)/g, '$1' + tsep) + decimals;
	},
	render: function() {
		var portfolioValue = 0;
		var dayPL = 0;
		var dayPercent = 0;
		var dayPLClass = 'positive';
		_.each(this.quotes, function(quote) {
			if(!isNaN(quote.MarketValue)) {
				portfolioValue += parseFloat(quote.MarketValue);
				dayPL += parseFloat(quote.todayPL);
			}
		});
		dayPercent = dayPL / (portfolioValue - dayPL) * 100;
		dayPLClass = dayPL >= 0 ? 'positive' : 'negative';
		this.setSidebarColor(dayPLClass);
		this.portfolioValueToday = portfolioValue;
		portfolioValue = this.numberFormat(portfolioValue, 2);
		
		portfolioValue = portfolioValue.toString().split('.').join('<span class="market-value__cents">.');
		portfolioValue += '</span>';
		$('article').html(this.template({ 
			quotes: this.quotes, 
			portfolioValue: portfolioValue, 
			dayPL: this.numberFormat(dayPL, 2, true),
			dayPercent: this.numberFormat(dayPercent, 2),
			dayPLClass: dayPLClass
		}));
		this.setBackgroundColor();
		this.bindListeners();
	},
	setSidebarColor: function(dayPLClass) {
		var color = dayPLClass == 'positive' ? '#21CE99' : '#F9523A'
		$('.logo').css('border', '3px solid ' + color);
		$('.logo').css('color', color);
		$('.btn-logout').css('background', color)
	}
};
$(document).ready(function() {
	window.Investments.init();
});