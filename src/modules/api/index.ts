import 'reflect-metadata';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import * as jwt from 'jsonwebtoken';
import { buildSchema } from 'type-graphql';
import * as resolvers from './resolvers';

const PORT = process.env.API_PORT || 4000;
const PATH = process.env.GRAPHQL_PATH || '/graphql';
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
    // plugins: [
    //   {
    //     async requestDidStart({ context }) {
    //       console.log(context.auth);
    //     },
    //   },
    // ],
  });
  await server.start();
  server.applyMiddleware({ app, path: PATH });

  app.listen({ port: PORT }, () => {
    console.log(`API running at http://localhost:${PORT}${PATH}`);
  });
}
main();
