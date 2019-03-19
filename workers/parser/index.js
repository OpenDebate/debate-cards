const Promise = require('bluebird');
const pandoc = require('node-pandoc');
const cheerio = require('cheerio');
const path = require('path')
const dir = process.env.FILE_DIR;
const File = require('@file');
const Card = require('@card');

let status = "running";
console.log(`PARSER: ${status}`)
const convert = Promise.promisify((file, cb) => {
  const fpath = path.join(dir, file.file)
  const args = '-f docx -t html5';
	pandoc(fpath, args, cb);
});

const parse = (html, file)  => {
	cards = [];
	var $ = cheerio.load(html);
	$('h4').each( (i, elem) => {
		var item = $(elem);
		var card = {
			tag: item.text(),
			cite: item.next().contents().filter('strong').text(),
			card: "<h4>"+item.text()+"</h4>"+item.nextUntil('h1, h2, h3, h4').toArray().map(p => "<p>"+$(p).html()+"</p>").join(''),
			set: file.set,
			file: file._id,
			h1: item.prevAll('h1').eq(0).text(),
			h2: item.prevAll('h2').eq(0).text(),
			h3: item.prevAll('h3').eq(0).text(),
			index: i
		};
		cards.push(card);
	});
	return cards;
}

const save = async (cards) => {
	cards.forEach( async card => 
		await 
		Card.controller.add(card)
		.catch(err=>{})
	)
}

const handler = async () => {
  try {
    const files = await File.model.find({status:'incomplete'});
		if (files.length == 0 && status != "stopped") { return };
		console.log(`PARSER: ${files.length} docs in queue`)
    const file = files.slice(-1)[0]
		// console.log(file.name)
		
		await File.model.updateOne({_id:file._id},{status:'parsing'})
		
    const html = await convert(file);
		const cards = parse(html, file);
		await save(cards);

		await File.model.updateOne({_id:file._id},{status:'complete'})
		
  } catch (error) {
    console.log(error);
	}
	handler();
}

// poll the db for new files once the queue has drained
setInterval(
	() => handler(), 
	process.env.POLL_INTERVAL * 60 * 1000
);
