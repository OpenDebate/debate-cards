import { StyleName, styleMap, getDocxStyles } from './';
import { Document, Packer, Paragraph, TextRun, IRunOptions, IParagraphOptions } from 'docx';
import { cloneDeep, isEqual } from 'lodash';
import ch from 'cheerio';
import { promises as fs } from 'fs';

export interface TextToken {
  text: string;
  format: StyleName[];
}

export interface TextBlock {
  format: StyleName;
  tokens: TextToken[];
}

export const tokensToMarkup = (textBlocks: TextBlock[]): string => {
  const dom = '';
  textBlocks.forEach(({ format, tokens }) => {
    const { domElement } = styleMap[format];
    dom += `<${domElement}>`;
    tokens.forEach(({ text, format }) => {
      let str = text;
      format.forEach((style) => {
        const elName = styleMap[style]?.domElement;
        str = `<${elName}>${str}</${elName}>`;
      });
      dom += str
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

export const simplifyTokens = (block: TextBlock): TextBlock => {
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
