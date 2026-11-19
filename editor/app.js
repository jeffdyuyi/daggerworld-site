import { loadAccount, saveCharacter, deleteCharacter, readSession } from '../session.js';
import { itemArt, itemAppearances, validAppearance, spriteUrl, paintPaperdoll, downloadToken } from './paperdoll.js';

// Global App State
let db = null;
let currentUser = null;
let characters = [];
let activeCharIndex = 0;
let currentPickerSlot = null;
let activeRollAttr = 'agility';
let activeBagItemIndex = null;
const lastRollCache = new Map();
const rollAttributeNames = { agility: '敏捷', strength: '力量', finesse: '灵巧', instinct: '本能', presence: '风采', knowledge: '知识' };

// Class Icon Mapping for RPG Avatars
const classIconMap = {
  '战士': '⚔️', '守护者': '🛡️', '游荡者': '🗡️', '游侠': '🏹',
  '法师': '🔮', '德鲁伊': '🌿', '吟游诗人': '🎭', '神使': '✝️',
  '术士': '⚡', '邪术师': '👁️', '格斗家': '🥊', '审判官': '📜',
  '噬罪者': '💀', '奇术师': '✨'
};

let currentLayer = 'vault';
let isGmOverrideActive = false;

// ==========================================================================
// 战役公共原创资源库与图标解析器 (Kenney & PbDH Standard Compliant)
// ==========================================================================
let campaignResources = {
  name: '深水城2026战役扩展包',
  version: '1.0.0',
  author: '主持人基德',
  description: '深水城战役原创装备、战利品与领域法术卡',
  items: [],
  domainCards: []
};

function loadCampaignResources() {
  try {
    const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem('daggerworld.campaign_resources.v1') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        campaignResources = {
          name: parsed.name || '深水城2026战役扩展包',
          version: parsed.version || '1.0.0',
          author: parsed.author || '主持人基德',
          description: parsed.description || '',
          items: Array.isArray(parsed.items) ? parsed.items : [],
          domainCards: Array.isArray(parsed.domainCards) ? parsed.domainCards : []
        };
      }
    }
  } catch (err) {
    console.warn('读取战役资源库异常:', err);
  }
}

function saveCampaignResources() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('daggerworld.campaign_resources.v1', JSON.stringify(campaignResources));
    }
  } catch (err) {
    console.warn('存储战役资源库异常:', err);
  }
}

// 物品图标智能解析器 (Kenney 风格西幻物品字典)
function resolveItemIcon(name = '', type = '', subcat = '') {
  const str = (name + ' ' + type + ' ' + subcat).toLowerCase();
  if (/药水|药膏|灵药|解药|毒|毒液|溶剂|秘药|药剂/.test(str)) return '🧪';
  if (/口粮|干粮|面包|肉|干酪|麦酒|水袋|野粮|食物/.test(str)) return '🍖';
  if (/卷轴|羊皮纸|法术书|书|契约|地图|信|便笺/.test(str)) return '📜';
  if (/剑|长剑|短剑|大剑|阔剑|弯刀|军刀|重剑|刺剑|刃/.test(str)) return '🗡️';
  if (/匕首|飞刀|小刀|短刃|刺针|暗器/.test(str)) return '🔪';
  if (/盾|鸢盾|圆盾|塔盾|硬木盾|大盾/.test(str)) return '🛡️';
  if (/弓|长弓|短弓|弩|十字弩|箭|箭袋/.test(str)) return '🏹';
  if (/杖|法杖|魔杖|长棍|法球|圣徽/.test(str)) return '🪄';
  if (/斧|战斧|手斧|双刃斧|巨斧|重斧/.test(str)) return '🪓';
  if (/锤|战锤|链枷|钉头锤|重锤/.test(str)) return '🔨';
  if (/甲|板甲|胸甲|皮甲|链甲|锁子甲|鳞甲|战甲|外骨骼/.test(str)) return '🥋';
  if (/袍|法袍|长袍|斗篷|披风|风衣/.test(str)) return '🧥';
  if (/盔|头盔|面具|兜帽|护额|全覆盔|军帽/.test(str)) return '🪖';
  if (/冠|王冠|头冠|发带|环冠/.test(str)) return '👑';
  if (/手套|铁手套|臂铠|护腕/.test(str)) return '🧤';
  if (/靴|长靴|皮靴|战靴|踏云靴/.test(str)) return '🥾';
  if (/火把|提灯|油灯|火|火石|灯/.test(str)) return '🕯️';
  if (/绳|麻绳|铁链|钩爪|攀爬/.test(str)) return '🪢';
  if (/开锁器|钥匙|钥匙串|锁/.test(str)) return '🗝️';
  if (/宝石|水晶|奥术碎片|原石|钻石|红宝石|蓝宝石|祖母绿|珍珠/.test(str)) return '💎';
  if (/金币|钱袋|银币|铜币|金条|钱箱/.test(str)) return '💰';
  if (/戒|指环|魔戒/.test(str)) return '💍';
  if (/项链|护符|吊坠|首饰|徽章|挂坠/.test(str)) return '📿';
  if (/罗盘|指南针|星盘|日晷|仪/.test(str)) return '🧭';
  if (/笛|琴|鲁特琴|号角|竖琴|乐器/.test(str)) return '🪈';
  if (/炸弹|爆弹|雷管|火药/.test(str)) return '💣';
  if (/骰|骰子/.test(str)) return '🎲';
  if (/轮椅|战车|战斗轮椅/.test(str)) return '🦽';
  if (type === '消耗品') return '🧪';
  if (type === '战利品') return '💎';
  if (type === '武器') return '⚔️';
  if (type === '护甲') return '🛡️';
  return '📦';
}


// DOM Helper
const el = id => document.getElementById(id);

// Slot SVG Icon mapping
const slotIconMap = {
  head: './assets/icons/slot-head.svg',
  chest: './assets/icons/slot-armor.svg',
  wrists: './assets/icons/slot-wrists.svg',
  legs: './assets/icons/slot-legs.svg',
  feet: './assets/icons/slot-feet.svg',
  back: './assets/icons/slot-back.svg',
  ring1: './assets/icons/slot-ring-1.svg',
  ring2: './assets/icons/slot-ring-2.svg',
  trinket1: './assets/icons/slot-trinket-1.svg',
  trinket2: './assets/icons/slot-trinket-2.svg',
  suit: './assets/icons/slot-suit.svg',
  costume: './assets/icons/slot-costume.svg',
  weapon_main: './assets/icons/slot-primary-weapon.svg',
  weapon_off: './assets/icons/slot-secondary-weapon.svg',
  weapon_spare: './assets/icons/slot-backup-weapon-1.svg',
  main_bag: './assets/icons/slot-main-bag.svg',
  pouch_1: './assets/icons/slot-pouch-1.svg',
  pouch_2: './assets/icons/slot-pouch-2.svg',
  satchel_1: './assets/icons/slot-satchel-1.svg',
  satchel_2: './assets/icons/slot-satchel-2.svg'
};

// Domain Color Map (Matching all 11 Chinese domains)
let domainColors = {
  '利刃': '#b91c1c', '刀锋': '#b91c1c',
  '骸骨': '#9a3412', '骨骼': '#9a3412',
  '典籍': '#1d4ed8', '秘典': '#1d4ed8',
  '优雅': '#ec4899',
  '午夜': '#4c1d95',
  '贤者': '#047857', '智者': '#047857',
  '辉耀': '#d97706', '辉光': '#d97706',
  '勇气': '#b45309',
  '奥术': '#7c3aed',
  '恐怖': '#831843',
  '秘密': '#0f766e'
};

function getDomainColor(domain) {
  if (!domain) return '#64748b';
  if (domainColors[domain]) return domainColors[domain];
  const cd = (campaignResources.customDomains || []).find(d => d.name === domain);
  return cd?.color || '#64748b';
}

// Markdown & Rich Tag Renderer
function renderMarkdown(str) {
  if (!str) return '';
  let out = String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Color badges :red[**运气操控者**] or :red[...]
  out = out.replace(/:([a-z]+)\[(.*?)\]/g, (match, color, content) => {
    return `<span class="md-badge md-${color}">${content}</span>`;
  });

  // Bold italic ***...***
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold **...**
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic *...*
  out = out.replace(/\*([^\*\n]+?)\*/g, '<em>$1</em>');

  // Convert HTML breaks and bullet points
  out = out.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  out = out.replace(/\n\s*-\s+/g, '<br>• ');
  out = out.replace(/\n\n+/g, '<br><br>');
  out = out.replace(/\n/g, '<br>');

  return out;
}

// Clean title extractor from strings like ":red[**运气操控者**]：描述"
function cleanTitle(str, fallback = '特性') {
  if (!str) return fallback;
  const m = str.match(/(?::[a-z]+\[)?(?:\*\*)?([^\*\]:：\r\n]+)(?:\*\*)?(?:\])?[:：]?/);
  if (m && m[1] && m[1].trim().length > 0 && m[1].trim().length < 35) {
    return m[1].trim();
  }
  return fallback;
}


// Default Character Template
function createDefaultCharacter(name = '新晋冒险者', gender = '男', ancestryId = '种族:人类', classId = '职业:战士', subclassId = null) {
  return {
    id: 'local_' + Date.now(),
    avatar_name: name || '新晋冒险者',
    level: 1,
    notes: '',
    sheet: {
      gender: ['男', '女', '无'].includes(gender) ? gender : '男',
      ancestryId: ancestryId || '种族:人类',
      communityId: '社群:巧手匠',
      classId: classId || '职业:战士',
      subclassId: subclassId || '子职:战士:勇气呼唤:基础',
      hp: { cur: 6, max: 6 },
      stress: { cur: 0, max: 6 },
      hope: { cur: 2, max: 6 },
      armorPips: { cur: 0 },
      attributes: {
        agility: 0,
        strength: 2,
        finesse: 1,
        instinct: 1,
        presence: 0,
        knowledge: -1
      },
      advancements: [],
      equipment: {
        head: null,
        chest: null,
        wrists: null,
        legs: null,
        feet: null,
        back: null,
        ring1: null,
        ring2: null,
        trinket1: null,
        trinket2: null,
        suit: null,
        costume: null,
        weapon_main: null,
        weapon_off: null,
        weapon_spare: null
      },
      bags: {
        main_bag: null,
        pouch_1: null,
        pouch_2: null,
        satchel_1: null,
        satchel_2: null
      },
      inventoryItems: [],
      currency: { gold: 0, bags: 0, dust: 0 },
      equippedDomainCards: [],
      vaultDomainCards: [],
      customDomainCards: []
    }
  };
}

// Critical Schema Normalizer (Guarantees every field exists, preventing runtime exceptions!)
function normalizeCharacter(char) {
  if (!char || typeof char !== 'object') return createDefaultCharacter();
  const defaultChar = createDefaultCharacter();
  const defaultSheet = defaultChar.sheet;

  char.avatar_name = char.avatar_name || '深水城探索者';
  char.level = Number(char.level) || 1;
  char.notes = char.notes || '';
  char.id = char.id || ('local_' + Date.now());

  if (!char.sheet || typeof char.sheet !== 'object') {
    char.sheet = {};
  }
  const s = char.sheet;

  s.ancestryId = s.ancestryId || defaultSheet.ancestryId;
  s.communityId = s.communityId || defaultSheet.communityId;
  s.classId = s.classId || defaultSheet.classId;
  s.subclassId = s.subclassId || defaultSheet.subclassId;

  s.hp = {
    cur: typeof s.hp?.cur === 'number' ? s.hp.cur : defaultSheet.hp.cur,
    max: typeof s.hp?.max === 'number' ? s.hp.max : defaultSheet.hp.max
  };
  s.stress = {
    cur: typeof s.stress?.cur === 'number' ? s.stress.cur : defaultSheet.stress.cur,
    max: typeof s.stress?.max === 'number' ? s.stress.max : defaultSheet.stress.max
  };
  s.hope = {
    cur: typeof s.hope?.cur === 'number' ? s.hope.cur : defaultSheet.hope.cur,
    max: typeof s.hope?.max === 'number' ? s.hope.max : defaultSheet.hope.max
  };
  s.armorPips = {
    cur: typeof s.armorPips?.cur === 'number' ? s.armorPips.cur : 0
  };

  s.attributes = {
    agility: typeof s.attributes?.agility === 'number' ? s.attributes.agility : 0,
    strength: typeof s.attributes?.strength === 'number' ? s.attributes.strength : 2,
    finesse: typeof s.attributes?.finesse === 'number' ? s.attributes.finesse : 1,
    instinct: typeof s.attributes?.instinct === 'number' ? s.attributes.instinct : 1,
    presence: typeof s.attributes?.presence === 'number' ? s.attributes.presence : 0,
    knowledge: typeof s.attributes?.knowledge === 'number' ? s.attributes.knowledge : -1
  };

  s.gender = ['男', '女', '无'].includes(s.gender) ? s.gender : '男';
  s.advancements = Array.isArray(s.advancements) ? s.advancements : [];
  s.equipment = s.equipment && typeof s.equipment === 'object' ? s.equipment : { ...defaultSheet.equipment };
  s.bags = s.bags && typeof s.bags === 'object' ? s.bags : { ...defaultSheet.bags };
  s.inventoryItems = Array.isArray(s.inventoryItems) ? s.inventoryItems : [...defaultSheet.inventoryItems];
  s.currency = s.currency && typeof s.currency === 'object' ? s.currency : { ...defaultSheet.currency };
  s.equippedDomainCards = Array.isArray(s.equippedDomainCards) ? s.equippedDomainCards : [];
  s.vaultDomainCards = Array.isArray(s.vaultDomainCards) ? s.vaultDomainCards : [];
  s.customDomainCards = Array.isArray(s.customDomainCards) ? s.customDomainCards : [];

  return char;
}

// Active Character Helper
function curChar() {
  if (!characters.length) {
    characters.push(createDefaultCharacter());
    activeCharIndex = 0;
  }
  return normalizeCharacter(characters[activeCharIndex]);
}

