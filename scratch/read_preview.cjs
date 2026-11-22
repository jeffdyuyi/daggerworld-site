const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const start = html.indexOf('<section id="preview"');
const end = html.indexOf('</section>', start);
console.log(html.slice(start, start + 1200));

