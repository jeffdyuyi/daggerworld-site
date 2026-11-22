const fs = require('fs');

const appJs = fs.readFileSync('editor/app.js', 'utf8');

// 查找装备相关定义与工坊编辑关键词
const keywords = ['weaponSummary', 'equipmentIssue', 'customItem', 'openItemEditor', 'editEquipment', 'renderInventory', 'renderGear'];

keywords.forEach(kw => {
  const count = (appJs.match(new RegExp(kw, 'g')) || []).length;
  console.log(`Keyword "${kw}": count=${count}`);
});

