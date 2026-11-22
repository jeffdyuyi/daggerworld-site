const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

console.log('Total length:', html.length);
console.log('Contains preview-fog-overlay:', html.includes('id="preview-fog-overlay"'));
console.log('Contains preview-atlas-showcase:', html.includes('preview-atlas-showcase'));
console.log('Contains initPreviewFogController:', html.includes('initPreviewFogController'));

// 检查未闭合标签粗略统计
const openDivs = (html.match(/<div[\s>]/g) || []).length;
const closeDivs = (html.match(/<\/div>/g) || []).length;
console.log(`divs: ${openDivs} open, ${closeDivs} close`);

const openSections = (html.match(/<section[\s>]/g) || []).length;
const closeSections = (html.match(/<\/section>/g) || []).length;
console.log(`sections: ${openSections} open, ${closeSections} close`);

const openScripts = (html.match(/<script[\s>]/g) || []).length;
const closeScripts = (html.match(/<\/script>/g) || []).length;
console.log(`scripts: ${openScripts} open, ${closeScripts} close`);

