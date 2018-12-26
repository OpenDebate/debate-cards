var pandoc = require('node-pandoc');
const Promise = require('bluebird');
var fs = require('fs');
var cheerio = require('cheerio');
const db = require('../db.js');
var crypto = require('crypto');

const getFiles = Promise.promisify((dir, cb) => {
	fs.readdir(dir, cb);
});

const convert = Promise.promisify((filePath, cb) => {
	// src = 'parse/docsA.docx',
    args = '-f docx -t html5';
	pandoc(filePath, args, cb);
});

function parse(html, file) {
	cards = [];
	var $ = cheerio.load(html);
	$('h4').each( (i, elem) => {
		var item = $(elem);
		var card = {
			tag: item.text(),
			cite: item.next().contents().filter('strong').text(),
			hash: crypto.createHash('md5').update(item.text()+item.next().contents().filter('strong').text()).digest('hex'),
			fullCard: "<h4>"+item.text()+"</h4>"+item.nextUntil('h1, h2, h3, h4').toArray().map(p => "<p>"+$(p).html()+"</p>").join(''),
			set: "Open Ev 2018",
			fileName: file,
			pocket: item.prevAll('h1').eq(0).text(),
			hat: item.prevAll('h2').eq(0).text(),
			block: item.prevAll('h3').eq(0).text(),
			index: i
		};
		if (validateCard(card)){
			cards.push(card);
		}
	});
	return cards;
}

function validateCard(card){
	const hasTag = card.tag.length > 2;
	const hasContent = (card.fullCard.length - card.tag.length) > 100;
	return (hasTag && hasContent);
}

function insertCards(cards) { 
	cards.forEach(card => {
		db
		.getConnection()
		.collection('cards_4')
		.update({hash:card.hash}, card, {upsert: true});
	});
}

const save = Promise.promisify((data, cb) => {
    args = '-f html -t docx -o parse/output.docx --reference-doc parse/reference.docx';
	pandoc(data, args, cb);
});

const docMagic = async (file) => {
	const fileName = file.split('/').pop();
	const html = await convert(file).catch(err => {throw err;});
	const cards = parse(html, fileName);
	insertCards(cards);
	return fileName;
};

while(!db.isAvailable) {}; // really shity hack to wait on db, will fix later with Promise

(async () => {
	const path = "/Users/arvindb/Code/openev-downloader/Download/";
	files = await getFiles(path);
	Promise.map(files, function(file) {
		// Promise.map awaits for returned promises as well.
		return docMagic(path+file)
		.then(res => console.log(res))
		.catch(err => console.log(err));
	}, {concurrency: 8}).then(function() {
		console.log("Done!");
	});
})()
.catch(err => console.log(err));
