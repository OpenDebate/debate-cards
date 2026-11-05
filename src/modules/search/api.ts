import { UserInputError } from 'apollo-server-core';
import { runSearch, SearchResultData } from './search';
import { SearchInput, SearchInputError } from './query';

/** runSearch for GraphQL resolvers: input mistakes become a BAD_USER_INPUT error the client can show. */
export async function searchForApi(input: SearchInput): Promise<SearchResultData> {
  try {
    return await runSearch(input);
  } catch (err) {
    if (err instanceof SearchInputError) throw new UserInputError(err.message);
    throw err;
  }
}
