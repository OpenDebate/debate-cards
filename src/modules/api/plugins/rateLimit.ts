import { MAX_COMPLEXITY, RATE_LIMIT_DURATION, RATE_LIMIT_POINTS } from 'app/constants';
import { GraphQLSchema } from 'graphql';
import { PluginDefinition } from 'apollo-server-core';
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from 'graphql-query-complexity';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Ctx, Field, ObjectType, Query, Resolver } from 'type-graphql';

const rateLimiter = new RateLimiterMemory({ points: RATE_LIMIT_POINTS, duration: RATE_LIMIT_DURATION });

// Anonymous callers can mint as many tokens (and so as many uids) as they like with `login`, so a per-uid allowance
// is no limit at all. Everyone is limited by network address instead; see TRUST_PROXY for running behind a proxy.
export const getClientKey = (context: Record<string, any>): string => context.ip ?? 'unknown';

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
        if (complexity > MAX_COMPLEXITY) {
          throw new Error(`Query complexity of ${complexity} is greater than maximum ${MAX_COMPLEXITY}`);
        }
        if (complexity && !context.auth?.admin) {
          try {
            await rateLimiter.consume(getClientKey(context), complexity);
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
    // get() returns null until the caller has consumed something, which means a full allowance
    const rateLimiterRes = await rateLimiter.get(getClientKey(context));
    return {
      limit: RATE_LIMIT_POINTS,
      duration: RATE_LIMIT_DURATION * 1000,
      resetAt: Date.now() + (rateLimiterRes?.msBeforeNext ?? RATE_LIMIT_DURATION * 1000),
      remaining: rateLimiterRes?.remainingPoints ?? RATE_LIMIT_POINTS,
      consumed: rateLimiterRes?.consumedPoints ?? 0,
    };
  }
}
