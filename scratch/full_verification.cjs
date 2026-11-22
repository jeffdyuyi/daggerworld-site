const fs = require('fs');
const { execSync } = require('child_process');

console.log('--- 1. 语法检查 ---');
try {
  execSync('node --check news-archive.js');
  console.log('news-archive.js: Syntax OK');
} catch (e) {
  console.error('news-archive.js: Syntax Error', e.message);
}

try {
  execSync('node --check session.js');
  console.log('session.js: Syntax OK');
} catch (e) {
  console.error('session.js: Syntax Error', e.message);
}

console.log('--- 2. HTML 核心要素检查 ---');
const html = fs.readFileSync('index.html', 'utf8');
const checks = [
  ['#preview', html.includes('id="preview"')],
  ['#preview-fog-overlay', html.includes('id="preview-fog-overlay"')],
  ['preview-atlas-showcase', html.includes('preview-atlas-showcase')],
  ['Book-FRAiF-218-map-faerun.webp', html.includes('Book-FRAiF-218-map-faerun.webp')],
  ['initPreviewFogController', html.includes('initPreviewFogController')],
  ['isDaggerworldActivated', html.includes('isDaggerworldActivated')],
  ['三局两胜 BO3 STUDIO', html.includes('三局两胜 BO3 STUDIO')],
  ['不咕鸟（哈基米德）', html.includes('不咕鸟（哈基米德）')],
  ['无深水城2026战役', !html.includes('深水城2026战役')],
  ['无衍生项目', !html.includes('衍生项目')],
  ['无羊蹄人', !html.includes('羊蹄人')],
  ['无龙人', !html.includes('龙人')]
];

checks.forEach(([name, passed]) => {
  console.log(`  ${passed ? '✓' : '✗'} ${name}`);
});

console.log('--- 3. 新闻档案检查 ---');
const newsFile = fs.readFileSync('news-archive.js', 'utf8');
const newsChecks = [
  ['无羊蹄人', !newsFile.includes('羊蹄人')],
  ['无龙人', !newsFile.includes('龙人')],
  ['无殿堂级', !newsFile.includes('殿堂级')],
  ['无业界天花板', !newsFile.includes('业界天花板')],
  ['无雷霆之势', !newsFile.includes('雷霆之势')],
  ['无全方位无死角', !newsFile.includes('全方位无死角')],
  ['首篇新闻标题准确', newsFile.includes('《匕首世界》重启测试即将开启')],
  ['时间线2030', newsFile.includes('2030-03-22')]
];

newsChecks.forEach(([name, passed]) => {
  console.log(`  ${passed ? '✓' : '✗'} ${name}`);
});

