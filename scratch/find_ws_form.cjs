const fs = require('fs');

const html = fs.readFileSync('editor/index.html', 'utf8');

const start = html.indexOf('id="ws-item-name"');
if (start !== -1) {
  console.log(html.slice(start - 200, start + 1800));
} else {
  console.log('ws-item-name not found');
}

