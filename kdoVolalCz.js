var http = require('./http');
var cheerio = require('cheerio');

module.exports = {
	download: function(n, callback) {
		var url = 'http://www.kdovolal.cz/cislo/';
		var data = { cis : n, 'Hledej' : 'Hledej'}
		
		http.post(url, data, function(data) {
			if (data) {
				extractData(data, callback);
			} else {
				console.log('could not download data from url: ' + url);
				callback(null, {});
			}
		});
	}
}

function extractData(data, callback) {
	var $ = cheerio.load(data);
	var result = {};
	$('html > body > div > div > div > article > div > p > div > div > p').each(function(i, e) {
		var c = $(e).text();
		c = c.substring(c.indexOf('</strong> ') + 10, c.indexOf('x'));
		result.searchCount = c;
	});
	$('html > body > div > div > div > article > div > p > div > div > p > div > span').each(function(i, e) {
		var status = $(e).text();
		result.status = status;
	});
	console.log('kv.cz extraction complete');
	callback(null, result);
}