const mongoose = require("mongoose");
const path = require("path");

const Card = require("./model");

module.exports = {
  // ctxt = {card}
  add: async (ctxt) => {
    try {
      let card = new Card(ctxt);
      card = await card.save();
      return card;
    } catch (error) {
      throw error;
    }
  },

  // ctxt = {id}
  get: async (ctxt) => {
    const { id } = ctxt;
    try {
      const card = await Card.findOne({ _id: id });
      return card;
    } catch (error) {
      throw error;
    }
  },
  // ctxt =  {ids}
  getMany: async (ctxt) => {
    // const {ids} = ctxt;
    try {
      const ids = ctxt.ids.map((id) => mongoose.Types.ObjectId(id));
      let docs = await Card.aggregate([
        { $match: { _id: { $in: ids } } },
        // idek what this does - some black magic to preserve order
        { $addFields: { __order: { $indexOfArray: [ids, "$_id"] } } },
        { $sort: { __order: 1 } },
      ]);
      docs = await Card.populate(docs, { path: "file" });

      return docs;
    } catch (error) {
      throw error;
    }
  },

  // ctxt = {skip, limit, query}
  getAll: async (ctxt) => {
    const { skip = 0, limit = 100 } = ctxt;
    try {
      const cards = await Card.find({}).lean().skip(skip).limit(limit);
      return cards;
    } catch (error) {
      throw error;
    }
  },

  // ctxt = {id}
  delete: async (ctxt) => {
    const { id } = ctxt;
    try {
      const card = await Card.findOne({ id });
      await Card.deleteOne({ id });
      return card;
    } catch (error) {
      return error;
    }
  },
};
