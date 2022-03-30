import { TextBlock, TokenStyle, TextToken, simplifyTokens, tokensToDocument } from './tokens';
import { getStyleNameByXml, getOutlineLvlName } from './styles';
import { Parser as XmlParser } from 'htmlparser2';

export const markupToDocument = async (xml: string, styles: string): Promise<Buffer> => {
  const tokens = await markupToTokens(xml, styles, { simplified: true });
  const buffer = await tokensToDocument(tokens);
  return buffer;
};

interface TokensOption {
  simplified: boolean;
}

export async function markupToTokens(document: string, styles: string, options?: TokensOption): Promise<TextBlock[]> {
  const blocks = await tokenize(document, styles);
  if (options?.simplified) {
    const simplifiedBlocks = blocks.map(simplifyTokens);
    return simplifiedBlocks;
  }
  return blocks;
}

const handleStyleTag = (name: string, attribs: Record<string, string>, styles: TokenStyle) => {
  if (name === 'w:u') styles.underline = attribs['w:val'] !== 'none';
  else if (name === 'w:highlight') styles.mark = true;
  else if (name === 'w:b') styles.strong = attribs['w:val'] !== '0';
};

const parseStyles = (styles: string): Promise<Record<string, TokenStyle>> =>
  new Promise((resolve, reject) => {
    const parsedStyles: Record<string, TokenStyle> = {};
    let styleName = '';
    new XmlParser(
      {
        onopentag(name, attribs) {
          if (name === 'w:style') {
            styleName = attribs['w:styleId'];
            parsedStyles[styleName] = { underline: false, strong: false, mark: false };
          } else if (styleName) handleStyleTag(name, attribs, parsedStyles[styleName]);
        },
        onend: () => resolve(parsedStyles),
        onerror: reject,
      },
      { xmlMode: true },
    ).parseComplete(styles);
  });

const tokenize = (xml: string, styles: string): Promise<TextBlock[]> =>
  new Promise((resolve, reject) => {
    parseStyles(styles).then((styleData) => {
      const blocks: TextBlock[] = [];
      let block: TextBlock;
      let token: TextToken;
      new XmlParser(
        {
          onopentag(name, attribs) {
            if (name === 'w:p') block = { format: 'text', tokens: [] };
            else if (name === 'w:pStyle') block.format = getStyleNameByXml(attribs['w:val']);
            else if (name === 'w:outlineLvl') block.format = getOutlineLvlName(+attribs['w:val'] + 1);
            else if (name === 'w:r') token = { text: '', format: { underline: false, strong: false, mark: false } };
            else if (token) {
              if (name === 'w:rStyle') token.format = { ...styleData[attribs['w:val']] };
              else handleStyleTag(name, attribs, token.format);
            }
          },
          ontext(data) {
            if (token) token.text += data;
          },
          onclosetag(name) {
            if (name === 'w:p' && block.tokens.length) blocks.push(block);
            else if (name === 'w:r' && token.text) block.tokens.push(token);
          },
          onend: () => resolve(blocks),
          onerror: reject,
        },
        { xmlMode: true },
      ).parseComplete(xml);
    });
  });
