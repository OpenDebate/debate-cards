import { markupToTokens, TextBlock } from './';
import { tokensToMarkup } from './tokens';
import { ParseOne } from 'unzipper';
import fs from 'fs';

/* 
  1 - open document.xml and styles.xml by unzipping .docx file
  2 - tokenize document.xml and pull info on named styles from styles.xml
*/
export const documentToTokens = async (filepath: string): Promise<TextBlock[]> => {
  const document = loadXml(filepath, /document\.xml$/);
  const styles = loadXml(filepath, /styles\.xml$/);
  const tokens = await markupToTokens(document, styles, { simplified: true });
  return tokens;
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

// Load xml by unzipping docx file, file is regex for file name to look for
const loadXml = (path: string, file: RegExp) =>
  fs.createReadStream(path).pipe(ParseOne(file)).on('error', console.error);
