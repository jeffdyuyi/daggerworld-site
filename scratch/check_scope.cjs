const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const scriptRegex = /<script(?:\s+src="([^"]*)")?>([\s\S]*?)<\/script>/gi;
const scripts = [];
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  if (!match[1]) scripts.push(match[2]);
}

// 检查变量声明
const varNames = {};
scripts.forEach((s, idx) => {
  const matches = s.match(/(?:const|let|var|function)\s+([a-zA-Z0-9_$]+)/g) || [];
  matches.forEach(m => {
    const name = m.split(/\s+/)[1];
    varNames[name] = varNames[name] || [];
    varNames[name].push(idx + 1);
  });
});

console.log('--- 作用域冲突检查 ---');
for (const [name, scriptList] of Object.entries(varNames)) {
  if (scriptList.length > 1) {
    console.log(`Potential variable collision across scripts: ${name} in scripts: ${scriptList.join(', ')}`);
  }
}
console.log('Scope check complete.');

