import { resourceArt } from './resource-art.js';
const art = new URL('./assets/paperdoll/', import.meta.url);
const avatarArt = new URL('./assets/lpc/', import.meta.url);
const sprites = new Map();
export const itemAppearances = {
  cape: '披风', sword: '剑', dagger: '匕首', axe: '斧', hammer: '锤', spear: '长矛', staff: '法杖',
  bow: '弓', crossbow: '弩', scythe: '镰刀', shield: '木盾', steelShield: '铁盾',
  leather: '皮甲', chain: '链甲', plate: '板甲', robe: '长袍', tunic: '短衣',
  helm: '头盔', hood: '兜帽', crown: '头冠', boots: '靴', gloves: '护手', legs: '护腿',
  'item-health': '红药瓶', 'item-stress': '蓝药瓶', 'item-poison': '绿药瓶',
  'item-potion': '高颈瓶', 'item-bottle': '棕药瓶', 'item-scroll': '卷轴', 'item-book': '书',
  'item-map': '地图', 'item-torch': '火把', 'item-gem': '宝石', 'item-crystal': '晶球',
  'item-bag': '布袋', 'item-chest': '箱', 'item-ring': '戒指', 'item-charm': '护符',
  'item-key': '钥匙', 'item-bomb': '炸弹', 'item-rope': '绳索', 'item-gold': '金币',
  'item-seed': '叶片', 'item-food': '食物', 'item-box': '匣',
};

export function validAppearance(value) {
  return Object.hasOwn(itemAppearances, value) ? value : '';
}
const iconRules = [
  [/配方|卷轴|契约|羊皮纸/, 'item-scroll'],
  [/生命药水|治疗药/, 'item-health'],
  [/耐力药水|精力药/, 'item-stress'],
  [/毒液|毒药/, 'item-poison'],
  [/药水|药剂|灵药|秘药|解药/, 'item-potion'],
  [/斗篷|披风|风衣/, 'cape'],
  [/头盔|战盔|面具/, 'helm'],
  [/兜帽/, 'hood'],
  [/头冠|王冠|发带/, 'crown'],
  [/护腿|护胫/, 'legs'],
  [/靴|鞋/, 'boots'],
  [/手套|护手|护腕|护臂/, 'gloves'],
  [/板甲|胸甲/, 'plate'],
  [/链甲|锁子甲|鳞甲/, 'chain'],
  [/皮甲|软甲|护甲/, 'leather'],
  [/布甲|丝甲|法袍|长袍/, 'robe'],
  [/盾/, 'shield'],
  [/匕首|短刀|小刀|飞刀|刺针/, 'dagger'],
  [/镰/, 'scythe'],
  [/斧/, 'axe'],
  [/锤|铁头棍|链枷/, 'hammer'],
  [/长矛|枪矛|戟/, 'spear'],
  [/弩/, 'crossbow'],
  [/箭袋|穿刺箭|弓/, 'bow'],
  [/剑|弯刀|拳刃|短刃|军刀/, 'sword'],
  [/杖|法球|长棍/, 'staff'],
  [/箱|盒/, 'item-chest'],
  [/背包|挎包|腰包|行囊|皮袋|沙袋|无限袋/, 'item-bag'],
  [/书|典籍|守护者$/, 'item-book'],
  [/地图|罗盘|指南针/, 'item-map'],
  [/火炬|火把/, 'item-torch'],
  [/灯|火罐/, 'item-lantern'],
  [/炸弹|爆弹|火药|黑烟/, 'item-bomb'],
  [/钥匙|开锁/, 'item-key'],
  [/戒指|指环|之戒/, 'item-ring'],
  [/吊坠|项链|护符|徽记|遗宝|符文|护身符/, 'item-charm'],
  [/宝石|血石|魅力石|勇气石|珍珠/, 'item-gem'],
  [/晶|棱镜|碎片|精魂/, 'item-crystal'],
  [/金条|币|钱/, 'item-gold'],
  [/种子|叶|药草/, 'item-seed'],
  [/瓶|罐/, 'item-bottle'],
  [/口粮|面包|肉|干粮|食物/, 'item-food'],
  [/绳|网|手铐|锁链/, 'item-rope'],
  [/羽毛/, 'item-feather'],
  [/石|黏土|粘土/, 'item-stone'],
  [/布|床单|绷带/, 'item-cloth'],
  [/哨|笛|号角/, 'item-signal'],
];

