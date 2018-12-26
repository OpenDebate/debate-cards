const db = require('../util/db.js');
const {promisify} = require('util');
const {ObjectId} = require('mongodb');
const tmp = require('tmp-promise');
var pandoc = require('node-pandoc');

module.exports = (app) => {
	app.post('/save', async (req, res) => {
		var ids = req.body.ids.map(
			x => ObjectId(x)
		);
		try {
			const docs = await db.getConnection()
				.collection("cards_4")
				.aggregate(
					[
						{ $match: { _id: { $in: ids } } },
						//idek what this does - some black magic to preserve order
						{$addFields: {"__order": {$indexOfArray: [ids, "$_id" ]}}},
						{$sort: {"__order": 1}}
					]            
				)
				.toArray()
			
			const path = await tmp.tmpName({postfix: '.docx' })
			const data = docs.map(doc => doc.fullCard).join('');
			const args = '-f html -t docx -o '+path+' --reference-doc parse/reference.docx';
			await promisify(pandoc)(data, args)
			res.sendFile(path);
		} catch (error) {
			res.status(500);
		}
	})
};

// const save = Promise.promisify((data, cb) => {
//     args = '-f html -t docx -o parse/output.docx --reference-doc parse/reference.docx';
// 	pandoc(data, args, cb);
// });