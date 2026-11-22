const fs = require('fs');

// 1. 扫描 news-archive.js 中的地名穿越
const newsText = fs.readFileSync('news-archive.js', 'utf8');
const newsLines = newsText.split('\n');

console.log('--- 检查 news-archive.js 中的超前地名穿越 ---');
newsLines.forEach((line, i) => {
  if (line.includes('深水城') || line.includes('剑湾') || line.includes('费伦') || line.includes('博德之门') || line.includes('托瑞尔')) {
    console.log(`L${i+1}: ${line.trim()}`);
  }
});

// 2. 扫描真实数据库中的领域卡
const db = JSON.parse(fs.readFileSync('editor/data/database.json', 'utf8'));
console.log('\n--- 真实数据库中的领域卡总数 ---', (db.domain_cards || []).length);
const domainSamples = {};
(db.domain_cards || []).forEach(card => {
  domainSamples[card.领域] = domainSamples[card.领域] || [];
  if (domainSamples[card.领域].length < 5) {
    domainSamples[card.领域].push(`${card.名称} (Lv${card.等级})`);
  }
});
for (const [dom, list] of Object.entries(domainSamples)) {
  console.log(`[${dom}]: ${list.join(', ')}`);
}

