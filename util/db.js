const MongoClient = require('mongodb').MongoClient;
const uri = process.env.MONGO_LOCAL_CONN_URL;
const dbName = process.env.MONGO_DB_NAME;

var db = null;

MongoClient.connect(uri, function(err, client) {
	if(err){console.log(err);}
	console.log("Connected successfully to database");
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