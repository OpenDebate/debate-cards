const fetch = require('node-fetch');
const db = require('../db.js');
const {ObjectId} = require('mongodb');

module.exports = (app) => {
  app.get('/card/:id', (req, res) => {
		db.getConnection()
		.collection("cards_4")
		.find({_id: ObjectId(req.params.id)})
		.toArray(function(err, docs) {
			res.json({
				status: "success",
				meta: {
					skip: 0,
					limit: 0,
					total: docs.length
				},
				data: docs[0]
			});
		}); 
  });
};

// generate solr querey string from user search
buildQuery = str => {
    var ret = str.split(" ").map(x => 
        x.length > 5 ? x+"~2" : x 
    ).join(" ");
    console.log(encodeURIComponent(ret));
    return encodeURIComponent("("+ret+")");
    // return encodeURIComponent(ret);
};