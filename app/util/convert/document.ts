import mammoth from 'mammoth';
import ch from 'cheerio';
import pandoc from 'node-pandoc-promise';

/* PRIVATE FUNCTIONS */

const openWithPandoc = async (path: string) => {
  await pandoc(path, ['-f', 'docx', '-t', 'html5']);
};

const openWithMammoth = async (path: string) => {
  const { value } = await mammoth.convertToHtml({ path });
  return value;
};

/* PUBLIC FUNCTIONS */

// eslint-disable-next-line import/prefer-default-export
export const documentToMarkup = async (filepath: string, { options }) => {
  switch (options.method) {
    case 'primary':
      return openWithPandoc(filepath);
    case 'secondary':
      return openWithMammoth(filepath);
    default:
      throw new Error('Invalid options');
  }
};
