import { TextBlock, TokenStyle, TextToken, simplifyTokens } from './tokens';
import { getStyleNameByXml, getOutlineLvlName } from './styles';
import { WritableStream as XmlStream } from 'htmlparser2/lib/WritableStream';
import { Readable } from 'stream';

interface TokensOption {
  simplified: boolean;
}

export async function markupToTokens(
  document: Readable,
  styles: Readable,
  options?: TokensOption,
): Promise<TextBlock[]> {
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

const parseStyles = (styles: Readable): Promise<Record<string, TokenStyle>> =>
  new Promise((resolve, reject) => {
    const parsedStyles: Record<string, TokenStyle> = {};
    let styleName = '';
    const parser = new XmlStream(
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
    );
    styles.pipe(parser);
  });

const tokenize = (xml: Readable, styles: Readable): Promise<TextBlock[]> =>
  new Promise((resolve, reject) => {
    parseStyles(styles).then((styleData) => {
      const blocks: TextBlock[] = [];
      let block: TextBlock;
      let token: TextToken;
      const parser = new XmlStream(
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
      );
      xml.pipe(parser);
    });
  });
