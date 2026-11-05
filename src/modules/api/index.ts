import 'reflect-metadata';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import * as jwt from 'jsonwebtoken';
import { buildSchema } from 'type-graphql';
import * as resolvers from './resolvers';
import { API_PATH, API_PORT } from 'app/constants';
import { rateLimitPlugin, RateLimitResolver } from './plugins';

async function main() {
  const app = express();

  const schema = await buildSchema({
    resolvers: [
      RateLimitResolver,
      resolvers.AuthResolver,
      ...resolvers.QueueResolvers,

      resolvers.EvidenceResolver,
      resolvers.FileResolver,
      resolvers.EvidenceBucketResolver,
      resolvers.TagResolver,
      ...resolvers.caselistResolvers,
    ],
    // @Authorized() requires any valid token; @Authorized('ADMIN') requires an admin token.
    // Get one with: mutation { login(password: "$ADMIN_PASSWORD") { token } }
    authChecker: ({ context }: { context: { auth?: { admin?: boolean } } }, roles) => {
      if (!context.auth) return false;
      if (roles.includes('ADMIN')) return !!context.auth.admin;
      return true;
    },
    validate: { forbidUnknownValues: false },
  });

  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      const auth = () => {
        const header = req.headers.authorization;
        if (!header) return null;

        const token = header.split(' ')[1];
        if (!token) return null;

        try {
          return jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
          return null;
        }
      };
      return { auth: auth(), ip: req.ip };
    },
    plugins: [rateLimitPlugin(schema)],
  });
  await server.start();
  server.applyMiddleware({ app, path: API_PATH });

  app.listen({ port: API_PORT }, () => {
    console.log(`API running at http://localhost:${API_PORT}${API_PATH}`);
  });
}
main();
export default {
  name: 'api',
  main,
};
