export * from './wiki';

// Max number of files being parsed concurrently, allows parsing to take place while waiting for database response
export const CONCURRENT_PARSERS = 10;
// Max number of cards being deduplicated concurrently
export const CONCURRENT_DEDUPLICATION = 1000;

/* Allow small differences in matching cards to help with things like part of the cite being attached to the start of the card */
// If a card has EDGE_TOLERANCE different sentences at start or end, will be treated as if they matched all the way to the start or end
export const EDGE_TOLERANCE = 1;
// If a card has almost an entire card within it, with at most INSIDE_TOLERANCE sentences missing from the start or end, it will be treated as if the entire card matched
export const INSIDE_TOLERANCE = 1;
/* 
  Regex used to split text into sentences 
  Matches puncuation followed by (whitespace + capital letter) and allows citiation numbers (ex. Sample text.123 Next sentence)
  Will fail in some weird cases, but should be good enough
*/
export const SENTENCE_REGEX = /([.?!])+(?=\d*\s+[A-Z])/;