export function itemArt(item = {}) {
  const appearance = validAppearance(item.appearance);
  if (/^(主武器|副武器|护甲):/.test(item.resourceId || '')) return resourceArt[item.resourceId] || 'item-box';
  if (appearance) return appearance;
  if (item.ID?.startsWith('装备:') && !item.ownedGearId) return 'item-box';
  const name = item.名称 ?? item.name ?? '';
  if (item.ID && /^(主武器|副武器|护甲):/.test(item.ID)) return resourceArt[item.ID] || 'item-box';
  const category = item.子类别 ?? item.subcat ?? '';
  const match = iconRules.find(([pattern]) => pattern.test(name))
    ?? iconRules.find(([pattern]) => pattern.test(category));
  const type = item.类型 ?? item.type;
  if (match) return match[1];


  if (type === '消耗品') return 'item-potion';
  return item.ID?.startsWith('战利品:') || type === '战利品' ? 'item-charm' : 'item-box';
}

export function spriteUrl(sprite) {
  if (sprite === 'cape') sprite = 'item-cloth';
  return new URL(`${sprite}.png`, art).href;
}

function loadSprite(name) {
  if (!sprites.has(name)) {
    sprites.set(name, new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`无法加载贴图 ${name}`));
      image.src = new URL(`${name}.png`, avatarArt).href;
    }).catch(error => {
      sprites.delete(name);
      throw error;
    }));
  }
  return sprites.get(name);
}

const torsoSprites = new Set(['leather', 'chain', 'plate', 'robe', 'tunic']);
const headSprites = new Set(['helm', 'hood', 'crown']);
const handSprites = new Set(['sword', 'dagger', 'axe', 'hammer', 'staff', 'spear', 'bow', 'crossbow', 'scythe', 'shield', 'steelShield']);
const oldColors = {pale:'#d9a582',tan:'#b47c52',deep:'#744630',green:'#799746'};
const speciesColors = {兽人:'#799746',魔裔:'#a34e78',蛙裔:'#79a764',龟人:'#889550',龙人:'#9f6946',猫族:'#c58d59',猿族:'#886346',哥布林:'#819456'};
const speciesOf = sheet => sheet.ancestryId?.split(':').at(-1) ?? '';
export function appearanceDefaults(sheet) {
  const look = sheet.paperdoll ?? {};
  return {
    skin: /^#[a-f0-9]{6}$/i.test(look.skin) ? look.skin : oldColors[look.skin] ?? speciesColors[speciesOf(sheet)] ?? oldColors.pale,
    hair: look.hair ?? (['龙人','蛙裔','龟人','猫族','猿族'].includes(speciesOf(sheet)) ? 'none' : 'brown'),
    beard: Boolean(look.beard), horns: look.horns === 'curl' ? 'curl' : 'point',
    wings: look.wings === 'vein' ? 'vein' : 'petal',
  };
}

