import { GraphQLResolveInfo } from 'graphql';
import graphqlFields from 'graphql-fields';

const transformFields = (fields: any) =>
  Object.entries(fields).reduce<any>((transformed, [key, value]) => {
    if (key === '__arguments') return transformed;
    transformed[key] = Object.keys(value).length > 0 ? { select: transformFields(value) } : true;
    return transformed;
  }, {});

export const selectFields = (info: GraphQLResolveInfo) => transformFields(graphqlFields(info));
