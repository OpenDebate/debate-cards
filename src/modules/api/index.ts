import 'reflect-metadata';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import * as jwt from 'jsonwebtoken';
import { buildSchema } from 'type-graphql';
import * as resolvers from './resolvers';
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from 'graphql-query-complexity';
import { API_PATH, API_PORT, MAX_COMPLEXITY } from 'app/constants';

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
  server.applyMiddleware({ app, path: API_PATH });

  app.listen({ port: API_PORT }, () => {
    console.log(`API running at http://localhost:${API_PORT}${API_PATH}`);
  });
}
main();