// Original 1px sprites on the same 64×64 grid as the LPC body.
const creatureHeads = {
  猫族: [
    '##..................##',
    '#h#................#h#',
    '#hh#..............#hh#',
    '#hss##############ssh#',
    '#hssssssssssssssssssh#',
    '#ssssssddd.dddsssssss#',
    '#ssssssssssssssssssss#',
    '#sss##ssssssss##sssss#',
    '#sss#essssssss#esssss#',
    '#sssssssllllsssssssss#',
    '##lssslll##lllssslss##',
    '.#llllll####llllll##.',
    '..##lll##ll##llll##..',
    '....####llll####....',
    '.......######.......',
  ],
  猿族: [
    '.......########.......',
    '.....##dddddddd##.....',
    '....#dddddddddddd#....',
    '..###dddssssssddd###..',
    '.#ss#ddssssssssdd#ss#.',
    '#shs#dss######ssd#shs#',
    '#hhs#ss#esssse#ss#shh#',
    '.#ss#ssssssssssss#ss#.',
    '..###ssssllssssss###..',
    '...#ssssllllllllsss#..',
    '...#ssslll#ll#llsss#..',
    '...#ssllllllllllsss#..',
    '....#ssll####llss##...',
    '.....##ssssssss##.....',
    '.......########.......',
  ],
  龙人: [
    '..#................#..',
    '..##..............##..',
    '...#l#..........#l#...',
    '...#ll#........#ll#...',
    '....#l##########l#....',
    '..###ssdssssddsss###..',
    '.##ddssdssssddssdd##.',
    '#lddsss##ss##sssddl#',
    '.##dsss#ess#esssd##.',
    '..##ssssssssssss##..',
    '...#sss########sss#.',
    '...#ss#ssssssss#ss#.',
    '....##sss#ss#sss##..',
    '....#lllsssslllll#..',
    '....#l##########l#..',
    '.....#llllllllll#...',
    '......##########....',
  ],
};

function drawCreatureHead(ctx, kind, skin) {
  const palette = { '#':'#2d2330', s:skin, d:shadeSkin(skin,-42),
    l:shadeSkin(skin,72), h:'#ab6760', e:kind === '猫族' ? '#f2ce62' : kind === '龙人' ? '#f3a654' : '#e7c99f' };
  creatureHeads[kind].forEach((row,index) => {
    const left = 32-Math.floor(row.length/2);
    row.replaceAll('.', ' ').split('').forEach((pixel,column) => {
      if (!palette[pixel]) return;
      ctx.fillStyle = palette[pixel];
      ctx.fillRect(left+column, (kind === '龙人' ? 14 : 16)+index, 1, 1);
    });
  });
}

function shadeSkin(color, amount) {
  const channels = color.slice(1).match(/../g).map(hex => Math.max(0,Math.min(255,parseInt(hex,16)+amount)));
  return 'rgb('+channels.join(',')+')';
}

