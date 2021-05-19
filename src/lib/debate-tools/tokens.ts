import { StyleName, styleMap, getBlocksUntil, getDocxStyles, getIndexesWith } from './';
import { Document, Packer, Paragraph, TextRun, IRunOptions, IParagraphOptions } from 'docx';
import { uniq, cloneDeep, isEqual } from 'lodash';
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
  const dom = ch.load('<div id="root"></div>');
  textBlocks.forEach(({ format, tokens }) => {
    const { domElement } = styleMap[format];
    const containerEl = `<${domElement}></${domElement}>`;
    dom('#root').append(containerEl);
    tokens.forEach(({ text, format }) => {
      let str = text;
      format.forEach((style) => {
        const elName = styleMap[style]?.domElement;
        str = `<${elName}>${str}</${elName}>`;
      });

      dom('#root').children().last().append(str);
    });
  });

  return dom('#root').html();
};

export const tokensToDocument = async (textBlocks: TextBlock[]): Promise<Buffer> => {
  const styles = await fs.readFile(`/Users/arvindb/dev/debate-cards/src/lib/debate-tools/styles.xml`, 'utf-8');
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

export const mergeTokens = (tokensA: TextBlock[], tokensB: TextBlock[]): TextBlock[] => {
  const mergedBlocks = combineFormat(tokensA, tokensB);
  const simplifedBlocks = mergedBlocks.map((block) => simplifyTokens(block));
  return simplifedBlocks;
};

const combineFormat = (blocksPrimary: TextBlock[], blocksSecondary: TextBlock[]): TextBlock[] => {
  let blocksMerged = cloneDeep(blocksPrimary);
  const anchorsMerged = getIndexesWith(blocksMerged, ['h4']);
  const anchorsB = getIndexesWith(blocksSecondary, ['h4']);
  anchorsMerged.forEach((_, i) => {
    const anchorMerged = anchorsMerged[i];
    const anchorSecondary = anchorsB[i];
    const restOfMergedBlocks = getBlocksUntil(blocksMerged, anchorMerged, ['h4']);
    const restOfSecondaryBlocks = getBlocksUntil(blocksSecondary, anchorSecondary, ['h4']);

    const mergedSegment = restOfMergedBlocks.map(({ tokens, format }, i) => {
      const tokensSecondary = restOfSecondaryBlocks[i]?.tokens;
      return {
        format,
        tokens: tokens.map(({ text, format }, j) => ({
          text,
          format:
            tokensSecondary && tokensSecondary[j]?.format
              ? uniq([...tokensSecondary[j]?.format, ...format]).sort()
              : format,
        })),
      };
    });

    const start = blocksMerged.slice(0, anchorMerged);
    const end = blocksMerged.slice(anchorMerged + mergedSegment.length, blocksMerged.length);
    blocksMerged = [...start, ...mergedSegment, ...end];
  });
  return blocksMerged;
};
