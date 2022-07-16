import 'reflect-metadata';
import { Evidence } from '../models';
import { createGetResolver } from '.';
import { Resolver } from 'type-graphql';

const EvidenceGetResolver = createGetResolver('evidence', Evidence);

@Resolver()
export class EvidenceResolver extends EvidenceGetResolver {}
