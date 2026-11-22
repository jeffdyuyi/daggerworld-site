const fs = require('fs');

// =========================================================================
// 1. 更新 editor/index.html
// =========================================================================
let editorHtml = fs.readFileSync('editor/index.html', 'utf8');

// 1.1 在 item-action-modal 中增加插槽显示区与 GM 编辑按钮
const oldItemModalFooter = `<button class="dw-btn dw-btn-outline" style="color:var(--accent-cinnabar-bright);" id="item-action-delete">🗑️ 丢弃</button>
        <button class="dw-btn dw-btn-gold" id="item-action-use">🧪 使用/消耗 1个</button>`;

const newItemModalFooter = `<button class="dw-btn dw-btn-outline" style="color:var(--accent-cinnabar-bright);" id="item-action-delete">🗑️ 丢弃</button>
        <button class="dw-btn dw-btn-primary gm-only-control" id="item-action-gm-edit" style="display:none;background:linear-gradient(135deg,#7d1c14,#a43825);color:#fff;border-color:#e5b358;">👑 主持人再编辑 / 觉醒</button>
        <button class="dw-btn dw-btn-gold" id="item-action-use">🧪 使用/消耗 1个</button>`;

editorHtml = editorHtml.replace(oldItemModalFooter, newItemModalFooter);

// 1.2 在 item-action-modal 的 desc 后面加上专门的插槽与隐藏成长区
const oldItemModalDesc = `<p id="item-action-desc" style="font-size:13px;color:var(--text-main);"></p>`;
const newItemModalDesc = `<p id="item-action-desc" style="font-size:13px;color:var(--text-main);"></p>
        <div id="item-action-sockets-container" class="gear-socket-bar" style="display:none;"></div>
        <div id="item-action-growth-container" class="gear-growth-display" style="display:none;"></div>`;

editorHtml = editorHtml.replace(oldItemModalDesc, newItemModalDesc);

// 1.3 添加专用的【主持人装备就地再编辑与觉醒弹窗】(#gm-gear-edit-modal)
const gmGearEditModalHtml = `
  <!-- MODAL: GM In-place Gear Editor (主持人装备再编辑与觉醒弹窗) -->
  <div class="dw-modal-backdrop" id="gm-gear-edit-modal" hidden>
    <div class="dw-modal-window" style="max-width:560px;">
      <div class="modal-header">
        <h2 style="display:flex;align-items:center;gap:8px;">
          <span>👑</span>
          <span>主持人装备再编辑 · 授名与觉醒</span>
        </h2>
        <button class="modal-close-btn" id="gm-gear-edit-close">✕</button>
      </div>
      <div class="modal-body" style="display:grid;gap:14px;">
        <div class="f-select-group">
          <label style="font-weight:bold;color:var(--text-gold);">装备授名 / 名称 (Name)</label>
          <input type="text" id="gm-ge-name" class="dw-input" placeholder="输入传奇装备专属名称..." maxlength="60" />
        </div>

        <div class="f-select-group">
          <label style="font-weight:bold;color:var(--text-muted);">描述与功勋铭文 (Description)</label>
          <textarea id="gm-ge-desc" class="dw-input" rows="3" placeholder="装备经历、外观或叙事说明..."></textarea>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:rgba(0,0,0,0.25);padding:10px 14px;border-radius:6px;border:1px solid rgba(229,179,88,0.2);">
          <div class="f-select-group">
            <label style="font-size:12px;color:#a3e635;display:flex;align-items:center;gap:4px;">
              <span>ᚱ</span> 符文插槽数量 (Rune Sockets)
            </label>
            <input type="number" id="gm-ge-rune-sockets" class="dw-input" min="0" max="6" value="0" />
            <span style="font-size:11px;color:var(--text-muted);">默认 0 (不开启插槽)</span>
          </div>
          <div class="f-select-group">
            <label style="font-size:12px;color:#38bdf8;display:flex;align-items:center;gap:4px;">
              <span>✦</span> 宝石插槽数量 (Gem Sockets)
            </label>
            <input type="number" id="gm-ge-gem-sockets" class="dw-input" min="0" max="6" value="0" />
            <span style="font-size:11px;color:var(--text-muted);">默认 0 (不开启插槽)</span>
          </div>
        </div>

        <div style="background:linear-gradient(145deg,rgba(45,15,12,0.4),rgba(20,10,8,0.7));padding:12px 14px;border-radius:6px;border:1px solid #7d2318;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <label style="font-weight:bold;color:#f59e0b;font-size:13px;display:flex;align-items:center;gap:6px;">
              <span>🔒</span> 隐藏成长词条 / 觉醒潜能
            </label>
            <label style="font-size:12px;color:#fbbf24;cursor:pointer;display:flex;align-items:center;gap:6px;">
              <input type="checkbox" id="gm-ge-hidden-active" checked />
              <span>对玩家隐藏此词条 (仅GM可见)</span>
            </label>
          </div>
          <textarea id="gm-ge-growth-text" class="dw-input" rows="2" placeholder="例如：当击杀深渊首领后解锁：造成冰霜伤害+2；或特定剧情点唤醒的能力..."></textarea>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
            勾选隐藏后，普通玩家界面完全不可见此属性；取消勾选后正式向玩家公开觉醒。
          </div>
        </div>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:space-between;">
        <button class="dw-btn dw-btn-outline" id="gm-gear-edit-cancel">取消</button>
        <button class="dw-btn dw-btn-gold" id="gm-gear-edit-save">💾 保存修改并生效</button>
      </div>
    </div>
  </div>
`;

