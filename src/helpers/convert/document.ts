import { markupToTokens, mergeTokens, TextToken } from './';
import mammoth from 'mammoth';
import pandoc from 'node-pandoc-promise';
import file from 'app/entities/file';
import { TextBlock } from './tokens';
import { promises as fs } from 'fs';

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

const convertToHtml = async (filepath: string, options: ConversionOptions): Promise<string> => {
  if (options.method === 'primary') {
    return openWithPandoc(filepath);
  }
  if (options.method === 'secondary') {
    return openWithMammoth(filepath);
  }
  throw new Error('Invalid options');
};

export const documentToTokens = async (filepath: string): Promise<TextBlock[]> => {
  const markupA = await convertToHtml(filepath, { method: 'primary' });
  const markupB = await convertToHtml(filepath, { method: 'secondary' });
  const tokensA = markupToTokens(markupA);
  const tokensB = markupToTokens(markupB);
  await fs.writeFile(
    './output-doc-a.html',
    `
    <style>
      em {
        text-decoration: underline;
        font-style: normal;
      }
    </style>
    ${markupA}
  `,
  );
  await fs.writeFile(
    './output-doc-a.html',
    `
    <style>
      em {
        text-decoration: underline;
        font-style: normal;
      }
    </style>
    ${markupA}
  `,
  );
  await fs.writeFile(
    './output-doc-b.html',
    `
    <style>
      em {
        text-decoration: underline;
        font-style: normal;
      }
    </style>
    ${markupB}
  `,
  );
  const mergedTokens = mergeTokens(tokensA, tokensB);
  return mergedTokens;
};

/* 
  1 - open document as html with pandoc and mammoth
  2 - tokenize html and merge output
  3 - reconstruct merged and cleaned html output
*/
export const documentToMarkup = async (filepath: string): Promise<string> => {
  const mergedTokens = documentToTokens(filepath);

  return;
};
