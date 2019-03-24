require('dotenv').config();
require('module-alias/register');

// init database
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_CONN_URL, { useNewUrlParser: true })

// load modules
require('./workers/api');
require('./workers/parser')
