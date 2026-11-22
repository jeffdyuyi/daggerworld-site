const fs = require('fs');

const css = fs.readFileSync('editor/app.css', 'utf8');
console.log('app.css length:', css.length);
console.log('has ws-visual-section:', css.includes('ws-visual-section'));

