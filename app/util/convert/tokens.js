import mammoth from 'mammoth';
import ch from 'cheerio';
import pandoc from 'node-pandoc-promise';

//  Merge and return output from output pandoc and mammoth
export default async (filePath) => {
  await convertToMarkup(path);
};

// Generate markup using both pandoc and mammoth
const convertToMarkup = async (path) => {
  const mammothConfig = {};

  const markupA = await pandoc(path, ['-f', 'docx', '-t', 'html5']);
  const { value: markupB } = await mammoth.convertToHtml(
    { path },
    mammothConfig,
  );

  return { a: markupA, b: markupB };
};