function speciesLayer(destination, kind, look, behind) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const polygon = (color, points) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    ctx.closePath(); ctx.fill();
  };
  const rect = (color,x,y,w,h) => {ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
  const mirror = (color,points) => {
    polygon(color,points);
    polygon(color,points.map(([x,y]) => [64-x,y]));
  };
  const skin=look.skin, ink='#302531';
  if (behind && kind === '仙灵') {
    const thin = look.wings === 'vein';
    mirror('#674870',[[29,39],[10,34],[4,22],[5,13],[15,16],[26,29],[30,34]]);
    mirror(thin?'#addbe4':'#d99acf',[[27,36],[11,31],[7,22],[7,16],[14,19],[24,30]]);
    mirror('#b58ac5',[[28,37],[18,35],[10,39],[10,45],[18,47],[27,42]]);
    mirror('#f4d8eb',[[23,32],[11,23],[10,19],[14,22]]);
  }
  if (behind && ['猫族','猿族','龙人'].includes(kind)) {
    polygon(ink,[[39,43],[47,46],[52,44],[54,39],[58,38],[57,46],[53,50],[46,51],[39,48]]);
    polygon(skin,[[41,45],[47,48],[52,46],[55,42],[55,46],[52,49],[46,50],[41,47]]);
  }
  if (behind && kind === '龟人') {
    polygon('#4a4630',[[20,28],[44,28],[50,35],[49,47],[44,53],[20,53],[15,47],[14,35]]);
    mirror('#726541',[[20,30],[25,32],[22,40],[16,42],[16,35]]);
    mirror('#85794a',[[16,44],[22,42],[24,48],[20,51],[17,48]]);
  }
  if (!behind) {
    switch (kind) {
      case '精灵':
      case '兽人':
        mirror(ink,[[25,24],[15,20],[16,25],[23,30],[26,29]]);
        mirror(skin,[[24,25],[17,22],[18,25],[23,28]]);
        if (kind === '兽人') {
          rect('#efe4bc',25,29,2,4); rect('#efe4bc',37,29,2,4);
          rect(ink,27,31,10,1);
        }
        break;
      case '魔裔':
        mirror('#47303a',look.horns === 'curl' ? [[27,20],[19,19],[16,15],[17,9],[21,8],[23,11],[20,12],[20,15],[27,15]] : [[26,20],[19,18],[17,8],[21,11],[26,13]]);
        mirror('#ae7e77',look.horns === 'curl' ? [[22,16],[19,16],[18,13],[19,10],[20,10],[19,14]] : [[20,16],[19,11],[24,15]]);
        break;
      case '猫族':
      case '猿族':
      case '龙人':
        drawCreatureHead(ctx,kind,skin);
        if (kind === '猿族') {
          mirror(shadeSkin(skin,-25),[[18,38],[21,41],[21,48],[18,51],[15,48],[15,43]]);
          mirror(skin,[[18,43],[20,45],[20,48],[18,49],[16,47],[16,45]]);
        } else if (kind === '猫族') {
          mirror(shadeSkin(skin,65),[[17,44],[21,44],[22,47],[20,48],[16,48]]);
        } else {
          mirror(shadeSkin(skin,-42),[[17,41],[21,42],[22,46],[20,48],[17,47],[15,45]]);
          mirror('#dbc48f',[[16,45],[18,45],[18,47],[17,48]]);
        }
        break;
      case '蛙裔':
      case '龟人': {
        const frog=kind==='蛙裔';
        polygon(ink,[[20,19],[23,15],[28,17],[36,17],[41,15],[44,20],[frog?48:45,25],[45,32],[39,36],[25,36],[19,32],[frog?16:19,25]]);
        polygon(skin,[[22,20],[24,17],[29,19],[35,19],[40,17],[42,21],[frog?46:43,26],[43,31],[38,34],[26,34],[21,31],[frog?18:21,26]]);
        if (frog) mirror(skin,[[19,41],[22,44],[21,47],[17,48],[14,47],[16,45]]);
        if (frog) mirror(skin,[[23,20],[19,19],[17,23],[19,27],[23,25]]);
        rect('#f0cd98',25,28,14,5);
        mirror(ink,[[24,23],[28,23],[28,26],[24,26]]);
        rect(ink,27,32,10,1);
        break;
      }
    }
  }
  destination.drawImage(canvas,0,0,128,128);
}

function drawSkin(ctx, image, color, replaceHead) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const skin = canvas.getContext('2d');
  skin.drawImage(image,0,0,64,64);
  const data = skin.getImageData(0,0,64,64);
  const rgb = color.slice(1).match(/../g).map(v=>parseInt(v,16));
  for (let i=0; i<data.data.length; i+=4) {
    if (!data.data[i+3]) continue;
    const shade = (.3*data.data[i]+.55*data.data[i+1]+.15*data.data[i+2]-165)*.8;
    for(let channel=0;channel<3;channel++) data.data[i+channel]=rgb[channel]+shade;
  }
  skin.putImageData(data,0,0);
  if (replaceHead) skin.clearRect(0,0,64,29);
  ctx.drawImage(canvas,0,0,128,128);
}
const hairVariants = { brown: 'hair', black: 'hairDark', gold: 'hairGold', gray: 'hairGray' };

