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
		var result = { n: numbers.n, ncc: numbers.ncc };
		async.parallel({
			zlateStranky: function(callback) {
				downloadZlateStranky(numbers.ncc, callback);
			},
			kdovolalnet: function(callback) {
				downloadKdoVolalNet(numbers.n, callback);
			},
			kdovolalcz: function(callback) {
				downloadKdoVolalCz(numbers.n, callback);
			}
		},
		function(err, results) {
			var zs = results.zlateStranky;
			merge(result, { zs: results.zlateStranky });
			merge(result, { kvnet: results.kdovolalnet });
			merge(result, { kvcz: results.kdovolalcz });
			store(result);
			res.send(result.zs.name + ' ' + result.kvnet.count + ' ' + result.kvcz.status);
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