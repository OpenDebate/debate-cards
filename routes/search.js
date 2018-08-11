const fetch = require('node-fetch');
const request = require('request');
const db = require('../db.js');
const {ObjectId} = require('mongodb');

module.exports = (app) => {
  app.get('/search', (req, res) => {
	var solrParams = buildQuery(req.query.q) + buildFilter(req.query.s);
    // make request to solr sever
    var url = "http://192.168.1.163:8983/solr/carddb/select?"+solrParams+"&wt=json&indent=true";
    var log = req.query.q + (req.query.s.length>1 ? " | " + req.query.s.split(',') : "");
    console.log(log);
    fetch(url)
        .then(res => res.json())
        .then(data => {
            res.json({
                status: "success",
                meta: {
                    skip: 0,
                    limit: 0,
                    total: data.response.docs.length
                },
                data: data.response.docs
            });
        }).catch(err => {
            res.json({error:"something broke.",info:err.toString()});
            console.error(err);
        });    
  });
};

// generate solr querey string from user search
buildQuery = (str,fld) => {
    var base="q=tag_cite_meta%3A";
    var ret = str.split(" ").map(x => 
        x.length > 5 ? x+"~2" : x 
    ).join(" ");
    return base+"("+encodeURIComponent(ret)+")";
};

buildFilter = sets => {
    var base = "&fq=ns%3Acarddb.cards_4&fq=set%3A";
    if(sets.length>1){
        var q = sets.split(",").map(x => 
            '"'+encodeURIComponent(x)+'"'
        ).join(" ");
        return base+"("+q+")";
    }
   return "&fq=ns%3Acarddb.cards_4";
};