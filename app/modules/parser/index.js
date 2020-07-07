import mammoth from 'mammoth';
import ch from 'cheerio';
import pandoc from 'node-pandoc-promise';
import { uniq, isEqual, cloneDeep } from 'lodash';
import { promises as fs } from 'fs';

const convertToMarkup = async (path) => {
  const mammothConfig = {};

  const markupA = await pandoc(path, ['-f', 'docx', '-t', 'html5']);
  const { value: markupB } = await mammoth.convertToHtml(
    { path },
    mammothConfig,
  );

  return { a: markupA, b: markupB };
};

const parse = (html, file) => {
  const $ = ch.load(html);
  const cards = $('h4')
    .map((i, item) => ({
      tag: ch(item).text(),
      cite: ch(item).next().contents().filter('strong').text(),
      card: `<h4>${ch(item).text()}</h4>${ch(item)
        .nextUntil('h1, h2, h3, h4')
        .toArray()
        .map((p) => `<p>${ch(p).html()}</p>`)
        .join('')}`,
      text: ch(item).nextUntil('h1, h2, h3, h4').text(),
      // set: file.set,
      // file: file._id,
      h1: ch(item).prevAll('h1').eq(0).text(),
      h2: ch(item).prevAll('h2').eq(0).text(),
      h3: ch(item).prevAll('h3').eq(0).text(),
      index: i,
    }))
    .get();
  return cards;
};

// take in html markup and output flat array of text nodes
const mergeFormatting = (markupA, markupB) => {
  const styleMap = {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    span: 'underline',
    strong: 'strong',
    mark: 'mark',
  };
  const flattenTree = (tree) => {
    // flatten dom tree into list of nodes
    const flat = [];
    const flatten = (nodes, flattedNodes) => {
      for (let index = 0; index < nodes.length; index += 1) {
        flattedNodes.push(nodes[index]);
        if (nodes[index].childNodes !== null) {
          if (nodes[index].childNodes.length > 0)
            flatten(nodes[index].childNodes, flattedNodes);
        }
      }
    };
    flatten(tree, flat);
    return flat;
  };

  const tokenize = (markup) => {
    // get all text nodes with formatting
    let tokens = ch('p, h1, h2, h3, h4', markup)
      .get()
      .map((block) =>
        flattenTree(ch(block).contents().get())
          .filter((node) => node.type === 'text')
          .map((node) => ({
            text: node.data,
            format: ch(node)
              .parentsUntil('p')
              .get()
              .map((el) => styleMap[el.name]),
          })),
      );

    tokens = tokens.map((paragraph) =>
      paragraph.flatMap((node) =>
        node.text.split('').map((text) => ({ text, format: node.format })),
      ),
    );
    return tokens;
  };

  const tokensA = tokenize(markupA);
  const tokensB = tokenize(markupB);

  const mergedTokens = tokensA.map((paragraphs, i) =>
    paragraphs.map(({ text, format }, j) => ({
      text,
      format: tokensB[i][j]
        ? uniq([...tokensB[i][j].format, ...format]).sort()
        : format,
    })),
  );

  const simplifedTokens = mergedTokens.map((textBlock) => {
    const simplifiedBlock = textBlock.reduce((acc, node) => {
      const prevNode = acc.length > 0 ? acc[acc.length - 1] : undefined;
      const isSameFormat = prevNode
        ? isEqual(node.format, prevNode.format)
        : false;

      if (!isSameFormat) {
        return [...acc, cloneDeep(node)];
      }
      prevNode.text += node.text;
      return acc;
    }, []);

    return simplifiedBlock;
  });

  const mergedMarkup = simplifedTokens;

  return mergedMarkup;
};

(async () => {
  const res = await convertToMarkup(
    '/Users/arvindb/Code/debate-cards/app/modules/parser/sample.docx',
  );
  await fs.writeFile('./output.html', await mergeFormatting(res.a, res.b));
})();
