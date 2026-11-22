const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const scriptRegex = /<script(?:\s+src="([^"]*)")?>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  count++;
  if (!match[1]) {
    const lines = match[2].trim().split('\n');
    console.log(`=== Inline Script ${count} (total lines: ${lines.length}) ===`);
    console.log('Start:', lines.slice(0, 5).join('\n'));
    console.log('...');
    console.log('End:', lines.slice(-5).join('\n'));
  }
}

