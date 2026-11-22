const fs = require('fs');

let appJs = fs.readFileSync('editor/app.js', 'utf8');

// 1. 修改 openItemActionModal(index)
const oldModalLogic = `  el('item-action-title').textContent = item.name;
  const desc = el('item-action-desc');
  desc.innerHTML = renderMarkdown(item.desc || '');`;

const newModalLogic = `  el('item-action-title').textContent = item.name;
  const desc = el('item-action-desc');
  desc.innerHTML = renderMarkdown(item.desc || '');

  // 符文与宝石插槽渲染
  const socketsContainer = el('item-action-sockets-container');
  if (socketsContainer) {
    const runeCount = Math.max(0, Number(item.runeSockets) || 0);
    const gemCount = Math.max(0, Number(item.gemSockets) || 0);
    if (runeCount > 0 || gemCount > 0) {
      let socketsHtml = '<span class="socket-title">💎 插槽开口：</span>';
      for (let i = 0; i < runeCount; i++) {
        socketsHtml += '<span class="socket-pill rune">ᚱ 符文槽 [未刻印]</span>';
      }
      for (let i = 0; i < gemCount; i++) {
        socketsHtml += '<span class="socket-pill gem">✦ 宝石槽 [未镶嵌]</span>';
      }
      socketsContainer.innerHTML = socketsHtml;
      socketsContainer.style.display = 'flex';
    } else {
      socketsContainer.innerHTML = '';
      socketsContainer.style.display = 'none';
    }
  }

  // 隐藏成长词条渲染与 GM 控制
  const isGm = currentUser?.role === 'gm' || Boolean(isGmOverrideActive);
  const growthContainer = el('item-action-growth-container');
  if (growthContainer) {
    growthContainer.innerHTML = '';
    const hasGrowth = Boolean(item.hiddenGrowth && item.hiddenGrowth.trim());
    const isHidden = item.hiddenGrowthActive ?? true;

    if (hasGrowth) {
      if (isGm) {
        growthContainer.innerHTML = isHidden
          ? \`<div class="gm-hidden-growth-tag">👑 隐藏成长词条 [玩家不可见]: \${escapeHtml(item.hiddenGrowth)}</div>\`
          : \`<div class="player-awakened-growth-tag">🌟 觉醒成长词条: \${escapeHtml(item.hiddenGrowth)}</div>\`;
        growthContainer.style.display = 'block';
      } else if (!isHidden) {
        growthContainer.innerHTML = \`<div class="player-awakened-growth-tag">🌟 觉醒成长词条: \${escapeHtml(item.hiddenGrowth)}</div>\`;
        growthContainer.style.display = 'block';
      } else {
        growthContainer.style.display = 'none';
      }
    } else {
      growthContainer.style.display = 'none';
    }
  }

  // GM 专属装备再编辑按钮控制
  const gmEditBtn = el('item-action-gm-edit');
  if (gmEditBtn) {
    gmEditBtn.style.display = isGm ? 'inline-flex' : 'none';
    gmEditBtn.onclick = () => {
      el('item-action-modal').hidden = true;
      openGmGearEditor(item, index);
    };
  }`;

appJs = appJs.replace(oldModalLogic, newModalLogic);

