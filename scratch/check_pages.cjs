const fs = require('fs');

const files = ['index.html', 'account.html', 'editor/index.html'];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  console.log(`=== ${f} ===`);
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('深水城') || l.includes('衍生项目') || l.includes('2026') || l.includes('匕首心')) {
      console.log(`  L${i+1}: ${l.trim()}`);
    }
  });
});

