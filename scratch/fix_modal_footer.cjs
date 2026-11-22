const fs = require('fs');

let html = fs.readFileSync('editor/index.html', 'utf8');

const target = `<button class="dw-btn dw-btn-outline" style="color:var(--accent-cinnabar-bright);" id="item-action-delete">🗑️ 丢弃</button>`;
const replacement = `<button class="dw-btn dw-btn-outline" style="color:var(--accent-cinnabar-bright);" id="item-action-delete">🗑️ 丢弃</button>
        <button class="dw-btn dw-btn-primary" id="item-action-gm-edit" style="display:none;background:linear-gradient(135deg,#7d1c14,#a43825);color:#fff;border-color:#e5b358;">👑 主持人再编辑 / 觉醒</button>`;

if (html.includes(target)) {
  html = html.replace(target, replacement);
  fs.writeFileSync('editor/index.html', html, 'utf8');
  console.log('Successfully inserted item-action-gm-edit button!');
} else {
  console.log('Target not found in editor/index.html');
}

