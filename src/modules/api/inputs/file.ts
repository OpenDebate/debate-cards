import { ArgsType, Field, Int } from 'type-graphql';

@ArgsType()
export class TagFilesInput {
  @Field((type) => Int)
  take: number;

  @Field((type) => Int, { defaultValue: 0 })
  skip: number;

  @Field((type) => [String], {
    nullable: true,
    defaultValue: [],
    description: 'Files must match every one of these tags',
  })
  every?: string[];

  @Field((type) => [String], {
    nullable: true,
    defaultValue: [],
    description: 'Files must match at least one of these tags',
  })
  some?: string[];
}
