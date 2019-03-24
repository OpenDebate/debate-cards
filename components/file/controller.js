const events = require('events');
const eventEmitter = new events.EventEmitter();




const File = require('./model');


module.exports = {

  // ctxt = {file}
  add: async (ctxt) => {
    try {
      let file = new File(ctxt);
      file = await file.save()
      return file;
    } catch (error) {
      return error;
    }
  },

  // ctxt = {id}
  get: async (ctxt) => {
    const {id} = ctxt
    try {
      const file = await File.findOne({id});
      return file;
    } catch (error) {
      throw error;
    }
  },

  // ctxt = {skip, limit, query}
  getAll: async (ctxt) => {
    const {skip, limit}  = ctxt;
    try {
      const files = await File
      .find({})
      .skip(skip)
      .limit(limit);
      return files
    } catch (error) {
      throw error;
    }
  },

  // ctxt = {id}
  delete: async (ctxt) => {
    const {id} = ctxt
    try {
      const file = await File.findOne({id});
      await File.deleteOne({id});
      return file;
    } catch (error) {
      return error;
    }
  }
};
