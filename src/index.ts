import { documentToTokens, tokensToMarkup, extractCards, tokensToDocument } from 'app/lib';
import { promises as fs } from 'fs';
(async () => {
  const SAMPLE_FILE = '/Users/arvindb/Downloads/file.docx';
  try {
    const tokens = await documentToTokens(SAMPLE_FILE);
    const markup = tokensToMarkup(tokens);
    const cards = extractCards(tokens);
    await fs.writeFile(
      './output-doc.html',
      `
      <style>
        em {
          text-decoration: underline;
          font-style: normal;
        }
      </style>
      ${markup}
    `,
    );
    fs.writeFile('./output-doc.docx', await tokensToDocument(tokens));

    console.log(cards);
  } catch (error) {
    console.error(error);
  }
})();
