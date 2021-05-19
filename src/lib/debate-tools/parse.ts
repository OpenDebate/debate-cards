import { TextBlock, StyleName, getStyles, tokensToMarkup } from '.';
import { Evidence } from 'app/entities';

const extractText = (blocks: TextBlock[], styles?: StyleName[]): string => {
  if (!blocks[0]) return;
  return blocks
    .reduce((acc, block) => {
      // filter tokens by styles
      const filteredTokens = styles
        ? block?.tokens.filter(({ format }) => styles.every((style) => format.includes(style)))
        : block?.tokens;
      // join text and add spacing
      const text = filteredTokens.reduce((str, val) => str + `${val.text.trim()} `, '').trim();
      return acc + text + '\n';
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
    h1: extractHeading('h1'),
    h2: extractHeading('h2'),
    h3: extractHeading('h3'),
    summary: extractText(body, ['underline']),
    fulltext: extractText(body),
    markup: tokensToMarkup(card),
    index: idx,
  };
};

export const extractCards = (doc: TextBlock[]): any[] => {
  const anchors = getIndexesWith(doc, ['h4']);
  return anchors.map((anchor, i) => parseCard(doc, anchor, i));
};
