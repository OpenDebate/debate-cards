import { markupToTokens, TextBlock } from './';
import { tokensToMarkup } from './tokens';
import { ParseOne } from 'unzipper';
import fs from 'fs';

/* 
  1 - open document.xml and styles.xml by unzipping .docx file
  2 - tokenize document.xml and pull info on named styles from styles.xml
*/
export const documentToTokens = (filepath: string): Promise<TextBlock[]> =>
  new Promise((resolve, reject) => {
    const document = loadXml(filepath, /document\.xml$/).on('error', reject);
    const styles = loadXml(filepath, /styles\.xml$/).on('error', reject);
    markupToTokens(document, styles, { simplified: true }).then(resolve).catch(reject);
  });

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
const loadXml = (path: string, file: RegExp) => fs.createReadStream(path).pipe(ParseOne(file));
