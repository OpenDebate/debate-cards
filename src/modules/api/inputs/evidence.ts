import { ArgsType, Field, Float, InputType, registerEnumType } from 'type-graphql';

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
class EvidenceSearchField {
  @Field((type) => SearchableEvidenceField)
  field: SearchableEvidenceField;

  @Field((type) => Float, { defaultValue: 1 })
  weight?: number;
}

@ArgsType()
export class EvidenceSearchArgs {
  @Field()
  query: string;

  @Field((type) => [EvidenceSearchField], {
    // These defaults are basically random, could be adjusted
    defaultValue: [
      { field: SearchableEvidenceField.tag, weight: 2 },
      { field: SearchableEvidenceField.cite, weight: 5 },
      { field: SearchableEvidenceField.fullcite, weight: 2 },
      { field: SearchableEvidenceField.fulltext, weight: 1 },
      // Cards with the query underlined/highlighted get higher scores
      { field: SearchableEvidenceField.summary, weight: 1 },
      { field: SearchableEvidenceField.spoken, weight: 1 },
    ] as EvidenceSearchField[],
  })
  fields?: EvidenceSearchField[];
}
