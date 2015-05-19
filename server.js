var express = require('express');
var async = require('async');
var mongo = require('./mongo');
var zs = require('./zlateStranky');
var kvnet = require('./kdoVolalNet');
var kvcz = require('./kdoVolalCz');
var tellows = require('./tellows');
var nv = require('./neznamyVolajici');
var vc = require('./vyhledatCislo');
var tools = require('./tools');

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
		var record = { n: numbers.n, ncc: numbers.ncc };

		mongo.find(record, function(documentFound) {
			if (documentFound) {
				console.log('number found in db');
				res.send(documentFound.zs.name + ' ' + documentFound.kvnet.count + ' ' + documentFound.kvcz.status);
			} else {
				console.log('number NOT found in db');
				downloadFromProviders(record, numbers, function (documentDownloaded) {
					res.send(documentDownloaded.zs.name + ' ' + documentDownloaded.kvnet.count + ' ' + documentDownloaded.kvcz.status);
				});
			}
		});
		
		
	} catch(err) {
		res.send('error ' + err);
	}
};
app.get('/search', search);
app.listen(8000, '0.0.0.0');

function downloadFromProviders(record, numbers, callback) {
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
		tools.merge(record, { zs: results.zlateStranky });
		tools.merge(record, { kvnet: results.kdovolalnet });
		tools.merge(record, { kvcz: results.kdovolalcz });
		tools.merge(record, { tellows: results.tellows });
		tools.merge(record, { nv: results.neznamyVolajici });
		tools.merge(record, { vc: results.vyhledatCislo });
		callback(record);
		mongo.store(record);
	});
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
