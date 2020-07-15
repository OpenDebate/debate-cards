import ch from 'cheerio';
import { TextBlock, getStyles, getStyleByElement, styleMap } from './';

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

export const markupToTokens = (markup: string): TextBlock[] => {
  const tokens = tokenize(markup);
  return tokens;
};

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
