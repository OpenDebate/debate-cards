import { Evidence } from 'app/entities';
import { db, TypedEvent, TextBlock, markupToTokens, tokensToDocument } from 'app/lib';
import { flatMap, groupBy } from 'lodash';

export const onGenerateFile = new TypedEvent<{ gid: string }>();

const cardsToTokens = (cards: Evidence[]): TextBlock[] =>
  cards.flatMap((card: Evidence) => markupToTokens(card.markup));

const flattenLevel = (data: Evidence[], level: number): TextBlock[] => {
  if (level == 4) return cardsToTokens(data);

  const header = 'h' + level;
  return flatMap(groupBy(data, header), (el, name) => [
    { format: header, tokens: [{ format: [], text: name }] } as TextBlock,
    ...flattenLevel(el, level + 1),
  ]);
};

export default async (ids: number[], keepHeadings: boolean): Promise<Buffer> => {
  let evidence = await db.evidence.findMany({
    where: {
      id: { in: ids },
    },
  });

  let tokens: TextBlock[] = keepHeadings ? flattenLevel(evidence, 1) : cardsToTokens(evidence);
  return await tokensToDocument(tokens);
};
