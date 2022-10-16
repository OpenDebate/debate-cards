import type parser from 'app/modules/parser';
import type deduplication from 'app/modules/deduplicator';
import type caselistModule from 'app/modules/caselist';
import { ExtractLoadArgs } from 'app/lib';
import { ArgsType, Field } from 'type-graphql';

@ArgsType()
export class ParseLoadInput implements ExtractLoadArgs<typeof parser['queue']> {
  @Field((type) => [String], { nullable: true })
  gids?: string[];
}

@ArgsType()
export class DedupLoadInput implements ExtractLoadArgs<typeof deduplication['queue']> {}

@ArgsType()
export class OpenevLoadInput implements ExtractLoadArgs<typeof caselistModule['openevQueue']> {}
@ArgsType()
export class CaselistLoadInput implements ExtractLoadArgs<typeof caselistModule['caselistQueue']> {}
@ArgsType()
export class SchoolLoadInput implements ExtractLoadArgs<typeof caselistModule['schoolQueue']> {}
@ArgsType()
export class TeamLoadInput implements ExtractLoadArgs<typeof caselistModule['teamQueue']> {}
