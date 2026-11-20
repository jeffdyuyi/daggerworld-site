export const livePaperdollEnabled = false;

const shapes = {
  tall: {label:'高大型', ancestries:['巨人','费尔博格','费尔伯格','龙人','龙裔','兽人']},
  short: {label:'矮小型', ancestries:['矮人','半身人','哥布林','地精','蛙裔','蛙人']},
  slender: {label:'纤细型', ancestries:['精灵','仙灵']},
  medium: {label:'中型', ancestries:[]},
};

export function showCharacterOutline(target, ancestryId, bodyShape) {
  const ancestry = typeof ancestryId === 'string' ? ancestryId.split(':').at(-1) : '';
  const id = Object.hasOwn(shapes,bodyShape) ? bodyShape : Object.keys(shapes).find(key => shapes[key].ancestries.includes(ancestry)) ?? 'medium';
  const shape = shapes[id];
  const url = new URL('./assets/silhouettes/'+id+'.webp',import.meta.url);
  let picture = target.querySelector('img');
  if (!picture) {
    picture = document.createElement('img');
    picture.width = 320;
    picture.height = 440;
    picture.decoding = 'async';
    target.replaceChildren(picture);
  }
  picture.alt = shape.label+'人体轮廓';
  if (picture.src !== url.href) picture.src = url.href;
  target.hidden = false;
}
