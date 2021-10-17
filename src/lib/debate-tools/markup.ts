import ch from 'cheerio';
import { union } from 'lodash';
import { TextBlock, getStyleNameByXml, simplifyTokens, tokensToDocument } from './';

export const markupToDocument = async (xml: string, styles: string): Promise<Buffer> => {
  const tokens = markupToTokens(xml, styles, { simplifed: true });
  const buffer = await tokensToDocument(tokens);
  return buffer;
};

interface TokensOption {
  simplifed: boolean;
}

export const markupToTokens = (document: string, styles: string, options?: TokensOption): TextBlock[] => {
  const blocks = tokenize(document, styles);
  if (options?.simplifed) {
    const simplifedBlocks = blocks.map((block) => simplifyTokens(block));
    return simplifedBlocks;
  }
  return blocks;
};

const getChild = (el, names: string[]) => names.reduce((acc, name) => {
  return acc?.children?.find(child => child.name === name)
}, el)

// Extract what formatting applies to block of text
const getElFormating = (styleEl) => {
  const styles = getChild(styleEl, ['w:rPr']);
  if (!styles) return [];

  const highlight = getChild(styles, ['w:highlight']);
  const bold = getChild(styles, ['w:b']);
  const underline = getChild(styles, ["w:u"])?.attribs['w:val'];

  let formating = [];
  if (highlight) formating.push('mark')
  if (bold && bold.attribs['w:val'] !== '0') formating.push('strong')
  if (underline && underline !== 'none') formating.push('underline');

  return formating;
}

const tokenize = (xml: string, styles: string): TextBlock[] => {
  const s = ch.load(styles, { xmlMode: true });
  const d = ch.load(xml, { xmlMode: true });

  // Generate map of style names to formatting from styles.xml
  const xmlStyles = s('w\\:style').get().reduce((acc, node) => {
    acc[node.attribs["w:styleId"]] = getElFormating(node)
    return acc
  }, {});

  const tokens: TextBlock[] = d('w\\:p')
    .get()
    .map((block) => ({
      format: getStyleNameByXml(getChild(block, ["w:pPr", "w:pStyle"])?.attribs["w:val"]),
      tokens: ch(block).children('w\\:r').get().map((node) => ({
        text: ch(node).text(),
        // combine formatting defined in text block and formatting from style name
        format: union(
          getElFormating(node),
          xmlStyles[getChild(node, ["w:rPr", "w:rStyle"])?.attribs["w:val"]]
        )
      }))
    }));

  return tokens;
};
