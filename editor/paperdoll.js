const art = new URL('./assets/paperdoll/', import.meta.url);
const sprites = new Map();
const iconRules = [
  [/配方|卷轴|契约|羊皮纸/, 'item-scroll'],
  [/生命药水|治疗药/, 'item-health'],
  [/耐力药水|精力药/, 'item-stress'],
  [/毒液|毒药/, 'item-poison'],
  [/药水|药剂|灵药|秘药|解药/, 'item-potion'],
  [/斗篷|披风|风衣/, 'robe'],
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
  [/匕首|短刀|飞刀|刺针/, 'dagger'],
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
  const name = item.名称 ?? item.name ?? '';
  const category = item.子类别 ?? item.subcat ?? '';
  const match = iconRules.find(([pattern]) => pattern.test(name))
    ?? iconRules.find(([pattern]) => pattern.test(category));
  const type = item.类型 ?? item.type;
  if (match) return match[1];
  if (/武器/.test(type)) return 'sword';
  if (/护甲/.test(type)) return 'leather';
  if (type === '消耗品') return 'item-potion';
  return item.ID?.startsWith('战利品:') || type === '战利品' ? 'item-charm' : 'item-box';
}

export function spriteUrl(sprite) {
  return new URL(`${sprite}.png`, art).href;
}

function loadSprite(name) {
  if (!sprites.has(name)) {
    sprites.set(name, new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`无法加载贴图 ${name}`));
      image.src = spriteUrl(name);
    }).catch(error => {
      sprites.delete(name);
      throw error;
    }));
  }
  return sprites.get(name);
}

const torsoSprites = new Set(['leather', 'chain', 'plate', 'robe', 'tunic']);
const headSprites = new Set(['helm', 'hood', 'crown']);
const handSprites = new Set(['sword', 'dagger', 'axe', 'hammer', 'staff', 'spear', 'bow', 'crossbow', 'scythe', 'shield']);
const skinVariants = { pale: ['body', 'body2'], tan: ['tan', 'tan2'], deep: ['deep', 'deep2'], green: ['green', 'green2'] };
const hairVariants = { brown: 'hair', black: 'hairDark', gold: 'hairGold', gray: 'hairGray' };

export function outfitLayers(sheet, suitActive) {
  const gear = sheet.equipment ?? {};
  const look = sheet.paperdoll ?? {};
  const ancestry = sheet.ancestryId ?? '';
  const skin = Object.hasOwn(skinVariants, look.skin) ? skinVariants[look.skin]
    : /兽人|地精|蛙裔|蛙裔畜/.test(ancestry) ? skinVariants.green : skinVariants.pale;
  const body = skin[sheet.gender === '女' ? 1 : 0];
  const hair = look.hair === 'none' ? null : Object.hasOwn(hairVariants, look.hair) ? hairVariants[look.hair] : 'hair';
  const chest = suitActive ? gear.suit : gear.chest;
  const armor = chest ? itemArt(chest) : null;
  const dress = itemArt(gear.costume ?? {});
  const torso = torsoSprites.has(armor) ? armor : chest ? 'plate' : torsoSprites.has(dress) ? dress : 'shirt';
  const helmet = gear.head ? itemArt(gear.head) : null;
  const main = gear.weapon_main ? itemArt(gear.weapon_main) : null;
  const off = gear.weapon_off ? itemArt(gear.weapon_off) : null;
  const offSprite = off === 'shield' && /铁|钢/.test(gear.weapon_off.名称 ?? '') ? 'steelShield' : off;
  return {
    cape: Boolean(gear.back) || /披风|斗篷/.test(gear.costume?.名称 ?? ''),
    layers: [
      { sprite: body },
      { sprite: gear.legs ? 'legs' : 'boots' },
      { sprite: torso },
      ...(gear.wrists ? [{ sprite: 'gloves' }] : []),
      ...(gear.feet ? [{ sprite: 'boots', metal: true }] : []),
      ...(hair ? [{ sprite: hair }] : []),
      ...(look.beard ? [{ sprite: 'beard' }] : []),
      ...(off ? [{ sprite: handSprites.has(off) ? offSprite : 'staff', flip: off !== 'shield' }] : []),
      ...(main ? [{ sprite: handSprites.has(main) ? main : 'staff', flip: main === 'shield' }] : []),
      ...(helmet ? [{ sprite: headSprites.has(helmet) ? helmet : 'helm' }] : []),
    ],
  };
}

let activeRender = 0;

export async function paintPaperdoll(canvas, sheet, suitActive) {
  const render = ++activeRender;
  const { cape, layers } = outfitLayers(sheet, suitActive);
  const loaded = await Promise.all(layers.map(layer => loadSprite(layer.sprite)));
  if (render !== activeRender) return false;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.imageSmoothingEnabled = false;
  if (cape) {
    ctx.fillStyle = '#401e26';
    ctx.fillRect(38, 52, 52, 52);
    ctx.fillStyle = '#863c45';
    ctx.fillRect(44, 52, 40, 46);
    ctx.fillStyle = '#b76b57';
    ctx.fillRect(44, 94, 40, 4);
  }
  layers.forEach(({ flip, metal }, index) => {
    ctx.save();
    if (flip) {
      ctx.translate(128, 0);
      ctx.scale(-1, 1);
    }
    if (metal) ctx.filter = 'grayscale(1) brightness(1.35)';
    ctx.drawImage(loaded[index], 8, 8, 112, 112);
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
  ctx.drawImage(canvas, 24, 15, 80, 80, 0, 0, 256, 256);
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
