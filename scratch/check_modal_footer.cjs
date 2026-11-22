const fs = require('fs');

const html = fs.readFileSync('editor/index.html', 'utf8');
const start = html.indexOf('id="item-action-modal"');
console.log(html.slice(start, start + 700));

