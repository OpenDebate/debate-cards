import { findKey, pickBy } from 'lodash';

interface Style {
  block: boolean;
  heading: boolean;
  domSelector: string;
  domElement: string;
}
interface StyleMap {
  [key: string]: Style;
}

export const styleMap: StyleMap = {
  h1: {
    block: true,
    heading: true,
    domSelector: 'h1',
    domElement: 'h1',
  },
  h2: {
    block: true,
    heading: true,
    domSelector: 'h2',
    domElement: 'h2',
  },
  h3: {
    block: true,
    heading: true,
    domSelector: 'h3',
    domElement: 'h3',
  },
  h4: {
    block: true,
    heading: true,
    domSelector: 'h4',
    domElement: 'h4',
  },
  p: {
    block: true,
    heading: false,
    domSelector: 'p',
    domElement: 'p',
  },
  emphasis: {
    block: false,
    heading: false,
    domSelector: 'span',
    domElement: 'em',
  },
  strong: {
    block: false,
    heading: false,
    domSelector: 'strong',
    domElement: 'strong',
  },
  mark: {
    block: false,
    heading: false,
    domSelector: 'mark',
    domElement: 'mark',
  },
};

export type StyleName = keyof typeof styleMap & string;

export const getStyleByElement = (elementName: string): StyleName => {
  return findKey(styleMap, { domSelector: elementName });
};

export const getStyles = (filter: Partial<Style>): StyleName[] => {
  return Object.keys(pickBy(styleMap, filter));
};
