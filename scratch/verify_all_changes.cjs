const { execSync } = require('child_process');
const fs = require('fs');

console.log('--- 1. JS 语法校验 ---');
try {
  execSync('node --check editor/app.js');
  console.log('editor/app.js: PASS ✓');
} catch (e) {
  console.error('editor/app.js: FAIL ✗', e.message);
}

try {
  execSync('node --check news-archive.js');
  console.log('news-archive.js: PASS ✓');
} catch (e) {
  console.error('news-archive.js: FAIL ✗', e.message);
}

console.log('--- 2. HTML 标签校验 ---');
const html = fs.readFileSync('editor/index.html', 'utf8');
const checks = [
  ['#gm-gear-edit-modal', html.includes('id="gm-gear-edit-modal"')],
  ['#item-action-gm-edit', html.includes('id="item-action-gm-edit"')],
  ['#ws-rune-sockets', html.includes('id="ws-rune-sockets"')],
  ['#ws-hidden-growth-text', html.includes('id="ws-hidden-growth-text"')]
];
checks.forEach(([name, ok]) => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
});

console.log('--- 3. 新闻数量检查 ---');
const newsContent = fs.readFileSync('news-archive.js', 'utf8');
const arrayMatch = newsContent.match(/const news = (\[[\s\S]*\]);/);
const news = new Function(`return ${arrayMatch[1]}`)();
console.log('Total news count:', news.length);

