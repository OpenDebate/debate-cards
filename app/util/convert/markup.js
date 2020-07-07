import mammoth from 'mammoth';
import ch from 'cheerio';
import pandoc from 'node-pandoc-promise';

/* PRIVATE FUNCTIONS */
const openWithPandoc = async (path) => {
  await pandoc(path, ['-f', 'docx', '-t', 'html5']);
};

const openWithMammoth = async (path) => {
  const { value: markupB } = await mammoth.convertToHtml(
    { path },
    mammothConfig,
  );
};

/* PUBLIC FUNCTIONS */
export const markupToTokens = async (
  filepath,
  options = { method: 'primary' },
) => {
  switch (options.method) {
    case 'primary':
      return;
      break;

    default:
      break;
  }
};
