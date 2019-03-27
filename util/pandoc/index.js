const {promisify} = require('util');
const tmp = require('tmp-promise');
var pandoc = require('node-pandoc');

module.exports = {
  generateDoc: async docs => {
    const path = await tmp.tmpName({postfix: '.docx' })
    const data = docs.map(doc => doc.card).join('');
    const args = `-f html -t docx -o ${path} --reference-doc ${__dirname}/reference.docx`;
    await promisify(pandoc)(data, args);
    return path;
  }
};
