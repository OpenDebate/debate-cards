import { TextBlock, StyleName, getStyles, tokensToMarkup } from '.';
import { Evidence } from 'app/entities';

const extractText = (blocks: TextBlock[], styles?: StyleName[]): string => {
  if (!blocks[0]) return;
  return blocks
    .reduce((acc, block) => {
      // join text and add spacing if skipping tokens
      const text = block?.tokens.reduce((str, token) => {
        if (!styles || styles.every(style => token.format.includes(style))) return str + token.text
        else return str.trim() + ' '
      }, '');

      return acc.trim() + '\n' + text.trim();
    }, '')
    .trim();
};

export const getIndexesWith = (blocks: TextBlock[], styles: StyleName[]): number[] => {
  const indexes = blocks.reduce<number[]>((arr, block, index) => {
    const isMatch = styles.includes(block.format);
    return isMatch ? [...arr, index] : arr;
  }, []);
  return indexes;
};

const getLastBlockWith = (blocks: TextBlock[], anchor: number, styles: StyleName[]): TextBlock => {
  let ret;
  const range = [...Array(anchor).keys()];
  range.forEach((idx) => (ret = styles.includes(blocks[idx].format) ? blocks[idx] : ret));
  return ret;
};

export const getBlocksUntil = (blocks: TextBlock[], anchor: number, styles: StyleName[]): TextBlock[] => {
  const subDoc = blocks.slice(anchor, blocks.length);
  const endIdx = subDoc.slice(1).findIndex((block) => styles.includes(block.format)) + 1;
  return subDoc.slice(0, endIdx > 0 ? endIdx : blocks.length);
};

interface EvidenceData extends Evidence {
  index: number;
}

const parseCard = (doc: TextBlock[], anchor = 0, idx): Partial<EvidenceData> => {
  const blockStyles = getStyles({ heading: true });
  const card = getBlocksUntil(doc, anchor, blockStyles);
  /*
    first block element is the tag,
    assume second block element is the cite,
    everything left is the card body 
   */
  const [tag, cite, ...body] = card;

  const extractHeading = (name: StyleName) => extractText([getLastBlockWith(doc, anchor, [name])]);

  return {
    tag: extractText([tag]),
    cite: extractText([cite], ['strong']),
    pocket: extractHeading('pocket'),
    hat: extractHeading('hat'),
    block: extractHeading('block'),
    summary: extractText(body, ['underline']),
    spoken: extractText(body, ['mark']),
    fulltext: extractText(body),
    markup: tokensToMarkup(card),
    index: idx,
  };
};

export const extractCards = (doc: TextBlock[]): any[] => {
  const anchors = getIndexesWith(doc, ['tag']);
  return anchors.map((anchor, i) => parseCard(doc, anchor, i));
};
