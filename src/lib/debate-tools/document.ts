import { createStyleParser, createTokenizer, StyleRecord, TextBlock } from './';
import { simplifyTokens, tokensToMarkup } from './tokens';
import { ParseOne } from 'unzipper';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

interface TokensOption {
  simplified: boolean;
}

/* 
  1 - open document.xml and styles.xml by unzipping .docx file
  2 - tokenize document.xml and pull info on named styles from styles.xml
*/
export const documentToTokens = async (filepath: string, options?: TokensOption): Promise<TextBlock[]> => {
  const styleData = await new Promise<StyleRecord>((resolve, reject) =>
    pipeline([createReadStream(filepath), ParseOne(/styles\.xml$/), createStyleParser(resolve, reject)]).catch(reject),
  );
  const blocks = await new Promise<TextBlock[]>((resolve, reject) =>
    pipeline([
      createReadStream(filepath),
      ParseOne(/document\.xml$/),
      createTokenizer(styleData, resolve, reject),
    ]).catch(reject),
  );
  if (options?.simplified) {
    const simplifiedBlocks = blocks.map(simplifyTokens);
    return simplifiedBlocks;
  }
  return blocks;
};

/* 
  1 - open document.xml
  2 - tokenize xml
  3 - reconstruct cleaned html
*/
export const documentToMarkup = async (filepath: string): Promise<string> => {
  const tokens = await documentToTokens(filepath);
  const markup = tokensToMarkup(tokens);
  return markup;
};
