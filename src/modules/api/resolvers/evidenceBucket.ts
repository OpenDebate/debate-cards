import 'reflect-metadata';
import { Resolver } from 'type-graphql';
import { createGetResolver } from '.';
import { EvidenceBucket } from '../models';

@Resolver(EvidenceBucket)
export class EvidenceBucketResolver extends createGetResolver('evidenceBucket', EvidenceBucket, ['evidence']) {}
