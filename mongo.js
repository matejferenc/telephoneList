var mongoUrl = 'mongodb://localhost:27017/telephoneList';
var mongodb = require('mongodb');
var tools = require('./tools');

module.exports = {
	store: function(result) {
		var mongoClient = mongodb.MongoClient;
		mongoClient.connect(mongoUrl, function(err, db) {
			if (err) {
				console.log('error while connecting to mongodb: ' + err);
			} else {
				var coll = db.collection('numbers');
				coll.insert(tools.returnMerged(result, { inserted : new Date() }));
				db.close();
			}
		});
	},
	
	find: function(data, callback) {
		var mongoClient = mongodb.MongoClient;
		mongoClient.connect(mongoUrl, function(err, db) {
			if (err) {
				console.log('error while connecting to mongodb: ' + err);
			} else {
				var coll = db.collection('numbers');
				var since = new Date();
				//month ago
				since.setMonth(since.getMonth() - 1);
				//younger than month
				var f = tools.returnMerged(data, { 'inserted' : { $gte : since } });
				console.log('mongodb searching for: ' + f);
				coll.findOne(f, function(err, document) {
					if (err) {
						console.log('error while searching in mongodb: ' + err);
						db.close();
					} else {
						callback(document);
						db.close();
					}
				});
			}
		});
	}
}