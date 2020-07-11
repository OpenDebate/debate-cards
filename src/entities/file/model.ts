import mongoose, { Schema, Document } from 'mongoose';

const fileSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  path: {
    type: String,
  },
  hash: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
  },
  data_set: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['proccessed', 'incomplete', 'inprogress'],
    default: 'incomplete',
    required: true,
  },
  source: {
    type: String,
  },
  side: {
    type: String,
    enum: ['AFF', 'NEG'],
  },
  school: {
    type: String,
  },
  team: {
    type: String,
  },
});

interface File {
  name: string;
  path: string;
  hash: string;
  date: string;
  stauts: string;
  group?: string;
  source?: string;
  side?: string;
  school?: string;
  team?: string;
}

export type FileDocument = File & Document;

export const File = mongoose.model<FileDocument>('File', fileSchema);