// 2. 注入 openGmGearEditor 逻辑与关闭事件
const gmEditorFunctions = `
// ==========================================
// 主持人就地装备再编辑、授名与成长觉醒系统
// ==========================================
let activeGmEditItem = null;
let activeGmEditIndex = null;

function openGmGearEditor(item, index) {
  if (!item) return;
  activeGmEditItem = item;
  activeGmEditIndex = index;

  if (el('gm-ge-name')) el('gm-ge-name').value = item.name || '';
  if (el('gm-ge-desc')) el('gm-ge-desc').value = item.desc || '';
  if (el('gm-ge-rune-sockets')) el('gm-ge-rune-sockets').value = item.runeSockets ?? 0;
  if (el('gm-ge-gem-sockets')) el('gm-ge-gem-sockets').value = item.gemSockets ?? 0;
  if (el('gm-ge-growth-text')) el('gm-ge-growth-text').value = item.hiddenGrowth || '';
  if (el('gm-ge-hidden-active')) el('gm-ge-hidden-active').checked = item.hiddenGrowthActive ?? true;

  el('gm-gear-edit-modal').hidden = false;
}

function closeGmGearEditor() {
  if (el('gm-gear-edit-modal')) el('gm-gear-edit-modal').hidden = true;
  activeGmEditItem = null;
  activeGmEditIndex = null;
}

function saveGmGearEdit() {
  if (!activeGmEditItem) return;
  const c = curChar();
  if (!c || !c.sheet) return;

  const newName = el('gm-ge-name')?.value?.trim();
  if (!newName) return alert('装备名称不可为空！');

  activeGmEditItem.name = newName;
  activeGmEditItem.desc = el('gm-ge-desc')?.value?.trim() || '';
  activeGmEditItem.runeSockets = Math.max(0, parseInt(el('gm-ge-rune-sockets')?.value) || 0);
  activeGmEditItem.gemSockets = Math.max(0, parseInt(el('gm-ge-gem-sockets')?.value) || 0);
  activeGmEditItem.hiddenGrowth = el('gm-ge-growth-text')?.value?.trim() || '';
  activeGmEditItem.hiddenGrowthActive = Boolean(el('gm-ge-hidden-active')?.checked);

  // 若该装备已穿戴于 equipment 槽位中，同步更新槽位数据
  if (activeGmEditItem.ownedGearId && c.sheet.equipment) {
    for (const [slotKey, slotItem] of Object.entries(c.sheet.equipment)) {
      if (slotItem && slotItem.ownedGearId === activeGmEditItem.ownedGearId) {
        c.sheet.equipment[slotKey] = { ...slotItem, ...activeGmEditItem };
      }
    }
  }

  saveLocal();
  renderAll();
  closeGmGearEditor();
}

function initGmGearEditorListeners() {
  el('gm-gear-edit-close')?.addEventListener('click', closeGmGearEditor);
  el('gm-gear-edit-cancel')?.addEventListener('click', closeGmGearEditor);
  el('gm-gear-edit-save')?.addEventListener('click', saveGmGearEdit);
}
`;

// 插入到 initWorkshopLayer 之前
appJs = appJs.replace('function initWorkshopLayer() {', `${gmEditorFunctions}\nfunction initWorkshopLayer() {`);

// 3. 在工坊 workshopGear() 与 fillWorkshopGear(item) 中支持读取与回显
const oldWorkshopGearReturn = `  return readGear({
    capacity: Number(el('ws-container-cap')?.value),
    slot: allowedSlots[0] || (passiveInBag ? 'passive' : ''),
    allowedSlots,
    passiveInBag,
    quality,
    avatarVisualId,
    isSuitTier,
    suitTier,
    modifiers
  });`;

const newWorkshopGearReturn = `  const runeSockets = Math.max(0, Number(el('ws-rune-sockets')?.value) || 0);
  const gemSockets = Math.max(0, Number(el('ws-gem-sockets')?.value) || 0);
  const hiddenGrowth = el('ws-hidden-growth-text')?.value?.trim() || '';
  const hiddenGrowthActive = Boolean(el('ws-hidden-growth-active')?.checked);

  return readGear({
    capacity: Number(el('ws-container-cap')?.value),
    slot: allowedSlots[0] || (passiveInBag ? 'passive' : ''),
    allowedSlots,
    passiveInBag,
    quality,
    avatarVisualId,
    isSuitTier,
    suitTier,
    runeSockets,
    gemSockets,
    hiddenGrowth,
    hiddenGrowthActive,
    modifiers
  });`;

appJs = appJs.replace(oldWorkshopGearReturn, newWorkshopGearReturn);

const oldFillWorkshopGearEnd = `  if (el('ws-usage-trigger')) el('ws-usage-trigger').value = triggerVal;
  if (el('ws-usage-cost')) el('ws-usage-cost').value = costVal;
  if (el('ws-usage-charges')) el('ws-usage-charges').value = chargesVal;
}`;

const newFillWorkshopGearEnd = `  if (el('ws-usage-trigger')) el('ws-usage-trigger').value = triggerVal;
  if (el('ws-usage-cost')) el('ws-usage-cost').value = costVal;
  if (el('ws-usage-charges')) el('ws-usage-charges').value = chargesVal;

  // 8. 回显插槽开口与隐藏成长
  if (el('ws-rune-sockets')) el('ws-rune-sockets').value = item.runeSockets ?? 0;
  if (el('ws-gem-sockets')) el('ws-gem-sockets').value = item.gemSockets ?? 0;
  if (el('ws-hidden-growth-text')) el('ws-hidden-growth-text').value = item.hiddenGrowth || '';
  if (el('ws-hidden-growth-active')) el('ws-hidden-growth-active').checked = item.hiddenGrowthActive ?? true;
}`;

appJs = appJs.replace(oldFillWorkshopGearEnd, newFillWorkshopGearEnd);

// 4. 在 init 流程中挂载 initGmGearEditorListeners
appJs = appJs.replace('initWorkshopLayer();', 'initWorkshopLayer();\n  initGmGearEditorListeners();');

fs.writeFileSync('editor/app.js', appJs, 'utf8');
console.log('editor/app.js updated successfully with GM gear in-place editor and socket logic!');

