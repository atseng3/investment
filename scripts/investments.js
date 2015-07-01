'use strict';

// "1d",
// "1m",
// "3m",
// "6m",
// "1y",
// "2y",
// "5y"

// http://chartapi.finance.yahoo.com/instrument/1.0/TSLA/chartdata;type=quote;range=1m/json

window.Investments = {
	chartAPI: 'https://chartapi.finance.yahoo.com/instrument/1.0/',
	chartQuote: '/chartdata;type=quote;range=',
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
		},
		AMBA: {
			shares: 2000,
			cost: 150000
		},
		UA: {
			shares: 1000,
			cost: 60000
		},
		AAPL: {
			shares: null,
			cost: null
		},
		GOOG: {
			shares: null,
			cost: null
		},
		CHGG: {
			shares: null,
			cost: null
		},
		BABA: {
			shares: null,
			cost: null
		},
		PANW: {
			shares: null,
			cost: null
		},
		IBKR: {
			shares: null,
			cost: null
		},

	},
	// portfolio: {
	// 	TSLA: {
	// 		shares: 608,
	// 		cost: 119287
	// 	},
	// 	AMBA: {
	// 		shares: 1758,
	// 		cost: 200000
	// 	},
	// 	UA: {
	// 		shares: 409,
	// 		cost: 33508
	// 	}
	// },
	quotes: {

	},
	template: _.template('<div>' +
							'<div class="market-value"><span class="market-value__sign">$ </span><%= portfolioValue %></div>' +
							'<div class="day-gain <%= dayPLClass %>"><%= dayPL %> (<%= dayPercent %>%) <span class="day-gain__span">TODAY</span></div>' +

							'<table id="chart-list">' + 
								'<svg id="chart" width="1000" height="500"></svg>' +
								'<tr class="<%= dayPLClass %>">' + 
									'<th class="chart-range selected" data-range="1d" data-text="TODAY">1 DAY</th>' +
									'<th class="chart-range" data-range="1m" data-text="PAST MONTH">1 MONTH</th>' +
									'<th class="chart-range" data-range="3m" data-text="PAST 3 MONTHS">3 MONTHS</th>' +
									'<th class="chart-range" data-range="1y" data-text="PAST YEAR">1 YEAR</th>' +
									'<th class="chart-range" data-range="2y" data-text="PAST 2 YEARS">2 YEARS</th>' +
									'<th class="chart-range" data-range="5y" data-text="PAST 5 YEARS">5 YEARS</th>' +
									'<th class="chart-range" data-range="all" data-text="ALL">ALL</th>' +
								'</tr>' + 
							'</table>' +
							'<table id="watchlist">' +
								'<tr class="labels">' +
									'<th>Symbol</th>' +
									'<th>Price</th>' +
									'<th>% Change</th>' +
									'<th>Value Change</th>' +
									'<th>Market Value</th>' +
									'<th>Cost</th>' +
									'<th>P/L</th>' +
								'</tr>' +
								'<% _.each(quotes, function(quote) { %>' +
									'<tr class="<%= quote.Change >= 0 ? "positive" : "negative" %>">' +
										'<td class="symbol"><%= quote.Symbol %><br><span class="num-shares"><%= quote.Shares %> SHARES</span></td>' + 
										'<td>$<%= quote.LastTradePriceOnly %></td>' + 
										'<td><%= quote.PercentChange %></td>' + 
										'<td>$<%= quote.todayPL %></td>' + 
										'<td>$<%= quote.MarketValue %></td>' + 
										'<td>$<%= quote.Cost %></td>' + 
										'<td><%= quote.totalPL %></td>' + 
									'</tr>' +
								'<% }) %>' +
							'</table>' +
						 '</div>'),
	init: function() {
		this.fetchQuotes();
	},

	bindListeners: function() {
		var that = this;
		_.each($('.chart-range'), function(range) {
			$(range).on('click', _.bind(that.loadChart, that));
		});
		$('.chart-range.selected').click();
	},

	loadChart: function(event) {
		// toggle Tab
		var $target = $(event.target);
		this.toggleTab($target);
		// call api for data points
		this.fetchPlotData($target);
		// re-plot chart
	},

	toggleTab: function($target) {
		if($target.hasClass('selected')) {
			return false;
		}
		$target.siblings().removeClass('selected');
		$target.addClass('selected');
	},

	fetchPlotData: function($target) {
		var range = $target.data('range');
		var url = this.chartAPI + 'MTSI' + this.chartQuote + range + '/json';
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
	 //    xAxis = d3.svg.axis()
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

	setBackgroundColor: function() {
		var date = new Date(Date.now());
		var hour = date.getHours().toString();
		var minutes = date.getMinutes().toString();
		var timeOfDay = parseInt(hour.concat(minutes));
		// something bad happening over here with the time
		if(timeOfDay > 1300 || timeOfDay < 630) {
			$('.market-value').css('color', '#FFF');
			$('.symbol').css('color', '#FFF');
			$('body').css('background-color', '#020A11');
			console.log('market close');
		} else {
			$('.market-value').css('color', '#000');
			$('.symbol').css('color', '#000');
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
			} else {
				sorted['Shares'] = 0;
				sorted['todayPL'] = '-';
				sorted['MarketValue'] = '-';
				sorted['Cost'] = '-';
				sorted['totalPL'] = '-';
			}
			// sorted['Shares'] = portfolio[sorted['Symbol']].shares;
			// sorted['LastTradePriceOnly'] = quote.LastTradePriceOnly;
			// sorted['PercentChange'] = quote.PercentChange;
			// sorted['todayPL'] = (quote.Change / sorted['LastTradePriceOnly'] * quote.PreviousClose * sorted['Shares']).toFixed(2);
			// sorted['MarketValue'] = parseFloat(sorted['Shares'] * sorted['LastTradePriceOnly']).toFixed(2);
			// sorted['Cost'] = parseInt(portfolio[sorted['Symbol']].cost).toFixed(2);
			// sorted['totalPL'] = that.numberFormat(sorted['MarketValue'] - sorted['Cost'], 2, true);
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
		$('.btn-logout').css('background', color)
	}
};
$(document).ready(function() {
	window.Investments.init();
});