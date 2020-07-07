const mongoose = require('mongoose');
// schema maps to a collection
const Schema = mongoose.Schema;

const fileSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  file: {
    type: String,
  },
  date: {
    type: Date,
  },
  set: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['complete', 'incomplete', 'parsing'],
    default: 'incomplete',
    required: true,
  },
  author: {
    type: String,
  },

  side: {
    type: String,
    enum: ['AFF', 'NEG'],
  },
  wikidata: {
    school: {
      type: String
    },
    code: {
      type: String
    },
    url: {
      type: String
    },
  }
});

module.exports = mongoose.model('File', fileSchema); // instance of schema