const axios = require ('axios');
const solrUri = process.env.SOLR_LOCAL_CONN_URL;

module.exports = (app) => {
  app.get('/search', async (req, res) => {

    let result = {
        error: null,
        status: 200,
        meta: {
            skip: 0,
            limit: 0,
            total: 0,
        },
        data: []
    }

	var solrParams = buildQuery(req.query.q) + buildFilter(req.query.s);
    var url = `${solrUri}/select?${solrParams}&wt=json&indent=true`;
    var log = req.query.q + (req.query.s.length>1 ? " | " + req.query.s.split(',') : "");
    console.log(log);
    
    try {
        const res = await axios(url);
        const {docs} = res.data.response
        result.data = docs
        result.meta.length = docs.length
    } catch (error) {
        result.status = 400
        result.error = 'Bad Request';
    } finally {
        res.status(result.status).send(result);
    } 
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