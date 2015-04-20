var http = require('./http');
var cheerio = require('cheerio');

module.exports = {
	download: function(n, callback) {
		var url = 'http://kdovolal.net/' + n;
		
		http.get(url, function(data) {
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
	var result = { count: 0 };
	$('html > body > div > div > table > tr').each(function(i, e) {
		result.count += 1;
	});
	console.log('kv.net extraction complete');
	callback(null, result);
}