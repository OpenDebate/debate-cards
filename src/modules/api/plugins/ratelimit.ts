import { MAX_COMPLEXITY } from 'app/constants';
import { GraphQLSchema } from 'graphql';
import { PluginDefinition } from 'apollo-server-core';
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from 'graphql-query-complexity';

export const rateLimitPlugin = (schema: GraphQLSchema): PluginDefinition => ({
  async requestDidStart() {
    return {
      async didResolveOperation({ request, document }) {
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
});
