import { resourceArt } from './resource-art.js';

const art = new URL('./assets/paperdoll/', import.meta.url);
const equipArt = new URL('./assets/equipment/', import.meta.url);

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

// 优质手绘高精度装备道具图标映射表（源自纸娃娃原创装备库）
export const highResEquipmentMap = {
  // 武器
  sword: 'weapon-01',
  axe: 'weapon-03',
  hammer: 'weapon-04',
  dagger: 'weapon-05',
  spear: 'weapon-02',
  bow: 'weapon-06',
  crossbow: 'weapon-06',
  staff: 'weapon-04',
  scythe: 'weapon-03',

  // 护甲与服装
  plate: 'armor-01',
  chain: 'armor-02',
  leather: 'armor-03',
  robe: 'armor-05',
  tunic: 'armor-06',

  // 防具配件
  shield: 'offhand-01',
  steelShield: 'offhand-02',
  helm: 'helmet-01',
  hood: 'helmet-03',
  crown: 'helmet-04',
  cape: 'cape-01',
  boots: 'boots-01',
  legs: 'legs-01',
  gloves: 'belt-01',

  // 饰品与消耗品
  'item-ring': 'ring-01',
  'item-charm': 'charm-01',
  'item-gem': 'charm-02',
  'item-crystal': 'charm-04',
  'item-health': 'consumable-01',
  'item-stress': 'consumable-02',
  'item-poison': 'consumable-03',
  'item-potion': 'consumable-04',
  'item-food': 'consumable-05',
  'item-bottle': 'consumable-06',
  'item-scroll': 'satchel-01',
  'item-book': 'satchel-02',
  'item-bag': 'pack-01',
  'item-chest': 'pack-02',
  'item-pouch': 'pouch-01',
  'item-box': 'pack-03',
  'item-gold': 'ring-03'
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
  if (!sprite) return '';
  if (typeof sprite === 'string' && (sprite.startsWith('/') || sprite.startsWith('./') || sprite.startsWith('../') || sprite.startsWith('http://') || sprite.startsWith('https://') || sprite.includes('/'))) {
    return new URL(sprite, import.meta.url).href;
  }
  // 优先匹配纸娃娃高清手绘道具图标
  const highRes = highResEquipmentMap[sprite] || (typeof sprite === 'string' && sprite.includes('-0') ? sprite : null);
  if (highRes) {
    return new URL(`${highRes}.png`, equipArt).href;
  }
  if (sprite === 'cape') sprite = 'item-cloth';
  return new URL(`${sprite}.png`, art).href;
}
