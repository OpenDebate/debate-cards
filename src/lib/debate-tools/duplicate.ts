import { SentenceMatch, Sentence, Info, Children, Lock } from 'app/lib';
import { EDGE_TOLERANCE, INSIDE_TOLERANCE, SENTENCE_REGEX } from 'app/constants';
import { min, uniq } from 'lodash';
const sentenceLock: Record<string, Lock> = {};
const mergeLock: Record<number, Lock> = {};

export const getSentences = (text: string, cutoff = 20): string[] | undefined => {
  return text
    ?.split(SENTENCE_REGEX)
    .map((el) => el.replace(/[^A-Z]/gi, '').toLowerCase())
    .filter((el: string) => el.length >= cutoff);
};

type CardMatch = { start: number; end: number };
const isMatch = async ({ start, end }: CardMatch, key: number, cardLength: number) =>
  // If start or end probably real match
  start >= EDGE_TOLERANCE ||
  end >= cardLength - (EDGE_TOLERANCE + 1) ||
  // Otherwise should be entire card inside this one
  end - start - (await Info.get(key, 'length')) <= INSIDE_TOLERANCE;

export const getMatching = async (matches: SentenceMatch[]): Promise<number[]> => {
  // Calculates length of match in case there is a gap due to typo or collision
  const cards: Record<number, CardMatch> = {};
  for (let i = 0; i < matches.length; i++) {
    const id = matches[i].cardId;
    if (id === null) continue;
    // If new match, set current index as start and end at end of card, otherwise update end index
    cards[id] ? (cards[id].end = i) : (cards[id] = { start: i, end: matches.length - 1 });
  }

  const matching: number[] = [];
  // Filter out probably false matches
  await Promise.all(
    Object.entries(cards).map(async ([key, value]) => {
      if (await isMatch(value, +key, matches.length)) matching.push(+key);
    }),
  );
  return matching;
};

export const findParent = async (id: number, text: string): Promise<{ updates: string[]; parent: number }> => {
  const updates = [id.toString()];
  const sentences = getSentences(text) ?? [];

  const unlockSentences = () => {
    // Unlock for any cards waiting on sentence, then remove lock for future cards
    for (const sentence of sentences) {
      sentenceLock[sentence]?.unlock();
      delete sentenceLock[sentence];
    }
  };

  let matching: number[];
  try {
    // If any sentences in this card are being processed wait for them to finish, then mark sentneces as being procsessed
    for (const sentence of sentences) {
      await sentenceLock[sentence]?.promise;
      sentenceLock[sentence] = new Lock();
    }
    if (sentences.length) Info.set(id, 'length', sentences.length);

    // Get matching cards
    const existing = await Promise.all(sentences.map(Sentence.get));
    const filteredMatches = await getMatching(existing.flat());
    matching = await Promise.all(filteredMatches.map((card) => Info.get(card, 'parent')));
  } catch (e) {
    unlockSentences();
    throw e;
  }

  const parent = min(matching) ?? id;
  const toMerge = matching.filter((card) => card !== parent);
  const mLock = (mergeLock[parent] = new Lock());

  try {
    // In rare case multiple different parents were matched, merge cards and update parents
    if (toMerge.length) {
      // If cards are being added to a given bucket, wait to merge that bucket
      for (const card of toMerge) await mergeLock[card]?.promise;
      const children = await Promise.all(toMerge.map(Children.get));
      updates.push(...children.flat());
    }

    sentences.forEach((sentence, i) => Sentence.set(sentence, [{ cardId: id, index: i }]));
  } catch (e) {
    console.error(e);
  }

  unlockSentences();
  // If lock on parent hasnt been overwritten, unlock it
  if (mergeLock[parent] === mLock) {
    mergeLock[parent]?.unlock();
    delete mergeLock[parent];
  }
  return { updates: uniq(updates), parent };
};