// Application Initialization
async function init() {
  setupTabs();
  setupSlotIcons();
  setupCreationWizard();
  setupEventListeners();

  loadCampaignResources();
  // 1. 优先本地秒开 (0ms 极速响应，消除白屏等待)
  loadLocalFallback();

  // 2. 异步加载规则数据库并填充下拉菜单与创角选项
  try {
    const res = await fetch('./data/database.json');
    db = await res.json();
    populateSelectOptions();
  } catch (err) {
    console.error('Failed to load database.json:', err);
  }

  // 3. 决定初始层级视图 (如果 URL 包含 #sheet 则进入第二层工作台，否则默认进入第一层角色库大厅)
  const currentHash = (typeof location !== 'undefined' && location.hash) ? location.hash : '';
  if (currentHash === '#sheet' && characters.length > 0) {
    switchLayer('sheet', activeCharIndex);
  } else {
    switchLayer('vault');
  }

  // 4. 异步后台静默同步云端，网络延时不阻塞页面操作
  const session = readSession();
  if (session) {
    updateSyncStatus(true, `正在同步云端 · ${session.login || '冒险者'}…`);
    loadAccount().then(account => {
      currentUser = account;
      if (currentUser?.characters && currentUser.characters.length > 0) {
        characters = currentUser.characters.map(normalizeCharacter);
        activeCharIndex = 0;
        saveLocal(); // 同步缓存至本地
        renderVaultCharList();
        renderVaultLobby();
        renderAll();
      }
      updateSyncStatus(true, `云端已同步 · ${currentUser.login || '冒险者'}`);
    }).catch(err => {
      console.warn('Background sync deferred:', err.message);
      updateSyncStatus(false, `本地模式 · ${session.login || '冒险者'}`);
    });
  } else {
    updateSyncStatus(false, '本地离线模式');
  }
}

function loadLocalFallback() {
  const localData = localStorage.getItem('daggerworld.vault.v1');
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      characters = (Array.isArray(parsed) && parsed.length > 0) ? parsed.map(normalizeCharacter) : [createDefaultCharacter()];
    } catch {
      characters = [createDefaultCharacter()];
    }
  } else {
    characters = [createDefaultCharacter()];
  }
  updateSyncStatus(false, '本地离线档案');
}

function saveLocal() {
  localStorage.setItem('daggerworld.vault.v1', JSON.stringify(characters));
}

function updateSyncStatus(online, text) {
  const badge = el('sync-status');
  const span = el('sync-text');
  if (span) span.textContent = text;
  if (badge) {
    if (online) badge.classList.remove('offline');
    else badge.classList.add('offline');
  }
}

// Setup Static Slot Background Icons
function setupSlotIcons() {
  for (const [slotKey, iconPath] of Object.entries(slotIconMap)) {
    const iconBox = el(`slot-icon-${slotKey.replace('_', '-')}`);
    if (iconBox) {
      iconBox.style.backgroundImage = `url("${iconPath}")`;
    }
  }
}

// Setup Tab Navigation
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pageId = `page-${btn.dataset.page}`;
      const page = el(pageId);
      if (page) page.classList.add('active');
    });
  });
}

// Populate Select Dropdowns
function populateSelectOptions() {
  if (!db) return;

  const selAncestry = el('fn-select-ancestry');
  const selComm = el('fn-select-community');
  const selClass = el('fn-select-class');

  if (selAncestry && db.ancestries) {
    selAncestry.innerHTML = db.ancestries.map(a => `<option value="${a.ID}">${a.名称}</option>`).join('');
  }
  if (selComm && db.communities) {
    selComm.innerHTML = db.communities.map(c => `<option value="${c.ID}">${c.名称}</option>`).join('');
  }
  if (selClass && db.classes) {
    selClass.innerHTML = db.classes.map(c => `<option value="${c.ID}">${c.名称}</option>`).join('');
  }

  updateSubclassOptions();

  // Populate Layer 1 Creation Wizard dropdowns
  const newAnc = el('new-char-ancestry');
  const newCls = el('new-char-class');
  if (newAnc && db.ancestries) {
    newAnc.innerHTML = db.ancestries.map(a => `<option value="${a.ID}">${a.名称}</option>`).join('');
  }
  if (newCls && db.classes) {
    newCls.innerHTML = db.classes.map(c => `<option value="${c.ID}">${c.名称}</option>`).join('');
  }
  updateCreatorSubclassOptions();
  updateCreatorAncestryPreview();
  updateCreatorClassPreview();
}

function updateSubclassOptions() {
  if (!db || !db.subclasses) return;
  const c = curChar();
  const classObj = db.classes?.find(cls => cls.ID === c.sheet?.classId || cls.名称 === c.sheet?.classId);
  const className = classObj ? classObj.名称 : '战士';

  const subList = db.subclasses.filter(sc => sc.主职 === className || sc.ID.includes(className));
  const selSub = el('fn-select-subclass');
  if (selSub) {
    selSub.innerHTML = subList.map(sc => `<option value="${sc.ID}">${sc.名称} (${sc.等级 || '基础'})</option>`).join('');
    if (subList.length > 0) {
      if (!subList.some(o => o.ID === c.sheet.subclassId)) {
        c.sheet.subclassId = subList[0].ID;
      }
      selSub.value = c.sheet.subclassId;
    }
  }
}

// Dynamic Defense, Maximum Resources, and Damage Thresholds Engine
function calculateStats(char) {
  const lvl = char.level || 1;
  const s = char.sheet || {};
  const eq = s.equipment || {};
  const advs = s.advancements || [];

  // Base Max HP and Stress from Class & Advancements
  const clsObj = db?.classes?.find(x => x.ID === s.classId || x.名称 === s.classId);
  const baseHp = Number(clsObj?.生命点 || 6);
  const hpBonus = advs.filter(a => a.startsWith('hp')).length;
  const maxHp = baseHp + hpBonus;

  const stressBonus = advs.filter(a => a.startsWith('stress')).length;
  const maxStress = 6 + stressBonus;

  const hopeBonus = advs.filter(a => a === 'hope').length;
  const maxHope = 6 + hopeBonus;

  // Base Proficiency
  const baseProf = Math.max(1, Math.floor((lvl - 1) / 3) + 1);
  const profBonus = advs.filter(a => a === 'prof').length;
  const totalProf = baseProf + profBonus;

  // Armor & Thresholds Calculation
  let baseArmor = 0;
  let majorBonus = 0;
  let severeBonus = 0;
  let isSuitActive = false;
  let suitItem = null;

  // Check if a full suit is equipped (e.g. 皮甲套装, 锁甲套装, 板甲套装)
  if (eq.suit && eq.suit.名称 && eq.suit.名称 !== '无套装 (无甲)') {
    isSuitActive = true;
    suitItem = eq.suit;
    baseArmor = Number(suitItem.护甲值 || suitItem.基础护甲 || 1);
    majorBonus = Number(suitItem.重度阈值 || 1);
    severeBonus = Number(suitItem.严重阈值 || 2);
  } else {
    // Modular pieces calculation
    const pieces = [eq.head, eq.chest, eq.wrists, eq.legs, eq.feet, eq.back, eq.ring1, eq.ring2, eq.trinket1, eq.trinket2];
    for (const p of pieces) {
      if (p) {
        baseArmor += Number(p.护甲值 || 0);
        majorBonus += Number(p.重度阈值 || 0);
        severeBonus += Number(p.严重阈值 || 0);
      }
    }
  }

  // Off-hand shield bonus
  if (eq.weapon_off && eq.weapon_off.护甲值) {
    baseArmor += Number(eq.weapon_off.护甲值);
  }

  // Unarmored baseline thresholds: Major = Level, Severe = Level * 2
  const majorThreshold = lvl + majorBonus;
  const severeThreshold = (lvl * 2) + severeBonus;

  return {
    maxHp,
    maxStress,
    maxHope,
    totalProf,
    baseArmor,
    majorThreshold,
    severeThreshold,
    isSuitActive,
    suitItem,
    majorBonus,
    severeBonus
  };
}

// Main Render Function

// ==========================================================================
// 核心两层架构控制器 (Two-Tier Layer Controller)
// ==========================================================================
function switchLayer(layer, targetIndex) {
  currentLayer = layer;
  const vaultLayer = el('layer-vault');
  const sheetLayer = el('layer-sheet');
  const workshopLayer = el('layer-workshop');
  const backBtn = el('btn-back-vault');
  const brandLink = el('brand-link');

  if (layer === 'vault') {
    if (vaultLayer) vaultLayer.hidden = false;
    if (sheetLayer) sheetLayer.hidden = true;
    if (workshopLayer) workshopLayer.hidden = true;
    if (backBtn) backBtn.style.display = 'none';
    if (brandLink) brandLink.style.display = 'flex';
    renderVaultLobby();
    try { history.replaceState(null, '', '#vault'); } catch {}
  } else if (layer === 'workshop') {
    if (vaultLayer) vaultLayer.hidden = true;
    if (sheetLayer) sheetLayer.hidden = true;
    if (workshopLayer) workshopLayer.hidden = false;
    if (backBtn) {
      backBtn.style.display = 'inline-flex';
      backBtn.innerHTML = '<span>‹</span> 返回角色卡';
      backBtn.title = '返回角色卡页面';
    }
    if (brandLink) brandLink.style.display = 'flex';
    initWorkshopLayer();
    try { history.replaceState(null, '', '#workshop'); } catch {}
  } else {
    // sheet
    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < characters.length) {
      activeCharIndex = targetIndex;
    }
    if (vaultLayer) vaultLayer.hidden = true;
    if (sheetLayer) sheetLayer.hidden = false;
    if (workshopLayer) workshopLayer.hidden = true;
    if (backBtn) {
      backBtn.style.display = 'inline-flex';
      backBtn.innerHTML = '<span>‹</span> 角色库大厅';
      backBtn.title = '返回第一层角色库大厅';
    }
    renderAll();
    try { history.replaceState(null, '', '#sheet'); } catch {}
  }
}

// 渲染第一层：角色库展示与角色卡片列表
function renderVaultLobby() {
  const container = el('lobby-char-cards-container');
  const countBadge = el('vault-count-badge');
  if (countBadge) countBadge.textContent = characters.length;
  if (!container) return;

  container.innerHTML = '';
  if (!characters.length) {
    container.innerHTML = `
      <div style="grid-column:1/-1;background:var(--bg-card);padding:36px;border-radius:10px;border:1px dashed var(--border-bo3);text-align:center;">
        <p style="font-size:16px;color:var(--text-gold);margin-bottom:8px;">📜 暂无角色档案</p>
        <p style="font-size:13px;color:var(--text-muted);">可在右侧新建角色。</p>
      </div>
    `;
    return;
  }

  characters.forEach((char, idx) => {
    const s = char.sheet || {};
    const clsObj = db?.classes?.find(c => c.ID === s.classId || c.名称 === s.classId);
    const clsName = clsObj?.名称 || '战士';
    const ancObj = db?.ancestries?.find(a => a.ID === s.ancestryId || a.名称 === s.ancestryId);
    const ancName = ancObj?.名称 || '人类';
    const scObj = db?.subclasses?.find(sc => sc.ID === s.subclassId);
    const scName = scObj?.名称 || '初阶';
    const gender = s.gender || '男';
    const icon = classIconMap[clsName] || '⚔️';
    const isActive = idx === activeCharIndex;

    const card = document.createElement('div');
    card.className = `vault-char-card ${isActive ? 'active-char' : ''}`;
    card.innerHTML = `
      <div class="vcard-top">
        <div class="vcard-avatar">
          <span class="vcard-icon">${icon}</span>
        </div>
        <div class="vcard-meta">
          <div class="vcard-name-row">
            <h3 class="vcard-name">${char.avatar_name || '无名角色'}</h3>
            <span class="gender-badge gender-${gender}">${gender === '男' ? '♂ 男' : (gender === '女' ? '♀ 女' : '⚪ 无')}</span>
          </div>
          <div class="vcard-tags">
            <span class="vcard-tag">${ancName}</span>
            <span class="vcard-tag vcard-class">${clsName} · ${scName}</span>
            <span class="vcard-tag vcard-level">Lv.${char.level || 1}</span>
          </div>
        </div>
      </div>
      <div class="vcard-trackers">
        <div class="vcard-stat"><small>生命</small> <strong>${s.hp?.cur ?? 6}/${s.hp?.max ?? 6}</strong></div>
        <div class="vcard-stat"><small>压力</small> <strong>${s.stress?.cur ?? 0}/${s.stress?.max ?? 6}</strong></div>
        <div class="vcard-stat"><small>希望</small> <strong>${s.hope?.cur ?? 2}/${s.hope?.max ?? 6}</strong></div>
        <div class="vcard-stat"><small>护甲</small> <strong>${s.armorPips?.cur ?? 0}</strong></div>
      </div>
      <div class="vcard-actions">
        <button class="vcard-btn-enter" data-index="${idx}">
          <span>⚔️</span> 打开角色卡
        </button>
        <button class="vcard-btn-icon" data-action="export" data-index="${idx}" title="导出本卡 JSON">💾</button>
        <button class="vcard-btn-icon" data-action="delete" data-index="${idx}" title="删除角色" style="color:#ef4444;">🗑️</button>
      </div>
    `;

    // Bind card actions
    card.querySelector('.vcard-btn-enter').addEventListener('click', () => {
      switchLayer('sheet', idx);
    });
    card.querySelector('[data-action="export"]').addEventListener('click', (e) => {
      e.stopPropagation();
      exportCharacterJson(idx);
    });
    card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCharacterByIndex(idx);
    });

    container.appendChild(card);
  });
}

