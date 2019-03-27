const axios = require("axios");
const {solr} = require("@util");
const util = require('util')
const { filter, fuzzy, field } = solr.util;

module.exports = app => {
  app.get("/search", async (req, res) => {
    const { 
      q, 
      f="tag cite meta", 
      s="", 
      skip=0, 
      limit=250 
    } = req.query;

    let result = {
      error: null,
      status: 200,
      meta: {
        skip: skip,
        limit: limit,
        total: 0
      },
      data: []
    };
    // var solrParams = buildQuery(req.query.q) + buildFilter(req.query.s);
    // var url = `${solrUri}/select?${solrParams}&wt=json&indent=true`;
    // var log = req.query.q + (req.query.s.length>1 ? " | " + req.query.s.split(',') : "");

    try {
      const query = solr.client
        .createQuery()
        .q(fuzzy(q))
        .edismax()
        .qf(field(f.split(",")))
        .start(skip)
        .rows(limit)
      if(s){query.matchFilter("set", "("+s.split(',').map(e=>`"${e}"`)+")")}  
      const solrRes = await util.promisify(solr.client.search.bind(solr.client))(query)
 
      const { docs, numFound } = solrRes.response;
      result.data = docs;
      result.meta.total = numFound;
    } catch (error) {
      console.error(error)
      result.status = 400;
      result.error = error.message;
    } finally {
      res.status(result.status).send(result);
    } 
  });
};

// generate solr querey string from user search
