import { ArgsType, Field, Int } from 'type-graphql';

@ArgsType()
export class CaselistInput {
  @Field()
  caselist: string;
}
@ArgsType()
export class SchoolInput extends CaselistInput {
  @Field()
  school: string;
}
@ArgsType()
export class TeamInput extends SchoolInput {
  @Field()
  team: string;
}

@ArgsType()
export class CiteSearchInput {
  @Field()
  query: string;

  @Field((type) => Int, { defaultValue: 10 })
  take: number;

  @Field((type) => Int, { defaultValue: 0 })
  skip: number;
}