export function outfitLayers(sheet, suitActive) {
  const gear = {...sheet.equipment};
  if (suitActive) for (const slot of ['head','chest','legs','feet']) delete gear[slot];
  const look = appearanceDefaults(sheet);
  const kind = speciesOf(sheet);
  const gender = sheet.gender === '女' ? 'female' : 'male';
  const fitted = name => name + '-' + gender;
  const hair = look.hair === 'none' ? null : Object.hasOwn(hairVariants, look.hair) ? hairVariants[look.hair] : 'hair';
  const chest = suitActive ? gear.suit : gear.chest;
  const armor = chest ? itemArt(chest) : null;
  const dress = itemArt(gear.costume ?? {});
  const torso = torsoSprites.has(armor) ? armor : chest ? 'shirt' : torsoSprites.has(dress) ? dress : 'shirt';
  const helmet = gear.head ? itemArt(gear.head) : null;
  const layers = [];
  function add(sprite, flip = false) { layers.push({ sprite, flip }); }
  function hand(item, isOffHand) {
    if (!item) return;
    const image = itemArt(item);
    const isShield = image === 'shield' || image === 'steelShield';
    const metalShield = image === 'steelShield' || (isShield && /铁|钢/.test(item.名称 ?? ''));
    if (!handSprites.has(image)) return;
    add(metalShield ? fitted('steelShield') : image, isShield ? !isOffHand : isOffHand);
  }

  if ([gear.back, gear.costume, chest].some(item => item && itemArt(item) === 'cape')) add('cape');
  layers.push({kind,behind:true});
  layers.push({sprite:fitted('skin'),skin:look.skin});
  add(fitted('pants'));
  add(fitted('boots'));
  if (itemArt(gear.legs ?? {}) === 'legs') add(fitted('greaves'));
  if (itemArt(gear.feet ?? {}) === 'boots') add(fitted('armoredBoots'));
  add(fitted('shirt'));
  if (torso !== 'shirt') add(torso === 'robe' ? 'robe' : fitted(torso));
  if (itemArt(gear.wrists ?? {}) === 'gloves') add(fitted('gloves'));
  if (hair) add(hair);
  if (look.beard) add('beard');
  layers.push({kind,behind:false});
  hand(gear.weapon_off, true);
  hand(gear.weapon_main, false);
  if (headSprites.has(helmet)) add(headSprites.has(helmet) && helmet !== 'helm' ? helmet : fitted('helm'));
  return layers;
}

const canvasRenders = new WeakMap();

export async function paintPaperdoll(canvas, sheet, suitActive) {
  const render = Symbol();
  canvasRenders.set(canvas, render);
  const layers = outfitLayers(sheet, suitActive);
  const loaded = await Promise.all(layers.map(layer => layer.sprite ? loadSprite(layer.sprite) : null));
  if (canvasRenders.get(canvas) !== render) return false;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.imageSmoothingEnabled = false;
  const look = appearanceDefaults(sheet);
  layers.forEach(({ flip, kind, behind, skin }, index) => {
    if (!loaded[index]) { speciesLayer(ctx,kind,look,behind); return; }
    if (skin) { drawSkin(ctx,loaded[index],skin,Boolean(creatureHeads[speciesOf(sheet)])); return; }
    ctx.save();
    if (flip) {
      ctx.translate(128, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(loaded[index], 0, 0, 128, 128);
    ctx.restore();
  });
  return true;
}

export function downloadToken(canvas, name) {
  const token = document.createElement('canvas');
  token.width = token.height = 256;
  const ctx = token.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#312329';
  ctx.fillRect(0, 0, 256, 256);
  ctx.drawImage(canvas, 28, 24, 72, 72, 0, 0, 256, 256);
  ctx.restore();
  ctx.strokeStyle = '#e3b36c';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.stroke();
  const link = document.createElement('a');
  link.download = `${(name || '化身').replace(/[<>:"/\\|?*]/g, '_')}-指示物.png`;
  link.href = token.toDataURL('image/png');
  link.click();
}
