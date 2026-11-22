const fs = require('fs');

const content = fs.readFileSync('news-archive.js', 'utf8');

// 通过正则提取所有新闻项
const arrayMatch = content.match(/const news = (\[[\s\S]*\]);/);
if (!arrayMatch) {
  console.error('Cannot parse news array');
  process.exit(1);
}

// 用 Function 执行解析出数组
const news = new Function(`return ${arrayMatch[1]}`)();

console.log(`Total news items: ${news.length}`);
news.forEach((item, index) => {
  const [category, date, title, ...paragraphs] = item;
  console.log(`[#${index + 1}] [${category}] ${date} | ${title} (paragraphs: ${paragraphs.length})`);
});

