const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// 检查所有 script 块
const scriptRegex = /<script(?:\s+src="([^"]*)")?>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  count++;
  console.log(`Script ${count}: src=${match[1] || 'inline'}, length=${match[2].length}`);
}

// 检查是否存在重复 id
const idRegex = /\sid="([^"]+)"/g;
const ids = {};
let idMatch;
while ((idMatch = idRegex.exec(html)) !== null) {
  const id = idMatch[1];
  ids[id] = (ids[id] || 0) + 1;
  if (ids[id] > 1) {
    console.log(`Duplicate ID found: "${id}" (count: ${ids[id]})`);
  }
}
console.log('ID check complete.');

