import { GraphQLResolveInfo } from 'graphql';
import graphqlFields from 'graphql-fields';

const transformFields = (fields: any) => {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([key, value]) => Object.keys(value).length == 0) // Remove nested fields
      .map(([key, value]) => [key, true]), // Transform into format for prisma select
  );
};

/** Prisma select for the fields of a card the client asked for; `fields` is a graphql-fields tree. */
export const selectFromFields = (fields: object) => ({ id: true, ...transformFields(fields) });

export const selectFields = (info: GraphQLResolveInfo) => selectFromFields(graphqlFields(info));
