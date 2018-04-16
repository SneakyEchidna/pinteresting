const PDK = require('node-pinterest');
const fs = require('fs');
const https = require('https');
let mkdirp = require('mkdirp');
let pinterest = PDK.init('YOUR_TOKEN_HERE');

let board = `${process.argv[2]}`; //'username/board'
let dir = `./${board}/`;
mkdirp(dir, (err) => {
  if (err) console.error(err);
  else console.log(`dir ${dir} created`);
});
let links = [];
let pinsLink = `https://api.pinterest.com/v1/boards/${board}/pins/`;

const writeFile = (links) =>
  fs.writeFile('links', links.join('\n'), (err) => {
    if (err) {
      return console.log(err);
    }
    console.log('The links file was saved!');
  });

const download = (url, dest, cb) => {
  let file = fs.createWriteStream(dest);
  let request = https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      cb();
    });
  });
};

const promiseWhile = (data, condition, action) => {
  let whilst = (data) => {
    return condition(data) ? action(data).then(whilst) : Promise.resolve(data);
  };
  return whilst(data);
};
const getImageLink = (data) => data.data.map((data) => data.image.original.url);
const getImages = (link) =>
  new Promise((resolve, reject) => {
    let options = {
      qs: {
        fields: 'image',
        limit: 100,
      },
    };
    let reg = RegExp(/^[^&]+/g);
    let parsedLink = reg.exec(link);
    pinterest.api(parsedLink[0], options).then((data) => {
      links.push(getImageLink(data));
      promiseWhile(
        data.page.next,
        (data) => typeof data === 'string',
        getImages
      ).then(() => resolve());
    });
  });
let i = 0;
// let nameReg = RegExp(/(?:[^/][\d\w\.]+)$(?<=(?:.jpg)|(?:.png)|(?:.gif)|(?:.jpeg))/g)
getImages(pinsLink).then(() =>
  require('async').eachLimit(
    links.reduce((acc, e) => acc.concat(e), []),
    5,
    (url, next) => {
      download(url, `./${board}/${i++}.${url.slice(-3)}`, next);
    },
    () => {
      console.log('Download finished');
    }
  )
);
