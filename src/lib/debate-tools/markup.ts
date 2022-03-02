import ch from 'cheerio';
import {
  TextBlock,
  getStyleNameByXml,
  TokenStyle,
  SectionStyleName,
  simplifyTokens,
  tokensToDocument,
  getOutlineLvlName,
  getStyleNameByOutlineLvl,
} from './';

export const markupToDocument = async (xml: string, styles: string): Promise<Buffer> => {
  const tokens = markupToTokens(xml, styles, { simplified: true });
  const buffer = await tokensToDocument(tokens);
  return buffer;
};

interface TokensOption {
  simplified: boolean;
}

export const markupToTokens = (document: string, styles: string, options?: TokensOption): TextBlock[] => {
  const blocks = tokenize(document, styles);
  if (options?.simplified) {
    const simplifiedBlocks = blocks.map((block) => simplifyTokens(block));
    return simplifiedBlocks;
  }
  return blocks;
};

const getChild = (el, names: string[]) =>
  names.reduce((acc, name) => {
    return acc?.children?.find((child) => child.name === name);
  }, el);

// Extract what formatting applies to block of text
const updateElFormating = (styleEl, current?: TokenStyle): TokenStyle => {
  const formatting: TokenStyle = current ? { ...current } : { underline: false, strong: false, mark: false };
  const styles = getChild(styleEl, ['w:rPr']);
  if (!styles) return formatting;

  const highlight = getChild(styles, ['w:highlight']);
  const bold = getChild(styles, ['w:b']);
  const underline = getChild(styles, ['w:u'])?.attribs['w:val'];

  if (highlight) formatting.mark = true;
  if (bold) formatting.strong = bold.attribs['w:val'] !== '0';
  if (underline) formatting.underline = underline !== 'none';

  return formatting;
};

const getBlockFormat = (block): SectionStyleName => {
  const stlyeNameFormat = getStyleNameByXml(getChild(block, ['w:pPr', 'w:pStyle'])?.attribs['w:val']);
  if (stlyeNameFormat !== 'text') return stlyeNameFormat;

  // Sometimes uses outline level instead of header
  const outlineLvl = getChild(block, ['w:pPr', 'w:outlineLvl'])?.attribs['w:val'];
  return getOutlineLvlName(parseInt(outlineLvl) + 1);
};

const tokenize = (xml: string, styles: string): TextBlock[] => {
  const s = ch.load(styles, { xmlMode: true });
  const d = ch.load(xml, { xmlMode: true });

  // Generate map of style names to formatting from styles.xml
  const xmlStyles: Record<string, TokenStyle> = s('w\\:style')
    .get()
    .reduce((acc, node) => {
      acc[node.attribs['w:styleId']] = updateElFormating(node);
      return acc;
    }, {});

  const tokens: TextBlock[] = d('w\\:p')
    .get()
    .map((block) => ({
      format: getBlockFormat(block),
      tokens: ch(block)
        .children('w\\:r')
        .get()
        .map((node) => ({
          text: ch(node).text(),
          // combine formatting defined in text block and formatting from style name
          format: updateElFormating(node, xmlStyles[getChild(node, ['w:rPr', 'w:rStyle'])?.attribs['w:val']]),
        })),
    }));

  return tokens;
};
