import { ArgsType, Field, Float, InputType, Int, registerEnumType } from 'type-graphql';

// Not sure if there is a better or more type safe way to do this
export enum SearchableEvidenceField {
  tag,
  cite,
  fullcite,
  summary,
  spoken,
  fulltext,
  pocket,
  hat,
  block,
}
registerEnumType(SearchableEvidenceField, { name: 'SearchableEvidenceField' });

@InputType()
export class EvidenceSearchField {
  @Field((type) => SearchableEvidenceField)
  field: SearchableEvidenceField;

  @Field((type) => Float, { defaultValue: 1 })
  weight?: number;
}

@ArgsType()
export class EvidenceSearchArgs {
  @Field()
  query: string;

  @Field((type) => Int, { defaultValue: 10 })
  take: number;

  @Field((type) => Int, { defaultValue: 0 })
  skip: number;

  @Field((type) => [EvidenceSearchField], { nullable: true })
  fields?: EvidenceSearchField[];

  @Field((type) => [String], { nullable: true })
  tags?: string[];

  @Field((type) => Float, {
    nullable: true,
    description: 'Boost for cards that appear in many rounds: score * (1 + weight * ln(copies)). Default 0.2, 0 turns it off.',
  })
  duplicateWeight?: number;
}
