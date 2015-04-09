var express = require('express');
var app = express();
app.get('/', function(req, res) {
	res.send('Hello World');
});

var search = function(req, res) {
	var n = req.query.n;
	try {
		validateTelephoneNumber(n);
		res.send(n);
	} catch(err) {
		res.send("error " + err);
	}
};
app.get('/search', search);
app.listen(3000);

function validateTelephoneNumber(n) {
	var regex = new RegExp('^\\s*\\+?[\\s\\d]+$');
	if (!regex.test(n)) {
		throw 'number not valid ' + n;
	}
}

function downloadZlateStranky(n) {
	
}