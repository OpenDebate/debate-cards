import { ArgsType, Field } from 'type-graphql';

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
