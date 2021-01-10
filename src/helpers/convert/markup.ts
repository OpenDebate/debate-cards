import ch from 'cheerio';
import { TextBlock, getStyles, getStyleByElement, simplifyTokens, tokensToDocument } from './';

export const markupToDocument = async (markup: string): Promise<Buffer> => {
  const tokens = markupToTokens(markup, { simplifed: true });
  const buffer = await tokensToDocument(tokens);
  return buffer;
};

interface TokensOption {
  simplifed: boolean;
}

export const markupToTokens = (markup: string, options?: TokensOption): TextBlock[] => {
  const blocks = tokenize(markup);
  if (options?.simplifed) {
    const simplifedBlocks = blocks.map((block) => simplifyTokens(block));
    return simplifedBlocks;
  }
  return blocks;
};

const flattenTree = (tree: any[]): any[] => {
  const flat = [];
  const flatten = (nodes: string | any[], flattedNodes: any[]) => {
    for (let index = 0; index < nodes.length; index += 1) {
      flattedNodes.push(nodes[index]);
      if (nodes[index].childNodes !== null) {
        if (nodes[index].childNodes.length > 0) {
          flatten(nodes[index].childNodes, flattedNodes);
        }
      }
    }
  };
  flatten(tree, flat);
  return flat;
};

const tokenize = (markup: string): TextBlock[] => {
  const blockSelector = getStyles({ block: true }).join(', ');
  const nodes: TextBlock[] = ch(blockSelector, markup)
    .get()
    .map((block) => ({
      format: ch(block).get()[0].name,
      tokens: flattenTree(ch(block).contents().get())
        .filter((node) => node.type === 'text')
        .map((node) => ({
          text: node.data,
          format: ch(node)
            .parentsUntil(blockSelector)
            .get()
            .map((el) => getStyleByElement(el.name)),
        })),
    }));

  const tokens = nodes.map(({ format, tokens }) => ({
    format,
    tokens: tokens.flatMap((node) => node.text.split('').map((text) => ({ text, format: node.format }))),
  }));

  return tokens;
};
