import 'reflect-metadata';
import { db } from 'app/lib/db';
import { Arg, Info, Query, Resolver } from 'type-graphql';
import { Evidence } from '../models/evidence';

@Resolver(Evidence)
export class EvidenceResolver {
  @Query((returns) => Evidence, { nullable: true })
  async evidence(@Arg('id') id: number): Promise<Evidence> {
    return db.evidence.findUnique({ where: { id } });
  }
}
