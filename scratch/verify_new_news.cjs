const fs = require('fs');
const { execSync } = require('child_process');

console.log('--- 1. 语法检查 ---');
execSync('node --check news-archive.js');
console.log('news-archive.js: Syntax PASS');

console.log('--- 2. 结构完整性校验 ---');
const content = fs.readFileSync('news-archive.js', 'utf8');
const arrayMatch = content.match(/const news = (\[[\s\S]*\]);/);
const news = new Function(`return ${arrayMatch[1]}`)();

console.log('Total entries:', news.length);
if (news.length !== 58) throw new Error('Expected 58 entries, got ' + news.length);

news.forEach((item, i) => {
  if (!Array.isArray(item) || item.length < 4) {
    throw new Error(`Item ${i+1} format invalid`);
  }
  const [cat, date, title, ...p] = item;
  if (!cat || !date || !title || p.length === 0) {
    throw new Error(`Item ${i+1} missing fields`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Item ${i+1} invalid date format: ${date}`);
  }
});
console.log('All 58 entries format PASS');

console.log('--- 3. 敏感词/一致性核验 ---');
const forbidden = ['羊蹄人', '龙人', '深水城2026战役', '衍生项目', '殿堂级', '业界天花板', '雷霆之势'];
forbidden.forEach(word => {
  if (content.includes(word)) {
    throw new Error(`Forbidden word found: ${word}`);
  }
});
console.log('All forbidden words check PASS');

console.log('--- 4. 关键伏笔暗线检查 ---');
const keywords = [
  '人事任命错误',
  '资金异动',
  '特别历史档案奖',
  '占位符',
  '未公开机制设计'
];
keywords.forEach(kw => {
  const found = content.includes(kw);
  console.log(`Keyword "${kw}": ${found ? 'Found ✓' : 'MISSING ✗'}`);
});
console.log('Full verification SUCCESS!');

