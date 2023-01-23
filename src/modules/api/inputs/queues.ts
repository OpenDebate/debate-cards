import type parser from 'app/modules/parser';
import type deduplication from 'app/modules/deduplicator';
import type caselistModule from 'app/modules/caselist';
import { ExtractLoadArgs } from 'app/lib';
import { ArgsType, Field, Int } from 'type-graphql';

@ArgsType()
export class ParseLoadInput implements ExtractLoadArgs<typeof parser['queue']> {
  @Field()
  loadPending: boolean;

  @Field((type) => [String], { nullable: true })
  gids?: string[];
}

@ArgsType()
export class DedupLoadInput implements ExtractLoadArgs<typeof deduplication['queue']> {
  @Field()
  loadPending: boolean;

  @Field({ nullable: true })
  take: number;

  @Field((type) => [String], { nullable: true })
  gids?: string[];
}

@ArgsType()
export class OpenevLoadInput implements ExtractLoadArgs<typeof caselistModule['openevQueue']> {
  @Field((type) => [Int], { nullable: true })
  years?: number[];
}
@ArgsType()
export class CaselistLoadInput implements ExtractLoadArgs<typeof caselistModule['caselistQueue']> {
  @Field()
  archived: boolean;

  @Field()
  active: boolean;

  @Field((type) => [Int], { nullable: true })
  years?: number[];

  @Field((type) => [String], { nullable: true })
  names?: string[];
}
@ArgsType()
export class SchoolLoadInput implements ExtractLoadArgs<typeof caselistModule['schoolQueue']> {
  @Field()
  caselist: string;

  @Field()
  school: string;
}
@ArgsType()
export class TeamLoadInput implements ExtractLoadArgs<typeof caselistModule['teamQueue']> {
  @Field()
  caselist: string;

  @Field()
  school: string;

  @Field()
  team: string;
}
@ArgsType()
export class OpensourceLoadInput implements ExtractLoadArgs<typeof caselistModule['opensourceQueue']> {
  @Field()
  loadPending: boolean;
}
@ArgsType()
export class UpdateLoadInput implements ExtractLoadArgs<typeof caselistModule['updateQueue']> {
  @Field((type) => [String], { nullable: true })
  caselists?: string[];
}
