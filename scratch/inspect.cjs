const fs = require('fs');

const files = ['index.html', 'app.js', 'news-archive.js'];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('深水城2026') || line.includes('衍生') || line.includes('2026')) {
      console.log(`${file}:${idx + 1}: ${line.trim()}`);
    }
  });
});

