import { resourceArt } from './resource-art.js';

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

// 优质手绘高精度装备道具图标映射表（96 款精美手绘图库）
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
  'item-gold': 'ring-03',
  'item-cloth': 'fashion-01',
  'item-signal': 'charm-03',
  'item-feather': 'charm-05',
  'item-stone': 'charm-06',
  'item-torch': 'consumable-06',
  'item-lantern': 'consumable-06',
  'item-bomb': 'consumable-03',
  'item-key': 'charm-01',
  'item-seed': 'charm-04',
  'item-rope': 'packstraps-01',
};

// 96 件全量手绘高精度装备精美图录（供工坊外观选择器与道具展示直接使用）
export const EXQUISITE_EQUIPMENT_CATALOG = [
  // 武器 1~6
  { id: 'weapon-01', name: '精钢长剑', cat: 'weapon', slot: 'weapon_main', sprite: 'weapon-01', desc: '手绘精美武器 · 单手' },
  { id: 'weapon-02', name: '破甲长矛', cat: 'weapon', slot: 'weapon_main', sprite: 'weapon-02', desc: '手绘精美武器 · 双手' },
  { id: 'weapon-03', name: '战斧战锤', cat: 'weapon', slot: 'weapon_main', sprite: 'weapon-03', desc: '手绘精美武器 · 单手' },
  { id: 'weapon-04', name: '学者法杖', cat: 'weapon', slot: 'weapon_main', sprite: 'weapon-04', desc: '手绘精美武器 · 双手' },
  { id: 'weapon-05', name: '秘银短匕', cat: 'weapon', slot: 'weapon_main', sprite: 'weapon-05', desc: '手绘精美武器 · 单手' },
  { id: 'weapon-06', name: '巡林猎弓', cat: 'weapon', slot: 'weapon_main', sprite: 'weapon-06', desc: '手绘精美武器 · 双手' },

  // 护甲 1~6
  { id: 'armor-01', name: '重装骑士板甲', cat: 'armor', slot: 'armor', sprite: 'armor-01', desc: '手绘精美护甲 · 重型' },
  { id: 'armor-02', name: '密织锁子甲', cat: 'armor', slot: 'armor', sprite: 'armor-02', desc: '手绘精美护甲 · 中型' },
  { id: 'armor-03', name: '游侠镶钉皮甲', cat: 'armor', slot: 'armor', sprite: 'armor-03', desc: '手绘精美护甲 · 轻型' },
  { id: 'armor-04', name: '硬化胸甲', cat: 'armor', slot: 'armor', sprite: 'armor-04', desc: '手绘精美护甲 · 中型' },
  { id: 'armor-05', name: '法术织锦长袍', cat: 'armor', slot: 'armor', sprite: 'armor-05', desc: '手绘精美护甲 · 轻便' },
  { id: 'armor-06', name: '冒险者短衣', cat: 'armor', slot: 'armor', sprite: 'armor-06', desc: '手绘精美服装 · 日常' },

  // 战盔 1~6
  { id: 'helmet-01', name: '全覆重盔', cat: 'head', slot: 'head', sprite: 'helmet-01', desc: '手绘精美战盔 · 头部' },
  { id: 'helmet-02', name: '半覆面盔', cat: 'head', slot: 'head', sprite: 'helmet-02', desc: '手绘精美战盔 · 头部' },
  { id: 'helmet-03', name: '暗影兜帽', cat: 'head', slot: 'head', sprite: 'helmet-03', desc: '手绘精美兜帽 · 头部' },
  { id: 'helmet-04', name: '仪式头冠', cat: 'head', slot: 'head', sprite: 'helmet-04', desc: '手绘精美头冠 · 头部' },
  { id: 'helmet-05', name: '角斗士角盔', cat: 'head', slot: 'head', sprite: 'helmet-05', desc: '手绘精美头盔 · 头部' },
  { id: 'helmet-06', name: '旅者软帽', cat: 'head', slot: 'head', sprite: 'helmet-06', desc: '手绘精美软帽 · 头部' },

  // 副手盾牌 1~6
  { id: 'offhand-01', name: '鸢形木盾', cat: 'shield', slot: 'weapon_off', sprite: 'offhand-01', desc: '手绘精美副手 · 盾牌' },
  { id: 'offhand-02', name: '精钢圆盾', cat: 'shield', slot: 'weapon_off', sprite: 'offhand-02', desc: '手绘精美副手 · 盾牌' },
  { id: 'offhand-03', name: '重型塔盾', cat: 'shield', slot: 'weapon_off', sprite: 'offhand-03', desc: '手绘精美副手 · 盾牌' },
  { id: 'offhand-04', name: '符文防盾', cat: 'shield', slot: 'weapon_off', sprite: 'offhand-04', desc: '手绘精美副手 · 盾牌' },
  { id: 'offhand-05', name: '仪式小圆盾', cat: 'shield', slot: 'weapon_off', sprite: 'offhand-05', desc: '手绘精美副手 · 盾牌' },
  { id: 'offhand-06', name: '招架短匕', cat: 'shield', slot: 'weapon_off', sprite: 'offhand-06', desc: '手绘精美副手 · 防御' },

  // 披风 1~6
  { id: 'cape-01', name: '晨曦红斗篷', cat: 'body', slot: 'cape', sprite: 'cape-01', desc: '手绘精美披风 · 背部' },
  { id: 'cape-02', name: '林地迷彩披风', cat: 'body', slot: 'cape', sprite: 'cape-02', desc: '手绘精美披风 · 背部' },
  { id: 'cape-03', name: '暗夜绒毛斗篷', cat: 'body', slot: 'cape', sprite: 'cape-03', desc: '手绘精美披风 · 背部' },
  { id: 'cape-04', name: '游荡者披肩', cat: 'body', slot: 'cape', sprite: 'cape-04', desc: '手绘精美披风 · 背部' },
  { id: 'cape-05', name: '学派纹章披风', cat: 'body', slot: 'cape', sprite: 'cape-05', desc: '手绘精美披风 · 背部' },
  { id: 'cape-06', name: '破损行军风衣', cat: 'body', slot: 'cape', sprite: 'cape-06', desc: '手绘精美披风 · 背部' },

  // 战靴 1~6
  { id: 'boots-01', name: '骑士钢战靴', cat: 'body', slot: 'boots', sprite: 'boots-01', desc: '手绘精美足部 · 重型' },
  { id: 'boots-02', name: '猎人绑腿软靴', cat: 'body', slot: 'boots', sprite: 'boots-02', desc: '手绘精美足部 · 敏捷' },
  { id: 'boots-03', name: '法术行云长靴', cat: 'body', slot: 'boots', sprite: 'boots-03', desc: '手绘精美足部 · 布制' },
  { id: 'boots-04', name: '加固铁头靴', cat: 'body', slot: 'boots', sprite: 'boots-04', desc: '手绘精美足部 · 防护' },
  { id: 'boots-05', name: '斥候轻履', cat: 'body', slot: 'boots', sprite: 'boots-05', desc: '手绘精美足部 · 静音' },
  { id: 'boots-06', name: '泥泞旅人靴', cat: 'body', slot: 'boots', sprite: 'boots-06', desc: '手绘精美足部 · 耐磨' },

  // 护腿 1~6
  { id: 'legs-01', name: '重装精钢护胫', cat: 'body', slot: 'legs', sprite: 'legs-01', desc: '手绘精美腿部 · 防具' },
  { id: 'legs-02', name: '锁甲鳞甲护腿', cat: 'body', slot: 'legs', sprite: 'legs-02', desc: '手绘精美腿部 · 中型' },
  { id: 'legs-03', name: '皮质绑腿裤', cat: 'body', slot: 'legs', sprite: 'legs-03', desc: '手绘精美腿部 · 轻便' },
  { id: 'legs-04', name: '骑手马裤', cat: 'body', slot: 'legs', sprite: 'legs-04', desc: '手绘精美腿部 · 敏捷' },
  { id: 'legs-05', name: '学者长袍衬裤', cat: 'body', slot: 'legs', sprite: 'legs-05', desc: '手绘精美腿部 · 舒适' },
  { id: 'legs-06', name: '游侠战术裹腿', cat: 'body', slot: 'legs', sprite: 'legs-06', desc: '手绘精美腿部 · 坚固' },

  // 腰带与护手 1~6
  { id: 'belt-01', name: '挂扣战术皮带', cat: 'body', slot: 'belt', sprite: 'belt-01', desc: '手绘精美配件 · 腰部/护手' },
  { id: 'belt-02', name: '金纹护腕皮带', cat: 'body', slot: 'belt', sprite: 'belt-02', desc: '手绘精美配件 · 腰部/护手' },
  { id: 'belt-03', name: '锁扣重型腰封', cat: 'body', slot: 'belt', sprite: 'belt-03', desc: '手绘精美配件 · 腰部/护手' },
  { id: 'belt-04', name: '药剂暗格腰带', cat: 'body', slot: 'belt', sprite: 'belt-04', desc: '手绘精美配件 · 腰部/护手' },
  { id: 'belt-05', name: '仪式宝珠腰封', cat: 'body', slot: 'belt', sprite: 'belt-05', desc: '手绘精美配件 · 腰部/护手' },
  { id: 'belt-06', name: '简易行囊扎带', cat: 'body', slot: 'belt', sprite: 'belt-06', desc: '手绘精美配件 · 腰部/护手' },

  // 戒指 1~6
  { id: 'ring-01', name: '蓝宝石银指环', cat: 'item', slot: 'ring1', sprite: 'ring-01', desc: '手绘精美饰品 · 戒指' },
  { id: 'ring-02', name: '炽红玛瑙金戒', cat: 'item', slot: 'ring1', sprite: 'ring-02', desc: '手绘精美饰品 · 戒指' },
  { id: 'ring-03', name: '古铜印章指环', cat: 'item', slot: 'ring1', sprite: 'ring-03', desc: '手绘精美饰品 · 戒指' },
  { id: 'ring-04', name: '翡翠守护之戒', cat: 'item', slot: 'ring1', sprite: 'ring-04', desc: '手绘精美饰品 · 戒指' },
  { id: 'ring-05', name: '幽冥黯晶指环', cat: 'item', slot: 'ring1', sprite: 'ring-05', desc: '手绘精美饰品 · 戒指' },
  { id: 'ring-06', name: '素面精钢婚戒', cat: 'item', slot: 'ring1', sprite: 'ring-06', desc: '手绘精美饰品 · 戒指' },

  // 护符 1~6
  { id: 'charm-01', name: '白银圣徽吊坠', cat: 'item', slot: 'charm', sprite: 'charm-01', desc: '手绘精美饰品 · 护符' },
  { id: 'charm-02', name: '月光石护身符', cat: 'item', slot: 'charm', sprite: 'charm-02', desc: '手绘精美饰品 · 护符' },
  { id: 'charm-03', name: '猛兽尖牙项链', cat: 'item', slot: 'charm', sprite: 'charm-03', desc: '手绘精美饰品 · 护符' },
  { id: 'charm-04', name: '星辰棱镜吊坠', cat: 'item', slot: 'charm', sprite: 'charm-04', desc: '手绘精美饰品 · 护符' },
  { id: 'charm-05', name: '金羽守护羽符', cat: 'item', slot: 'charm', sprite: 'charm-05', desc: '手绘精美饰品 · 护符' },
  { id: 'charm-06', name: '古代符文石牌', cat: 'item', slot: 'charm', sprite: 'charm-06', desc: '手绘精美饰品 · 护符' },

  // 背包 1~6
  { id: 'pack-01', name: '帆布大行囊', cat: 'pack', slot: 'inventory', sprite: 'pack-01', desc: '手绘精美容具 · 背包' },
  { id: 'pack-02', name: '精工铆钉皮箱', cat: 'pack', slot: 'inventory', sprite: 'pack-02', desc: '手绘精美容具 · 箱匣' },
  { id: 'pack-03', name: '冒险者补给箱', cat: 'pack', slot: 'inventory', sprite: 'pack-03', desc: '手绘精美容具 · 箱匣' },
  { id: 'pack-04', name: '附魔扩容背包', cat: 'pack', slot: 'inventory', sprite: 'pack-04', desc: '手绘精美容具 · 背包' },
  { id: 'pack-05', name: '野外防潮背篓', cat: 'pack', slot: 'inventory', sprite: 'pack-05', desc: '手绘精美容具 · 背包' },
  { id: 'pack-06', name: '紧凑行军背包', cat: 'pack', slot: 'inventory', sprite: 'pack-06', desc: '手绘精美容具 · 背包' },

  // 药水与消耗品 1~6
  { id: 'consumable-01', name: '红曜生命药剂', cat: 'item', slot: 'inventory', sprite: 'consumable-01', desc: '手绘精美道具 · 药剂' },
  { id: 'consumable-02', name: '宁神清心灵水', cat: 'item', slot: 'inventory', sprite: 'consumable-02', desc: '手绘精美道具 · 药剂' },
  { id: 'consumable-03', name: '炼金解毒秘剂', cat: 'item', slot: 'inventory', sprite: 'consumable-03', desc: '手绘精美道具 · 药剂' },
  { id: 'consumable-04', name: '纯净圣泉合剂', cat: 'item', slot: 'inventory', sprite: 'consumable-04', desc: '手绘精美道具 · 药剂' },
  { id: 'consumable-05', name: '野营干粮补给', cat: 'item', slot: 'inventory', sprite: 'consumable-05', desc: '手绘精美道具 · 口粮' },
  { id: 'consumable-06', name: '高颈秘酿烧酒', cat: 'item', slot: 'inventory', sprite: 'consumable-06', desc: '手绘精美道具 · 饮品' },

  // 书籍与卷轴袋 1~6
  { id: 'satchel-01', name: '羊皮纸卷轴包', cat: 'pack', slot: 'inventory', sprite: 'satchel-01', desc: '手绘精美容具 · 书卷' },
  { id: 'satchel-02', name: '学者法术典籍', cat: 'pack', slot: 'inventory', sprite: 'satchel-02', desc: '手绘精美典籍 · 书籍' },
  { id: 'satchel-03', name: '牛皮文件挎包', cat: 'pack', slot: 'inventory', sprite: 'satchel-03', desc: '手绘精美容具 · 挎包' },
  { id: 'satchel-04', name: '符文羊皮契约', cat: 'pack', slot: 'inventory', sprite: 'satchel-04', desc: '手绘精美图卷 · 卷轴' },
  { id: 'satchel-05', name: '密探信函筒', cat: 'pack', slot: 'inventory', sprite: 'satchel-05', desc: '手绘精美容具 · 筒匣' },
  { id: 'satchel-06', name: '古旧航海日志', cat: 'pack', slot: 'inventory', sprite: 'satchel-06', desc: '手绘精美典籍 · 地图' },

  // 腰间皮袋 1~6
  { id: 'pouch-01', name: '附魔钱袋', cat: 'pack', slot: 'inventory', sprite: 'pouch-01', desc: '手绘精美容具 · 皮袋' },
  { id: 'pouch-02', name: '草药束口袋', cat: 'pack', slot: 'inventory', sprite: 'pouch-02', desc: '手绘精美容具 · 皮袋' },
  { id: 'pouch-03', name: '施法材料布袋', cat: 'pack', slot: 'inventory', sprite: 'pouch-03', desc: '手绘精美容具 · 皮袋' },
  { id: 'pouch-04', name: '精钢锁扣暗袋', cat: 'pack', slot: 'inventory', sprite: 'pouch-04', desc: '手绘精美容具 · 皮袋' },
  { id: 'pouch-05', name: '兽皮油膏袋', cat: 'pack', slot: 'inventory', sprite: 'pouch-05', desc: '手绘精美容具 · 皮袋' },
  { id: 'pouch-06', name: '应急针线缝包', cat: 'pack', slot: 'inventory', sprite: 'pouch-06', desc: '手绘精美容具 · 皮袋' },

  // 时装与常服 1~6
  { id: 'fashion-01', name: '贵族丝绸礼服', cat: 'body', slot: 'armor', sprite: 'fashion-01', desc: '手绘精美时装 · 身躯' },
  { id: 'fashion-02', name: '游吟诗人坎肩', cat: 'body', slot: 'armor', sprite: 'fashion-02', desc: '手绘精美时装 · 身躯' },
  { id: 'fashion-03', name: '商旅刺绣外套', cat: 'body', slot: 'armor', sprite: 'fashion-03', desc: '手绘精美时装 · 身躯' },
  { id: 'fashion-04', name: '学士素雅长袍', cat: 'body', slot: 'armor', sprite: 'fashion-04', desc: '手绘精美时装 · 身躯' },
  { id: 'fashion-05', name: '港口水手夹克', cat: 'body', slot: 'armor', sprite: 'fashion-05', desc: '手绘精美时装 · 身躯' },
  { id: 'fashion-06', name: '工匠坚实围裙', cat: 'body', slot: 'armor', sprite: 'fashion-06', desc: '手绘精美时装 · 身躯' },

  // 背带配件 1~6
  { id: 'packstraps-01', name: '加宽双肩负重带', cat: 'body', slot: 'belt', sprite: 'packstraps-01', desc: '手绘精美配件 · 承重' },
  { id: 'packstraps-02', name: '斜挎弓袋枪带', cat: 'body', slot: 'belt', sprite: 'packstraps-02', desc: '手绘精美配件 · 携带' },
  { id: 'packstraps-03', name: '皮质胸前束带', cat: 'body', slot: 'belt', sprite: 'packstraps-03', desc: '手绘精美配件 · 束缚' },
  { id: 'packstraps-04', name: '挂刀快拔枪背带', cat: 'body', slot: 'belt', sprite: 'packstraps-04', desc: '手绘精美配件 · 快拔' },
  { id: 'packstraps-05', name: '登山重锁安全绳', cat: 'body', slot: 'belt', sprite: 'packstraps-05', desc: '手绘精美配件 · 安全' },
  { id: 'packstraps-06', name: '简易行装绑绳', cat: 'body', slot: 'belt', sprite: 'packstraps-06', desc: '手绘精美配件 · 扎捆' }
];

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

