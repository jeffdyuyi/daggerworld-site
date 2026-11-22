const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. 样式增强
const fogCss = `
/* 资料片预告迷雾与费伦大陆全景大地图展示 */
#preview.fog-locked {
  position: relative;
  min-height: 85vh;
  overflow: hidden;
}
.preview-fog-overlay {
  position: absolute;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  backdrop-filter: blur(22px) brightness(0.6) saturate(1.2);
  -webkit-backdrop-filter: blur(22px) brightness(0.6) saturate(1.2);
  background: radial-gradient(circle at 50% 35%, rgba(28, 18, 24, 0.82) 0%, rgba(15, 10, 14, 0.96) 75%),
              radial-gradient(circle at 15% 85%, rgba(68, 32, 45, 0.5) 0%, transparent 60%),
              radial-gradient(circle at 85% 15%, rgba(35, 45, 68, 0.5) 0%, transparent 60%);
  transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 1.2s;
  animation: fogShift 16s ease-in-out infinite alternate;
}
@keyframes fogShift {
  0% { filter: contrast(100%) brightness(100%); }
  50% { filter: contrast(115%) brightness(92%); }
  100% { filter: contrast(105%) brightness(108%); }
}
.preview-fog-overlay.fog-dispersing {
  opacity: 0 !important;
  transform: scale(1.06) !important;
  pointer-events: none !important;
}
.fog-seal-card {
  max-width: 540px;
  width: 100%;
  background: linear-gradient(145deg, #2a1614 0%, #170b09 100%);
  border: 2px solid var(--gold);
  border-radius: 8px;
  padding: clamp(24px, 5vw, 40px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.8), 0 0 35px rgba(229, 179, 88, 0.25);
  text-align: center;
  color: #eedcc6;
  position: relative;
  overflow: hidden;
}
.fog-seal-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, transparent, #ffd885, transparent);
}
.fog-seal-rune {
  font-size: 38px;
  margin-bottom: 12px;
  display: inline-block;
  filter: drop-shadow(0 0 10px rgba(229, 179, 88, 0.6));
}
.fog-seal-badge {
  display: inline-block;
  background: #5c1813;
  color: #ffe6d6;
  border: 1px solid #a43825;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 4px;
  letter-spacing: .15em;
  font-weight: bold;
  margin-bottom: 14px;
}
.fog-seal-card h3 {
  font-size: clamp(22px, 3.5vw, 28px);
  color: #f7e6c4;
  margin: 0 0 14px;
  letter-spacing: .06em;
}
.fog-seal-card p {
  font-size: 14px;
  line-height: 1.8;
  color: #c7b59e;
  margin: 0 0 24px;
}
.fog-input-group {
  display: flex;
  gap: 8px;
  max-width: 440px;
  margin: 0 auto 16px;
}
.fog-input-group input {
  flex: 1;
  background: rgba(15, 8, 7, 0.8);
  border: 1px solid #795348;
  border-radius: 4px;
  color: #fff;
  padding: 10px 14px;
  font-size: 15px;
  letter-spacing: .1em;
  text-align: center;
  outline: none;
  transition: border-color .2s;
}
.fog-input-group input:focus {
  border-color: var(--gold);
  box-shadow: 0 0 8px rgba(229, 179, 88, 0.4);
}
.fog-unlock-btn {
  background: linear-gradient(135deg, #a43825 0%, #7d1c14 100%);
  color: #fff !important;
  font-weight: bold;
  border: 1px solid #d45942;
  border-radius: 4px;
  padding: 10px 20px;
  cursor: pointer;
  white-space: nowrap;
  transition: all .2s;
}
.fog-unlock-btn:hover {
  background: linear-gradient(135deg, #c24630 0%, #94251c 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,.5);
}
.fog-hint {
  font-size: 12px;
  color: #9e8a75;
  margin-top: 14px;
}
.fog-hint a {
  color: #e5b358;
  text-decoration: underline;
}
.fog-error-msg {
  color: #ff8570;
  font-size: 12px;
  margin-top: 8px;
  min-height: 18px;
}

/* 费伦大陆全景大地图展示栏 */
.preview-atlas-showcase {
  background: #20110e;
  border: 2px solid var(--gold);
  border-radius: 8px;
  padding: 18px clamp(12px, 3vw, 24px);
  margin-bottom: 24px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.35);
}
.atlas-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(229, 179, 88, 0.25);
  margin-bottom: 16px;
}
.atlas-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.atlas-badge {
  background: #6a1a12;
  color: #ffe6d6;
  border: 1px solid #b83a2a;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: .08em;
}
.atlas-title-group h3 {
  color: #f7e6c4;
  margin: 0;
  font-size: clamp(17px, 2.5vw, 22px);
  letter-spacing: .04em;
}
.atlas-subtitle {
  color: #c7b59e;
  font-size: 13px;
  margin-left: 6px;
}
.atlas-map-wrapper {
  position: relative;
  background: #140a08;
  border: 1px solid #6b4c3b;
  border-radius: 6px;
  overflow: hidden;
  text-align: center;
}
.atlas-map-wrapper img {
  width: 100%;
  max-height: 620px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
  transition: transform 0.3s ease;
  background: #110807;
}
.atlas-map-wrapper img:hover {
  transform: scale(1.015);
}
.atlas-map-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(20, 10, 8, 0.85);
  border-top: 1px solid rgba(229, 179, 88, 0.2);
}
.atlas-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #4a1f18;
  border: 1px solid #9c6d3d;
  color: #f7e6c4 !important;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: bold;
  text-decoration: none !important;
  transition: all .2s;
}
.atlas-btn:hover {
  background: #6e2c22;
  border-color: #ffd885;
  color: #fff !important;
}
.atlas-btn.secondary {
  background: rgba(255,255,255,0.06);
  border-color: #6b4c3b;
  color: #dfd2be !important;
}
.atlas-map-fallback {
  padding: 48px 24px;
  background: #1a0e0c;
  color: #dfd2be;
  text-align: center;
}
.fallback-card {
  max-width: 480px;
  margin: 0 auto;
}
.fallback-icon {
  font-size: 42px;
  margin-bottom: 12px;
}
.fallback-card h4 {
  color: #f7e6c4;
  margin: 0 0 10px;
  font-size: 18px;
}
.fallback-card p {
  color: #b5a089;
  font-size: 13px;
  line-height: 1.7;
  margin-bottom: 18px;
}
`;

