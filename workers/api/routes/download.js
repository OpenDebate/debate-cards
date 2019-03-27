const Card = require('@card');
const {pandoc} = require('@util');

module.exports = (app) => {
	app.post('/download', async (req, res) => {
	
		try {
			const {ids} = req.body;

			const docs = await Card.controller.getMany({ids})
			console.log(docs);
			const path = await pandoc.generateDoc(docs)
			res.sendFile(path);
		} catch (error) {
			console.error(error)
			res.status(400).send();
		}
	})
};

// const save = Promise.promisify((data, cb) => {
//     args = '-f html -t docx -o parse/output.docx --reference-doc parse/reference.docx';
// 	pandoc(data, args, cb);
// });