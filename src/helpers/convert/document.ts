import { markupToTokens, mergeTokens, TextToken } from './';
import mammoth from 'mammoth';
import pandoc from 'node-pandoc-promise';

const openWithPandoc = async (path: string): Promise<string> => {
  const value = await pandoc(path, ['-f', 'docx', '-t', 'html5']);
  return value;
};

const openWithMammoth = async (path: string): Promise<string> => {
  const { value } = await mammoth.convertToHtml({ path });
  return value;
};

interface ConversionOptions {
  method: 'primary' | 'secondary';
}

export const documentToMarkup = async (filepath: string, options: ConversionOptions): Promise<string> => {
  if (options.method === 'primary') {
    return openWithPandoc(filepath);
  }
  if (options.method === 'secondary') {
    return openWithMammoth(filepath);
  }
  throw new Error('Invalid options');
};

export const documentToTokens = async (filepath: string): Promise<TextToken[][]> => {
  const markupA = await documentToMarkup(filepath, { method: 'primary' });
  const markupB = await documentToMarkup(filepath, { method: 'secondary' });
  const tokensA = markupToTokens(markupA);
  const tokensB = markupToTokens(markupB);
  const mergedTokens = mergeTokens(tokensA, tokensB);
  return mergedTokens;
};
