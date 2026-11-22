const fs = require('fs');

const newsContent = fs.readFileSync('news-archive.js', 'utf8');
const arrayMatch = newsContent.match(/const news = (\[[\s\S]*\]);/);
const news = new Function(`return ${arrayMatch[1]}`)();

console.log('Original count:', news.length);

const filtered = news.filter(item => {
  const title = item[2] || '';
  if (title.includes('九大领域卡牌协同') || title.includes('九大领域协同') || title.includes('动态战局演进')) {
    console.log('Removing article:', title);
    return false;
  }
  return true;
});

console.log('Filtered count:', filtered.length);

const outContent = `const news = ${JSON.stringify(filtered, null, 2)};\n`;
fs.writeFileSync('news-archive.js', outContent, 'utf8');
console.log('news-archive.js successfully updated!');