// 插入到 </body> 之前
editorHtml = editorHtml.replace('</body>', `${gmGearEditModalHtml}\n</body>`);

// 1.4 在工坊装备编辑表单中增加【💎 插槽与隐藏成长潜能 (GM专属)】区域
const wsSocketsFormHtml = `
            <!-- 4. 符文宝石插槽与隐藏成长潜能 (GM专属) -->
            <div class="f-select-group ws-col-span-2" style="background:rgba(0,0,0,0.2);border:1px solid rgba(229,179,88,0.25);border-radius:6px;padding:12px 14px;margin-top:6px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <strong style="color:var(--text-gold);font-size:13px;display:flex;align-items:center;gap:6px;">
                  <span>💎</span> 符文宝石插槽与隐藏成长潜能 (GM)
                </strong>
                <span class="ws-calc-subhint">默认不开启插槽；隐藏词条对普通玩家不可见</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
                <div>
                  <label style="font-size:12px;color:#a3e635;">ᚱ 符文插槽数量 (Rune Sockets)</label>
                  <input type="number" id="ws-rune-sockets" class="dw-input" min="0" max="6" value="0" style="margin-top:4px;" />
                </div>
                <div>
                  <label style="font-size:12px;color:#38bdf8;">✦ 宝石插槽数量 (Gem Sockets)</label>
                  <input type="number" id="ws-gem-sockets" class="dw-input" min="0" max="6" value="0" style="margin-top:4px;" />
                </div>
              </div>
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <label style="font-size:12px;color:#f59e0b;">🔒 隐藏成长词条 / 觉醒潜能</label>
                  <label style="font-size:11px;color:#fbbf24;cursor:pointer;display:flex;align-items:center;gap:4px;">
                    <input type="checkbox" id="ws-hidden-growth-active" checked />
                    <span>对玩家隐藏此词条</span>
                  </label>
                </div>
                <input type="text" id="ws-hidden-growth-text" class="dw-input" placeholder="例如：斩杀龙类生物后觉醒：伤害掷骰+1d4" />
              </div>
            </div>
`;

// 插入在 ws-visual-section 之后
editorHtml = editorHtml.replace('<!-- 3. 图像与纸娃娃穿戴外观选择 (可视化挑选) -->', `${wsSocketsFormHtml}\n                <!-- 3. 图像与纸娃娃穿戴外观选择 (可视化挑选) -->`);

fs.writeFileSync('editor/index.html', editorHtml, 'utf8');
console.log('editor/index.html updated successfully with sockets and GM gear editor modal!');

// =========================================================================
// 2. 更新 editor/app.css
// =========================================================================
let appCss = fs.readFileSync('editor/app.css', 'utf8');

const socketsCss = `
/* 符文与宝石插槽样式 */
.gear-socket-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 10px 0;
  padding: 8px 12px;
  background: rgba(15, 8, 7, 0.75);
  border: 1px solid rgba(229, 179, 88, 0.25);
  border-radius: 6px;
}
.socket-title {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: bold;
}
.socket-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: .05em;
}
.socket-pill.rune {
  background: rgba(163, 230, 53, 0.12);
  color: #bef264;
  border: 1px dashed rgba(163, 230, 53, 0.5);
}
.socket-pill.gem {
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc;
  border: 1px dashed rgba(56, 189, 248, 0.5);
}

/* 隐藏成长词条样式 */
.gear-growth-display {
  margin: 8px 0;
}
.gm-hidden-growth-tag {
  background: linear-gradient(135deg, rgba(80, 20, 15, 0.35) 0%, rgba(30, 15, 12, 0.6) 100%);
  border: 1px dashed #f59e0b;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  color: #fde68a;
  line-height: 1.6;
}
.player-awakened-growth-tag {
  background: rgba(229, 179, 88, 0.12);
  border: 1px solid rgba(229, 179, 88, 0.4);
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  color: #fef08a;
  line-height: 1.6;
}
`;

appCss += `\n${socketsCss}\n`;
fs.writeFileSync('editor/app.css', appCss, 'utf8');
console.log('editor/app.css updated with socket and growth styles!');