function exportCharacterJson(idx = null) {
  const target = (idx !== null && idx !== undefined && characters[idx]) ? characters[idx] : curChar();
  if (!target) return;
  const jsonStr = JSON.stringify(target, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `匕首世界角色_${target.avatar_name || '角色'}_Lv${target.level}.json`;
  a.click();
}

function deleteCharacterByIndex(idx) {
  const target = characters[idx];
  if (!target) return;
  if (confirm(`确定要彻底删除角色【${target.avatar_name}】吗？此操作无法撤销。`)) {
    characters.splice(idx, 1);
    if (!characters.length) {
      characters.push(createDefaultCharacter());
    }
    activeCharIndex = Math.min(activeCharIndex, characters.length - 1);
    saveLocal();
    renderVaultLobby();
  }
}

// ==========================================================================
// 创角向导 (Character Creation Wizard) 控制器
// ==========================================================================
function setupCreationWizard() {
  const genderPills = document.querySelectorAll('#gender-selector .gender-pill');
  const genderHidden = el('new-char-gender');
  genderPills.forEach(pill => {
    pill.addEventListener('click', () => {
      genderPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      if (genderHidden) genderHidden.value = pill.dataset.gender;
    });
  });

  const selAnc = el('new-char-ancestry');
  const selCls = el('new-char-class');
  const selSub = el('new-char-subclass');

  if (selAnc) {
    selAnc.addEventListener('change', updateCreatorAncestryPreview);
  }
  if (selCls) {
    selCls.addEventListener('change', () => {
      updateCreatorSubclassOptions();
      updateCreatorClassPreview();
    });
  }

  // 确立契约并创建角色
  const submitBtn = el('btn-submit-create-char');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const nameInput = el('new-char-name');
      const name = nameInput?.value?.trim() || '深水城探险者';
      const gender = genderHidden?.value || '男';
      const ancestryId = selAnc?.value || '种族:人类';
      const classId = selCls?.value || '职业:战士';
      const subclassId = selSub?.value || null;

      // 确立新角色
      const newChar = createDefaultCharacter(name, gender, ancestryId, classId, subclassId);
      
      // 根据所选职业同步初始生命与闪避
      const clsObj = db?.classes?.find(c => c.ID === classId || c.名称 === classId);
      if (clsObj) {
        newChar.sheet.hp.cur = Number(clsObj.生命点 || 6);
        newChar.sheet.hp.max = Number(clsObj.生命点 || 6);
      }

      characters.push(newChar);
      activeCharIndex = characters.length - 1;
      saveLocal();

      // 清空表单
      if (nameInput) nameInput.value = '';
      
      // 平滑切入第二层跑团工作台！
      switchLayer('sheet', activeCharIndex);
      alert(`已创建角色「${name}」。`);
    });
  }

  // 顶部“铸造新角色”平滑滚动
  const scrollCreateBtn = el('btn-hero-scroll-create');
  if (scrollCreateBtn) {
    scrollCreateBtn.addEventListener('click', () => {
      el('vault-creator-section')?.scrollIntoView?.({ behavior: 'smooth' });
      el('new-char-name')?.focus?.();
    });
  }

  // 导入角色卡 JSON
  const importBtn = el('btn-hero-import');
  const fileInput = el('hero-import-file');
  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          const normalized = normalizeCharacter(parsed);
          characters.push(normalized);
          activeCharIndex = characters.length - 1;
          saveLocal();
          renderVaultLobby();
          alert(`成功导入角色【${normalized.avatar_name}】！`);
        } catch {
          alert('导入失败：文件格式不符合匕首世界角色卡规范。');
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });
  }
}

function updateCreatorAncestryPreview() {
  const selAnc = el('new-char-ancestry');
  const preview = el('preview-ancestry-card');
  if (!selAnc || !preview || !db) return;
  const anc = db.ancestries?.find(a => a.ID === selAnc.value);
  if (anc) {
    preview.innerHTML = `
      <p style="margin-bottom:4px;color:var(--text-main);">${anc.简介 || ''}</p>
      <div>${renderMarkdown(anc.特性A || '')}</div>
      <div style="margin-top:4px;">${renderMarkdown(anc.特性B || '')}</div>
    `;
  }
}

function updateCreatorClassPreview() {
  const selCls = el('new-char-class');
  const preview = el('preview-class-card');
  if (!selCls || !preview || !db) return;
  const c = db.classes?.find(cls => cls.ID === selCls.value);
  if (c) {
    preview.innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:6px;font-size:11px;">
        <span style="color:var(--text-gold);"><strong>领域：</strong>${c.领域 || '战役'}</span>
        <span><strong>初始生命：</strong>${c.生命点 || 6}</span>
        <span><strong>初始闪避：</strong>${c.闪避值 || 10}</span>
      </div>
      <div>${renderMarkdown(c.职业特性 || '')}</div>
    `;
  }
}

function updateCreatorSubclassOptions() {
  const selCls = el('new-char-class');
  const selSub = el('new-char-subclass');
  if (!selCls || !selSub || !db) return;
  const clsObj = db.classes?.find(cls => cls.ID === selCls.value);
  const className = clsObj ? clsObj.名称 : '战士';
  const subs = (db.subclasses || []).filter(s => s.主职 === className || s.ID.includes(className));
  selSub.innerHTML = subs.map(s => `<option value="${s.ID}">${s.名称} (${s.等级 || '基础'})</option>`).join('');
}

function renderAll() {
  const c = curChar();
  renderLastRoll(c);
  const s = c.sheet;
  const stats = calculateStats(c);

  // Sync Max limits to state
  s.hp.max = stats.maxHp;
  s.stress.max = stats.maxStress;
  s.hope.max = stats.maxHope;
  if (s.hp.cur > s.hp.max) s.hp.cur = s.hp.max;
  if (s.stress.cur > s.stress.max) s.stress.cur = s.stress.max;
  if (s.hope.cur > s.hope.max) s.hope.cur = s.hope.max;
  if (s.armorPips.cur > stats.baseArmor) s.armorPips.cur = stats.baseArmor;

  // 1. Top Header Info
  el('cur-char-name').textContent = c.avatar_name || '无名角色';
  const clsObj = db?.classes?.find(x => x.ID === s.classId || x.名称 === s.classId);
  el('cur-char-class').textContent = `${clsObj?.名称 || '战士'} · Lv ${c.level}`;

  el('dash-name').textContent = c.avatar_name || '无名角色';
  el('dash-class').textContent = clsObj?.名称 || '战士';
  el('dash-level').textContent = `Lv ${c.level}`;

  const genderEl = el('dash-gender');
  if (genderEl) {
    const gender = s.gender || '男';
    genderEl.textContent = gender === '男' ? '♂ 男' : (gender === '女' ? '♀ 女' : '⚪ 无');
    genderEl.className = `gender-badge gender-${gender}`;
  }

  // 2. Combat Resource Tracks & Pips
  renderPips('hp', s.hp.cur, s.hp.max, 'filled-health');
  renderPips('stress', s.stress.cur, s.stress.max, 'filled-stress');
  renderPips('hope', s.hope.cur, s.hope.max, 'filled-hope');
  renderPips('armor', s.armorPips.cur, stats.baseArmor, 'filled-armor');

  el('hp-cur').textContent = s.hp.cur;
  el('hp-max').textContent = s.hp.max;
  el('stress-cur').textContent = s.stress.cur;
  el('stress-max').textContent = s.stress.max;
  el('hope-cur').textContent = s.hope.cur;
  el('hope-max').textContent = s.hope.max;
  el('armor-cur').textContent = s.armorPips.cur;
  el('armor-max').textContent = stats.baseArmor;

  // Thresholds Dashboard Readout
  el('th-minor').textContent = `1 ~ ${stats.majorThreshold - 1}`;
  el('th-major').textContent = `${stats.majorThreshold} ~ ${stats.severeThreshold - 1}`;
  el('th-severe').textContent = `${stats.severeThreshold}+`;

  // Defense Stats
  el('stat-armor-score').textContent = stats.baseArmor;
  el('stat-evasion').textContent = clsObj?.闪避值 || 8;
  el('stat-proficiency').textContent = stats.totalProf;

  // Advancements checkboxes
  const advContainer = el('advancements-container');
  if (advContainer) {
    advContainer.querySelectorAll('input[data-adv]').forEach(cb => {
      cb.checked = (s.advancements || []).includes(cb.dataset.adv);
    });
  }

  const tier = c.level <= 4 ? 1 : (c.level <= 7 ? 2 : 3);
  el('cur-tier-tag').textContent = `第 ${tier} 阶位 (${tier === 1 ? '1-4级' : (tier === 2 ? '5-7级' : '8-10级')})`;

  // 3. Equipment Loadout Slots
  renderEquipmentSlots(stats);

  // 4. Attributes Column
  if (s.attributes) {
    for (const [attr, mod] of Object.entries(s.attributes)) {
      const modEl = el(`attr-mod-${attr}`);
      if (modEl) modEl.textContent = (mod >= 0 ? `+${mod}` : `${mod}`);
    }
  }

  // 5. Foundations Page
  renderFoundations(clsObj);

  // 6. Skills / Domain Cards Page
  renderDomainCards();

  // 7. Inventory Page
  renderInventory(stats);
}

function renderPips(type, cur, max, fillClass) {
  const container = el(`${type}-pips`);
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < max; i++) {
    const pip = document.createElement('div');
    pip.className = `pip ${i < cur ? fillClass : ''}`;
    pip.title = `${type.toUpperCase()} 点数 ${i + 1}`;
    pip.addEventListener('click', () => {
      const c = curChar();
      if (type === 'hp') c.sheet.hp.cur = (i + 1 === c.sheet.hp.cur) ? i : i + 1;
      else if (type === 'stress') c.sheet.stress.cur = (i + 1 === c.sheet.stress.cur) ? i : i + 1;
      else if (type === 'hope') c.sheet.hope.cur = (i + 1 === c.sheet.hope.cur) ? i : i + 1;
      else if (type === 'armor') c.sheet.armorPips.cur = (i + 1 === c.sheet.armorPips.cur) ? i : i + 1;
      saveLocal();
      renderAll();
    });
    container.appendChild(pip);
  }
}

function renderEquipmentSlots(stats) {
  const c = curChar();
  const eq = c.sheet.equipment || {};

  el('suit-mode-tag').textContent = stats.isSuitActive ? `套装生效：${stats.suitItem.名称}` : '散件细分累加计算';
  el('suit-mode-tag').style.borderColor = stats.isSuitActive ? 'var(--accent-health)' : 'var(--border-bo3)';

  const slotKeys = ['head', 'chest', 'wrists', 'legs', 'feet', 'back', 'ring1', 'ring2', 'trinket1', 'trinket2', 'suit', 'costume'];
  for (const k of slotKeys) {
    const itemEl = el(`slot-name-${k}`);
    if (itemEl) {
      const item = eq[k];
      itemEl.textContent = item ? item.名称 : '空置';
      itemEl.style.color = item ? 'var(--text-main)' : 'var(--text-muted)';
      renderSlotArt(k, item);
    }
  }

  // Weapons
  el('wp-main-name').textContent = eq.weapon_main?.名称 || '空手';
  el('wp-main-stats').textContent = weaponSummary(eq.weapon_main);

  el('wp-off-name').textContent = eq.weapon_off?.名称 || '空置';
  el('wp-off-stats').innerHTML = eq.weapon_off ? renderMarkdown(eq.weapon_off.描述 || (eq.weapon_off.护甲值 ? `+${eq.weapon_off.护甲值} 护甲` : '')) || '—' : '—';

  el('wp-spare-name').textContent = eq.weapon_spare?.名称 || '空置';
  el('wp-spare-stats').textContent = weaponSummary(eq.weapon_spare);
  for (const slot of ['weapon_main', 'weapon_off', 'weapon_spare']) renderSlotArt(slot, eq[slot]);
  renderPaperdoll(c, stats.isSuitActive);
}

function weaponSummary(item) {
  return [item?.距离, item?.伤害, item?.属性].filter(Boolean).join(' · ') || '—';
}

function renderSlotArt(slot, item) {
  const icon = el(`slot-icon-${slot.replace('_', '-')}`);
  const source = item ? spriteUrl(itemArt(item)) : slotIconMap[slot];
  if (icon && source) {
    icon.style.backgroundImage = `url("${source}")`;
    icon.classList.toggle('pixel-item', Boolean(item));
  }
}

function itemImage(item) {
  const img = document.createElement('img');
  img.className = 'pixel-item-image';
  img.src = spriteUrl(itemArt(item));
  img.alt = '';
  img.loading = 'lazy';
  return img;
}

function renderPaperdoll(character, suitActive) {
  const look = character.sheet.paperdoll ?? {};
  el('paperdoll-skin').value = look.skin ?? '';
  el('paperdoll-hair').value = look.hair ?? 'brown';
  el('paperdoll-beard').checked = Boolean(look.beard);
  const exportButton = el('paperdoll-export');
  const status = el('paperdoll-status');
  exportButton.disabled = true;
  status.hidden = true;
  void paintPaperdoll(el('paperdoll'), character.sheet, suitActive)
    .then(painted => { if (painted) exportButton.disabled = false; })
    .catch(() => {
      if (!exportButton.disabled) return;
      status.textContent = '立绘加载失败';
      status.hidden = false;
    });
}

function renderFoundations(clsObj) {
  const c = curChar();
  const s = c.sheet;

  if (el('fn-char-name')) el('fn-char-name').value = c.avatar_name || '';
  if (s.ancestryId && el('fn-select-ancestry')) el('fn-select-ancestry').value = s.ancestryId;
  if (s.communityId && el('fn-select-community')) el('fn-select-community').value = s.communityId;
  if (s.classId && el('fn-select-class')) el('fn-select-class').value = s.classId;
  if (s.subclassId && el('fn-select-subclass')) el('fn-select-subclass').value = s.subclassId;
  if (el('fn-gm-notes')) el('fn-gm-notes').value = c.notes || '';

  // 性别标签与单选按钮微调 (男/女/无)
  const currentGender = s.gender || '男';
  const genderPills = document.querySelectorAll('#fn-gender-selector .gender-pill-mini');
  genderPills.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.gender === currentGender);
    btn.disabled = !isGmOverrideActive;
  });

  // 主持人特权调整 (GM Override) 状态与表单控制
  const lockStatusEl = el('fn-lock-status');
  const alertNoticeEl = el('gm-alert-notice');
  const gmToggleBtn = el('btn-gm-override-toggle');
  const lockedInputs = [
    el('fn-char-name'),
    el('fn-select-ancestry'),
    el('fn-select-community'),
    el('fn-select-class'),
    el('fn-select-subclass')
  ];

  if (isGmOverrideActive) {
    if (lockStatusEl) lockStatusEl.innerHTML = '<span style="color:#f59e0b;font-weight:bold;">👑 GM特权已激活 (可自由调整姓名/性别/种族/职业)</span>';
    if (alertNoticeEl) alertNoticeEl.hidden = false;
    if (gmToggleBtn) {
      gmToggleBtn.classList.add('active');
      gmToggleBtn.innerHTML = '<span>🔒</span> 锁定角色基石';
    }
    lockedInputs.forEach(input => {
      if (input) {
        input.disabled = false;
        input.classList.remove('locked-field');
      }
    });
  } else {
    if (lockStatusEl) lockStatusEl.innerHTML = '<span class="lock-icon">🔒</span> 核心基石已铭刻 (玩家锁定)';
    if (alertNoticeEl) alertNoticeEl.hidden = true;
    if (gmToggleBtn) {
      gmToggleBtn.classList.remove('active');
      gmToggleBtn.innerHTML = '<span>👑</span> GM特权调整';
    }
    lockedInputs.forEach(input => {
      if (input) {
        input.disabled = true;
        input.classList.add('locked-field');
      }
    });
  }

  // Ancestry Cards
  const anc = db?.ancestries?.find(a => a.ID === s.ancestryId);
  if (anc) {
    el('fn-ancestry-a-title').textContent = cleanTitle(anc.特性A, '种族核心特性');
    el('fn-ancestry-a-desc').innerHTML = renderMarkdown(anc.特性A || anc.简介 || '暂无详细描述');
    el('fn-ancestry-b-title').textContent = cleanTitle(anc.特性B, '种族辅助特性');
    el('fn-ancestry-b-desc').innerHTML = renderMarkdown(anc.特性B || '无特殊辅助特性');
  }

  // Class Core Trait
  if (clsObj) {
    el('fn-class-trait-title').textContent = `${clsObj.名称} · 职业特性`;
    let classDesc = '';
    if (clsObj.职业特性) classDesc += clsObj.职业特性;
    if (clsObj.希望特性) {
      if (classDesc) classDesc += '\n\n';
      classDesc += (clsObj.希望特性.startsWith(':') ? '' : ':gold[**希望特性**]：') + clsObj.希望特性;
    }
    el('fn-class-trait-desc').innerHTML = renderMarkdown(classDesc || clsObj.描述 || '标准职业机制');
  }

  // Subclass
  const sc = db?.subclasses?.find(sub => sub.ID === s.subclassId);
  if (sc) {
    el('fn-subclass-title').textContent = cleanTitle(sc.描述, `${sc.名称} (${sc.等级 || '基础'})`);
    el('fn-subclass-desc').innerHTML = renderMarkdown(sc.描述 || '子职业专精能力');

    // Spellcasting Trait
    const spCard = el('spellcasting-card');
    if (sc.施法属性 && sc.施法属性 !== '无' && sc.施法属性 !== 'N/A') {
      spCard.hidden = false;
      el('sp-trait-title').textContent = `核心施法流派 · 属性：【${sc.施法属性}】`;
      el('sp-trait-desc').innerHTML = renderMarkdown(`该角色具有施法能力，法术检定根据【${sc.施法属性}】属性值掷骰。难度DC根据目标调整。`);
    } else {
      spCard.hidden = true;
    }
  }

  // Community
  const comm = db?.communities?.find(cm => cm.ID === s.communityId);
  if (comm) {
    el('fn-community-title').textContent = comm.名称;
    el('fn-community-desc').innerHTML = renderMarkdown(comm.描述 || comm.简介 || '社群风俗');
  }
}

function renderDomainCards() {
  const c = curChar();
  const s = c.sheet;
  const isGMOverride = el('gm-override-domains').checked;

  const clsObj = db?.classes?.find(cls => cls.ID === s.classId || cls.名称 === s.classId);
  const classDomains = clsObj?.领域 ? clsObj.领域.split(/[+、,]/) : ['利刃', '骸骨'];

  // Domain filter tabs
  const filterBar = el('domain-filters-bar');
  const customDomainNames = (campaignResources.customDomains || []).map(cd => cd.name).filter(Boolean);
  const allDomains = ['全部', '利刃', '骸骨', '典籍', '优雅', '午夜', '贤者', '辉耀', '勇气', '奥术', '恐怖', '秘密', ...customDomainNames];
  const allowed = isGMOverride ? allDomains : ['全部', ...classDomains];

  filterBar.innerHTML = allowed.map(d => `<button class="domain-pill ${d === '全部' ? 'active' : ''}" data-domain="${d}">${d}</button>`).join('');
  filterBar.querySelectorAll('.domain-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      filterBar.querySelectorAll('.domain-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterDomainCardsDisplay(btn.dataset.domain, isGMOverride, classDomains);
    });
  });

  filterDomainCardsDisplay('全部', isGMOverride, classDomains);
}

function filterDomainCardsDisplay(filterDomain, isGMOverride, classDomains) {
  const c = curChar();
  const s = c.sheet;
  const equippedContainer = el('equipped-cards-container');
  const vaultContainer = el('domain-vault-cards-container');

  // Equipped Cards
  const equipped = s.equippedDomainCards || [];
  el('equipped-cards-count').textContent = equipped.length;
  equippedContainer.innerHTML = equipped.length ? '' : '<div style="color:var(--text-muted);font-size:13px;padding:12px;">尚未整备随身领域卡，请从下方秘藏中点击卡牌整备。</div>';
  equipped.forEach((card, idx) => {
    equippedContainer.appendChild(createCardElement(card, true, idx));
  });

  // Vault Cards
  const customCards = s.customDomainCards || [];
  const campaignCards = campaignResources.domainCards || [];
  let available = [...(db?.domain_cards || []), ...customCards, ...campaignCards];

  if (!isGMOverride) {
    available = available.filter(card => classDomains.some(cd => card.领域 && (card.领域.includes(cd) || cd.includes(card.领域))));
  }

  if (filterDomain !== '全部') {
    available = available.filter(card => card.领域 === filterDomain);
  }

  // Filter out already equipped
  const equippedIds = new Set(equipped.map(e => e.ID || e.名称));
  available = available.filter(c => !equippedIds.has(c.ID || c.名称));

  vaultContainer.innerHTML = '';
  available.slice(0, 30).forEach(card => {
    vaultContainer.appendChild(createCardElement(card, false));
  });
}

function createCardElement(card, isEquipped, index) {
  const div = document.createElement('div');
  div.className = `dh-card ${isEquipped ? 'equipped' : ''}`;
  div.innerHTML = `
    <div class="dh-card-banner">
      <span class="dh-domain-tag" style="background:${getDomainColor(card.领域)}">${card.领域 || '战役'} · ${card.等级 || '1级'}</span>
      <span class="dh-card-recall">⚡ ${card.回想 || '0⚡'}</span>
    </div>
    <div class="dh-card-title">${card.名称}</div>
    <div class="dh-card-type">${card.类型 || '领域能力'}</div>
    <div class="dh-card-desc">${renderMarkdown(card.描述 || '')}</div>
    <div class="dh-card-action">${isEquipped ? '✕ 点击卸下至秘藏' : '＋ 点击整备至随身'}</div>
  `;
  div.addEventListener('click', () => {
    const c = curChar();
    if (isEquipped) {
      c.sheet.equippedDomainCards.splice(index, 1);
    } else {
      if ((c.sheet.equippedDomainCards || []).length >= 5) {
        alert('随身整备卡牌最多为 5 张！请先卸下其他卡牌。');
        return;
      }
      if (!c.sheet.equippedDomainCards) c.sheet.equippedDomainCards = [];
      c.sheet.equippedDomainCards.push(card);
    }
    saveLocal();
    renderAll();
  });
  return div;
}

function bagCapacity(bags) {
  const mainCap = Number(bags.main_bag?.capacity ?? bags.main_bag?.容量) || 10;
  const p1Cap = Number(bags.pouch_1?.capacity ?? bags.pouch_1?.容量) || 0;
  const p2Cap = Number(bags.pouch_2?.capacity ?? bags.pouch_2?.容量) || 0;
  const s1Cap = Number(bags.satchel_1?.capacity ?? bags.satchel_1?.容量) || 0;
  const s2Cap = Number(bags.satchel_2?.capacity ?? bags.satchel_2?.容量) || 0;
  const extraCap = p1Cap + p2Cap + s1Cap + s2Cap;
  return { mainCap, p1Cap, p2Cap, s1Cap, s2Cap, extraCap, totalSlots: mainCap + extraCap };
}

function renderInventory(stats) {
  const c = curChar();
  const bags = c.sheet.bags || {};
  const { mainCap, p1Cap, p2Cap, s1Cap, s2Cap, extraCap, totalSlots } = bagCapacity(bags);

  el('bag-base-slots').textContent = mainCap;
  el('bag-extra-slots').textContent = extraCap;
  el('bag-total-slots').textContent = totalSlots;

  el('bag-name-main').textContent = bags.main_bag?.名称 || '10格标准行囊';
  el('bag-name-pouch1').textContent = bags.pouch_1 ? `${bags.pouch_1.名称} (+${p1Cap}格)` : '空腰带位 (0格)';
  el('bag-name-pouch2').textContent = bags.pouch_2 ? `${bags.pouch_2.名称} (+${p2Cap}格)` : '空腰带位 (0格)';
  el('bag-name-satchel1').textContent = bags.satchel_1 ? `${bags.satchel_1.名称} (+${s1Cap}格)` : '空挎包位 (0格)';
  el('bag-name-satchel2').textContent = bags.satchel_2 ? `${bags.satchel_2.名称} (+${s2Cap}格)` : '空挎包位 (0格)';
  for (const slot of ['main_bag', 'pouch_1', 'pouch_2', 'satchel_1', 'satchel_2']) renderSlotArt(slot, bags[slot]);

  // Visual Grid
  const grid = el('inventory-grid');
  grid.innerHTML = '';
  const items = c.sheet.inventoryItems || [];

  for (let i = 0; i < totalSlots; i++) {
    const item = items[i];
    const cell = document.createElement('div');
    cell.className = `grid-cell ${item ? 'occupied' : ''}`;
    if (item) {
      cell.innerHTML = `
        <span class="cell-icon"></span>
        <span class="cell-name">${item.name}</span>
        ${item.qty > 1 ? `<span class="cell-qty">x${item.qty}</span>` : ''}
      `;
      cell.querySelector('.cell-icon').append(itemImage(item));
      cell.title = `${item.name}: ${item.desc || '物品'}\n(点击操作)`;
      cell.addEventListener('click', () => {
        openItemActionModal(i);
      });
    } else {
      cell.innerHTML = `<span style="color:rgba(255,255,255,0.08);font-size:11px;">#${i + 1}</span>`;
      cell.addEventListener('click', () => {
        openAddItemModal(i);
      });
    }
    grid.appendChild(cell);
  }

  // Currency
  const curr = c.sheet.currency || { gold: 15, bags: 1, dust: 0 };
  el('coin-gold').value = curr.gold;
  el('coin-bags').value = curr.bags;
  el('coin-dust').value = curr.dust;

  // Armor Formula Breakdown Readout
  const fb = el('armor-formula-breakdown');
  fb.innerHTML = `
    <div class="formula-row">
      <span>基准无甲状态公式：</span>
      <span>基础护甲 0 点，重度阈值 = 等级 (${c.level})，严重阈值 = 等级×2 (${c.level * 2})</span>
    </div>
    <div class="formula-row">
      <span>防具计算模式：</span>
      <span class="formula-rule-badge">${stats.isSuitActive ? '套装覆盖模式 (SRD 套装规则)' : '散件细分累加模式'}</span>
    </div>
    ${stats.isSuitActive ? `
      <div class="formula-row" style="color:var(--text-gold);">
        <span>当前生效套装：<strong>${stats.suitItem.名称}</strong></span>
        <span>基础护甲 ${stats.baseArmor} | 重度阈值 +${stats.majorBonus} (总 ${stats.majorThreshold}) | 严重阈值 +${stats.severeBonus} (总 ${stats.severeThreshold})</span>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:6px;">
        ※ 穿戴了整套护甲（如皮甲套装、锁甲套装），系统已自动覆盖头部、身躯、腿部等散件护甲值，以套装统一防护力进行严谨判定。
      </p>
    ` : `
      <div class="formula-row" style="color:var(--text-main);">
        <span>散件部件加成累加：</span>
        <span>散件提供护甲 +${stats.baseArmor} | 重度加成 +${stats.majorBonus} (总 ${stats.majorThreshold}) | 严重加成 +${stats.severeBonus} (总 ${stats.severeThreshold})</span>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:6px;">
        ※ 未装备整套套装时，角色自由组合穿戴的头盔、身躯、护腕、护胫等部件将各自叠加护甲槽与阈值加成。
      </p>
    `}
  `;
}

