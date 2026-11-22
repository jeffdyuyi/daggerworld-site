const fs = require('fs');

const html = fs.readFileSync('editor/index.html', 'utf8');

const start = html.indexOf('ws-visual-section');
if (start !== -1) {
  console.log(html.slice(start, start + 2500));
}

