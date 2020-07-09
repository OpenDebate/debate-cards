import { uniq, cloneDeep, isEqual } from 'lodash';

export interface TextToken {
  text: string;
  format: string[];
}

const combineFormat = (tokensA: TextToken[][], tokensB: TextToken[][]): TextToken[][] =>
  tokensA.map((paragraphs, i) =>
    paragraphs.map(({ text, format }, j) => ({
      text,
      format: tokensB[i][j] ? uniq([...tokensB[i][j].format, ...format]).sort() : format,
    })),
  );

const simplifyTokens = (tokens: TextToken[][]): TextToken[][] =>
  tokens.map((textBlock) => {
    const simplifiedBlock = textBlock.reduce((acc, node) => {
      const prevNode = acc.length > 0 ? acc[acc.length - 1] : undefined;
      const isSameFormat = prevNode ? isEqual(node.format, prevNode.format) : false;

      if (!isSameFormat) {
        return [...acc, cloneDeep(node)];
      }
      prevNode.text += node.text;
      return acc;
    }, []);

    return simplifiedBlock;
  });

export const mergeTokens = (tokensA: TextToken[][], tokensB: TextToken[][]): TextToken[][] => {
  const mergedTokens = combineFormat(tokensA, tokensB);
  const simplifedTokens = simplifyTokens(mergedTokens);
  return simplifedTokens;
};
