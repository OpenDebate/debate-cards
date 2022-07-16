import 'reflect-metadata';
import { Resolver } from 'type-graphql';
import { createGetResolver } from '.';
import { File } from '../models';

const FileGetResolver = createGetResolver('file', File);
@Resolver()
export class FileResolver extends FileGetResolver {}
