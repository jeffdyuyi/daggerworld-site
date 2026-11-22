const fs = require('fs');

const newsContent = fs.readFileSync('news-archive.js', 'utf8');
const htmlContent = fs.readFileSync('index.html', 'utf8');

console.log('--- 种族名一致性检查 ---');
console.log('news-archive has 羊蹄人:', newsContent.includes('羊蹄人'));
console.log('index.html has 羊蹄人:', htmlContent.includes('羊蹄人'));
console.log('news-archive has 龙人:', newsContent.includes('龙人'));

console.log('--- 浮夸词汇分布 ---');
const buzzwords = ['殿堂级', '史诗', '颠覆性', '业界天花板', '雷霆之势', '至高桂冠', '全方位无死角', '金牌标杆', '无可撼动', '横扫全球', '神圣选民'];
buzzwords.forEach(w => {
  const countInNews = (newsContent.match(new RegExp(w, 'g')) || []).length;
  const countInHtml = (htmlContent.match(new RegExp(w, 'g')) || []).length;
  if (countInNews > 0 || countInHtml > 0) {
    console.log(`Word "${w}": news=${countInNews}, html=${countInHtml}`);
  }
});

