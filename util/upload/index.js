const Promise = require('bluebird');
const fs = require('fs');
const request = require('request-promise');
const path = "/Users/arvindb/Desktop/Open\ Source\ 17/";

const getFiles = Promise.promisify((dir, cb) => {
	fs.readdir(dir, cb);
});

const upload = (file, params) => {
  return new Promise(function (resolve , reject) {
    let r = request.post('http://localhost:8080/v2/file', function optionalCallback (err, httpResponse, body) {
    if (err) {
      reject(err)
    }
      resolve(file);
  });
  let form = r.form()
  form.append('file', fs.createReadStream(path+file));
  form.append('set', 'HS Wiki 18')
  });
  
}


(async () => {
	files = await getFiles(path);
	Promise.map(files, function(file) {
		// Promise.map awaits for returned promises as well.
		return upload(file)
		.then(res => console.log(res))
		.catch(err => console.log(err));
	}, {concurrency: 1}).then(function() {
		console.log("Done!");
	});
})()
.catch(err => console.log(err));
