import { markupToTokens, TextBlock } from './';
import { tokensToMarkup } from './tokens';
import { ParseOne } from 'unzipper';
import fs from 'fs';

/* 
  1 - open document.xml and styles.xml by unzipping .docx file
  2 - tokenize document.xml and pull info on named styles from styles.xml
*/
export const documentToTokens = async (filepath: string): Promise<TextBlock[]> => {
  const document = await loadXml(filepath, /document\.xml$/);
  const styles = await loadXml(filepath, /styles\.xml$/);
  const tokens = markupToTokens(document, styles, { simplifed: false });
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
const loadXml = (path: string, file: RegExp): Promise<string> => {
  return new Promise(resolve => {
    let data = "";
    const stream = fs.createReadStream(path);
    stream
      .pipe(ParseOne(file))
      .on("data", chunk => data += chunk)
      .on("end", () => resolve(data))
  })
}
