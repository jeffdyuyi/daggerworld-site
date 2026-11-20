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
const skinVariants = new Set(['pale', 'tan', 'deep', 'green']);
const hairVariants = { brown: 'hair', black: 'hairDark', gold: 'hairGold', gray: 'hairGray' };

export function outfitLayers(sheet, suitActive) {
  const gear = sheet.equipment ?? {};
  const look = sheet.paperdoll ?? {};
  const gender = sheet.gender === '女' ? 'female' : 'male';
  const fitted = name => name + '-' + gender;
  const skin = skinVariants.has(look.skin) ? look.skin
    : /兽人|地精|蛙裔|蛙裔畜/.test(sheet.ancestryId ?? '') ? 'green' : 'pale';
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
  add(fitted(skin === 'pale' ? 'skin' : skin));
  add(fitted('pants'));
  add(fitted('boots'));
  if (itemArt(gear.legs ?? {}) === 'legs') add(fitted('greaves'));
  if (itemArt(gear.feet ?? {}) === 'boots') add(fitted('armoredBoots'));
  add(fitted('shirt'));
  if (torso !== 'shirt') add(torso === 'robe' ? 'robe' : fitted(torso));
  if (itemArt(gear.wrists ?? {}) === 'gloves') add(fitted('gloves'));
  if (hair) add(hair);
  if (look.beard) add('beard');
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
  const loaded = await Promise.all(layers.map(layer => loadSprite(layer.sprite)));
  if (canvasRenders.get(canvas) !== render) return false;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.imageSmoothingEnabled = false;
  layers.forEach(({ flip }, index) => {
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
