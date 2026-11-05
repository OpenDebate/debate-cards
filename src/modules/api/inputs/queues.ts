import { ArgsType, Field, Int } from 'type-graphql';

@ArgsType()
export class ParseLoadInput {
  @Field()
  loadPending: boolean;

  @Field((type) => [String], { nullable: true })
  gids?: string[];
}

@ArgsType()
export class DedupLoadInput {
  @Field()
  loadPending: boolean;

  @Field({ nullable: true })
  take?: number;

  @Field((type) => [String], { nullable: true })
  gids?: string[];
}

@ArgsType()
export class OpenevLoadInput {
  @Field((type) => [Int], { nullable: true })
  years?: number[];
}

@ArgsType()
export class CaselistLoadInput {
  @Field({ nullable: true })
  archived: boolean;

  @Field({ nullable: true })
  active: boolean;

  @Field((type) => [Int], { nullable: true })
  years?: number[];

  @Field((type) => [String], { nullable: true })
  names?: string[];

  @Field({ nullable: true })
  schoolNameAlphaLimit?: string;
}

@ArgsType()
export class SchoolLoadInput {
  @Field()
  caselist: string;

  @Field()
  school: string;
}

@ArgsType()
export class TeamLoadInput {
  @Field()
  caselist: string;

  @Field()
  school: string;

  @Field()
  team: string;
}

@ArgsType()
export class OpensourceLoadInput {
  @Field()
  loadPending: boolean;
}

@ArgsType()
export class UpdateLoadInput {
  @Field((type) => [String], { nullable: true })
  caselists?: string[];
}
