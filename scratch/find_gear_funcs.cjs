const fs = require('fs');

const appJs = fs.readFileSync('editor/app.js', 'utf8');
const lines = appJs.split('\n');

lines.forEach((line, i) => {
  if (line.includes('function ') && (line.includes('Item') || line.includes('Equip') || line.includes('Gear') || line.includes('Workshop') || line.includes('Inventory'))) {
    console.log(`L${i+1}: ${line.trim()}`);
  }
});

