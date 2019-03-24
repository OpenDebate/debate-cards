require('dotenv').config();

const express = require('express');
const app = express(); 
const router = express.Router(); 
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const fs = require('fs');
const port = process.env.PORT || 8080; 



app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.set('json spaces', 2);
app.use(cors())


// test route to make sure everything is working 
router.get('/', function(req, res) {
	res.json({message: 'It Works! Welcome to the debate.cards API!'});
});

// dynamically load our routes
fs.readdirSync(path.join(__dirname, 'routes')).forEach(function(file) {
	if(file.indexOf('.js') > 0){
		const route = path.join(__dirname, 'routes', file);
    	require(route)(router);
	}
});

// all of our routes will be prefixed
app.use(process.env.API_PREFIX, router);

// start the server
app.listen(port);
console.log(`API: started on ${port}`);
