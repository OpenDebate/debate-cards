import { Evidence } from 'app/entities';
import { db, TypedEvent } from 'app/lib';
import { TextBlock, tokensToDocument, getOutlineLvlName, TextToken, TokenStyle, getStyles } from 'app/lib/debate-tools';
import ch from 'cheerio';
import { flatMap, groupBy } from 'lodash';

export const onGenerateFile = new TypedEvent<{ ids: number[] }>();

const textNodes = (nodes: any[], format: TokenStyle): TextToken[] => {
  return nodes.flatMap((node) => {
    if (node.type === 'text') return { text: node.data, format };

    const style = getStyles({ domElement: node.name })[0];
    return textNodes(node.children, { ...format, [style]: true });
  });
};

const cardToTokens = (card: Evidence): TextBlock[] =>
  ch('h4, p', card.markup)
    .get()
    .map((block) => ({
      format: block.name === 'h4' ? 'tag' : 'text',
      tokens: textNodes(ch(block).contents().get(), { underline: false, strong: false, mark: false }),
    }));

const flattenLevel = (data: Evidence[], level: number): TextBlock[] => {
  if (level == 4) return data.flatMap(cardToTokens);

  const header = getOutlineLvlName(level);
  return flatMap(groupBy(data, header), (el, name) => [
    {
      format: header,
      tokens: [{ format: { mark: false, strong: false, underline: false }, text: name }],
    },
    ...flattenLevel(el, level + 1),
  ]);
};

export default async (ids: number[], keepHeadings: boolean): Promise<Buffer> => {
  const evidence = await db.evidence.findMany({ where: { id: { in: ids } } });

  const tokens: TextBlock[] = flattenLevel(evidence, keepHeadings ? 1 : 4);
  onGenerateFile.emit({ ids });
  return await tokensToDocument(tokens);
};
