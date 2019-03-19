const mongoose = require('mongoose');
const path = require('path');


const File = require('./model');


module.exports = {
  add: async (ctxt) => {
    try {
      let file = new File(ctxt);
      file = await file.save()
      return file;
    } catch (error) {
      return error;
    }
  }
};