import 'reflect-metadata';
import { ApolloServer } from 'apollo-server';
import { buildSchema, Query } from 'type-graphql';

class HelloResolver {
  @Query(() => String)
  async hello() {
    return 'Hello world';
  }
}

const PORT = process.env.API_PORT || 4000;
async function main() {
  const schema = await buildSchema({
    resolvers: [HelloResolver],
  });

  const server = new ApolloServer({ schema });

  const { url } = await server.listen(PORT);
  console.log(`API running at ${url}`);
}
main();