// 插入 CSS 到 </style> 之前
html = html.replace('</style>', `${fogCss}\n</style>`);

// 2. 插入迷雾遮罩和费伦大陆大地图展示结构
const fogOverlayHtml = `
  <!-- 绝密先行资料片幽影迷雾封印遮罩 -->
  <div id="preview-fog-overlay" class="preview-fog-overlay" style="display:none;">
    <div class="fog-seal-card">
      <div class="fog-seal-rune">📜</div>
      <br>
      <span class="fog-seal-badge">先行资料片绝密封印</span>
      <h3>《遗忘国度》位面迷雾</h3>
      <p>
        次世代资料片《遗忘国度》全景档案正被上古秘法迷雾笼罩。<br>
        该先行探索档案仅面向已激活《匕首世界》重启测试资格的冒险者开放。请输入内测激活码破除迷雾：
      </p>
      <div class="fog-input-group">
        <input type="text" id="fog-passcode-input" placeholder="输入测试资格激活码..." autocomplete="off" />
        <button id="fog-unlock-btn" class="fog-unlock-btn">解开迷雾 ✦</button>
      </div>
      <div id="fog-error-msg" class="fog-error-msg"></div>
      <div class="fog-hint">
        尚未激活资格？可先前往 <a href="./account.html">游戏账号通行证</a> 登记角色或咨询官方内测。
      </div>
    </div>
  </div>
`;

const atlasShowcaseHtml = `
  <!-- 费伦大陆全景大地图绝密测绘 -->
  <div class="preview-atlas-showcase">
    <div class="atlas-header">
      <div class="atlas-title-group">
        <span class="atlas-badge">绝密测绘总图</span>
        <h3>费伦大陆全景地理图卷 (Faerûn Atlas)</h3>
        <span class="atlas-subtitle">—— 迷雾已破除，剑湾与内陆全貌展现</span>
      </div>
      <div class="atlas-quick-nav">
        <span style="font-size:12px;color:#a89582;">次世代《遗忘国度》核心世界地图</span>
      </div>
    </div>
    <div class="atlas-map-wrapper">
      <img id="faerun-atlas-img" src="./assets/Book-FRAiF-218-map-faerun.webp" alt="费伦大陆全景大地图" loading="eager" onerror="handleAtlasMapError(this)" />
      <div id="atlas-fallback-box" class="atlas-map-fallback" style="display:none;">
        <div class="fallback-card">
          <div class="fallback-icon">🗺️</div>
          <h4>费伦全境测绘原图准备就绪</h4>
          <p>
            由于灰机 Wiki 静态 CDN 防盗链保护，浏览器直接外链受限。您可将原图右键另存为至项目 <code>assets/Book-FRAiF-218-map-faerun.webp</code> 即可畅享超清大图！
          </p>
          <a href="https://dnd.huijiwiki.com/wiki/%E6%96%87%E4%BB%B6:Book-FRAiF-218-map-faerun.webp" target="_blank" rel="noopener noreferrer" class="atlas-btn">前往灰机 Wiki 查看高清原图 ↗</a>
        </div>
      </div>
      <div class="atlas-map-toolbar">
        <div>
          <a href="./assets/Book-FRAiF-218-map-faerun.webp" target="_blank" class="atlas-btn" id="atlas-zoom-link">🔍 打开全屏高清图卷</a>
        </div>
        <div>
          <a href="https://dnd.huijiwiki.com/wiki/%E6%96%87%E4%BB%B6:Book-FRAiF-218-map-faerun.webp" target="_blank" rel="noopener noreferrer" class="atlas-btn secondary">灰机 Wiki 原图词条 ↗</a>
        </div>
      </div>
    </div>
  </div>
`;

