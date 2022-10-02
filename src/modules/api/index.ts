import 'reflect-metadata';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import * as jwt from 'jsonwebtoken';
import { buildSchema } from 'type-graphql';
import * as resolvers from './resolvers';
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from 'graphql-query-complexity';

const PORT = process.env.API_PORT || 4000;
const PATH = process.env.GRAPHQL_PATH || '/graphql';
const MAX_COMPLEXITY = process.env.MAX_QUERY_COMPLEXITY || 100;

async function main() {
  const app = express();

  const schema = await buildSchema({
    resolvers: [
      resolvers.AuthResolver,
      resolvers.EvidenceResolver,
      resolvers.FileResolver,
      resolvers.EvidenceBucketResolver,
      resolvers.TagResolver,
      ...resolvers.caselistResolvers,
    ],
  });

  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      const header = req.headers.authorization;
      if (!header) return { auth: null };

      const token = header.split(' ')[1];
      if (!token) return { auth: null };

      try {
        return { auth: jwt.verify(token, process.env.JWT_SECRET) };
      } catch (err) {
        return { auth: null };
      }
    },
    plugins: [
      {
        async requestDidStart() {
          return {
            async didResolveOperation({ context, request, document }) {
              let complexity = getComplexity({
                schema,
                operationName: request.operationName,
                query: document,
                variables: request.variables,
                estimators: [fieldExtensionsEstimator(), simpleEstimator({ defaultComplexity: 1 })],
              });
              if (complexity > 0 && complexity < 100) complexity = 100;
              complexity = Math.floor(complexity / 100);
              if (complexity > 100) {
                throw new Error(`Query complexity of ${complexity} is greater than maximum ${MAX_COMPLEXITY}`);
              }
              if (complexity) console.log(`Query used ${complexity} complexity points`);
            },
          };
        },
      },
    ],
  });
  await server.start();
  server.applyMiddleware({ app, path: PATH });

  app.listen({ port: PORT }, () => {
    console.log(`API running at http://localhost:${PORT}${PATH}`);
  });
}
main();
