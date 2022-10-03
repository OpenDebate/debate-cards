import { MAX_COMPLEXITY, RATE_LIMIT_DURATION, RATE_LIMIT_POINTS } from 'app/constants';
import { GraphQLSchema } from 'graphql';
import { PluginDefinition } from 'apollo-server-core';
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from 'graphql-query-complexity';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Ctx, Field, ObjectType, Query, Resolver } from 'type-graphql';

const rateLimiter = new RateLimiterMemory({ points: RATE_LIMIT_POINTS, duration: RATE_LIMIT_DURATION });

const getUserKey = (context: Record<string, any>) => context.auth?.uid ?? context.ip;

export const rateLimitPlugin = (schema: GraphQLSchema): PluginDefinition => ({
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
        if (complexity) {
          try {
            await rateLimiter.consume(getUserKey(context), complexity);
          } catch (res) {
            throw new Error(`Rate limit reached. Try again in ${res.msBeforeNext}ms`);
          }
        }
      },
    };
  },
});

@ObjectType()
class RateLimitInfo {
  @Field()
  limit: number;

  @Field()
  duration: number;

  @Field()
  resetAt: number;

  @Field()
  remaining: number;

  @Field()
  consumed: number;
}

@Resolver()
export class RateLimitResolver {
  @Query((returns) => RateLimitInfo)
  async rateLimit(@Ctx() context: Record<string, any>): Promise<RateLimitInfo> {
    const rateLimiterRes = await rateLimiter.get(getUserKey(context));
    return {
      limit: RATE_LIMIT_POINTS,
      duration: RATE_LIMIT_DURATION * 1000,
      resetAt: Date.now() + rateLimiterRes.msBeforeNext,
      remaining: rateLimiterRes.remainingPoints,
      consumed: rateLimiterRes.consumedPoints,
    };
  }
}
