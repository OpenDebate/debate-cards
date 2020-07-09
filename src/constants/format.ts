// eslint-disable-next-line import/prefer-default-export
export const styleMap = {
  h1: {
    block: true,
    domSelectors: 'h1',
    domElement: 'h1',
  },
  h2: {
    block: true,
    domSelector: 'h2',
    domElement: 'h2',
  },
  h3: {
    block: true,
    domSelector: 'h3',
    domElement: 'h3',
  },
  h4: {
    block: true,
    domSelector: 'h4',
    domElement: 'h4',
  },
  p: {
    block: true,
    domSelector: 'p',
    domElement: 'p',
  },
  emphasis: {
    block: false,
    domSelector: 'span',
    domElement: 'p',
  },
  strong: {
    block: false,
    domSelector: 'strong',
    domElement: 'span',
  },
  mark: {
    block: false,
    domSelector: 'mark',
  },
};

export type styleMap = typeof styleMap;
