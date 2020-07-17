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

const reconcileBlocks = (blockA: TextBlock, blockB: TextBlock) => {
  const tokens = [];
  // let tokensB = [];
  let offsetA = 0;
  let offsetB = 0;
  blockA.tokens.forEach((_, idx) => {
    const tokenA = blockA.tokens[idx + offsetA];
    const tokenB = blockA.tokens[idx + offsetB];
    if (tokenA.text == tokenB.text) {
      tokens.push({
        text: tokenA.text,
        format: tokenB.format ? uniq([...tokenB.format, ...tokenA.format]).sort() : tokenA.format.sort(),
      });
    } else if (tokenA.text == ' ') {
      offsetA++;
    } else if (tokenB.text == ' ') {
      offsetB++;
    }
  });
};

const combineFormat = (blocksA: TextBlock[], blocksB: TextBlock[]): TextBlock[] => {
  return blocksA.map(({ tokens, format }, i) => {
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
