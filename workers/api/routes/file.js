const controller = require('@file').controller
const path = require('path');
const dir = process.env.FILE_DIR;
const multer = require('multer');
const uuidv4 = require('uuid/v4');
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, dir);
	},
	filename: (req, file, cb) => {
		const newFilename = `${uuidv4()}${path.extname(file.originalname)}`;
		cb(null, newFilename);
	},
});

const upload = multer({ storage });

module.exports = (app) => {
	app.post('/file', upload.single('file'), async (req, res) => {
		let result = {
      error: null,
      status: 200,
      data: null
    }
    try {
      const {originalname, filename} = req.file
      const data = await controller.add({...req.body, name:originalname, file:filename});
      result.data = data;
    } catch (error) {
      result.status = 400;
      console.error(error)
      result.error = error;
    } finally {
      res.status(result.status).send(result)
		}
	})

};

// const save = Promise.promisify((data, cb) => {
//     args = '-f html -t docx -o parse/output.docx --reference-doc parse/reference.docx';
// 	pandoc(data, args, cb);
// });