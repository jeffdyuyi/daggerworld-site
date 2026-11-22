const fs = require('fs');

let html = fs.readFileSync('editor/index.html', 'utf8');
html = html.replace(/app\.css\?v=[a-zA-Z0-9_-]+/g, 'app.css?v=20261122-legendary');
html = html.replace(/app\.js\?v=[a-zA-Z0-9_-]+/g, 'app.js?v=20261122-legendary');

fs.writeFileSync('editor/index.html', html, 'utf8');
console.log('editor/index.html cache version updated to 20261122-legendary!');

