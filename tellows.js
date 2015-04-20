var http = require('./http');
var cheerio = require('cheerio');

module.exports = {
	download: function(n, callback) {
		var url = 'http://www.tellows.cz/num/' + n;
		
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
	var result = {};
	$('#details > div.box.box3 > div > p > span[itemprop=count]').each(function(i, e) {
		var t = $(e).text();
		result.commentsCount = t;
	});
	if (result.commentsCount != 0) {
		$('#details > div.box.box3 > div > p').each(function(i, e) {
			var t = $(e).text();
			var s = t.substring(t.indexOf('Typy hovorů:') + 12, t.indexOf('Jméno / firma:'));
			s = s.replace(/[\r\n\t]/gm, '');
			s = s.replace(/  /gm, '');
			result.status = s;
			
			var f = t.substring(t.indexOf('Jméno / firma:') + 14, t.indexOf('Počet komentářů'));
			f = f.replace(/více.../igm, '');
			f = f.replace(/[\r\n\t]/gm, '');
			f = f.replace(/<[^<]>/gm, '');
			f = f.replace(/  /gm, '');
			result.name = f;
			
			var q = t.substring(t.indexOf('Poptávky po tomto čísle:') + 28, t.indexOf('function loadStats'));
			q = q.replace(/[\r\n\t]/gm, '');
			q = q.replace(/  /gm, '');
			result.searches = q;
		});
		$('#tellowsscore > div.scorepic > a > img').each(function(i, e) {
			var t = $(e).attr('src');
			result.score = t.substring(19, 20);
		});
	}
	
	console.log('tellows extraction complete');
	callback(null, result);
}