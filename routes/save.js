const db = require('../db.js');
const {ObjectId} = require('mongodb');
const tmp = require('tmp');
var pandoc = require('node-pandoc');

module.exports = (app) => {
	app.post('/save', (req, res) => {
		var ids = req.body.ids.map(
			x => ObjectId(x)
		);
		db.getConnection()
		.collection("cards_4")
		.aggregate(
			[
				{ $match: { _id: { $in: ids } } },
				//idek what this does - some black magic to preserve order
				{$addFields: {"__order": {$indexOfArray: [ids, "$_id" ]}}},
				{$sort: {"__order": 1}}
			]            
		)
		.toArray(function(err, docs) {
			tmp.tmpName({postfix: '.docx' },
			function _tempNameGenerated(err, path) {
				if (err) throw err;
				var data = docs.map(doc => doc.fullCard).join('');
				var args = '-f html -t docx -o '+path+' --reference-doc parse/reference.docx';
				pandoc(data, args, (err, out) => {
					res.sendFile(path);
				});
			  });
			
		});
	});
};

// const save = Promise.promisify((data, cb) => {
//     args = '-f html -t docx -o parse/output.docx --reference-doc parse/reference.docx';
// 	pandoc(data, args, cb);
// });