import mammoth from 'mammoth';
import pandoc from 'node-pandoc-promise';
import { markupToTokens, mergeTokens, TextBlock } from './';
import { tokensToMarkup } from './tokens';
import { file as tmpFile } from 'tmp-promise';
import { promises as fs } from 'fs';

/* 
  1 - open document as html with pandoc and mammoth
  2 - tokenize html and merge output
*/
export const documentToTokens = async (file: Buffer): Promise<TextBlock[]> => {
  const markupA = await convertToHtml(file, { method: 'primary' });
  const markupB = await convertToHtml(file, { method: 'secondary' });
  const tokensA = markupToTokens(markupA, { simplifed: false });
  const tokensB = markupToTokens(markupB, { simplifed: false });
  const mergedTokens = mergeTokens(tokensA, tokensB);
  return mergedTokens;
};

/* 
  1 - open document as html with pandoc and mammoth
  2 - tokenize html and merge output
  3 - reconstruct merged and cleaned html output
*/
export const documentToMarkup = async (file: Buffer): Promise<string> => {
  const tokens = await documentToTokens(file);
  const markup = tokensToMarkup(tokens);
  return markup;
};

// const documentToMarkup = (file: Buffer) => {
//   return documentToTokens(file).then((tokens) => tokensToMarkup(tokens));
// };
interface ConversionOptions {
  method: 'primary' | 'secondary';
}

const convertToHtml = async (file: Buffer, options: ConversionOptions): Promise<string> => {
  if (options.method === 'primary') {
    return openWithPandoc(file);
  }
  if (options.method === 'secondary') {
    return openWithMammoth(file);
  }
  throw new Error('Invalid options');
};

const openWithPandoc = async (file: Buffer): Promise<string> => {
  const { path, cleanup } = await tmpFile();
  await fs.writeFile(path, file);
  const value = await pandoc(path, ['-f', 'docx', '-t', 'html5']);
  cleanup();
  return value;
};

const openWithMammoth = async (file: Buffer): Promise<string> => {
  const { path, cleanup } = await tmpFile();
  await fs.writeFile(path, file);
  const { value } = await mammoth.convertToHtml({ path });
  cleanup();
  return value;
};
