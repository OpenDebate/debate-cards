require('dotenv').config();

const express = require('express');
const app = express(); 
const router = express.Router(); 
const bodyParser = require('body-parser');
const cors = require('cors')

const fs = require('fs');
const port = process.env.PORT || 8080; 

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set('json spaces', 2);
app.use(cors())


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
app.use('/v1', router);

// start the server
app.listen(port);
console.log('Magic happens on port ' + port);
