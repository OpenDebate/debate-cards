import { documentToTokens, tokensToMarkup, extractCards } from 'app/helpers';
import { promises as fs } from 'fs';
(async () => {
  const SAMPLE_FILE = '/Users/arvindb/Code/debate-cards/src/modules/parser/sample.docx';
  try {
    const tokens = await documentToTokens(SAMPLE_FILE);
    // const markup = tokensToMarkup(tokens);
    const cards = extractCards(tokens);
    // await fs.writeFile(
    //   './output-doc.html',
    //   `
    //   <style>
    //     em {
    //       text-decoration: underline;
    //       font-style: normal;
    //     }
    //   </style>
    //   ${markup}
    // `,
    // );
    console.log(cards);
  } catch (error) {
    console.error(error);
  }
})();
