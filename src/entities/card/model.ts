import mongoose, { Schema, Document } from 'mongoose';

const cardSchema = new Schema({
  file: {
    type: Schema.Types.ObjectId,
    ref: 'File',
  },
  tag: {
    type: String,
    required: true,
    trim: true,
  },
  cite: {
    type: String,
    trim: true,
  },
  summary: {
    type: String,
    required: true,
    minlength: 50,
  },
  markup: {
    type: String,
    required: true,
  },
  fulltext: {
    type: String,
    required: true,
  },
  card_data: {
    type: String,
    required: true,
  },
  h1: {
    type: String,
    trim: true,
  },
  h2: {
    type: String,
    trim: true,
  },
  h3: {
    type: String,
    trim: true,
  },
  file_index: {
    type: Number,
  },
  hash: {
    type: String,
  },
  fuzzy_hash: {
    type: String,
  },
});

interface Card {
  tag: string | Schema.Types.ObjectId;
  cite: string;
  summary: string;
  markup: string;
  fulltext: string;
  card_data: any;
  h1: string;
  h2: string;
  h3: string;
  file_index: number;
  hash: string;
  fuzzy_has: string;
}

export type CardDocument = Card & Document;

export const Card = mongoose.model<CardDocument>('Card', cardSchema);
