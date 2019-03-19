const host = process.env.SOLR_HOST;
const port = process.env.SOLR_PORT;
const core = process.env.SOLR_CORE;
const SolrNode = require('solr-node');
const solr = new SolrNode({
    host,
    core,
    port,
    protocol: 'http'
});

module.exports = {
  getConnection : function() {
       return solr;
	},
	isAvailable : function() {
		return solr != null;
	 }
}	