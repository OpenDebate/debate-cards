var express = require('express');
var app = express(); 
const fs = require('fs');
var bodyParser = require('body-parser');
var port = process.env.PORT || 8080; 
var router = express.Router(); 
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set('json spaces', 2);

router.use(function(req, res, next) {
    // set apporpriate headers for x-orgin API requests
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Credentials", "true");
	res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
	res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
	next(); // make sure we go to the next routes and don't stop here
});

// test route to make sure everything is working 
router.get('/', function(req, res) {
	res.json({message: 'It Works! Welcome to the CardDB API!'});
});

// dynamically load our routes
fs.readdirSync('./routes/').forEach(function(file) {
	if(file.indexOf('.js') > 0){
		var route="./routes/"+file;
    	require(route)(router);
	}
});

// all of our routes will be prefixed with /api
app.use('/api', router);

// start the server
app.listen(port);
console.log('Magic happens on port ' + port);