// Event Listeners Setup
function setupEventListeners() {
  // Steppers: Level
  el('lvl-up').addEventListener('click', () => {
    const c = curChar();
    if (c.level < 10) { c.level++; saveLocal(); renderAll(); }
  });
  el('lvl-down').addEventListener('click', () => {
    const c = curChar();
    if (c.level > 1) { c.level--; saveLocal(); renderAll(); }
  });

  // Resource Plus/Minus Buttons
  el('hp-plus').addEventListener('click', () => { const c = curChar(); if (c.sheet.hp.cur < c.sheet.hp.max) { c.sheet.hp.cur++; saveLocal(); renderAll(); } });
  el('hp-minus').addEventListener('click', () => { const c = curChar(); if (c.sheet.hp.cur > 0) { c.sheet.hp.cur--; saveLocal(); renderAll(); } });
  el('stress-plus').addEventListener('click', () => { const c = curChar(); if (c.sheet.stress.cur < c.sheet.stress.max) { c.sheet.stress.cur++; saveLocal(); renderAll(); } });
  el('stress-minus').addEventListener('click', () => { const c = curChar(); if (c.sheet.stress.cur > 0) { c.sheet.stress.cur--; saveLocal(); renderAll(); } });
  el('hope-plus').addEventListener('click', () => { const c = curChar(); if (c.sheet.hope.cur < c.sheet.hope.max) { c.sheet.hope.cur++; saveLocal(); renderAll(); } });
  el('hope-minus').addEventListener('click', () => { const c = curChar(); if (c.sheet.hope.cur > 0) { c.sheet.hope.cur--; saveLocal(); renderAll(); } });
  el('armor-plus').addEventListener('click', () => { const c = curChar(); const st = calculateStats(c); if (c.sheet.armorPips.cur < st.baseArmor) { c.sheet.armorPips.cur++; saveLocal(); renderAll(); } });
  el('armor-minus').addEventListener('click', () => { const c = curChar(); if (c.sheet.armorPips.cur > 0) { c.sheet.armorPips.cur--; saveLocal(); renderAll(); } });

  // Attribute Steppers (+ / -)
  document.querySelectorAll('.attr-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const attr = btn.dataset.attrStep;
      const delta = parseInt(btn.dataset.delta, 10);
      const c = curChar();
      const curVal = c.sheet.attributes[attr] || 0;
      c.sheet.attributes[attr] = Math.max(-2, Math.min(5, curVal + delta));
      saveLocal();
      renderAll();
    });
  });

  // Advancements Checkboxes
  document.querySelectorAll('input[data-adv]').forEach(cb => {
    cb.addEventListener('change', () => {
      const adv = cb.dataset.adv;
      const c = curChar();
      if (!c.sheet.advancements) c.sheet.advancements = [];
      if (cb.checked) {
        if (!c.sheet.advancements.includes(adv)) c.sheet.advancements.push(adv);
      } else {
        c.sheet.advancements = c.sheet.advancements.filter(a => a !== adv);
      }
      saveLocal();
      renderAll();
    });
  });

  // Gear Slot Clicks (Open Picker Modal)
  document.querySelectorAll('.gear-slot, .weapon-slot, .bag-slot-card').forEach(slot => {
    slot.addEventListener('click', () => {
      const slotKey = slot.dataset.slot || slot.dataset.bagSlot;
      openItemPicker(slotKey);
    });
  });

  // Roll Attribute Buttons
  document.querySelectorAll('.roll-trigger-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const attr = btn.dataset.attrRoll;
      openDiceRoll(attr);
    });
  });

  // Foundations Change Events
  el('fn-char-name').addEventListener('input', e => {
    const c = curChar();
    c.avatar_name = e.target.value;
    saveLocal();
    el('cur-char-name').textContent = c.avatar_name;
    el('dash-name').textContent = c.avatar_name;
  });

  // GM Override Toggle & Field Unlocking
  const gmToggleBtn = el('btn-gm-override-toggle');
  if (gmToggleBtn) {
    gmToggleBtn.addEventListener('click', () => {
      isGmOverrideActive = !isGmOverrideActive;
      const c = curChar();
      const clsObj = db?.classes?.find(cls => cls.ID === c.sheet.classId || cls.名称 === c.sheet.classId);
      renderFoundations(clsObj);
    });
  }

  // Foundations Gender Selection (when GM Override is active)
  document.querySelectorAll('#fn-gender-selector .gender-pill-mini').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!isGmOverrideActive) return;
      const c = curChar();
      c.sheet.gender = btn.dataset.gender;
      saveLocal();
      const clsObj = db?.classes?.find(cls => cls.ID === c.sheet.classId || cls.名称 === c.sheet.classId);
      renderFoundations(clsObj);
      renderAll();
    });
  });

  el('fn-select-ancestry').addEventListener('change', e => {
    const c = curChar();
    c.sheet.ancestryId = e.target.value;
    saveLocal();
    renderAll();
  });

  el('fn-select-community').addEventListener('change', e => {
    const c = curChar();
    c.sheet.communityId = e.target.value;
    saveLocal();
    renderAll();
  });

  el('fn-select-class').addEventListener('change', e => {
    const c = curChar();
    c.sheet.classId = e.target.value;
    updateSubclassOptions();
    c.sheet.subclassId = el('fn-select-subclass').value;
    saveLocal();
    renderAll();
  });

  el('fn-select-subclass').addEventListener('change', e => {
    const c = curChar();
    c.sheet.subclassId = e.target.value;
    saveLocal();
    renderAll();
  });

  el('fn-gm-notes').addEventListener('input', e => {
    const c = curChar();
    c.notes = e.target.value;
    saveLocal();
  });

  // Currency Inputs
  ['gold', 'bags', 'dust'].forEach(type => {
    el(`coin-${type}`).addEventListener('change', e => {
      const c = curChar();
      c.sheet.currency[type] = Number(e.target.value) || 0;
      saveLocal();
    });
  });

  // GM Override Domains Toggle
  el('gm-override-domains').addEventListener('change', () => {
    renderDomainCards();
  });

  // Top Bar Actions & Two-Tier Layer Switching
  el('btn-back-vault')?.addEventListener('click', () => {
    if (currentLayer === 'workshop') {
      switchLayer(characters.length > 0 ? 'sheet' : 'vault');
    } else {
      switchLayer('vault');
    }
  });
  el('btn-open-vault')?.addEventListener('click', () => switchLayer('vault'));
  el('brand-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchLayer('vault');
  });

  el('vault-open-btn').addEventListener('click', openVaultModal);
  el('vault-modal-close').addEventListener('click', closeVaultModal);
  el('vault-create-btn').addEventListener('click', createNewAvatar);
  el('vault-refresh-btn').addEventListener('click', async () => {
    try {
      updateSyncStatus(true, '正在刷新云端…');
      const account = await loadAccount();
      if (account?.characters?.length) {
        characters = account.characters.map(normalizeCharacter);
        activeCharIndex = 0;
        updateSyncStatus(true, `云端已同步 · ${account.login || '冒险者'}`);
        renderVaultCharList();
        renderAll();
      } else {
        alert('云端暂无其他角色。');
      }
    } catch (err) {
      alert('刷新失败：' + err.message);
    }
  });

  el('btn-save-cloud').addEventListener('click', async () => {
    try {
      const c = curChar();
      updateSyncStatus(true, '正在上传云端…');
      const isExistingCloudRecord = c.id && !c.id.startsWith('local_') && !c.id.startsWith('imported_') && c.updated_at;
      const saved = await saveCharacter({
        avatar_name: c.avatar_name,
        level: c.level,
        sheet: c.sheet,
        notes: c.notes
      }, isExistingCloudRecord ? c : null);
      c.id = saved.id;
      c.updated_at = saved.updated_at;
      saveLocal();
      updateSyncStatus(true, '云端已同步！');
      alert(`角色【${c.avatar_name}】已成功同步至云端！`);
    } catch (err) {
      alert('保存至云端失败：' + err.message);
      updateSyncStatus(false, '保存失败 (已存本地)');
    }
  });

  // Fixed More Dropdown (Toggle class 'show' and close on outside click)
  const moreBtn = el('btn-more-toggle');
  const moreDropdown = el('more-dropdown');
  moreBtn.addEventListener('click', e => {
    e.stopPropagation();
    moreDropdown.classList.toggle('show');
  });
  document.addEventListener('click', e => {
    if (moreDropdown.classList.contains('show') && !moreDropdown.contains(e.target) && e.target !== moreBtn) {
      moreDropdown.classList.remove('show');
    }
  });

  el('btn-create-char').addEventListener('click', () => {
    moreDropdown.classList.remove('show');
    switchLayer('vault');
    setTimeout(() => {
      el('vault-creator-section')?.scrollIntoView?.({ behavior: 'smooth' });
      el('new-char-name')?.focus?.();
    }, 50);
  });
  el('btn-export-json').addEventListener('click', () => {
    moreDropdown.classList.remove('show');
    exportCharacterJson();
  });
  el('import-json-file').addEventListener('change', e => {
    moreDropdown.classList.remove('show');
    importCharacterJson(e);
  });
  el('btn-roll-init').addEventListener('click', () => {
    moreDropdown.classList.remove('show');
    openDiceRoll('agility');
  });

  // Picker Modal
  el('item-picker-close').addEventListener('click', () => el('item-picker-modal').hidden = true);
  el('picker-unequip-btn').addEventListener('click', unequipCurrentSlot);

  // Search in item picker
  el('picker-search-input').addEventListener('input', e => {
    filterPickerItems(e.target.value.trim().toLowerCase());
  });

  // Dice Modal
  el('dice-roll-close').addEventListener('click', () => el('dice-roll-modal').hidden = true);
  el('btn-re-roll').addEventListener('click', () => executeDualityRoll(activeRollAttr));

  // GM Workshop Triggers & Layer 3 Navigation
  el('btn-open-workshop')?.addEventListener('click', () => switchLayer('workshop'));
  el('btn-dropdown-workshop')?.addEventListener('click', () => {
    el('more-dropdown')?.classList.remove('show');
    switchLayer('workshop');
  });
  el('btn-fn-open-workshop')?.addEventListener('click', () => switchLayer('workshop'));
  el('btn-open-item-workshop')?.addEventListener('click', () => switchLayer('workshop'));
  el('btn-add-custom-card')?.addEventListener('click', () => {
    switchLayer('workshop');
    switchWorkshopWorkbenchTab('domain-card');
  });

  // Workshop Return Navigation
  el('btn-ws-to-sheet')?.addEventListener('click', () => switchLayer('sheet'));
  el('btn-ws-to-vault')?.addEventListener('click', () => switchLayer('vault'));

  // Target Character Selector
  el('ws-target-char-select')?.addEventListener('change', (e) => {
    workshopState.targetCharIndex = Number(e.target.value) || 0;
    updateWorkshopTargetSelect();
  });

  // Workshop Workbench Tabs
  document.querySelectorAll('.ws-workbench-tabs .ws-wtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchWorkshopWorkbenchTab(btn.dataset.targetTab);
    });
  });

  // Workshop Library Filter Pills
  document.querySelectorAll('.ws-filter-pills .ws-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ws-filter-pills .ws-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      workshopState.filter = btn.dataset.wsFilter;
      renderWorkshopLibrary();
    });
  });

  // Workshop Library Search Box
  el('ws-library-search')?.addEventListener('input', (e) => {
    workshopState.searchQuery = e.target.value.trim();
    renderWorkshopLibrary();
  });

  // Cancel Edit Mode
  el('btn-cancel-edit')?.addEventListener('click', cancelWorkshopEdit);
  el('btn-cancel-cd-edit')?.addEventListener('click', cancelCustomDomainEdit);

  // Form Submissions
  el('btn-ws-dispatch-item')?.addEventListener('click', () => handleWorkshopItemSubmit(true));
  el('btn-ws-save-item')?.addEventListener('click', () => handleWorkshopItemSubmit(false));
  el('btn-ws-dispatch-card')?.addEventListener('click', () => handleWorkshopCardSubmit(true));
  el('btn-ws-save-card')?.addEventListener('click', () => handleWorkshopCardSubmit(false));
  el('btn-ws-save-domain')?.addEventListener('click', handleSaveCustomDomain);

  // Live Previews for Forms
  const appearanceSelect = el('ws-item-appearance');
  for (const [value, label] of Object.entries(itemAppearances)) appearanceSelect.add(new Option(label, value));
  ['ws-item-name', 'ws-item-type', 'ws-item-tier', 'ws-item-subcat', 'ws-item-stats', 'ws-item-desc', 'ws-item-appearance'].forEach(id => {
    el(id)?.addEventListener('input', updateItemPreview);
    el(id)?.addEventListener('change', updateItemPreview);
  });
  ['ws-card-name', 'ws-card-domain', 'ws-card-type', 'ws-card-level', 'ws-card-recall', 'ws-card-desc'].forEach(id => {
    el(id)?.addEventListener('input', updateCardPreview);
    el(id)?.addEventListener('change', updateCardPreview);
  });

  // Color Preset Dots
  document.querySelectorAll('.preset-colors .color-preset-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const color = dot.dataset.color;
      if (color && el('ws-cd-color')) {
        el('ws-cd-color').value = color;
      }
    });
  });

  // Workshop PbDH Pack Operations
  el('btn-ws-export-pack')?.addEventListener('click', exportPbDHPack);
  el('ws-import-pack-file')?.addEventListener('change', importPbDHPack);
  el('btn-ws-clear-lib')?.addEventListener('click', clearWorkshopLibrary);

  // Add Item to Bag
  el('btn-add-item').addEventListener('click', () => openAddItemModal());
  el('btn-loot-catalog').addEventListener('click', () => openItemPicker('loot'));
  for (const field of ['skin', 'hair', 'beard']) {
    el(`paperdoll-${field}`).addEventListener('change', event => {
      const character = curChar();
      const value = field === 'beard' ? event.target.checked : event.target.value;
      character.sheet.paperdoll = { ...character.sheet.paperdoll, [field]: value };
      saveLocal();
      renderPaperdoll(character, calculateStats(character).isSuitActive);
    });
  }
  el('paperdoll-export').addEventListener('click', () => downloadToken(el('paperdoll'), curChar().avatar_name));
  el('btn-clean-bag').addEventListener('click', () => {
    const c = curChar();
    c.sheet.inventoryItems = (c.sheet.inventoryItems || []).filter(Boolean);
    saveLocal();
    renderInventory(calculateStats(c));
  });

  // Item Action Modal
  el('item-action-close').addEventListener('click', () => el('item-action-modal').hidden = true);
  el('item-qty-plus').addEventListener('click', () => {
    if (activeBagItemIndex === null) return;
    const c = curChar();
    const item = c.sheet.inventoryItems[activeBagItemIndex];
    if (item) {
      item.qty = (item.qty || 1) + 1;
      el('item-qty-val').textContent = item.qty;
      saveLocal();
      renderInventory(calculateStats(c));
    }
  });
  el('item-qty-minus').addEventListener('click', () => {
    if (activeBagItemIndex === null) return;
    const c = curChar();
    const item = c.sheet.inventoryItems[activeBagItemIndex];
    if (item && item.qty > 1) {
      item.qty -= 1;
      el('item-qty-val').textContent = item.qty;
      saveLocal();
      renderInventory(calculateStats(c));
    }
  });
  el('item-action-use').addEventListener('click', () => {
    if (activeBagItemIndex === null) return;
    const c = curChar();
    const item = c.sheet.inventoryItems[activeBagItemIndex];
    if (item) {
      if (item.qty > 1) {
        item.qty -= 1;
      } else {
        c.sheet.inventoryItems.splice(activeBagItemIndex, 1);
      }
      saveLocal();
      renderInventory(calculateStats(c));
      el('item-action-modal').hidden = true;
    }
  });
  el('item-action-delete').addEventListener('click', () => {
    if (activeBagItemIndex === null) return;
    const c = curChar();
    const item = c.sheet.inventoryItems[activeBagItemIndex];
    if (item && confirm(`确定要丢弃【${item.name}】吗？`)) {
      c.sheet.inventoryItems.splice(activeBagItemIndex, 1);
      saveLocal();
      renderInventory(calculateStats(c));
      el('item-action-modal').hidden = true;
    }
  });
}

