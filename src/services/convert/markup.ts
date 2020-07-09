import ch from 'cheerio';
import { TextToken, getStyle, getStyleByElement } from 'app/services/convert';

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

const tokenize = (markup: string): TextToken[][] => {
  const blockSelector = getStyle({ block: true }).join(', ');
  const nodes = ch(blockSelector, markup)
    .get()
    .map((block) =>
      flattenTree(ch(block).contents().get())
        .filter((node) => node.type === 'text')
        .map((node) => ({
          text: node.data,
          format: ch(node)
            .parentsUntil('p')
            .get()
            .map((el) => getStyleByElement(el.name)),
        })),
    );
  const tokens = nodes.map((paragraph) =>
    paragraph.flatMap((node) => node.text.split('').map((text) => ({ text, format: node.format }))),
  );
  return tokens;
};

export const markupToTokens = (markup: string): TextToken[][] => {
  const tokens = tokenize(markup);
  return tokens;
};
