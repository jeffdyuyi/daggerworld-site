const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'scratch' || entry.name === '.gemini') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchDir(full);
    } else if (entry.isFile()) {
      try {
        const content = fs.readFileSync(full, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (line.includes('深水城') || line.includes('衍生项目') || line.includes('B03 STUDIO') || line.includes('三局两胜')) {
            console.log(`${full}:${i+1}: ${line.trim()}`);
          }
        });
      } catch (e) {}
    }
  }
}

searchDir('.');