// Item Action Modal
function openItemActionModal(index) {
  activeBagItemIndex = index;
  const c = curChar();
  const item = c.sheet.inventoryItems[index];
  if (!item) return;

  el('item-action-title').textContent = `物品：【${item.name}】`;
  el('item-action-desc').innerHTML = renderMarkdown(item.desc || '行装杂物');
  el('item-qty-val').textContent = item.qty || 1;
  el('item-action-modal').hidden = false;
}

// Cached picker candidates
let currentPickerCandidates = [];

// Item Picker Modal Logic
function openItemPicker(slotKey) {
  currentPickerSlot = slotKey;
  el('item-picker-modal').hidden = false;
  const isLoot = slotKey === 'loot';
  el('picker-title').textContent = isLoot ? '战利品与消耗品' : `选择装备 · ${getSlotTitle(slotKey)}`;
  const search = el('picker-search-input');
  search.value = '';
  search.placeholder = isLoot ? '搜索物品' : '搜索装备';
  el('picker-unequip-btn').hidden = isLoot;

  let candidates = [];
  if (isLoot) {
    candidates = db?.loot || [];
  } else if (slotKey.startsWith('weapon_')) {
    candidates = (db?.weapons || []).filter(item => item.类型 === (slotKey === 'weapon_off' ? '副武器' : '主武器'));
  } else if (slotKey === 'suit') {
    candidates = db?.armor || [];
  } else if (slotKey === 'costume') {
    candidates = (db?.modular_gear || []).filter(item => item.部位 === 'costume');
  } else if (slotKey.includes('bag') || slotKey.includes('pouch') || slotKey.includes('satchel')) {
    const part = slotKey === 'main_bag' ? 'main-bag' : slotKey.split('_')[0];
    candidates = (db?.modular_gear || []).filter(g => g.部位 === part);
  } else {
    const part = slotKey.replace(/[0-9]/g, '');
    candidates = (db?.modular_gear || []).filter(g => g.部位 === part || g.类型 === getSlotTitle(slotKey));
  }

  currentPickerCandidates = candidates;
  renderPickerList(candidates);
}

