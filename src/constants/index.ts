// Max number of files being parsed concurrently, allows parsing to take place while waiting for database response
export const CONCURRENT_PARSERS = 10;
// Max number of cards being deduplicated concurrently
// Values above number of cpu threads may run into issues with postgres connections
export const CONCURRENT_DEDUPLICATION = 5;

// Absolute minimum fraction of matching sentences to consider a card a match
export const MIN_COUNT_FRACTION = 0.1;
/* Allow small differences in matching cards to help with things like part of the cite being attached to the start of the card 
   If a card has (numberOfSentences * EDGE_TOLERANCE) different sentences at start or end, will be treated as if they matched all the way to the start or end */
export const EDGE_TOLERANCE = 0.1;

// Whether a card card that matches `matching` out of `total` cards in a SubBucket should be added to it
export const SHOULD_MATCH = (matching: number, total: number): boolean => matching / total > 0.5;

// Whether BucketSets which `matching` out of `total` cards should be merged
// Also whether a card should be considered as a match for the purposes of merging
export const SHOULD_MERGE = (matching: number, total: number): boolean =>
  matching > 5 ? matching / total >= 0.02 : matching / total >= 0.2;

/* 
  Regex used to split text into sentences 
  Matches puncuation followed by (whitespace + capital letter) and allows citiation numbers (ex. Sample text.123 Next sentence)
  Will fail in some weird cases, but should be good enough
*/
export const SENTENCE_REGEX = /([.?!])+(?=\d*\s+[A-Z])/;

// Wait between requests to caselist api in ms. Seems to be limited to 1500 requests every 15 minutes
export const REQUEST_WAIT = 1000;

// API constants
export const API_PORT = parseInt(process.env.API_PORT) || 4000;
export const API_PATH = process.env.GRAPHQL_PATH || '/graphql';
export const MAX_COMPLEXITY = parseInt(process.env.MAX_QUERY_COMPLEXITY) || 100;
// Maximum complexity points that can be per duration
export const RATE_LIMIT_POINTS =
  parseInt(process.env.RATE_LIMIT_POINTS) || (process.env.NODE_ENV === 'development' ? 1_000_000_000 : 1_000);
// Duration in seconds
export const RATE_LIMIT_DURATION = parseInt(process.env.RATE_LIMIT_DURATION) || 60;

// Port for ipc used by admin tasks api
export const IPC_PORT = parseInt(process.env.IPC_PORT) || 3000;

export enum CaselistPriority {
  BASE = 0,
  UPDATE_DOWNLOAD = 1,
  UPDATE_LOAD = 2,
  MAX = 9999,
}
// Time to wait checking for updates to active caselists
// Should probably make dynamic to respond to activity spikes at some point
export const UPDATE_WAIT_MS = 60 * 1000;
