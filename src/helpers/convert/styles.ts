import { findKey, pickBy } from 'lodash';

interface style {
  block: boolean;
  domSelector: string;
  domElement: string;
}

interface styleMap {
  [key: string]: style;
}

export const styleMap: styleMap = {
  h1: {
    block: true,
    domSelector: 'h1',
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
    domElement: 'em',
  },
  strong: {
    block: false,
    domSelector: 'strong',
    domElement: 'strong',
  },
  mark: {
    block: false,
    domSelector: 'mark',
    domElement: 'mark',
  },
};

export const getStyleByElement = (elementName: string): string => {
  return findKey(styleMap, { domSelector: elementName });
};

export const getStyle = (filter: Partial<style>): string[] => {
  return Object.keys(pickBy(styleMap, filter));
};