function filterPickerItems(kw) {
  if (!kw) {
    renderPickerList(currentPickerCandidates);
    return;
  }
  const filtered = currentPickerCandidates.filter(item => 
    (item.名称 && item.名称.toLowerCase().includes(kw)) ||
    (item.描述 && item.描述.toLowerCase().includes(kw)) ||
    (item.类型 && item.类型.toLowerCase().includes(kw))
  );
  renderPickerList(filtered);
}

function renderPickerList(items) {
  const list = el('picker-items-list');
  list.innerHTML = '';

  if (!items.length) {
    list.innerHTML = '<div style="color:var(--text-muted);padding:16px;">未找到物品。</div>';
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'picker-item-card';
    card.innerHTML = `
      <div class="picker-item-title">${item.名称}</div>
      <div class="picker-item-stats">${item.护甲值 ? `+${item.护甲值} 护甲` : ''} ${item.伤害 ? `伤害 ${item.伤害}` : ''} ${item.容量 ? `容量 +${item.容量}格` : ''}</div>
      <div class="picker-item-desc">${renderMarkdown(item.描述 || '')}</div>
      <button type="button" class="picker-item-equip-btn">${currentPickerSlot === 'loot' ? '放入背包' : '装备'}</button>
    `;
    card.querySelector('.picker-item-title').prepend(itemImage(item));
    card.addEventListener('click', () => {
      if (currentPickerSlot === 'loot') {
        if (!putLootInBag(item)) return;
      } else {
        equipItemToSlot(currentPickerSlot, item);
      }
      el('item-picker-modal').hidden = true;
    });
    list.appendChild(card);
  });
}

function putLootInBag(item) {
  const character = curChar();
  const stats = calculateStats(character);
  const items = character.sheet.inventoryItems;
  const existing = items.find(entry => entry.resourceId === item.ID && item.ID);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    if (items.length >= bagCapacity(character.sheet.bags).totalSlots) {
      alert('背包已满');
      return false;
    }
    items.push({ resourceId: item.ID, name: item.名称, desc: item.描述 || '', type: item.类型, qty: 1 });
  }
  saveLocal();
  renderInventory(stats);
  return true;
}

function equipItemToSlot(slotKey, item) {
  const c = curChar();
  if (slotKey.startsWith('weapon_')) {
    c.sheet.equipment[slotKey] = item;
  } else if (['main_bag', 'pouch_1', 'pouch_2', 'satchel_1', 'satchel_2'].includes(slotKey)) {
    c.sheet.bags[slotKey] = item;
  } else {
    c.sheet.equipment[slotKey] = item;
  }
  saveLocal();
  renderAll();
}

function unequipCurrentSlot() {
  if (!currentPickerSlot) return;
  const c = curChar();
  if (currentPickerSlot.startsWith('weapon_')) {
    c.sheet.equipment[currentPickerSlot] = null;
  } else if (['main_bag', 'pouch_1', 'pouch_2', 'satchel_1', 'satchel_2'].includes(currentPickerSlot)) {
    c.sheet.bags[currentPickerSlot] = null;
  } else {
    c.sheet.equipment[currentPickerSlot] = null;
  }
  el('item-picker-modal').hidden = true;
  saveLocal();
  renderAll();
}

function getSlotTitle(k) {
  const titles = {
    head: '头部', chest: '身躯', wrists: '腕部', legs: '腿部', feet: '足部', back: '背部',
    ring1: '戒指1', ring2: '戒指2', trinket1: '饰品1', trinket2: '饰品2',
    suit: '套装护甲', costume: '外观时装',
    weapon_main: '主手武器', weapon_off: '副手装备', weapon_spare: '备用武器',
    main_bag: '主背包', pouch_1: '腰包1', pouch_2: '腰包2', satchel_1: '挎包1', satchel_2: '挎包2'
  };
  return titles[k] || k;
}

// Duality Dice Rolling Logic (1d12 Hope + 1d12 Fear)
function rollHistoryKey(character) {
  return `daggerworld.roll-history.v1:${JSON.stringify([currentUser?.owner ?? 'local', character.id])}`;
}

function readLastRoll(key) {
  if (!lastRollCache.has(key)) {
    let entry = null;
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? 'null');
      entry = Array.isArray(stored) ? stored[0] ?? null : stored;
      if (Array.isArray(stored)) localStorage.setItem(key, JSON.stringify(entry));
    } catch { /* The last roll remains available in memory. */ }
    lastRollCache.set(key, entry);
  }
  return lastRollCache.get(key);
}

function renderLastRoll(character) {
  const entry = readLastRoll(rollHistoryKey(character));
  const display = el('last-roll');
  display.hidden = !entry;
  if (!entry) {
    display.textContent = '';
    return;
  }
  const modifier = entry.mod >= 0 ? `+${entry.mod}` : String(entry.mod);
  display.textContent = `上一次检定 · ${rollAttributeNames[entry.attr] ?? '属性'} · 希望 ${entry.hope} / 恐惧 ${entry.fear} · 修正 ${modifier} · 合计 ${entry.total} · ${entry.outcome}`;
}

function openDiceRoll(attr) {
  activeRollAttr = attr;
  el('dice-roll-modal').hidden = false;
  el('roll-attr-title').textContent = `双元骰检定 · ${rollAttributeNames[attr]}`;
  executeDualityRoll(attr);
}

function executeDualityRoll(attr) {
  const c = curChar();
  const mod = Number(c.sheet.attributes[attr]) || 0;

  const hopeDie = Math.floor(Math.random() * 12) + 1;
  const fearDie = Math.floor(Math.random() * 12) + 1;
  const diceSum = hopeDie + fearDie;
  const total = diceSum + mod;

  el('dice-hope-val').textContent = hopeDie;
  el('dice-fear-val').textContent = fearDie;
  el('roll-sum-val').textContent = diceSum;
  el('roll-mod-val').textContent = mod >= 0 ? `+${mod}` : `${mod}`;
  el('roll-total-val').textContent = total;

  const verdictEl = el('roll-verdict');
  let outcome;
  if (hopeDie > fearDie) {
    outcome = '带着希望';
    verdictEl.textContent = '带着希望。请与检定难度比较。';
    verdictEl.style.color = '#72b5dc';
  } else if (fearDie > hopeDie) {
    outcome = '带着恐惧';
    verdictEl.textContent = '带着恐惧。请与检定难度比较。';
    verdictEl.style.color = '#f87171';
  } else {
    outcome = '关键成功';
    verdictEl.textContent = '关键成功。行动检定获得 1 点希望，并清除 1 点压力。';
    verdictEl.style.color = 'var(--text-gold)';
  }
  const key = rollHistoryKey(c);
  const entry = { attr, hope: hopeDie, fear: fearDie, mod, total, outcome };
  lastRollCache.set(key, entry);
  try { localStorage.setItem(key, JSON.stringify(entry)); } catch { /* Keep the last roll in memory. */ }
  renderLastRoll(c);
}

// Character Vault Modal Management
function openVaultModal() {
  el('vault-modal').hidden = false;
  renderVaultCharList();
}

function closeVaultModal() {
  el('vault-modal').hidden = true;
}

function renderVaultCharList() {
  const container = el('vault-char-list');
  container.innerHTML = '';

  characters.forEach((char, idx) => {
    const card = document.createElement('div');
    card.className = `vault-char-card ${idx === activeCharIndex ? 'active' : ''}`;
    const clsObj = db?.classes?.find(c => c.ID === char.sheet?.classId || c.名称 === char.sheet?.classId);
    card.innerHTML = `
      <div class="vault-char-left">
        <span style="font-size:24px;">🛡️</span>
        <div>
          <div class="vault-char-title">${char.avatar_name || '无名角色'}</div>
          <div class="vault-char-meta">${clsObj?.名称 || '战士'} · Lv ${char.level} · 更新于 ${new Date(char.updated_at || Date.now()).toLocaleDateString()}</div>
        </div>
      </div>
      <div class="vault-char-actions">
        <button class="dw-btn dw-btn-outline" style="padding:4px 8px;font-size:11px;" data-idx="${idx}">切换载入</button>
        ${characters.length > 1 ? `<button class="dw-btn dw-btn-outline" style="padding:4px 8px;font-size:11px;color:var(--accent-health);" data-del-idx="${idx}">删除</button>` : ''}
      </div>
    `;

    card.querySelector('[data-idx]').addEventListener('click', e => {
      e.stopPropagation();
      activeCharIndex = idx;
      closeVaultModal();
      renderAll();
    });

    const delBtn = card.querySelector('[data-del-idx]');
    if (delBtn) {
      delBtn.addEventListener('click', async e => {
        e.stopPropagation();
        if (confirm(`确定要彻底删除角色【${char.avatar_name}】吗？`)) {
          if (!char.id.startsWith('local_') && !char.id.startsWith('imported_')) {
            try { await deleteCharacter(char.id); } catch (err) { console.warn(err); }
          }
          characters.splice(idx, 1);
          activeCharIndex = 0;
          saveLocal();
          renderVaultCharList();
          renderAll();
        }
      });
    }

    container.appendChild(card);
  });
}

function createNewAvatar() {
  const name = prompt('请输入新角色的角色名称：', '深水城探索者');
  if (!name) return;
  const newChar = createDefaultCharacter(name);
  characters.push(newChar);
  activeCharIndex = characters.length - 1;
  saveLocal();
  closeVaultModal();
  renderAll();
}

// ==========================================================================
// 主持人专属：独立资源工坊与军械库系统 (Layer 3: Workshop, Armory & PbDH Pack)
// ==========================================================================

let workshopState = {
  currentTab: 'item',          // 'item' | 'domain-card' | 'custom-domain'
  filter: 'all',               // 'all' | '武器' | '护甲' | '战利品' | '消耗品' | '领域卡' | '自定领域'
  searchQuery: '',
  targetCharIndex: 0,
  editingType: null,           // null | 'item' | 'domain-card' | 'custom-domain'
  editingId: null
};

// 初始化独立工坊页面
function initWorkshopLayer() {
  workshopState.targetCharIndex = (activeCharIndex >= 0 && activeCharIndex < characters.length) ? activeCharIndex : 0;
  updateWorkshopTargetSelect();
  populateWorkshopDomainDropdown();
  renderCustomDomainsManager();
  renderWorkshopLibrary();
  updateItemPreview();
  updateCardPreview();
}

