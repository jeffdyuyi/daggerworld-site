export const livePaperdollEnabled = true;

const shapes = {
  tall: { label: '高大型', ancestries: ['巨人', '费尔博格', '费尔伯格', '龙人', '龙裔', '兽人'] },
  short: { label: '矮小型', ancestries: ['矮人', '半身人', '哥布林', '地精', '蛙裔', '蛙人'] },
  slender: { label: '纤细型', ancestries: ['精灵', '仙灵'] },
  medium: { label: '中型', ancestries: [] },
};

export function showCharacterOutline(target, ancestryId, bodyShape) {
  if (!target) return;
  const ancestry = typeof ancestryId === 'string' ? ancestryId.split(':').at(-1) : '';
  const id = Object.hasOwn(shapes, bodyShape) ? bodyShape : Object.keys(shapes).find(key => shapes[key].ancestries.includes(ancestry)) ?? 'medium';
  const shape = shapes[id];
  const url = new URL('./assets/silhouettes/' + id + '.webp', import.meta.url);

  target.classList?.remove('has-custom-portrait');
  let picture = target.querySelector('img');
  if (!picture || picture.classList?.contains('custom-portrait-img')) {
    picture = document.createElement('img');
    picture.width = 320;
    picture.height = 440;
    picture.decoding = 'async';
    target.replaceChildren(picture);
  }
  picture.className = 'silhouette-img';
  picture.alt = shape.label + '人体轮廓';
  picture.style.transform = '';
  if (picture.src !== url.href) picture.src = url.href;
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
