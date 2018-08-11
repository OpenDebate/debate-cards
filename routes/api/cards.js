//let PouchDB = require("pouchdb");
//var db = new PouchDB('db');
var request = require('request');
var Fuse = require('fuse.js');
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://192.168.1.163";
var generate = require('../util/generate.js');

var options = {
    keys: ['tag', 'cite'],
};
function Card(tag, cite, fullCite, cutText, fullText) {
	//set properties and assign filler values to prevent downstream errors
	this.tag = tag != (null || undefined)
		? tag
		: "";
	this.cite = cite != (null || undefined)
		? cite
		: "";
	this.fullCite = fullCite != (null || undefined)
		? fullCite
		: "";
	this.cutText = cutText != (null || undefined)
		? cutText
		: "";
	this.fullText = fullText != (null || undefined)
		? fullText
		: {
			text: " ",
			format: ["normal"]
		};
}
function search(str, db, res){
    console.log(str);
    // generate querey string
    console.log(str);
    var querey = "";
    for (term of str.split(" ")){
        if (term.length > 5){
             querey += term + "~2 ";
        }else{
            //  querey += term + " ";
            querey += term + " ";
        }
    }
    querey = "(" + querey + ")";
    // make request to solr sever
    var url = "http://192.168.1.163:8983/solr/carddb/select?q=tag_cite%3A"+querey+"&wt=json&indent=true";
    console.log(url);
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
          var ids = JSON.parse(body).response.docs.map(x => x._id);
          // fetch from db
        //   console.log(ids)
          db.collection("cards")
            .aggregate(
                [
                    { $project: { _id: 1, tag: 1, cite: 1, meta: 1 } },
                    { $match: { _id: { $in: ids } } },
                    //idek what this does - some black magic to preserve order
                    {$addFields: {"__order": {$indexOfArray: [ids, "$_id" ]}}},
                    {$sort: {"__order": 1}}
                ]            
            )
            .toArray(function(err, docs) {
                // reorder results b/c mongo find returns results in random order
                // var orderedResults = ids.map(function(id) {
                //     return docs.find(function(document) {
                //         return document._id.toString() == id;
                //     });
                // });
               res.json(docs);
            });
      }
    });
}
function save(ids, db, res){
    const collection = db.collection('cards');
    collection.find( { _id : { $in : ids } } )
    .toArray(function(err, docs) {
        var cards = [];
        for (var item of docs) {
            cards.push(
                new Card(
                    item.tag,
                    item.cite,
                    item.fullCite,
                    item.cutText,
                    item.fullText)
                );
        }
        generate.genDoc("xyz", cards, res);
    });
}

module.exports = {
    search : function(str, db, res) {
        search(str, db, res);
    },
    save : function(ids, db, res) {
        save(ids, db, res);
    }
};