// 替换 #preview 内部
// 先给 #preview 注入 fogOverlayHtml
html = html.replace('<section id="preview" class="route" hidden>', `<section id="preview" class="route fog-locked" hidden>\n${fogOverlayHtml}`);

// 在 preview-hero-box 之前插入 atlasShowcaseHtml
html = html.replace('<div class="preview-hero-box">', `${atlasShowcaseHtml}\n  <div class="preview-hero-box">`);

// 3. 注入 JS 逻辑
const fogJs = `
// ==========================================
// 资料片预告迷雾封印与激活码解锁系统
// ==========================================
function isDaggerworldActivated() {
  try {
    if (localStorage.getItem('daggerworld.preview.unlocked') === 'true') {
      return true;
    }
    const rawSession = localStorage.getItem('daggerworld.session.v1');
    if (rawSession) {
      const session = JSON.parse(rawSession);
      if (session && (session.user || session.access_token || session.player_name || session.account)) {
        return true;
      }
    }
  } catch (e) {}
  return false;
}

function handleAtlasMapError(img) {
  img.style.display = 'none';
  const fallback = document.getElementById('atlas-fallback-box');
  if (fallback) fallback.style.display = 'block';
}

function syncPreviewFogState() {
  const previewSection = document.getElementById('preview');
  const fogOverlay = document.getElementById('preview-fog-overlay');
  if (!previewSection || !fogOverlay) return;

  const isUnlocked = isDaggerworldActivated();
  if (isUnlocked) {
    previewSection.classList.remove('fog-locked');
    fogOverlay.style.display = 'none';
    fogOverlay.classList.remove('fog-dispersing');
  } else {
    previewSection.classList.add('fog-locked');
    fogOverlay.style.display = 'flex';
    fogOverlay.classList.remove('fog-dispersing');
  }
}

function initPreviewFogController() {
  const fogOverlay = document.getElementById('preview-fog-overlay');
  const input = document.getElementById('fog-passcode-input');
  const unlockBtn = document.getElementById('fog-unlock-btn');
  const errorMsg = document.getElementById('fog-error-msg');
  const previewSection = document.getElementById('preview');

  if (!fogOverlay || !unlockBtn || !input) return;

  function attemptUnlock() {
    const val = (input.value || '').trim();
    if (!val) {
      if (errorMsg) errorMsg.textContent = '请输入内测激活码';
      return;
    }

    // 任何非空激活码尝试，支持标准格式与测试通行证
    if (val.length < 4) {
      if (errorMsg) errorMsg.textContent = '激活码格式无效，长度至少需4位字符';
      return;
    }

    if (errorMsg) errorMsg.textContent = '';
    
    // 标记解锁状态
    try {
      localStorage.setItem('daggerworld.preview.unlocked', 'true');
      localStorage.setItem('daggerworld.preview.passcode', val);
    } catch (e) {}

    // 播放迷雾散去动画
    fogOverlay.classList.add('fog-dispersing');
    setTimeout(() => {
      if (previewSection) previewSection.classList.remove('fog-locked');
      fogOverlay.style.display = 'none';
    }, 1100);
  }

  unlockBtn.addEventListener('click', attemptUnlock);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      attemptUnlock();
    }
  });

  // 初始同步
  syncPreviewFogState();

  // 监听 hash 路由切换
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#preview') {
      syncPreviewFogState();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPreviewFogController);
} else {
  initPreviewFogController();
}
`;

// 插入 JS 逻辑到 </body> 之前的最后一个 <script> 块中
const lastScriptEnd = html.lastIndexOf('</script>');
if (lastScriptEnd !== -1) {
  html = html.slice(0, lastScriptEnd) + `\n${fogJs}\n` + html.slice(lastScriptEnd);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('Successfully injected preview fog and atlas map into index.html');
} else {
  console.error('Cannot find </script>');
}

