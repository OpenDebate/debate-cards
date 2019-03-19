const mongoose = require('mongoose');

// schema maps to a collection
const Schema = mongoose.Schema;

const cardSchema = new Schema({
  file: {
    type:mongoose.Schema.Types.ObjectId,
    ref:'File'
  },
  tag: {
    type: 'String',
    required: true,
    trim: true,
  },
  cite: {
    type: 'String',
    trim: true,
  },
  card: {
    type: 'String',
    required: true
  },
  set: {
    type: String,
    required: true,
    trim: true,
  },
  h1: {
    type: 'String',
    trim: true,
  },
  h2: {
    type: 'String',
    trim: true,
  },
  h3: {
    type: 'String',
    trim: true,
  },
  index: {
    type: 'Number',
  },
  date: {
    type: 'Date',
  },
});

module.exports = mongoose.model('Card', cardSchema); // instance of schema