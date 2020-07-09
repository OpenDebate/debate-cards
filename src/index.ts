import { documentToMarkup, markupToTokens, mergeTokens } from 'app/services/convert';

(async () => {
  const SAMPLE_FILE = '/Users/arvindb/Code/debate-cards/src/modules/parser/sample.docx';
  try {
    console.log('foo');
    const markupA = await documentToMarkup(SAMPLE_FILE, { method: 'primary' });
    const markupB = await documentToMarkup(SAMPLE_FILE, { method: 'secondary' });
    const tokensA = markupToTokens(markupA);
    const tokensB = markupToTokens(markupB);
    const mergedTokens = mergeTokens(tokensA, tokensB);
    console.log(mergedTokens);
  } catch (error) {
    console.error(error);
  }
})();
