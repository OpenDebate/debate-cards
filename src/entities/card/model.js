import { Schema, model } from 'mongoose'

const cardSchema = new Schema({
  file: {
    type: Schema.Types.ObjectId,
    ref: 'File'
  },
  tag: {
    type: String,
    required: true,
    trim: true
  },
  cite: {
    type: String,
    trim: true
  },
  summary: {
    type: String,
    required: true,
    minlength: 50
  },
  // markup: {
  //   type: String,
  //   required: true
  // },
  body: {
    type: Object,
    requires: true
  },
  card: {
    type: String,
    required: true
  },
  h1: {
    type: String,
    trim: true
  },
  h2: {
    type: String,
    trim: true
  },
  h3: {
    type: String,
    trim: true
  },
  index: {
    type: Number
  }
})

const Card = model('Card', cardSchema)

module.exports = Card // instance of schema