/**
 * 统一将装备/物品解析为 96 款精美手绘高清插画，彻底移除低清像素图标回退
 */
export function spriteUrl(sprite) {
  if (!sprite) return new URL('pack-03.png', equipArt).href;
  if (typeof sprite === 'string' && (sprite.startsWith('/') || sprite.startsWith('./') || sprite.startsWith('../') || sprite.startsWith('http://') || sprite.startsWith('https://'))) {
    return sprite;
  }

  // 精准匹配或别名转写为精美装备图
  let target = highResEquipmentMap[sprite] || sprite;
  if (typeof target === 'string') {
    // 兼容原带 .png 后缀
    if (target.endsWith('.png')) target = target.slice(0, -4);
    // 兼容带路径的命名
    if (target.includes('/')) {
      const parts = target.split('/');
      target = parts[parts.length - 1].replace(/\.png$/, '');
    }
    // 检查是否符合 96 种精美装备前缀
    if (/^(weapon|armor|helmet|belt|boots|cape|legs|offhand|ring|charm|pack|pouch|satchel|consumable|fashion|packstraps)-\d{2}$/.test(target)) {
      return new URL(`${target}.png`, equipArt).href;
    }
  }

  // 默认优雅 fallback 到精美道具箱
  return new URL('pack-03.png', equipArt).href;
}
