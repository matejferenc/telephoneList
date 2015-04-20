var http = require('./http');
var cheerio = require('cheerio');

module.exports = {
	download: function(ncc, callback) {
		var url = 'http://www.zlatestranky.cz/hledani/' + encodeURIComponent(encodeURIComponent(ncc)) + "/";

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
	var result = { results: [] };
	$('html > body > div > div > section > section > ol > li > section > div > div.span9').each(function(i, e) {
		var name = $(e).find('h1 > a').text();
		console.log('extracted name: ' + name);

		var address = $(e).find('ul > li > address:has(i.fa-home)').text();
		console.log('extracted address: ' + address);

		var web = $(e).find('ul > li > a:has(i.fa-link)').text();
		console.log('extracted web: ' + web);

		var email = $(e).find('ul > li > a:has(i.fa-envelope)').text();
		console.log('extracted email: ' + email);

		result.results.push({ name: name, email: email, address: address, web: web});
	});
	console.log('zs extraction complete');
	callback(null, result);
}