// 刷新全队受赐角色选择器与槽位统计
function updateWorkshopTargetSelect() {
  const sel = el('ws-target-char-select');
  const meta = el('ws-target-char-meta');
  if (!sel) return;

  sel.innerHTML = '';
  if (!characters.length) {
    sel.innerHTML = '<option value="0">暂无角色（请先创角）</option>';
    if (meta) meta.innerHTML = '<span class="f-badge">暂无角色</span>';
    return;
  }

  characters.forEach((char, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${char.avatar_name || '未命名'} (Lv.${char.sheet.level || 1} ${char.sheet.classId || '冒险者'})`;
    if (idx === workshopState.targetCharIndex) opt.selected = true;
    sel.appendChild(opt);
  });

  const c = characters[workshopState.targetCharIndex] || characters[0];
  if (c && meta) {
    const invCount = (c.sheet.inventoryItems || []).length;
    const equippedCards = (c.sheet.equippedDomainCards || []).length;
    const vaultCards = (c.sheet.customDomainCards || []).length;
    meta.innerHTML = `
      <span class="f-badge" style="background:rgba(212,175,55,0.15);border:1px solid var(--border-gold);color:var(--text-gold);">
        ${c.avatar_name} · Lv.${c.sheet.level || 1} ${c.sheet.classId || '无职业'}
      </span>
      <span style="font-size:12px;color:var(--text-muted);">
        🎒 背包 ${invCount} 件 ｜ ⚡ 随身卡 ${equippedCards}/5 ｜ 📜 秘藏 ${vaultCards} 张
      </span>
    `;
  }
}

// 填充领域下拉框 (官方 11 领域 + 所有自定义领域)
function populateWorkshopDomainDropdown() {
  const sel = el('ws-card-domain');
  if (!sel) return;

  const currentVal = sel.value;
  sel.innerHTML = '';

  const standardDomains = ['利刃', '骸骨', '典籍', '优雅', '午夜', '贤者', '辉耀', '勇气', '奥术', '恐怖', '秘密'];
  const stdGroup = document.createElement('optgroup');
  stdGroup.label = '官方预设领域';
  standardDomains.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = `${d} (${d === '利刃' ? 'Blade' : d === '骸骨' ? 'Bone' : d === '典籍' ? 'Codex' : d === '优雅' ? 'Grace' : d === '午夜' ? 'Midnight' : d === '贤者' ? 'Sage' : d === '辉耀' ? 'Splendor' : d === '勇气' ? 'Valor' : d === '奥术' ? 'Arcana' : d === '恐怖' ? 'Dread' : 'Secret'})`;
    stdGroup.appendChild(opt);
  });
  sel.appendChild(stdGroup);

  const customList = campaignResources.customDomains || [];
  if (customList.length > 0) {
    const custGroup = document.createElement('optgroup');
    custGroup.label = '战役自定领域';
    customList.forEach(cd => {
      const opt = document.createElement('option');
      opt.value = cd.name;
      opt.textContent = `🌌 ${cd.name}`;
      custGroup.appendChild(opt);
    });
    sel.appendChild(custGroup);
  }

  if (currentVal) sel.value = currentVal;
}

// 切换创制工作台右侧子页签 (item / domain-card / custom-domain)
function switchWorkshopWorkbenchTab(tab) {
  workshopState.currentTab = tab;
  document.querySelectorAll('.ws-workbench-tabs .ws-wtab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.targetTab === tab);
  });

  const pItem = el('ws-panel-item');
  const pCard = el('ws-panel-domain-card');
  const pCustom = el('ws-panel-custom-domain');

  if (pItem) pItem.hidden = (tab !== 'item');
  if (pCard) pCard.hidden = (tab !== 'domain-card');
  if (pCustom) pCustom.hidden = (tab !== 'custom-domain');

  if (tab === 'custom-domain') {
    renderCustomDomainsManager();
  }
}

// 实时更新物品表单预览
function updateItemPreview() {
  const name = el('ws-item-name')?.value?.trim() || '未命名物品';
  const type = el('ws-item-type')?.value || '战利品';
  const tier = el('ws-item-tier')?.value || '1';
  const subcat = el('ws-item-subcat')?.value?.trim() || '';
  const stats = el('ws-item-stats')?.value?.trim() || '暂无属性';
  const desc = el('ws-item-desc')?.value?.trim() || '暂无效果说明';

  if (el('ws-prev-name')) el('ws-prev-name').textContent = name;
  if (el('ws-prev-tag')) el('ws-prev-tag').textContent = `${type} ${subcat ? '· ' + subcat : ''} · T${tier}`;
  if (el('ws-prev-stats')) el('ws-prev-stats').textContent = stats;
  if (el('ws-prev-desc')) el('ws-prev-desc').innerHTML = renderMarkdown(desc);
  el('ws-prev-icon')?.replaceChildren(itemImage({ name, type, subcat, appearance: el('ws-item-appearance')?.value }));
}

// 实时更新领域卡表单预览
function updateCardPreview() {
  const name = el('ws-card-name')?.value?.trim() || '未命名领域卡';
  const domain = el('ws-card-domain')?.value || '利刃';
  const type = el('ws-card-type')?.value || '法术';
  const level = el('ws-card-level')?.value || '1';
  const recall = el('ws-card-recall')?.value || '1';
  const desc = el('ws-card-desc')?.value?.trim() || '卡牌机制规则描述…';

  if (el('ws-prev-card-title')) el('ws-prev-card-title').textContent = name;
  if (el('ws-prev-card-type')) el('ws-prev-card-type').textContent = type;
  if (el('ws-prev-card-recall')) el('ws-prev-card-recall').textContent = `⚡ ${recall}⚡`;
  if (el('ws-prev-card-desc')) el('ws-prev-card-desc').innerHTML = renderMarkdown(desc);

  const tagEl = el('ws-prev-card-tag');
  if (tagEl) {
    tagEl.textContent = `${domain} · ${level}级`;
    tagEl.style.background = getDomainColor(domain);
  }
}

// 提交物品创制 / 编辑 (保存或发放)
function handleWorkshopItemSubmit(isDispatch) {
  const name = el('ws-item-name')?.value?.trim();
  if (!name) return alert('请输入物品名称！');

  const type = el('ws-item-type')?.value || '战利品';
  const subcat = el('ws-item-subcat')?.value?.trim() || '';
  const tier = Number(el('ws-item-tier')?.value) || 1;
  const stats = el('ws-item-stats')?.value?.trim() || '';
  const desc = el('ws-item-desc')?.value?.trim() || '';
  const icon = resolveItemIcon(name, type, subcat);

  const editId = el('ws-item-edit-id')?.value;
  const item = {
    id: editId || `vari_${Date.now()}`,
    name,
    type,
    subcat,
    tier,
    stats,
    desc,
    icon,
    appearance: validAppearance(el('ws-item-appearance')?.value),
    qty: 1
  };

  // 1. 保存/更新至战役军械库
  const existingIdx = campaignResources.items.findIndex(it => (editId ? it.id === editId : it.name === name));
  if (existingIdx >= 0) {
    campaignResources.items[existingIdx] = item;
  } else {
    campaignResources.items.push(item);
  }
  saveCampaignResources();

  // 2. 发放至受赐角色
  if (isDispatch) {
    dispatchItemToCharacter(item, workshopState.targetCharIndex);
  } else {
    alert(editId ? `已更新物品【${name}】！` : `已保存物品【${name}】至战役军械库！`);
  }

  cancelWorkshopEdit();
  renderWorkshopLibrary();
}

// 提交领域卡创制 / 编辑 (保存或发放)
function handleWorkshopCardSubmit(isDispatch) {
  const name = el('ws-card-name')?.value?.trim();
  if (!name) return alert('请输入卡牌名称！');

  const domain = el('ws-card-domain')?.value || '利刃';
  const type = el('ws-card-type')?.value || '法术';
  const level = Number(el('ws-card-level')?.value) || 1;
  const recall = Number(el('ws-card-recall')?.value) || 0;
  const desc = el('ws-card-desc')?.value?.trim() || '';

  const editId = el('ws-card-edit-id')?.value;
  const card = {
    id: editId || `card_${Date.now()}`,
    ID: editId || `原创卡:${Date.now()}`,
    名称: name,
    类型: type,
    领域: domain,
    等级: `${level}级`,
    回想: `${recall}⚡`,
    描述: desc
  };

  // 1. 保存/更新至战役领域卡库
  const existingIdx = campaignResources.domainCards.findIndex(c => (editId ? (c.id === editId || c.ID === editId) : c.名称 === name));
  if (existingIdx >= 0) {
    campaignResources.domainCards[existingIdx] = card;
  } else {
    campaignResources.domainCards.push(card);
  }
  saveCampaignResources();

  // 2. 发放至受赐角色
  if (isDispatch) {
    dispatchCardToCharacter(card, workshopState.targetCharIndex);
  } else {
    alert(editId ? `已更新领域卡【${name}】！` : `已保存领域卡【${name}】至战役储备库！`);
  }

  cancelWorkshopEdit();
  renderWorkshopLibrary();
  renderDomainCards();
}

// 提交注册 / 修改自定义领域
function handleSaveCustomDomain() {
  const name = el('ws-cd-name')?.value?.trim();
  if (!name) return alert('请输入领域名称！');
  const color = el('ws-cd-color')?.value || '#8b5cf6';
  const desc = el('ws-cd-desc')?.value?.trim() || '';
  const editId = el('ws-cd-edit-id')?.value;

  if (!campaignResources.customDomains) campaignResources.customDomains = [];

  const existingIdx = campaignResources.customDomains.findIndex(d => (editId ? d.id === editId : d.name === name));
  const domainObj = {
    id: editId || `cd_${Date.now()}`,
    name,
    color,
    desc
  };

  if (existingIdx >= 0) {
    campaignResources.customDomains[existingIdx] = domainObj;
  } else {
    campaignResources.customDomains.push(domainObj);
  }

  // 同步色彩表
  domainColors[name] = color;
  saveCampaignResources();

  cancelCustomDomainEdit();
  populateWorkshopDomainDropdown();
  renderCustomDomainsManager();
  renderWorkshopLibrary();
  renderDomainCards();
  alert(`已成功注册自定领域【${name}】！`);
}

// 发放物品至指定角色背包
function dispatchItemToCharacter(item, charIndex) {
  const target = characters[charIndex] || curChar();
  if (!target) return alert('未找到目标角色！');
  if (!target.sheet.inventoryItems) target.sheet.inventoryItems = [];

  const formattedDesc = item.stats ? `**【${item.type} · ${item.subcat || '标准'}】** ${item.stats}\n\n${item.desc}` : item.desc;
  target.sheet.inventoryItems.push({
    name: item.name,
    desc: formattedDesc,
    qty: 1,
    icon: item.icon || resolveItemIcon(item.name, item.type, item.subcat),
    appearance: validAppearance(item.appearance),
    type: item.type,
    subcat: item.subcat,
    tier: item.tier
  });

  saveLocal();
  if (charIndex === activeCharIndex) {
    renderInventory(calculateStats(target));
  }
  updateWorkshopTargetSelect();
  alert(`👑 已成功向角色【${target.avatar_name}】的背包发放【${item.name}】！`);
}

// 发放领域卡至指定角色领域秘藏
function dispatchCardToCharacter(card, charIndex) {
  const target = characters[charIndex] || curChar();
  if (!target) return alert('未找到目标角色！');
  if (!target.sheet.customDomainCards) target.sheet.customDomainCards = [];

  target.sheet.customDomainCards.push(card);
  saveLocal();
  if (charIndex === activeCharIndex) {
    renderDomainCards();
  }
  updateWorkshopTargetSelect();
  alert(`👑 已成功向角色【${target.avatar_name}】的领域秘藏发放【${card.名称 || card.name}】！`);
}

// 回显载入物品进入编辑状态
function loadItemToEdit(item) {
  switchWorkshopWorkbenchTab('item');
  if (el('ws-item-edit-id')) el('ws-item-edit-id').value = item.id;
  if (el('ws-item-type')) el('ws-item-type').value = item.type || '战利品';
  if (el('ws-item-tier')) el('ws-item-tier').value = item.tier || '1';
  if (el('ws-item-name')) el('ws-item-name').value = item.name || '';
  if (el('ws-item-subcat')) el('ws-item-subcat').value = item.subcat || '';
  if (el('ws-item-stats')) el('ws-item-stats').value = item.stats || '';
  if (el('ws-item-desc')) el('ws-item-desc').value = item.desc || '';
  el('ws-item-appearance').value = validAppearance(item.appearance);

  workshopState.editingType = 'item';
  workshopState.editingId = item.id;

  const banner = el('ws-edit-banner');
  const targetLabel = el('ws-editing-target-name');
  if (banner) banner.hidden = false;
  if (targetLabel) targetLabel.textContent = `物品：${item.name}`;

  updateItemPreview();
  renderWorkshopLibrary();
}

// 回显载入领域卡进入编辑状态
function loadCardToEdit(card) {
  switchWorkshopWorkbenchTab('domain-card');
  const cId = card.id || card.ID;
  if (el('ws-card-edit-id')) el('ws-card-edit-id').value = cId;
  if (el('ws-card-name')) el('ws-card-name').value = card.名称 || card.name || '';
  if (el('ws-card-domain')) el('ws-card-domain').value = card.领域 || '利刃';
  if (el('ws-card-type')) el('ws-card-type').value = card.类型 || '法术';
  if (el('ws-card-level')) el('ws-card-level').value = parseInt(String(card.等级 || '1').replace(/\D/g, '')) || 1;
  if (el('ws-card-recall')) el('ws-card-recall').value = parseInt(String(card.回想 || '0').replace(/\D/g, '')) || 0;
  if (el('ws-card-desc')) el('ws-card-desc').value = card.描述 || card.desc || '';

  workshopState.editingType = 'domain-card';
  workshopState.editingId = cId;

  const banner = el('ws-edit-banner');
  const targetLabel = el('ws-editing-target-name');
  if (banner) banner.hidden = false;
  if (targetLabel) targetLabel.textContent = `领域卡：${card.名称 || card.name}`;

  updateCardPreview();
  renderWorkshopLibrary();
}

// 回显载入自定领域进入编辑状态
function loadCustomDomainToEdit(cd) {
  switchWorkshopWorkbenchTab('custom-domain');
  if (el('ws-cd-edit-id')) el('ws-cd-edit-id').value = cd.id;
  if (el('ws-cd-name')) el('ws-cd-name').value = cd.name;
  if (el('ws-cd-color')) el('ws-cd-color').value = cd.color;
  if (el('ws-cd-desc')) el('ws-cd-desc').value = cd.desc || '';
  if (el('btn-cancel-cd-edit')) el('btn-cancel-cd-edit').hidden = false;
}

// 退出/取消物品与卡牌编辑模式
function cancelWorkshopEdit() {
  workshopState.editingType = null;
  workshopState.editingId = null;

  if (el('ws-item-edit-id')) el('ws-item-edit-id').value = '';
  if (el('ws-item-name')) el('ws-item-name').value = '';
  if (el('ws-item-subcat')) el('ws-item-subcat').value = '';
  if (el('ws-item-stats')) el('ws-item-stats').value = '';
  if (el('ws-item-desc')) el('ws-item-desc').value = '';
  el('ws-item-appearance').value = '';

  if (el('ws-card-edit-id')) el('ws-card-edit-id').value = '';
  if (el('ws-card-name')) el('ws-card-name').value = '';
  if (el('ws-card-desc')) el('ws-card-desc').value = '';

  const banner = el('ws-edit-banner');
  if (banner) banner.hidden = true;

  updateItemPreview();
  updateCardPreview();
  renderWorkshopLibrary();
}

// 取消自定领域编辑
function cancelCustomDomainEdit() {
  if (el('ws-cd-edit-id')) el('ws-cd-edit-id').value = '';
  if (el('ws-cd-name')) el('ws-cd-name').value = '';
  if (el('ws-cd-color')) el('ws-cd-color').value = '#8b5cf6';
  if (el('ws-cd-desc')) el('ws-cd-desc').value = '';
  if (el('btn-cancel-cd-edit')) el('btn-cancel-cd-edit').hidden = true;
}

// 渲染自定领域管理器
function renderCustomDomainsManager() {
  const container = el('ws-custom-domains-list');
  const countEl = el('ws-custom-domains-count');
  const list = campaignResources.customDomains || [];

  if (countEl) countEl.textContent = list.length;
  if (!container) return;

  if (!list.length) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:12px;grid-column:1/-1;">战役暂无自定领域，可在上方登记注册。</div>';
    return;
  }

  container.innerHTML = '';
  list.forEach((cd, idx) => {
    const card = document.createElement('div');
    card.className = 'custom-domain-badge-card';
    card.innerHTML = `
      <div class="custom-domain-header">
        <span class="domain-tag-pill" style="background:${cd.color}">🌌 ${cd.name}</span>
        <div style="display:flex;gap:4px;">
          <button class="ws-btn-mini" data-action="edit-cd" title="编辑领域理念与主题色">✏️</button>
          <button class="ws-btn-mini ws-btn-mini-danger" data-action="del-cd" title="注销此领域">✕</button>
        </div>
      </div>
      <div class="domain-desc-text">${cd.desc || '暂无风味理念描述'}</div>
    `;

    card.querySelector('[data-action="edit-cd"]').addEventListener('click', () => loadCustomDomainToEdit(cd));
    card.querySelector('[data-action="del-cd"]').addEventListener('click', () => {
      if (confirm(`确定注销自定领域【${cd.name}】吗？已有的卡牌将保留，但新建卡牌时不再显示。`)) {
        campaignResources.customDomains.splice(idx, 1);
        delete domainColors[cd.name];
        saveCampaignResources();
        populateWorkshopDomainDropdown();
        renderCustomDomainsManager();
        renderWorkshopLibrary();
        renderDomainCards();
      }
    });

    container.appendChild(card);
  });
}

// 渲染战役储备军械库列表 (带实时多维度过滤与检索)
function renderWorkshopLibrary() {
  const container = el('ws-library-list');
  const totalCountEl = el('ws-lib-total-count');
  const filterBadge = el('ws-active-filter-badge');

  const items = campaignResources.items || [];
  const cards = campaignResources.domainCards || [];
  const customDomains = campaignResources.customDomains || [];

  const total = items.length + cards.length + customDomains.length;
  if (totalCountEl) totalCountEl.textContent = total;

  if (!container) return;

  const q = (workshopState.searchQuery || '').toLowerCase();
  const filter = workshopState.filter;

  if (filterBadge) {
    filterBadge.textContent = filter === 'all' ? '全部资源' : filter;
  }

  // 1. 过滤物品
  let matchedItems = items;
  if (['武器', '护甲', '战利品', '消耗品'].includes(filter)) {
    matchedItems = items.filter(it => it.type === filter);
  } else if (filter === '领域卡' || filter === '自定领域') {
    matchedItems = [];
  }
  if (q) {
    matchedItems = matchedItems.filter(it => 
      (it.name || '').toLowerCase().includes(q) ||
      (it.subcat || '').toLowerCase().includes(q) ||
      (it.stats || '').toLowerCase().includes(q) ||
      (it.desc || '').toLowerCase().includes(q)
    );
  }

  // 2. 过滤领域卡
  let matchedCards = cards;
  if (['武器', '护甲', '战利品', '消耗品', '自定领域'].includes(filter)) {
    matchedCards = [];
  }
  if (q) {
    matchedCards = matchedCards.filter(c => 
      (c.名称 || c.name || '').toLowerCase().includes(q) ||
      (c.领域 || '').toLowerCase().includes(q) ||
      (c.描述 || c.desc || '').toLowerCase().includes(q)
    );
  }

  // 3. 过滤自定领域
  let matchedDomains = customDomains;
  if (filter !== 'all' && filter !== '自定领域') {
    matchedDomains = [];
  }
  if (q) {
    matchedDomains = matchedDomains.filter(cd => 
      (cd.name || '').toLowerCase().includes(q) ||
      (cd.desc || '').toLowerCase().includes(q)
    );
  }

  const grandTotal = matchedItems.length + matchedCards.length + matchedDomains.length;
  if (!grandTotal) {
    container.innerHTML = `
      <div style="color:var(--text-muted);font-size:13px;padding:36px;text-align:center;">
        📦 暂无符合条件的储备资源<br>
        <span style="font-size:11px;opacity:0.7;">可在右侧工作台创制新条目，或点击上方导入卡包</span>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  // 渲染物品条目
  matchedItems.forEach((item, idx) => {
    const isEditing = (workshopState.editingType === 'item' && workshopState.editingId === item.id);
    const cardEl = document.createElement('div');
    cardEl.className = `ws-card-item ${isEditing ? 'editing' : ''}`;
    cardEl.innerHTML = `
      <div class="ws-card-header">
        <div class="item-left">
          <span style="font-size:16px;">${item.icon || resolveItemIcon(item.name, item.type, item.subcat)}</span>
          <strong>${item.name}</strong>
        </div>
        <div class="ws-card-badges">
          <span class="f-badge">${item.type}</span>
          <span class="f-badge">T${item.tier || 1}</span>
        </div>
      </div>
      ${item.stats ? `<div class="ws-card-stats">${item.stats}</div>` : ''}
      <div class="ws-card-body-desc">${renderMarkdown(item.desc || '暂无说明')}</div>
      <div class="ws-card-item-actions">
        <button type="button" class="ws-btn-mini ws-btn-gold" data-action="dispatch">👑 发放至受赐角色</button>
        <button type="button" class="ws-btn-mini" data-action="edit">✏️ 编辑</button>
        <button type="button" class="ws-btn-mini ws-btn-mini-danger" data-action="del">🗑️ 删除</button>
      </div>
    `;

    cardEl.querySelector('[data-action="dispatch"]').addEventListener('click', () => dispatchItemToCharacter(item, workshopState.targetCharIndex));
    cardEl.querySelector('[data-action="edit"]').addEventListener('click', () => loadItemToEdit(item));
    cardEl.querySelector('[data-action="del"]').addEventListener('click', () => {
      if (confirm(`确定从战役储备库删除物品【${item.name}】吗？`)) {
        const iIdx = campaignResources.items.indexOf(item);
        if (iIdx >= 0) campaignResources.items.splice(iIdx, 1);
        saveCampaignResources();
        renderWorkshopLibrary();
      }
    });

    container.appendChild(cardEl);
  });

  // 渲染领域卡条目
  matchedCards.forEach((cardObj, idx) => {
    const cId = cardObj.id || cardObj.ID;
    const isEditing = (workshopState.editingType === 'domain-card' && workshopState.editingId === cId);
    const domain = cardObj.领域 || cardObj.domain || '利刃';
    const cardEl = document.createElement('div');
    cardEl.className = `ws-card-item ${isEditing ? 'editing' : ''}`;
    cardEl.innerHTML = `
      <div class="ws-card-header">
        <div class="item-left">
          <span style="font-size:16px;">📜</span>
          <strong>${cardObj.名称 || cardObj.name}</strong>
        </div>
        <div class="ws-card-badges">
          <span class="domain-tag-pill" style="background:${getDomainColor(domain)}">${domain} · ${cardObj.等级 || '1级'}</span>
          <span class="f-badge">⚡ ${cardObj.回想 || '0⚡'}</span>
        </div>
      </div>
      <div class="ws-card-body-desc">${renderMarkdown(cardObj.描述 || cardObj.desc || '暂无卡牌说明')}</div>
      <div class="ws-card-item-actions">
        <button type="button" class="ws-btn-mini ws-btn-gold" data-action="dispatch">👑 发放至领域秘藏</button>
        <button type="button" class="ws-btn-mini" data-action="edit">✏️ 编辑</button>
        <button type="button" class="ws-btn-mini ws-btn-mini-danger" data-action="del">🗑️ 删除</button>
      </div>
    `;

    cardEl.querySelector('[data-action="dispatch"]').addEventListener('click', () => dispatchCardToCharacter(cardObj, workshopState.targetCharIndex));
    cardEl.querySelector('[data-action="edit"]').addEventListener('click', () => loadCardToEdit(cardObj));
    cardEl.querySelector('[data-action="del"]').addEventListener('click', () => {
      if (confirm(`确定从战役储备库删除领域卡【${cardObj.名称 || cardObj.name}】吗？`)) {
        const cIdx = campaignResources.domainCards.indexOf(cardObj);
        if (cIdx >= 0) campaignResources.domainCards.splice(cIdx, 1);
        saveCampaignResources();
        renderWorkshopLibrary();
        renderDomainCards();
      }
    });

    container.appendChild(cardEl);
  });

  // 渲染自定领域条目
  matchedDomains.forEach(cd => {
    const cardEl = document.createElement('div');
    cardEl.className = 'ws-card-item';
    cardEl.innerHTML = `
      <div class="ws-card-header">
        <div class="item-left">
          <span class="domain-tag-pill" style="background:${cd.color}">🌌 ${cd.name}</span>
          <span style="font-size:12px;color:var(--text-muted);">战役专属自定领域</span>
        </div>
      </div>
      <div class="ws-card-body-desc">${renderMarkdown(cd.desc || '暂无理念描述')}</div>
      <div class="ws-card-item-actions">
        <button type="button" class="ws-btn-mini" data-action="edit">✏️ 编辑领域</button>
      </div>
    `;
    cardEl.querySelector('[data-action="edit"]').addEventListener('click', () => loadCustomDomainToEdit(cd));
    container.appendChild(cardEl);
  });
}

// 导出 PbDH 规范卡牌包 (.json)
function exportPbDHPack() {
  const packName = prompt('请输入导出卡包的名称：', campaignResources.name || '深水城战役扩展包');
  if (!packName) return;

  const customDomainNames = (campaignResources.customDomains || []).map(cd => cd.name).filter(Boolean);
  const cardDomainNames = campaignResources.domainCards.map(c => c.领域 || c.domain).filter(Boolean);
  const allPackDomains = Array.from(new Set([...customDomainNames, ...cardDomainNames]));

  const pack = {
    name: packName,
    version: campaignResources.version || '1.0.0',
    description: campaignResources.description || '深水城战役原创装备、战利品、领域法术卡与自定领域',
    author: campaignResources.author || '主持人基德',
    customFieldDefinitions: {
      professions: [],
      ancestries: [],
      communities: [],
      domains: allPackDomains,
      variants: ['武器', '护甲', '战利品', '消耗品']
    },
    profession: [],
    ancestry: [],
    community: [],
    subclass: [],
    domain: campaignResources.domainCards.map(c => ({
      id: c.id || c.ID || `pbdh-gm-doma-${c.名称 || c.name}`,
      名称: c.名称 || c.name,
      领域: c.领域 || c.domain || '战役',
      描述: c.描述 || c.desc || '',
      等级: Number(String(c.等级 || c.level || 1).replace(/\D/g, '')) || 1,
      属性: c.属性 || c.类型 || '法术',
      回想: Number(String(c.回想 || c.recall || 0).replace(/\D/g, '')) || 0
    })),
    variant: campaignResources.items.map(item => ({
      id: item.id || `pbdh-gm-vari-${item.name}`,
      名称: item.name,
      类型: item.type || '战利品',
      子类别: item.subcat || '',
      等级: Number(item.tier) || 1,
      效果: item.desc || '',
      appearance: validAppearance(item.appearance),
      简略信息: item.stats ? { item1: item.stats } : {}
    })),
    customDomains: campaignResources.customDomains || []
  };

  const jsonStr = JSON.stringify(pack, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${packName}_PbDH卡包.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// 导入 PbDH 规范卡牌包 (.json)
function importPbDHPack(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const pack = JSON.parse(ev.target.result);
      if (!pack || typeof pack !== 'object') throw new Error('无效的 JSON 格式');

      let domainCount = 0;
      let variantCount = 0;
      let customDomainCount = 0;

      // 导入自定领域定义
      const packDomains = pack.customDomains || [];
      if (Array.isArray(packDomains)) {
        packDomains.forEach(cd => {
          if (!cd.name) return;
          const exIdx = (campaignResources.customDomains || []).findIndex(d => d.name === cd.name);
          const domainObj = {
            id: cd.id || `cd_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: cd.name,
            color: cd.color || '#8b5cf6',
            desc: cd.desc || ''
          };
          if (exIdx >= 0) {
            campaignResources.customDomains[exIdx] = domainObj;
          } else {
            if (!campaignResources.customDomains) campaignResources.customDomains = [];
            campaignResources.customDomains.push(domainObj);
          }
          domainColors[cd.name] = domainObj.color;
          customDomainCount++;
        });
      }

      // 如果卡包有 customFieldDefinitions.domains 且不在预设中，也登记
      if (Array.isArray(pack.customFieldDefinitions?.domains)) {
        const standardDomains = ['利刃', '骸骨', '典籍', '优雅', '午夜', '贤者', '辉耀', '勇气', '奥术', '恐怖', '秘密'];
        pack.customFieldDefinitions.domains.forEach(dName => {
          if (dName && !standardDomains.includes(dName)) {
            const ex = (campaignResources.customDomains || []).find(d => d.name === dName);
            if (!ex) {
              const newDomain = { id: `cd_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, name: dName, color: '#8b5cf6', desc: '自导入卡包扩展领域' };
              campaignResources.customDomains.push(newDomain);
              domainColors[dName] = newDomain.color;
              customDomainCount++;
            }
          }
        });
      }

      // 导入领域法术卡
      if (Array.isArray(pack.domain)) {
        pack.domain.forEach(d => {
          if (!d.名称) return;
          const card = {
            id: d.id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            ID: d.id || `卡包卡:${d.名称}`,
            名称: d.名称,
            类型: d.属性 || '法术',
            领域: d.领域 || '战役',
            等级: `${d.等级 || 1}级`,
            回想: `${d.回想 || 0}⚡`,
            描述: d.描述 || ''
          };
          const exIdx = campaignResources.domainCards.findIndex(c => c.名称 === card.名称);
          if (exIdx >= 0) campaignResources.domainCards[exIdx] = card;
          else campaignResources.domainCards.push(card);
          domainCount++;
        });
      }

      // 导入物品与战利品
      if (Array.isArray(pack.variant)) {
        pack.variant.forEach(v => {
          if (!v.名称) return;
          const stats = v.简略信息?.item1 || (typeof v.简略信息 === 'string' ? v.简略信息 : '');
          const item = {
            id: v.id || `vari_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: v.名称,
            type: v.类型 || '战利品',
            subcat: v.子类别 || '',
            tier: Number(v.等级) || 1,
            stats,
            desc: v.效果 || '',
            icon: resolveItemIcon(v.名称, v.类型, v.子类别),
            appearance: validAppearance(v.appearance),
            qty: 1
          };
          const exIdx = campaignResources.items.findIndex(it => it.name === item.name);
          if (exIdx >= 0) campaignResources.items[exIdx] = item;
          else campaignResources.items.push(item);
          variantCount++;
        });
      }

      saveCampaignResources();
      populateWorkshopDomainDropdown();
      renderCustomDomainsManager();
      renderWorkshopLibrary();
      renderDomainCards();
      alert(`成功导入卡包【${pack.name || '外部卡包'}】：包含 ${domainCount} 张领域卡，${variantCount} 件物品，${customDomainCount} 个自定领域！`);
    } catch (err) {
      alert('卡包导入失败：' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// 清空战役原创库
function clearWorkshopLibrary() {
  if (confirm('确定要清空全部战役原创物品、领域卡与自定领域吗？此操作无法撤销。')) {
    campaignResources.items = [];
    campaignResources.domainCards = [];
    campaignResources.customDomains = [];
    saveCampaignResources();
    populateWorkshopDomainDropdown();
    renderCustomDomainsManager();
    renderWorkshopLibrary();
    renderDomainCards();
  }
}


// 背包放入物品模态框 (智能结合 Kenney 图标解析)
function openAddItemModal(gridIndex = null) {
  const name = prompt('物品名称');
  if (!name) return;
  const desc = prompt('物品描述');
  const c = curChar();
  if (!c.sheet.inventoryItems) c.sheet.inventoryItems = [];

  const icon = resolveItemIcon(name);
  const item = { name, desc: desc || '', qty: 1, icon };
  if (gridIndex !== null && gridIndex < c.sheet.inventoryItems.length) {
    c.sheet.inventoryItems[gridIndex] = item;
  } else {
    c.sheet.inventoryItems.push(item);
  }
  saveLocal();
  renderInventory(calculateStats(c));
}


function importCharacterJson(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!imported.sheet) throw new Error('无效的角色卡格式');
      imported.id = 'imported_' + Date.now();
      characters.push(normalizeCharacter(imported));
      activeCharIndex = characters.length - 1;
      saveLocal();
      renderAll();
      alert(`已成功导入角色【${imported.avatar_name}】！`);
    } catch (err) {
      alert('导入失败：' + err.message);
    }
  };
  reader.readAsText(file);
}

// Boot application
init();
