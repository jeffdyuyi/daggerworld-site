const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Book-FRAiF-218-map-faerun.webp') || line.includes('faerun-atlas-img') || line.includes('preview-atlas-showcase')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});

