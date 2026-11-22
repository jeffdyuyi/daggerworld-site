const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/news-archive\.js\?v=[a-zA-Z0-9_-]+/g, 'news-archive.js?v=20261122h');
fs.writeFileSync('index.html', html, 'utf8');
console.log('Updated index.html to 20261122h');

