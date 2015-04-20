var http = require('./http');
var cheerio = require('cheerio');

module.exports = {
	download: function(n, callback) {
		var url = 'http://www.vyhledatcislo.cz/cislo/' + n;

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
	var result = { comments : [] };
	$('#duveryhodnost_inner').each(function(i, e) {
		var s = $(e).text();
		s = s.replace(/[\r\n\t%]/gm, '');
		s = s.replace(/ /gm, '');
		result.riskPercent = s;
	});
	$('#tbody-comments > tr').each(function(i, e) {
		var rank = $(e).find('td.tdRank').text();
		var comment = $(e).find('td.td_bl > p.commentText').text();
		result.comments.push({ rank : rank, comment : comment});
	});
	console.log('vyhledatCislo extraction complete');
	callback(null, result);
}