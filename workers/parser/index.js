const Promise = require('bluebird');
const pandoc = require('node-pandoc');
const cheerio = require('cheerio');
const path = require('path')
const dir = process.env.FILE_DIR;
const File = require('@file');
const Card = require('@card');

let running = false;

// console.log(`PARSER: ${status}`)
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
			text: item.nextUntil('h1, h2, h3, h4').text(),
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

const handleFile = async (file) => {
  try {		
		await File.model.updateOne({_id:file._id},{status:'parsing'})
    const html = await convert(file);
		const cards = parse(html, file);
		await save(cards);
		await File.model.updateOne({_id:file._id},{status:'complete'})
		return file.name
  } catch (error) {
    console.log(error);
	}
}

const startBatch = async () => {
	running = true;
	const files = await File.model.find({status:'incomplete'}).sort({_id: -1});
	if(files.length>0) {console.log(`PARSER: Processing ${files.length} files`)};
	Promise.map(files, function(file) {
		return handleFile(file)
		.catch(err => {});
	}, {concurrency: 2}).then(function() {
		running = false;
		//console.log("Done!");
	});
}



// poll the db for new files once the queue has drained
setInterval(
	() => {
		if(!running){startBatch()}
	}, 
	process.env.POLL_INTERVAL * 60 * 1000
);
