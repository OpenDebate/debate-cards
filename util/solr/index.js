const host = process.env.SOLR_HOST;
const port = process.env.SOLR_PORT;
const core = process.env.SOLR_CORE;
const http = require('http');
const agent = new http.Agent();
var solr = require('solr-client');

const client = solr.createClient({host, port, core, agent})

module.exports = {
  client: client,
  util: require('./util')
};
