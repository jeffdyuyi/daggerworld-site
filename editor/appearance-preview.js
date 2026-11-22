export const livePaperdollEnabled = false;

export function showCharacterOutline(target) {
  if (!target) return;
  target.classList?.remove('has-custom-portrait');
  target.replaceChildren();
  const guide = document.createElement('div');
  guide.className = 'empty-portrait-guide';
  guide.innerHTML = `
    <span class="empty-portrait-icon">📷</span>
    <span class="empty-portrait-text">点击上传立绘</span>
    <span class="empty-portrait-sub">支持本地图片与拖拽</span>
  `;
  target.appendChild(guide);
  target.hidden = false;
}

export function showCustomPortrait(target, customPortrait) {
  if (!target || !customPortrait?.dataUrl) return;
  const zoom = Number(customPortrait.zoom) || 1.0;
  const offsetX = Number(customPortrait.offsetX) || 0;
  const offsetY = Number(customPortrait.offsetY) || 0;

  target.classList?.add('has-custom-portrait');
  let img = target.querySelector('.custom-portrait-img');
  if (!img) {
    img = document.createElement('img');
    img.className = 'custom-portrait-img';
    img.decoding = 'async';
    target.replaceChildren(img);
  }
  img.alt = '自定义角色立绘';
  img.src = customPortrait.dataUrl;
  img.style.transform = `scale(${zoom}) translate(${offsetX}%, ${offsetY}%)`;
  target.hidden = false;
}
