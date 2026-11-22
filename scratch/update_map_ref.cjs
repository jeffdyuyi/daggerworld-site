const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const targetUrl = 'https://huiji-public.huijistatic.com/dnd/uploads/5/5f/Book-FRAiF-218-map-faerun.webp';

// 1. 替换 img 标签
const oldImg = `<img id="faerun-atlas-img" src="./assets/Book-FRAiF-218-map-faerun.webp" alt="费伦大陆全景大地图" loading="eager" onerror="handleAtlasMapError(this)" />`;
const newImg = `<img id="faerun-atlas-img" src="${targetUrl}" alt="费伦大陆全景大地图" loading="eager" referrerpolicy="no-referrer" onerror="handleAtlasMapError(this)" />`;

html = html.replace(oldImg, newImg);

// 2. 替换全屏原图链接
const oldZoom = `<a href="./assets/Book-FRAiF-218-map-faerun.webp" target="_blank" class="atlas-btn" id="atlas-zoom-link">🔍 打开全屏高清图卷</a>`;
const newZoom = `<a href="${targetUrl}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" class="atlas-btn" id="atlas-zoom-link">🔍 查看全屏超清大图</a>`;

html = html.replace(oldZoom, newZoom);

// 3. 优化 handleAtlasMapError 逻辑：先尝试本地 fallback，本地也失败才显示 fallback 卡片
const oldHandler = `function handleAtlasMapError(img) {
  img.style.display = 'none';
  const fallback = document.getElementById('atlas-fallback-box');
  if (fallback) fallback.style.display = 'block';
}`;

const newHandler = `function handleAtlasMapError(img) {
  if (!img.dataset.fallbackTried) {
    img.dataset.fallbackTried = 'true';
    img.src = './assets/Book-FRAiF-218-map-faerun.webp';
    return;
  }
  img.style.display = 'none';
  const fallback = document.getElementById('atlas-fallback-box');
  if (fallback) fallback.style.display = 'block';
}`;

html = html.replace(oldHandler, newHandler);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated map reference in index.html!');

