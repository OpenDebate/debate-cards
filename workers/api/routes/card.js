const controller = require('@card').controller
module.exports = (app) => {
  app.post('/card', async (req, res) => {
    let result = {
      error: null,
      status: 200,
      meta: {
          skip: 0,
          limit: 0,
          total: 1,
      },
      data: null
    }
    try {
      const data = await controller.add(req.body);
      result.data = data;
    } catch (error) {
      result.status = 400;
      console.log(error)
      result.error = error;
    } finally {
      res.status(result.status).send(result)
    }
  })

  app.get('/card/:id', async (req, res) => {
    const {id} = req.params
    let result = {
      error: "",
      status: 200,
      meta: {
          skip: 0,
          limit: 0,
          total: 1,
      },
      data: {}
    }
    try {
      result.data = await controller.get({id})
    } catch (error) {
      result.status = 400;
      result.error = error.message
    } finally {
      res.status(result.status).send(result)
    }
  });

  app.get('/card', async (req, res) => {
    let result = {
      error: null,
      status: 200,
      meta: {
          skip: 0,
          limit: 0,
          total: 1,
      },
      data: []
    }
    try {
      result.data = await controller.getAll(req.query)
    } catch (error) {
      result.status = 400;
      result.error = error;
    } finally {
      res.status(result.status).send(result)
    }
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