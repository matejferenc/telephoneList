var express = require('express');
var async = require('async');
var mongo = require('./mongo');
var zs = require('./zlateStranky');
var kvnet = require('./kdoVolalNet');
var kvcz = require('./kdoVolalCz');
var tellows = require('./tellows');
var nv = require('./neznamyVolajici');
var vc = require('./vyhledatCislo');

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
				zs.download(numbers.ncc, callback);
			},
			kdovolalnet: function(callback) {
				kvnet.download(numbers.n, callback);
			},
			kdovolalcz: function(callback) {
				kvcz.download(numbers.n, callback);
			},
			tellows: function(callback) {
				tellows.download(numbers.n, callback);
			},
			neznamyVolajici: function(callback) {
				nv.download(numbers.n, callback);
			},
			vyhledatCislo: function(callback) {
				vc.download(numbers.n, callback);
			}
		},
		function(err, results) {
			merge(record, { zs: results.zlateStranky });
			merge(record, { kvnet: results.kdovolalnet });
			merge(record, { kvcz: results.kdovolalcz });
			merge(record, { tellows: results.tellows });
			merge(record, { nv: results.neznamyVolajici });
			merge(record, { vc: results.vyhledatCislo });
			mongo.store(record);
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