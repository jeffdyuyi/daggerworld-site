const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('进入匕首世界') || line.includes('苍穹之枪') || line.includes('幽域崛起') || line.includes('月之挽歌') || line.includes('烈焰战旗') || line.includes('？？？')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

