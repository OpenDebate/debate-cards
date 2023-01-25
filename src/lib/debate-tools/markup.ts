import { TextBlock, TokenStyle, TextToken } from './tokens';
import { getStyleNameByXml, getOutlineLvlName, SectionStyleName } from './styles';
import { WritableStream as XmlStream } from 'htmlparser2/lib/WritableStream';

type StyleData = { token: TokenStyle; block: { format: SectionStyleName } };
export type StyleRecord = Record<string, StyleData>;
const handleStyleTag = (name: string, attribs: Record<string, string>, styles: StyleData) => {
  if (name === 'w:u') styles.token.underline = attribs['w:val'] !== 'none';
  else if (name === 'w:highlight') styles.token.mark = true;
  else if (name === 'w:b') styles.token.strong = attribs['w:val'] !== '0';
  else if (name === 'w:outlineLvl') styles.block.format = getOutlineLvlName(+attribs['w:val'] + 1);
};

export const createStyleParser = (resolve: (value: StyleRecord) => void, reject: (reason?: any) => void) => {
  const parsedStyles: StyleRecord = {};
  let styleName = '';
  return new XmlStream(
    {
      onopentag(name, attribs) {
        if (name === 'w:style') {
          styleName = attribs['w:styleId'];
          parsedStyles[styleName] = {
            token: { underline: false, strong: false, mark: false },
            block: { format: getStyleNameByXml(styleName) },
          };
        } else if (styleName) handleStyleTag(name, attribs, parsedStyles[styleName]);
      },
      onend: () => resolve(parsedStyles),
      onerror: reject,
    },
    { xmlMode: true },
  );
};

export const createTokenizer = (
  styleData: StyleRecord,
  resolve: (value: TextBlock[]) => void,
  reject: (reason?: any) => void,
) => {
  const blocks: TextBlock[] = [];
  let block: TextBlock;
  let token: TextToken;
  return new XmlStream(
    {
      onopentag(name, attribs) {
        if (name === 'w:p') block = { format: 'text', tokens: [] };
        else if (name === 'w:pStyle') block.format = styleData[attribs['w:val']].block.format;
        else if (name === 'w:r') token = { text: '', format: { underline: false, strong: false, mark: false } };
        else if (token) {
          if (name === 'w:rStyle') token.format = { ...styleData[attribs['w:val']].token };
          else handleStyleTag(name, attribs, { token: token.format, block });
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
};
