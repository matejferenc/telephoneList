var http = require('./http');
var cheerio = require('cheerio');

module.exports = {
	download: function(n, callback) {
		var url = 'http://neznamyvolajici.cz/' + n;
		
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
	var result = { };
	$('#content > p').each(function(i, e) {
		var t = $(e).text();
		if (t.indexOf('Uživatelé ohodnotili toto číslo známkou ') >= 0) {
			var m = t.substring(t.indexOf('Uživatelé ohodnotili toto číslo známkou ') + 40, t.indexOf(' ='));
			result.mark = m;
		}
	});
	console.log('neznamyVolajici.net extraction complete');
	callback(null, result);
}