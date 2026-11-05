import { ArgsType, Field, Float, InputType, Int } from 'type-graphql';
import { EvidenceSearchField } from './evidence';

@InputType()
export class SearchFiltersInput {
  @Field((type) => [String], { nullable: true, description: 'Cards must have every one of these tags' })
  all?: string[];

  @Field((type) => [String], { nullable: true, description: 'Cards must have at least one of these tags' })
  any?: string[];

  @Field((type) => [String], { nullable: true, description: 'Cards must have none of these tags' })
  none?: string[];
}

@ArgsType()
export class SearchEvidenceArgs {
  @Field({
    nullable: true,
    description:
      'What to search for. Every word must match; "quote marks" match a phrase, -word excludes, a | b means either, word* matches prefixes. Never fails on odd input. Optional if filters are given.',
  })
  query?: string;

  @Field((type) => Int, { defaultValue: 10, description: 'Results per page, 1 to 100' })
  take: number;

  @Field((type) => Int, { defaultValue: 0, description: 'skip + take cannot pass 10,000' })
  skip: number;

  @Field((type) => SearchFiltersInput, { nullable: true })
  filters?: SearchFiltersInput;

  @Field((type) => [EvidenceSearchField], { nullable: true, description: 'Per-field weights; the defaults favour the tag, then the cite, then the text' })
  fields?: EvidenceSearchField[];

  @Field((type) => Float, {
    nullable: true,
    description: 'Boost for cards that appear in many rounds: score * (1 + weight * ln(copies)). Default 0.2, 0 turns it off.',
  })
  duplicateWeight?: number;

  @Field({ defaultValue: true, description: 'Include counts per tag (source, side, level, event, year, camp, Open Evidence type)' })
  facets: boolean;

  @Field({ defaultValue: true, description: 'Include matched text fragments' })
  highlight: boolean;
}
