import { HeadingLevel, IParagraphOptions, IRunOptions } from 'docx';
import { findKey, pickBy } from 'lodash';

interface Style {
  block: boolean;
  heading: boolean;
  domSelector: string[];
  domElement: string;
  docxStyles?: IParagraphOptions | IRunOptions;
}
interface StyleMap {
  [key: string]: Style;
}

export const styleMap: StyleMap = {
  h1: {
    block: true,
    heading: true,
    domSelector: ['h1'],
    domElement: 'h1',
    docxStyles: {
      heading: HeadingLevel.HEADING_1,
      outlineLevel: 1,
    },
  },
  h2: {
    block: true,
    heading: true,
    domSelector: ['h2'],
    domElement: 'h2',
    docxStyles: {
      heading: HeadingLevel.HEADING_2,
      outlineLevel: 2,
    },
  },
  h3: {
    block: true,
    heading: true,
    domSelector: ['h3'],
    domElement: 'h3',
    docxStyles: {
      heading: HeadingLevel.HEADING_3,
      outlineLevel: 3,
    },
  },
  h4: {
    block: true,
    heading: true,
    domSelector: ['h4'],
    domElement: 'h4',
    docxStyles: {
      heading: HeadingLevel.HEADING_4,
      outlineLevel: 4,
    },
  },
  p: {
    block: true,
    heading: false,
    domSelector: ['p'],
    domElement: 'p',
  },
  underline: {
    block: false,
    heading: false,
    domSelector: ['span', 'u'],
    domElement: 'u',
    docxStyles: {
      underline: {},
    },
  },
  strong: {
    block: false,
    heading: false,
    domSelector: ['strong'],
    domElement: 'strong',
    docxStyles: {
      bold: true,
    },
  },
  mark: {
    block: false,
    heading: false,
    domSelector: ['mark'],
    domElement: 'mark',
    docxStyles: {
      highlight: 'cyan',
    },
  },
};

export type StyleName = keyof typeof styleMap & string;

export const getStyleByElement = (elementName: string): StyleName => {
  const predicate = ({ domSelector }) => domSelector.includes(elementName);
  return findKey(styleMap, predicate);
};

export const getStyles = (filter: Partial<Style>): StyleName[] => {
  return Object.keys(pickBy(styleMap, filter));
};

export const getDocxStyles = (styleNames: StyleName[]): IParagraphOptions | IRunOptions => {
  const mergedStyles = styleNames.reduce((acc, key) => ({ ...acc, ...styleMap[key]?.docxStyles }), {});
  return mergedStyles;
};
