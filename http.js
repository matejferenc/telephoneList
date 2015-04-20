var http = require("http");
var request = require('request');
var querystring = require('querystring');

module.exports = {
	// Utility function that downloads a URL and invokes
	// callback with the data.
	get: function(url, callback) {
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
		}).setTimeout(1000, function() {
			console.log('asdf');
			callback(null);
		});
	},

	// Utility function that downloads a URL and invokes
	// callback with the data.
	post: function(url, data, callback) {
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
}