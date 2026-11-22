const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const scriptRegex = /<script(?:\s+src="([^"]*)")?>([\s\S]*?)<\/script>/gi;
const scripts = [];
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  if (!match[1]) scripts.push(match[2]);
}

console.log('Script 1 cards context:');
scripts[0].split('\n').forEach((l, i) => {
  if (l.includes('cards') || l.includes('text')) console.log(`  S1:L${i+1}: ${l}`);
});

console.log('Script 2 cards context:');
scripts[1].split('\n').forEach((l, i) => {
  if (l.includes('cards') || l.includes('text')) console.log(`  S2:L${i+1}: ${l}`);
});

