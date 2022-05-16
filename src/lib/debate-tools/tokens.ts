import { SectionStyleName, TokenStyleName, styleMap, getDocxStyles } from './';
import { Document, Packer, Paragraph, TextRun, IRunOptions, IParagraphOptions } from 'docx';
import { promises as fs } from 'fs';

export type TokenStyle = Record<TokenStyleName, boolean>;

export interface TextToken {
  text: string;
  format: TokenStyle;
}

export interface TextBlock {
  format: SectionStyleName;
  tokens: TextToken[];
}

export const tokensToMarkup = (textBlocks: TextBlock[]): string => {
  let dom = '';
  const state: TokenStyle = { underline: false, strong: false, mark: false };
  textBlocks.forEach(({ format, tokens }) => {
    if (!tokens.length) return;

    const { domElement } = styleMap[format];
    dom += `<${domElement}>`;
    tokens.forEach(({ text, format }) => {
      if (!text) return;

      let tags = '';
      for (const style in state) {
        if (state[style] !== format[style]) {
          const elName = styleMap[style]?.domElement;
          tags += `<${format[style] ? '' : '/'}${elName}>`;
          state[style] = format[style];
        }
      }
      dom += tags + text;
    });
    dom += `</${domElement}>`;
  });

  return dom;
};

export const tokensToDocument = async (textBlocks: TextBlock[]): Promise<Buffer> => {
  const styles = await fs.readFile(`./src/lib/debate-tools/styles.xml`, 'utf-8');
  const doc = new Document({
    externalStyles: styles,
    sections: [
      {
        properties: {},
        children: textBlocks.map(
          (paragraph) =>
            new Paragraph({
              children: paragraph.tokens.map(
                (run) => new TextRun({ text: run.text, ...(getDocxStyles(run.format) as IRunOptions) }),
              ),
              ...(styleMap[paragraph.format].docxStyles as IParagraphOptions),
            }),
        ),
      },
    ],
  });

  const fileBuffer = await Packer.toBuffer(doc);
  return fileBuffer;
};

const isSameFormat = (a: TokenStyle, b: TokenStyle) =>
  a.mark === b.mark && a.strong === b.strong && a.underline === b.underline;
export const simplifyTokens = (block: TextBlock): TextBlock => {
  const simplifiedTokens = block.tokens.reduce((acc, { format, text }) => {
    if (!acc.length) return [{ format, text }];

    const prev = acc[acc.length - 1];
    const { format: prevFormat, text: prevText } = prev;

    // If same format just combine text
    isSameFormat(format, prevFormat) ? (prev.text = prevText + text) : acc.push({ text, format });
    return acc;
  }, []);

  return { format: block.format, tokens: simplifiedTokens };
};
