const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('史诗') || line.includes('神圣选民')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});

