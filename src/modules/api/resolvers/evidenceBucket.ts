import 'reflect-metadata';
import { Resolver } from 'type-graphql';
import { createGetResolver } from '.';
import { EvidenceBucket } from '../models';

const EvidenceBucketGetResolver = createGetResolver('evidenceBucket', EvidenceBucket);
@Resolver()
export class EvidenceBucketResolver extends EvidenceBucketGetResolver {}
