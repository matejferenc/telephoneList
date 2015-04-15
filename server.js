var express = require('express');
var http = require("http");
var cheerio = require('cheerio');
var mongodb = require('mongodb')
var async = require('async');
var querystring = require('querystring');
var request = require('request');

var mongoUrl = 'mongodb://localhost:27017/telephoneList';

var app = express();
app.get('/', function(req, res) {
	res.send('Hello World');
});

var search = function(req, res) {
	var input = req.query.n;
	console.log('input: ' + input);
	inputNormalized = normalize(input);
	console.log('input normalized: ' + inputNormalized);
	try {
		validateTelephoneNumber(inputNormalized);
		var numbers = resolveCountryCodes(inputNormalized);
		var record = { n: numbers.n, ncc: numbers.ncc, inserted: new Date() };
		async.parallel({
			zlateStranky: function(callback) {
				downloadZlateStranky(numbers.ncc, callback);
			},
			kdovolalnet: function(callback) {
				downloadKdoVolalNet(numbers.n, callback);
			},
			kdovolalcz: function(callback) {
				downloadKdoVolalCz(numbers.n, callback);
			},
			tellows: function(callback) {
				downloadTellows(numbers.n, callback);
			}
		},
		function(err, results) {
			var zs = results.zlateStranky;
			merge(record, { zs: results.zlateStranky });
			merge(record, { kvnet: results.kdovolalnet });
			merge(record, { kvcz: results.kdovolalcz });
			merge(record, { tellows: results.tellows });
			store(record);
			res.send(record.zs.name + ' ' + record.kvnet.count + ' ' + record.kvcz.status);
		});
	} catch(err) {
		res.send('error ' + err);
	}
};
app.get('/search', search);
app.listen(3000);

function merge(a, b) {
	for (var attrname in b) {
		a[attrname] = b[attrname];
	}
}

function normalize(n) {
	n = n.replace(/-/g, '')
	n = n.replace(/ /g, '');
	return n;
}

function store(result) {
	var mongoClient = mongodb.MongoClient;
	mongoClient.connect(mongoUrl, function(err, db) {
		if (err) {
			console.log('error while connecting to mongodb: ' + err);
		} else {
			var coll = db.collection('numbers');
			coll.insert(result);
			db.close();
		}
	});
}

function resolveCountryCodes(n) {
	var numbers = {};
	if (n.lastIndexOf('+420', 0) === 0) {//startsWith
		numbers.n = n.replace('+420', '');
		numbers.ncc = n;
	} else {
		numbers.n = n;
		numbers.ncc = '+420' + n;
	}
	return numbers;
}

function validateTelephoneNumber(n) {
	var regex = new RegExp('^\\+?[\\d]+$');
	if (!regex.test(n)) {
		throw 'number not valid ' + n;
	}
	console.log('number ' + n + ' is valid');
}

function downloadTellows(n, callback) {
	var url = 'http://www.tellows.cz/num/' + n;
	
	httpget(url, function(data) {
		if (data) {
			extractDataTellows(data, callback);
		} else console.log('could not download data from url: ' + url);
	});
}

function extractDataTellows(data, callback) {
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
			s = s.replace(/[\r\n]/gm, '');
			s = s.replace(/  /gm, '');
			result.status = s;
			
			var f = t.substring(t.indexOf('Jméno / firma:') + 14, t.indexOf('function klappen'));
			f = f.replace(/více.../igm, '');
			f = f.replace(/[\r\n]/gm, '');
			f = f.replace(/  /gm, '');
			result.name = f;
			
			var q = t.substring(t.indexOf('Poptávky po tomto čísle:') + 28, t.indexOf('function loadStats'));
			q = q.replace(/[\r\n]/gm, '');
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

function downloadKdoVolalCz(n, callback) {
	var url = 'http://www.kdovolal.cz/cislo/';
	var data = { cis : n, 'Hledej' : 'Hledej'}
	
	httppost(url, data, function(data) {
		if (data) {
			extractDataKVCz(data, callback);
		} else console.log('could not download data from url: ' + url);
	});
}

function extractDataKVCz(data, callback) {
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

function downloadKdoVolalNet(n, callback) {
	var url = 'http://kdovolal.net/' + n;
	
	httpget(url, function(data) {
		if (data) {
			extractDataKVNet(data, callback);
		} else console.log('could not download data from url: ' + url);
	});
}

function extractDataKVNet(data, callback) {
	var $ = cheerio.load(data);
	var result = { count: 0 };
	$('html > body > div > div > table > tr').each(function(i, e) {
		result.count += 1;
	});
	console.log('kv.net extraction complete');
	callback(null, result);
}

function downloadZlateStranky(ncc, callback) {
	var url = 'http://www.zlatestranky.cz/hledani/' + encodeURIComponent(encodeURIComponent(ncc)) + "/";

	httpget(url, function(data) {
		if (data) {
			extractDataZS(data, callback);
		} else console.log('could not download data from url: ' + url);
	});
}

function extractDataZS(data, callback) {
	var $ = cheerio.load(data);
	var result = {};
	$('html > body > div > div > section > section > ol > li > section > div > div > h1 > a').each(function(i, e) {
		var name = $(e).text();
		console.log('extracted name: ' + name);
		result.name = name;
	});
	$('html > body > div > div > section > section > ol > li > section > div > div > ul > li > address:has(i.fa-home)').each(function(i, e) {
		var address = $(e).text();
		console.log('extracted address: ' + address);
		result.address = address;
	});
	$('html > body > div > div > section > section > ol > li > section > div > div > ul > li > a:has(i.fa-link)').each(function(i, e) {
		var web = $(e).text();
		console.log('extracted web: ' + web);
		result.web = web;
	});
	$('html > body > div > div > section > section > ol > li > section > div > div > ul > li > a:has(i.fa-envelope)').each(function(i, e) {
		var email = $(e).text();
		console.log('extracted email: ' + email);
		result.email = email;
	});
	console.log('zs extraction complete');
	callback(null, result);
}

// Utility function that downloads a URL and invokes
// callback with the data.
function httpget(url, callback) {
	console.log('downloading from url: ' + url);
	http.get(url, function(res) {
		var data = "";
		res.on('data', function (chunk) {
		  data += chunk;
		});
		res.on('end', function() {
			callback(data);
		});
	}).on('error', function() {
		callback(null);
	});
}

// Utility function that downloads a URL and invokes
// callback with the data.
function httppost(url, data, callback) {
	console.log('downloading from url: ' + url);
	var postData = querystring.stringify(data);

	request({ uri : url,
		method : 'POST',
		form: data,
		headers: {
			'User-Agent' : 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.101 Safari/537.36'
		}},
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				//console.log(body);
				//console.log(error);
				//console.log(response);
				callback(body);
			} else {
				//console.log(error);
				//console.log(response);
				callback(null);
			}
	});
}