import { GraphQLResolveInfo } from 'graphql';
import graphqlFields from 'graphql-fields';

const transformFields = (fields: any) => {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([key, value]) => Object.keys(value).length == 0) // Remove nested fields
      .map(([key, value]) => [key, true]), // Transform into format for prisma select
  );
};

export const selectFields = (info: GraphQLResolveInfo) => ({ id: true, ...transformFields(graphqlFields(info)) });
