const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('龙人')) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});

