const mongoose = require('mongoose');
const path = require('path');


const Card = require('./model');


module.exports = {
  
  // ctxt = {card}
  add: async (ctxt) => {
    try {
      let card = new Card(ctxt);
      card = await card.save();
      return card
    } catch (error) {
      throw error;
    }
  },

  // ctxt = {id}
  get: async (ctx) =>{

  },

  // ctxt = {id}
  delete: async (ctxt) => {
    const {id} = ctxt
    try {
      const card = await File.findOne({id});
      await Card.deleteOne({id});
      return card;
    } catch (error) {
      return error;
    }
  }
};