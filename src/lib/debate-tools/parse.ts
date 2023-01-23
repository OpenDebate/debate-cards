import { TextBlock, StyleName, getStyles, tokensToMarkup } from '.';

const extractText = (blocks: TextBlock[], styles?: StyleName[]): string => {
  if (!blocks[0]) return;
  return blocks
    .reduce((acc, block) => {
      // join text and add spacing if skipping tokens
      const text = block?.tokens.reduce((str, token) => {
        if (!styles || styles.every((style) => token.format[style])) return str + token.text;
        else return str.trim() + ' ';
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
  for (let i = anchor; i >= 0; i--) if (styles.includes(blocks[i].format)) return blocks[i];
};

export const getBlocksUntil = (blocks: TextBlock[], anchor: number, styles: StyleName[]): TextBlock[] => {
  const subDoc = blocks.slice(anchor, blocks.length);
  const endIdx = subDoc.slice(1).findIndex((block) => styles.includes(block.format)) + 1;
  return subDoc.slice(0, endIdx > 0 ? endIdx : blocks.length);
};

const parseCard = (doc: TextBlock[], anchor = 0, idx: number) => {
  const blockStyles = getStyles({ heading: true });
  const card = getBlocksUntil(doc, anchor, blockStyles);
  /*
    first block element is the tag,
    assume second block element is the cite,
    everything left is the card body 
   */
  const tag = card.slice(0, 1);
  const cite = card.slice(1, 2);
  const body = card.slice(2);

  const extractHeading = (name: StyleName) => extractText([getLastBlockWith(doc, anchor, [name])]);
  const shortCite = extractText(cite, ['strong']);
  /* 
    Quite a few documents have the bolded part of cite in seperate block than rest of cite
    The cite in seperate block usually contains the author's name at the start, if that is detected move the first block of the body to the cite
  */
  if (body.length > 1) {
    const start = extractText([body[0]]).slice(0, 50);
    if (shortCite.split(' ').find((word) => start.includes(word))) cite.push(...body.splice(0, 1));
  }
  // If card has no body, move anything detected as cite to tag
  if (!body.length && cite) tag.push(...cite.splice(0, 1));

  return {
    tag: extractText(tag),
    cite: shortCite,
    fullcite: extractText(cite),
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

export const extractCards = (doc: TextBlock[]): ReturnType<typeof parseCard>[] => {
  const anchors = getIndexesWith(doc, ['tag']);
  return anchors.map((anchor, i) => parseCard(doc, anchor, i));
};
