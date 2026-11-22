const { execSync } = require('child_process');
const orig = execSync('git show HEAD:index.html').toString();
console.log('orig divs:', (orig.match(/<div[\s>]/g)||[]).length, (orig.match(/<\/div>/g)||[]).length);
