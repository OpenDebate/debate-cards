import { HeadingLevel, IParagraphOptions, IRunOptions } from 'docx';
import { findKey, pickBy } from 'lodash';
import { TokenStyle } from '.';

interface Style {
  block: boolean;
  heading: boolean;
  domSelector: string[];
  domElement: string;
  xmlName?: string;
  docxStyles?: IParagraphOptions | IRunOptions;
}

export type SectionStyleName = 'pocket' | 'hat' | 'block' | 'tag' | 'text';
export type TokenStyleName = 'underline' | 'strong' | 'mark';
export type StyleName = SectionStyleName | TokenStyleName;

export const styleMap: Record<StyleName, Style> = {
  pocket: {
    block: true,
    heading: true,
    domSelector: ['h1'],
    domElement: 'h1',
    xmlName: 'Heading1',
    docxStyles: {
      heading: HeadingLevel.HEADING_1,
      outlineLevel: 1,
    },
  },
  hat: {
    block: true,
    heading: true,
    domSelector: ['h2'],
    domElement: 'h2',
    xmlName: 'Heading2',
    docxStyles: {
      heading: HeadingLevel.HEADING_2,
      outlineLevel: 2,
    },
  },
  block: {
    block: true,
    heading: true,
    domSelector: ['h3'],
    domElement: 'h3',
    xmlName: 'Heading3',
    docxStyles: {
      heading: HeadingLevel.HEADING_3,
      outlineLevel: 3,
    },
  },
  tag: {
    block: true,
    heading: true,
    domSelector: ['h4'],
    domElement: 'h4',
    xmlName: 'Heading4',
    docxStyles: {
      heading: HeadingLevel.HEADING_4,
      outlineLevel: 4,
    },
  },
  text: {
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

export const getStyleNameByXml = (elXmlName: string): SectionStyleName => {
  const predicate = ({ xmlName = null }) => elXmlName === xmlName;
  return (findKey(styleMap, predicate) ?? 'text') as SectionStyleName;
};

export const getOutlineLvlName = (outlineLvl: number): SectionStyleName => {
  const predicate = ({ docxStyles = null }) => outlineLvl === docxStyles?.outlineLevel;
  return (findKey(styleMap, predicate) ?? 'text') as SectionStyleName;
};

export const getStyles = (filter: Partial<Style>): StyleName[] => {
  return Object.keys(pickBy(styleMap, filter)) as StyleName[];
};

export const getDocxStyles = (styleNames: TokenStyle): IParagraphOptions | IRunOptions => {
  const styles = pickBy(styleNames, (el) => el); // Get only styles that are set as true
  const mergedStyles = Object.keys(styles).reduce((acc, key) => ({ ...acc, ...styleMap[key]?.docxStyles }), {});
  return mergedStyles;
};
