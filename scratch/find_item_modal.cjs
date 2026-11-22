const fs = require('fs');

const html = fs.readFileSync('editor/index.html', 'utf8');

const start = html.indexOf('id="item-action-modal"');
if (start !== -1) {
  console.log(html.slice(start, start + 1200));
} else {
  console.log('item-action-modal not found');
}

