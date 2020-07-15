import { StyleName } from './';
import { uniq, cloneDeep, isEqual } from 'lodash';

export interface TextToken {
  text: string;
  format: StyleName[];
}

export interface TextBlock {
  format: StyleName;
  tokens: TextToken[];
}

const combineFormat = (blocksA: TextBlock[], blocksB: TextBlock[]): TextBlock[] => {
  const primaryBlocks = blocksA.map(({ tokens, format }, i) => {
    const tokensB = blocksB[i].tokens;
    if (tokens.length == tokensB.length) {
      return {
        format,
        tokens: tokens.map(({ text, format }, j) => ({
          text,
          format: tokensB[j].format ? uniq([...tokensB[j].format, ...format]).sort() : format,
        })),
      };
    } else {
      return { tokens, format };
    }
  });
};
// tokens.map(({ text, format }, j) => ({
//   text,
//   format: blocksB[i][j] ? uniq([...blocksB[i][j].format, ...format]).sort() : format,
// }))
const simplifyTokens = (block: TextBlock): TextBlock => {
  const simplifiedTokens = block.tokens.reduce((acc, node) => {
    const prevNode = acc.length > 0 ? acc[acc.length - 1] : undefined;
    const isSameFormat = prevNode ? isEqual(node.format, prevNode.format) : false;

    if (!isSameFormat) {
      return [...acc, cloneDeep(node)];
    }
    prevNode.text += node.text;
    return acc;
  }, []);

  return { format: block.format, tokens: simplifiedTokens };
};

export const doesContainStyle = (block: TextBlock, styles: StyleName[]): boolean => {
  // check if the format of an item in a TextBlock includes any of the passsed styles
  // prettier-ignore
  return block.tokens.some(({ format }) => 
    format.some((tokenStyle) => 
      styles.includes(tokenStyle)
  ));
};

export const mergeTokens = (tokensA: TextBlock[], tokensB: TextBlock[]): TextBlock[] => {
  const mergedBlocks = combineFormat(tokensA, tokensB);
  const simplifedBlocks = mergedBlocks.map((block) => simplifyTokens(block));
  return simplifedBlocks;
};

// export const tokensToMarkup
