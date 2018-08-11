const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://192.168.1.163";
var db = null;
MongoClient.connect(url, function(err, client) {
	if(err){console.log(err);}
	console.log("Connected successfully to database");
	const dbName = 'carddb';
	db = client.db(dbName);
});


// const db = function() {
//     return MongoClient.connect(url, (err, database) => {
// 	  if (err) return console.log(err);
// 	  console.log('connected to db!');
//       return database;
//     });
// };

module.exports = {
    getConnection : function() {
       return db;
	},
	isAvailable : function() {
		return db != null;
	 }
}	