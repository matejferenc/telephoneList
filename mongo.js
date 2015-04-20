var mongoUrl = 'mongodb://localhost:27017/telephoneList';
var mongodb = require('mongodb');

module.exports = {
	store: function(result) {
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
}