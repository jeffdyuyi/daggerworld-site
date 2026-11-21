import {setupAdventureBoard} from './adventure-board.js?v=20261121-layout2';
import {livePaperdollEnabled, showCharacterOutline, showCustomPortrait} from './appearance-preview.js?v=20261121-body2';
import { sheetStats, adjustment } from './stats.js';
import { gearSlots, gearEffects, qualities, readGear, slotMatches, storedItems, gearFormula, suitSlots, suitCoversSlot } from './gear-effects.js';
import { traits, startingModifiers, tierForLevel, damageDice, equipmentIssue, cardKey, uniqueCards, cardLevel, recallCost, experienceThresholds, lastLevel, rulesLevel, advancementCost } from './sheet-rules.js';
import { readGmNote, writeGmNote, loadAccount, grantCharacterResource, saveCharacter, deleteCharacter, readSession } from '../session.js?v=20261121-board1';
import { itemArt, itemAppearances, validAppearance, spriteUrl } from './item-art.js';

// Global App State
let db = null;
let dbPromise = null;
const RULES_CACHE_KEY = 'daggerworld.rules.database.v20261121';

async function loadDatabase() {
  if (db) return db;

  // 1. 本地优先：若 localStorage 存在规则缓存，零延迟立即就绪并渲染
  try {
    const cached = localStorage.getItem(RULES_CACHE_KEY);
    if (cached) {
      db = JSON.parse(cached);
      populateSelectOptions();
      updateSyncStatus(true, '规则资料已就绪 (离线就绪)');
    }
  } catch (e) {
    console.warn('读取本地规则缓存失败:', e);
  }

  // 2. 异步网络获取（后台刷新或首次冷启动加载）
  const fetchPromise = (async () => {
    const urls = [
      new URL('./data/database.json', import.meta.url).href,
      './data/database.json',
      './editor/data/database.json'
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (res.ok) {
          const remoteDb = await res.json();
          db = remoteDb;
          try { localStorage.setItem(RULES_CACHE_KEY, JSON.stringify(remoteDb)); } catch {}
          populateSelectOptions();
          updateSyncStatus(true, '规则资料已就绪');
          return db;
        }
      } catch (e) {
        console.warn('加载规则资料尝试失败:', url, e);
      }
    }
    if (!db) updateSyncStatus(false, '规则资料离线可用');
    return db;
  })();

  // 若本地已有缓存，直接返回已就绪的 db，让页面 0ms 秒开；后台静默刷新
  if (db) {
    fetchPromise.catch(() => {});
    return db;
  }
  return await fetchPromise;
}

function ensureDatabaseLoaded() {
  if (db) return Promise.resolve(db);
  if (!dbPromise) dbPromise = loadDatabase();
  return dbPromise;
}
let currentUser = null;
let characters = [];
let activeCharIndex = 0;
let currentPickerSlot = null;
let activeRollAttr = 'agility';
let activeBagItemIndex = null;
const lastRollCache = new Map();
const rollAttributeNames = { agility: '敏捷', strength: '力量', finesse: '灵巧', instinct: '本能', presence: '风采', knowledge: '知识' };

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
          domainCards: Array.isArray(parsed.domainCards) ? parsed.domainCards : [],
          customDomains: Array.isArray(parsed.customDomains) ? parsed.customDomains : [],
          statusEffects: Array.isArray(parsed.statusEffects) ? parsed.statusEffects : []
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
  if (typeof str === 'string') str = str.replace(/主持人|(?<![A-Za-z])GM(?![A-Za-z])/g, '系统');
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
    id: 'local_' + crypto.randomUUID(),
    avatar_name: name || '新晋冒险者',
    level: 1,
    sheet: {
      gender: ['男', '女', '无'].includes(gender) ? gender : '男',
      ancestryId: ancestryId || '种族:人类',
      communityId: '',
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
        waist: null,
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
      currency: { handfuls: 0, bags: 0, chests: 0, diamonds: 0 },
      equippedDomainCards: [],
      vaultDomainCards: [],
      customDomainCards: []
    }
  };
}

// Critical Schema Normalizer (Guarantees every field exists, preventing runtime exceptions!)
function normalizeCharacter(char) {
  if (!char || typeof char !== 'object') throw new Error('无效的角色档案');
  const defaultChar = createDefaultCharacter();
  const defaultSheet = defaultChar.sheet;

  char.avatar_name = char.avatar_name || '深水城探索者';
  char.level = Number(char.level) || 1;
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

  for (const [key, extra] of Object.entries(s.trackReserves ?? {})) {
    if (['hp','stress','hope','armorPips'].includes(key) && Number.isSafeInteger(extra) && extra>0) s[key].cur += extra;
  }
  delete s.trackReserves;
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
  const wrist = s.equipment.wrists;
  if (wrist && !s.inventoryItems.some(item => item?.ownedGearId && item.ownedGearId === wrist.ownedGearId)) {
    s.inventoryItems.push({
      ...wrist, name:wrist.名称 ?? wrist.name ?? '旧版装备',
      desc:wrist.描述 ?? wrist.desc ?? '', qty:1, slot:'wrists'
    });
  }
  delete s.equipment.wrists;
  s.currency = s.currency && typeof s.currency === 'object' ? s.currency : { ...defaultSheet.currency };
  s.equippedDomainCards = Array.isArray(s.equippedDomainCards) ? s.equippedDomainCards : [];
  s.vaultDomainCards = Array.isArray(s.vaultDomainCards) ? s.vaultDomainCards : [];
  s.customDomainCards = Array.isArray(s.customDomainCards) ? s.customDomainCards : [];

  return char;
}

// Active Character Helper
function curChar() {
  return characters[activeCharIndex] ?? null;
}

// Application Initialization
async function init() {
  const session = readSession();
  if (!session?.owner) { location.replace("../account.html"); return; }

  // 0. 本地角色身份预先激活：若曾为主持人，首毫秒即识别 GM 并就地亮起管理控件
  try {
    const cachedRole = localStorage.getItem('daggerworld.role.' + session.owner);
    if (cachedRole) {
      currentUser = { owner: session.owner, login: session.login, role: cachedRole };
    }
  } catch {}

  setupTabs(setupAdventureBoard());
  setupSlotIcons();
  setupCreationWizard();
  setupEventListeners();
  initPortraitListeners();

  // 只加载当前账号的缓存。
  loadLocalFallback();

  // 2. 异步加载规则数据库并填充下拉菜单与创角选项
  dbPromise = loadDatabase();
  await dbPromise;

  // 3. 决定初始层级视图 (如果 URL 包含 #sheet 则进入第二层工作台，否则默认进入第一层角色库)
  const currentHash = (typeof location !== 'undefined' && location.hash) ? location.hash : '';
  const openAdventure = currentHash === '#adventure';
  const openSheet = openAdventure || currentHash === '#sheet';
  if (openSheet && characters.length) {
    switchLayer('sheet',activeCharIndex);
    if (openAdventure) document.querySelector('[data-page="adventure"]')?.click();
  } else {
    switchLayer('vault');
  }

  // 4. 异步后台静默同步云端，网络延时不阻塞页面操作（内置自动重试与弹性降级）
  if (session) {
    updateSyncStatus(true, `正在同步云端 · ${session.login || '冒险者'}…`);
    const syncAccount = async (retries = 2) => {
      try {
        const account = await loadAccount();
        currentUser = account;
        try { localStorage.setItem('daggerworld.role.' + account.owner, account.role || 'player'); } catch {}
        if (account.role === 'gm') loadCampaignResources();
        el('btn-open-workshop').hidden = account.role !== 'gm';
        reconcileAccount(account);
        if (currentLayer === 'sheet') renderAll();
        if (openAdventure && currentLayer === 'vault' && characters.length) {
          switchLayer('sheet', activeCharIndex);
          document.querySelector('[data-page="adventure"]')?.click();
        }
        if (currentHash === '#workshop' && account.role === 'gm') switchLayer('workshop');
        updateSyncStatus(true, `云端已载入 · ${currentUser.login || '冒险者'}`);
      } catch (err) {
        if (retries > 0) {
          console.warn('云端同步稍有延迟，自动重试中...', err.message);
          updateSyncStatus(true, `云端重试中 · ${session.login || '冒险者'}`);
          await new Promise(r => setTimeout(r, 1200));
          return syncAccount(retries - 1);
        }
        console.warn('Background sync deferred:', err.message);
        updateSyncStatus(false, `本地就绪 · ${session.login || '冒险者'}`);
      }
    };
    syncAccount();
  } else {
    updateSyncStatus(false, '本地离线模式');
  }
}

const owner = readSession()?.owner;
const cacheKey = 'daggerworld.vault.v2.' + owner;
let baselines = {};
function payload(c) {
  const sheet = structuredClone(c.sheet);
  if (db) {
    const stats = calculateStats(c);
    const reserves = {};
    for (const [key,max] of Object.entries({hp:stats.maxHp,stress:stats.maxStress,hope:stats.maxHope,armorPips:stats.armorMax})) {
      const recorded = Math.max(0, Math.trunc(sheet[key].cur) || 0);
      if (recorded > max) reserves[key] = recorded-max;
      sheet[key] = { ...sheet[key], cur:Math.min(recorded,max), max };
    }
    if (Object.keys(reserves).length) sheet.trackReserves = reserves;
  }
  return {avatar_name:c.avatar_name,level:c.level,sheet};
}
function loadLocalFallback() {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    characters = (cached?.characters ?? []).map(normalizeCharacter);
    baselines = cached?.baselines ?? {};
    if (!cached) {
      const legacy = JSON.parse(localStorage.getItem('daggerworld.vault.v1') || '[]');
      characters = legacy.filter(c => c?.owner_id === owner).map(c => {
        delete c.notes; return normalizeCharacter(c);
      });
    }
  } catch { characters = []; }
}
function compareSnapshot(left,right) {
  const canonical = value => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])]));
    return value;
  };
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

const grantFields = ['experience','inventoryItems','customDomainCards','specialEffects'];
function mergeIncomingGrants(character, remote) {
  const baseline = baselines[character.id];
  if (!baseline || character.updated_at === remote.updated_at) return false;
  const previous = normalizeCharacter(JSON.parse(baseline));
  const withoutGrants = ({level,avatar_name,sheet}) => {
    const fields = {...sheet};
    for (const key of grantFields) delete fields[key];
    return {level,avatar_name,sheet:fields};
  };
  if (!compareSnapshot(withoutGrants(previous),withoutGrants(remote))) return false;

  const additions = {};
  for (const key of grantFields.slice(1)) {
    const before = previous.sheet[key] ?? [];
    const after = remote.sheet[key] ?? [];
    if (!compareSnapshot(before,after.slice(0,before.length)) || after.length < before.length) return false;
    additions[key] = after.slice(before.length);
  }
  for (const key of grantFields.slice(1)) {
    const combined = (character.sheet[key] ?? []).slice();
    for (const item of additions[key]) {
      if (key === 'customDomainCards' && combined.some(card => cardKey(card) === cardKey(item))) continue;
      combined.push(item);
    }
    character.sheet[key] = combined;
  }
  if (remote.sheet.experience) character.sheet.experience = remote.sheet.experience;
  character.updated_at = remote.updated_at;
  baselines[character.id] = JSON.stringify(payload(remote));
  return true;
}

// 本地使用优先智能无损合并策略（确保线下现场操作不被冲掉，GM新补正无缝吸收）
function smartMergeLocalPriority(local, remote) {
  if (!remote || !remote.sheet) return false;
  const ls = local.sheet;
  const rs = remote.sheet;

  // 1. GM 权威字段：以云端为增量合并进入本地
  // GM 补正项 (adjustments)
  if (rs.adjustments) {
    ls.adjustments = { ...(ls.adjustments || {}), ...rs.adjustments };
  }

  // 经验值 (experience): 若云端经验更高，采用云端经验
  if (rs.experience && (!ls.experience || (rs.experience.points ?? 0) > (ls.experience.points ?? 0))) {
    ls.experience = structuredClone(rs.experience);
  }

  // 特权/特殊效果 (specialEffects): 按 id 或 name 并集去重
  if (Array.isArray(rs.specialEffects)) {
    const existingIds = new Set((ls.specialEffects || []).map(e => e.id || e.name));
    ls.specialEffects = [...(ls.specialEffects || [])];
    for (const eff of rs.specialEffects) {
      if (!existingIds.has(eff.id || eff.name)) {
        ls.specialEffects.push(eff);
        existingIds.add(eff.id || eff.name);
      }
    }
  }

  // BUG 报修记录 (bugReports): 吸收云端已处理状态
  if (Array.isArray(rs.bugReports)) {
    const localReports = ls.bugReports || [];
    for (const r of rs.bugReports) {
      const match = localReports.find(l => l.id === r.id);
      if (match) {
        if (r.status === 'resolved') match.status = 'resolved';
      } else {
        localReports.push(r);
      }
    }
    ls.bugReports = localReports;
  }

  // 领域卡 / 物品 (customDomainCards / inventoryItems): 并集补齐
  if (Array.isArray(rs.customDomainCards)) {
    const owned = new Set((ls.customDomainCards || []).map(cardKey));
    ls.customDomainCards = [...(ls.customDomainCards || [])];
    for (const card of rs.customDomainCards) {
      if (!owned.has(cardKey(card))) {
        ls.customDomainCards.push(card);
        owned.add(cardKey(card));
      }
    }
  }

  // 2. 线下本地现场高频数据（hp.cur, stress.cur, hope.cur, armorPips.cur）绝对保留本地现场！
  // 3. 更新版本时间戳与基线
  local.updated_at = remote.updated_at;
  baselines[local.id] = JSON.stringify(payload(local));
  return true;
}

let refreshPending = false;
const observedCloudVersions = new Map();
async function refreshOpenSheet() {
  if (refreshPending || !currentUser || document.hidden || currentLayer !== 'sheet' || pendingWrites.size ||
      document.querySelector('dialog[open], .modal-backdrop:not([hidden]), .dw-modal-backdrop:not([hidden])') ||
      document.activeElement?.matches('input,textarea,select,[contenteditable]')) return;
  refreshPending = true;
  const versions = new Map(characters.map(c => [c.id,c.updated_at]));
  try {
    const account = await loadAccount();
    if (characters.some(c => versions.get(c.id) !== c.updated_at)) return;
    if (pendingWrites.size || currentLayer !== 'sheet' || document.activeElement?.matches('input,textarea,select,[contenteditable]')) return;
    const changed = account.characters.some(row => observedCloudVersions.get(row.id) !== row.updated_at &&
      !characters.some(c => c.id === row.id && c.updated_at === row.updated_at));
    if (!changed) return;
    reconcileAccount(account);
    for (const row of account.characters) observedCloudVersions.set(row.id,row.updated_at);
  } catch { /* 保持线下本地数据正常可用，静默等待下个时机 */ }
  finally { refreshPending = false; }
}
window.setInterval(refreshOpenSheet, 15000);
window.addEventListener('focus', refreshOpenSheet);
window.addEventListener('online', () => {
  updateSyncStatus(true, `网络已恢复 · ${currentUser?.login || '冒险者'}`);
  refreshOpenSheet();
});
window.addEventListener('offline', () => {
  updateSyncStatus(false, '离线模式 (本地正常使用)');
});

function reconcileAccount(account, interactive = false) {
  const currentOwner = readSession()?.owner;
  if (currentOwner && account.owner !== currentOwner) return location.reload();
  const selected = curChar()?.id;
  const remote = new Map(account.characters.map(c => [c.id, normalizeCharacter(c)]));
  characters = characters.filter(c => {
    if (pendingWrites.has(c)) { remote.delete(c.id); return true; }
    const draft = !c.updated_at || !baselines[c.id] || baselines[c.id] !== JSON.stringify(payload(c));
    if (draft) {
      const candidate = remote.get(c.id);
      if (!baselines[c.id] && candidate && c.updated_at === candidate.updated_at && JSON.stringify(payload(c)) === JSON.stringify(payload(candidate))) return false;
      const newer = remote.get(c.id);
      if (newer && newer.updated_at !== c.updated_at) {
        // 本地使用优先智能合并：绝不弹窗打断线下跑团，无损吸收云端补正！
        smartMergeLocalPriority(c, newer);
        // 静默向云端推回合并后的新现场
        persist(c, payload(c)).catch(() => {});
        remote.delete(c.id);
        return true;
      }
      remote.delete(c.id); return true;
    }
    return false;
  });
  for (const c of remote.values()) {
    characters.push(c); baselines[c.id] = JSON.stringify(payload(c));
  }
  activeCharIndex = Math.max(0, characters.findIndex(c => c.id === selected));
  saveLocal(); renderVaultLobby();
  if (characters.length && currentLayer === 'sheet') renderAll();
  if (!characters.length && currentLayer === 'sheet') switchLayer('vault');
}
function saveLocal() {
  if (owner && readSession()?.owner === owner) {
    try { localStorage.setItem(cacheKey, JSON.stringify({characters,baselines})); }
    catch (error) { console.warn('角色缓存写入失败：',error); }
  }
  renderSaveButton();
}
window.addEventListener('storage', () => {
  if (readSession()?.owner !== owner) location.replace('../account.html');
});
const pendingWrites = new Set();
async function persist(c, data = payload(c)) {
  if (readSession()?.owner !== owner) throw new Error('账号已切换，请重新进入。');
  if (pendingWrites.has(c)) throw new Error('正在保存这个角色。');
  pendingWrites.add(c);
  try {
    const snapshot = structuredClone(data);
    const row = await saveCharacter(snapshot, c.updated_at ? c : null);
    c.id = row.id; c.updated_at = row.updated_at; c.owner_id = row.owner_id;
    baselines[c.id] = JSON.stringify(snapshot);
    saveLocal();
  } finally { pendingWrites.delete(c); }
}

let saveErrorCharacter = null;
function renderSaveButton() {
  const button = el('btn-save-cloud');
  const character = curChar();
  if (!button || !character || !db) return;
  const saving = pendingWrites.has(character);
  const clean = baselines[character.id] === JSON.stringify(payload(character));
  button.disabled = saving || clean;
  button.textContent = saving ? '保存中…' : clean ? '已保存' : saveErrorCharacter === character ? '重试保存' : '保存更改';
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
function setupTabs(refreshAdventureBoard) {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pageId = `page-${btn.dataset.page}`;
      const page = el(pageId);
      if (page) page.classList.add('active');
      if (btn.dataset.page === 'skills') renderDomainCards();
      if (btn.dataset.page === 'adventure') void refreshAdventureBoard();
    });
  });
}

// Populate Select Dropdowns
function populateSelectOptions() {
  if (!db) return;

  const selAncestry = el('fn-select-ancestry');
  const selClass = el('fn-select-class');

  if (selAncestry && db.ancestries) {
    selAncestry.innerHTML = db.ancestries.map(a => `<option value="${a.ID}">${a.名称}</option>`).join('');
  }
  if (selClass && db.classes) {
    selClass.innerHTML = db.classes.map(c => `<option value="${c.ID}">${c.名称}</option>`).join('');
  }



  // Populate Layer 1 Creation Wizard dropdowns
  const newAnc = el('new-char-ancestry');
  const newCls = el('new-char-class');
  if (newAnc && db.ancestries) {
    newAnc.innerHTML = db.ancestries.map(a => `<option value="${a.ID}">${a.名称}</option>`).join('');
  }
  if (newCls && db.classes) {
    newCls.innerHTML = db.classes.map(c => `<option value="${c.ID}">${c.名称}</option>`).join('');
  }
  newCls?.refreshStartingCards?.();
  updateCreatorSubclassOptions();
  updateCreatorAncestryPreview();
  updateCreatorClassPreview();
}

function updateSubclassOptions() {
  if (!db || !db.subclasses) return;
  const c = curChar();
  if (!c || !c.sheet) return;
  const classObj = db.classes?.find(cls => cls.ID === c.sheet?.classId || cls.名称 === c.sheet?.classId);
  const className = classObj ? classObj.名称 : '战士';

  const subList = db.subclasses.filter(sc => sc.主职 === className || sc.ID.includes(className));
  const selSub = el('fn-select-subclass');
  if (selSub) {
    selSub.innerHTML = subList.map(sc => `<option value="${sc.ID}">${sc.名称} (${sc.等级 || '基础'})</option>`).join('');
    if (subList.length > 0) {
      selSub.value = subList.some(o => o.ID === c.sheet.subclassId) ? c.sheet.subclassId : subList[0].ID;
    }
  }
}

// Dynamic Defense, Maximum Resources, and Damage Thresholds Engine
function calculateStats(char) {
  const job = db?.classes?.find(x => x.ID === char.sheet.classId || x.名称 === char.sheet.classId);
  return sheetStats(char, job, bagCapacity(char.sheet.bags).totalSlots);
}

// Main Render Function

// ==========================================================================
// 核心两层架构控制器 (Two-Tier Layer Controller)
// ==========================================================================
async function switchLayer(layer, targetIndex) {
  if (layer === 'sheet' && !characters.length) layer = 'vault';
  if (layer === 'sheet' && !db) {
    updateSyncStatus(true, '正在加载规则资料…');
    await ensureDatabaseLoaded();
    if (!db) { alert('规则资料尚未加载完成，请检查网络或刷新后重试。'); return; }
  }
  el('btn-save-cloud').hidden = layer !== 'sheet';
  el('current-character').hidden = layer !== 'sheet';
  if (layer === 'workshop' && currentUser?.role !== 'gm') return;
  isGmOverrideActive = false;
  currentLayer = layer;
  const vaultLayer = el('layer-vault');
  const sheetLayer = el('layer-sheet');
  const workshopLayer = el('layer-workshop');
  el('sync-status').hidden = layer === 'sheet';
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
      backBtn.textContent = '返回角色库';
      backBtn.title = '返回角色库';
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
      backBtn.innerHTML = '<span>‹</span> 角色库';
      backBtn.title = '返回角色库';
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
  const stage = el('vault-preview');
  stage.hidden = !characters.length;
  const rows = characters.map((character, index) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'vault-choice';
    row.textContent = `${character.avatar_name || '无名角色'} · ${character.level || 1} 级`;
    row.setAttribute('aria-pressed', 'false');
    row.addEventListener('click', () => select(index));
    container.append(row);
    return row;
  });
  function select(index) {
    const character = characters[index];
    const sheet = character.sheet;
    rows.forEach((row, rowIndex) => row.setAttribute('aria-pressed', String(rowIndex === index)));
    const job = db?.classes?.find(item => item.ID === sheet.classId || item.名称 === sheet.classId);
    const ancestry = db?.ancestries?.find(item => item.ID === sheet.ancestryId || item.名称 === sheet.ancestryId);
    el('vault-preview-name').textContent = character.avatar_name || '无名角色';
    el('vault-preview-details').textContent = [ancestry?.名称, job?.名称, `${character.level || 1} 级`].filter(Boolean).join(' · ');
    el('vault-preview-open').onclick = () => switchLayer('sheet', index);
    el('vault-preview-export').onclick = () => exportCharacterJson(index);
    el('vault-preview-delete').onclick = () => deleteCharacterByIndex(index);
    setAppearanceFrame('vault-preview-canvas', character);
  }
  if (rows.length) select(Math.min(Math.max(activeCharIndex, 0), rows.length - 1));
  const create = document.createElement('button');
  create.type = 'button';
  create.className = 'vault-create-card';
  create.innerHTML = '<span aria-hidden="true">+</span>新建角色';
  create.addEventListener('click', showCharacterCreator);
  container.append(create);
}

async function showCharacterCreator() {
  const section = el('vault-creator-section');
  if (!db) {
    updateSyncStatus(true, '正在加载规则资料…');
    await ensureDatabaseLoaded();
  }
  if (!db) return alert('规则资料尚未加载完成，请检查网络或刷新后重试。');
  section.hidden = false;
  previewAppearance();
  section.scrollIntoView({ block: 'nearest' });
  el('new-char-name').focus({ preventScroll: true });
}

function exportCharacterJson(idx = null) {
  const target = (idx !== null && idx !== undefined && characters[idx]) ? characters[idx] : curChar();
  if (!target) return;
  const jsonStr = JSON.stringify(payload(target), null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `匕首世界角色_${target.avatar_name || '角色'}_Lv${target.level}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function deleteCharacterByIndex(idx) {
  const target = characters[idx];
  if (!target) return;
  if (confirm(`确定要彻底删除角色【${target.avatar_name}】吗？此操作无法撤销。`)) {
    if (target.updated_at) {
      try { await deleteCharacter(target); } catch (error) { return alert(error.message); }
    }
    characters = characters.filter(c => c !== target);
    activeCharIndex = Math.max(0, Math.min(activeCharIndex, characters.length - 1));
    saveLocal();
    renderVaultLobby();
  }
}

// ==========================================================================
// 创角向导 (Character Creation Wizard) 控制器
// ==========================================================================
function appearanceUrl(character) {
  const url = new URL('../fantasy-paperdoll/bridge/preview.html', import.meta.url);
  if (character?.sheet?.ancestryId) url.searchParams.set('ancestry', character.sheet.ancestryId);
  if (character?.sheet?.bodyShape) url.searchParams.set('bodyShape', character.sheet.bodyShape);
  if (character?.updated_at && character?.owner_id === currentUser?.owner) {
    url.searchParams.set('character', character.id);
  }
  return url;
}

function setAppearanceFrame(id, character, download = false) {
  const target = el(id);
  if (!target) return;
  const s = character?.sheet || {};
  const mode = s.portraitMode === 'custom' ? 'custom' : 'paperdoll';

  if (mode === 'custom' && s.customPortrait?.dataUrl) {
    target.classList.add('has-custom-portrait');
    showCustomPortrait(target, s.customPortrait);
    return;
  }
  target.classList.remove('has-custom-portrait');

  // mode === 'paperdoll': 动态纸娃娃换装态（所见即所得）
  let frame = target.querySelector('iframe');
  if (frame && frame.contentWindow?.DaggerworldAvatar?.setCharacter) {
    frame.contentWindow.DaggerworldAvatar.setCharacter(character).catch(err => {
      console.warn('纸娃娃实时刷新异常，降级显示轮廓:', err);
      showCharacterOutline(target, s.ancestryId, s.bodyShape);
    });
    target.hidden = false;
    return;
  }

  const url = appearanceUrl(character);
  url.searchParams.set('view', 'preview');
  if (download) url.searchParams.set('download', '');

  if (!frame) {
    frame = document.createElement('iframe');
    frame.title = '角色全身预览';
    frame.loading = 'lazy';
    frame.style.cssText = 'display:block;width:100%;height:100%;border:0;background:transparent';
    frame.onload = () => {
      if (frame.contentWindow?.DaggerworldAvatar?.setCharacter) {
        frame.contentWindow.DaggerworldAvatar.setCharacter(character).catch(() => {});
      }
    };
    frame.onerror = () => {
      console.warn('纸娃娃加载失败，降级显示人型轮廓');
      showCharacterOutline(target, s.ancestryId, s.bodyShape);
    };
    frame.src = url.href;
    target.replaceChildren(frame);
  } else if (frame.src !== url.href) {
    frame.src = url.href;
  }
  target.hidden = false;
}

function previewAppearance() {
  setAppearanceFrame('creator-paperdoll', {sheet:{ancestryId:el('new-char-ancestry').value,bodyShape:el('new-char-body-shape').value}});
}

function startingCards(job) {
  const domains = (job?.领域 ?? '').split(/[+、,，]/).map(name => name.trim());
  return uniqueCards(db?.domain_cards ?? []).filter(card => cardLevel(card) === 1 && domains.includes(card.领域));
}

function setupStartingAllocation() {
  const bank = el('creator-attribute-bank');
  const grid = el('creator-attribute-grid');
  const tokens = [...startingModifiers].reverse();
  const assignments = new Map();
  let selected = null;
  const signed = value => value > 0 ? '+'+value : String(value).replace('-','−');
  const sourceOf = token => [...assignments].find(([,id]) => id === token)?.[0];
  const button = (label,action) => {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'dw-btn dw-btn-outline';
    control.textContent = label;
    control.onclick = action;
    return control;
  };
  function place(key,token) {
    if (!Number.isInteger(token) || token < 0 || token >= tokens.length) return;
    const source = sourceOf(token);
    const old = assignments.get(key);
    if (source && source !== key) {
      if (old === undefined) assignments.delete(source);
      else assignments.set(source,old);
    }
    assignments.set(key,token);
    selected = null;
    render();
    grid.querySelector('[data-trait-key="'+key+'"]')?.focus();
  }
  function toggle(token) {
    selected = selected === token ? null : token;
    render();
    (grid.querySelector('[data-token="'+token+'"]') ?? bank.querySelector('[data-token="'+token+'"]'))?.focus();
  }
  function draggable(control,token) {
    control.dataset.token = token;
    control.draggable = true;
    control.ondragstart = event => {
      event.dataTransfer.setData('application/x-attribute-token',String(token));
      event.dataTransfer.effectAllowed = 'move';
      grid.classList.add('dragging');
    };
    control.ondragend = () => grid.classList.remove('dragging');
  }
  function render() {
    bank.replaceChildren(...tokens.map((value,token) => {
      const source = sourceOf(token);
      const control = button(signed(value),() => toggle(token));
      control.disabled = Boolean(source);
      control.setAttribute('aria-label',signed(value)+(source ? ' 已分给'+traits[source] : ' 待分配'));
      control.setAttribute('aria-pressed',String(selected === token && !source));
      if (!source) draggable(control,token);
      return control;
    }));
    grid.classList.toggle('placing-token',selected !== null);
    grid.replaceChildren(...Object.entries(traits).map(([key,label]) => {
      const token = assignments.get(key);
      const slot = document.createElement('div');
      slot.className = 'creator-attribute-slot';
      const control = button(label,() => {
        if (selected !== null && selected !== token) place(key,selected);
        else if (token !== undefined) toggle(token);
        else el('creator-attribute-status').textContent = '请先从上方选一个点数。';
      });
      control.dataset.traitKey = key;
      control.setAttribute('aria-pressed',String(token !== undefined && token === selected));
      const value = document.createElement('strong');
      value.textContent = token === undefined ? '待分配' : signed(tokens[token]);
      control.append(value);
      slot.append(control);
      if (token !== undefined) {
        draggable(control,token);
        const remove = button('退回',() => {
          assignments.delete(key);
          selected = token;
          render();
          bank.querySelector('[data-token="'+token+'"]')?.focus();
        });
        remove.className = 'attribute-return';
        remove.setAttribute('aria-label','退回'+label+'点数');
        slot.append(remove);
      }
      slot.ondragover = event => {
        if (!event.dataTransfer.types.includes('application/x-attribute-token')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        slot.classList.add('drop-target');
      };
      slot.ondragleave = event => { if (!slot.contains(event.relatedTarget)) slot.classList.remove('drop-target'); };
      slot.ondrop = event => {
        event.preventDefault();
        slot.classList.remove('drop-target');
        grid.classList.remove('dragging');
        const data = event.dataTransfer.getData('application/x-attribute-token');
        if (data !== '') place(key,Number(data));
      };
      return slot;
    }));
    el('creator-attribute-count').textContent = assignments.size+' / 6';
    el('creator-attribute-status').textContent = selected !== null
      ? '已选 '+signed(tokens[selected])+'，点目标属性放置或交换。'
      : assignments.size === 6 ? '六项属性已分配。可选中已有点数再交换。' : '选一个点数，再点属性。也可以直接拖放。';
    el('creator-attribute-reset').disabled = !assignments.size;
  }
  bank.ondragover = event => {
    if (event.dataTransfer.types.includes('application/x-attribute-token')) event.preventDefault();
  };
  bank.ondrop = event => {
    event.preventDefault();
    grid.classList.remove('dragging');
    const data = event.dataTransfer.getData('application/x-attribute-token');
    if (data === '') return;
    const token = Number(data);
    const source = sourceOf(token);
    if (!source) return;
    assignments.delete(source);
    selected = token;
    render();
    bank.querySelector('[data-token="'+token+'"]')?.focus();
  };
  function reset() { assignments.clear(); selected = null; render(); }
  el('creator-attribute-reset').onclick = reset;
  render();
  return { values: () => Object.fromEntries([...assignments].map(([key,id]) => [key,tokens[id]])), reset };
}

function setupCreationWizard() {
  el('new-char-body-shape').addEventListener('change',previewAppearance);
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
    selAnc.addEventListener('change', () => { updateCreatorAncestryPreview(); previewAppearance(); });
  }
  if (selCls) {
    selCls.addEventListener('change', () => {
      updateCreatorSubclassOptions();
      updateCreatorClassPreview();
    });
  }

  const form = el('form-create-character');
  const allocation = setupStartingAllocation();
  const selectedKeys = new Set();
  const requiredCards = () => selSub.value === '子职:法师:知识学派:基础' && selCls.value === '职业:法师' ? 3 : 2;
  function refreshStartingCards() {
    const job = db?.classes?.find(item => item.ID === selCls.value);
    const cards = startingCards(job);
    const allowed = new Set(cards.map(cardKey));
    for (const key of selectedKeys) if (!allowed.has(key)) selectedKeys.delete(key);
    while (selectedKeys.size > requiredCards()) selectedKeys.delete([...selectedKeys].at(-1));
    const grid = el('creator-domain-grid');
    const open = new Set([...grid.querySelectorAll('details[open]')].map(row => row.dataset.card));
    grid.replaceChildren(...cards.map(card => {
      const key = cardKey(card);
      const row = document.createElement('article');
      const details = document.createElement('details');
      details.dataset.card = key;
      details.open = open.has(key);
      const label = document.createElement('summary');
      label.textContent = card.名称+' · '+card.领域;
      const meta = document.createElement('small');
      meta.textContent = [card.属性,'回想 '+recallCost(card)+' 压力'].filter(Boolean).join(' · ');
      const effects = document.createElement('div');
      effects.innerHTML = renderMarkdown(card.描述 || '');
      details.append(label,meta,effects);
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'dw-btn dw-btn-outline';
      toggle.dataset.card = key;
      const picked = selectedKeys.has(key);
      toggle.textContent = picked ? '取消选择' : '选择';
      toggle.setAttribute('aria-pressed',String(picked));
      toggle.disabled = !picked && selectedKeys.size >= requiredCards();
      toggle.onclick = () => {
        if (picked) selectedKeys.delete(key);
        else if (selectedKeys.size < requiredCards()) selectedKeys.add(key);
        refreshStartingCards();
        [...grid.querySelectorAll('button')].find(button => button.dataset.card === key)?.focus();
      };
      row.append(details,toggle);
      return row;
    }));
    el('creator-domain-count').textContent = '已选 '+selectedKeys.size+' / '+requiredCards()+' 张'+
      (requiredCards() === 3 ? ' · 知识学派额外 1 张' : '');
  }
  selCls.addEventListener('change',refreshStartingCards);
  selSub.addEventListener('change',refreshStartingCards);
  el('new-char-class').refreshStartingCards = refreshStartingCards;
  const error = el('creator-error');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const nameInput = el('new-char-name');
    const name = nameInput.value.trim();
    if (!name || name.length > 30) {
      error.textContent = '请输入 1–30 字的角色名。';
      nameInput.focus();
      return;
    }
    const ancestry = db?.ancestries?.find(item => item.ID === selAnc.value);
    const job = db?.classes?.find(item => item.ID === selCls.value);
    const subclass = db?.subclasses?.find(item => item.ID === selSub.value && item.等级 === '基础' && item.主职 === job?.名称);
    if (!ancestry || !job || !subclass) { error.textContent = '请选择有效的种族、职业和子职业。'; return; }
    const attributes = allocation.values();
    if (Object.values(attributes).sort((a,b) => a-b).join(',') !== startingModifiers.join(',')) {
      error.textContent = '请各用一次 +2、−1，各用两次 +1、0。';
      return;
    }
    const character = createDefaultCharacter(name,genderHidden.value,ancestry.ID,job.ID,subclass.ID);
    const bodyShape = el('new-char-body-shape').value;
    if (bodyShape) character.sheet.bodyShape = bodyShape;
    const selectedCards = startingCards(job).filter(card => selectedKeys.has(cardKey(card)));
    if (selectedCards.length !== requiredCards()) {
      error.textContent = '请选择 '+requiredCards()+' 张不同的 1 级职业领域卡。';
      return;
    }
    character.sheet.equippedDomainCards = selectedCards;
    selectedKeys.clear();
    refreshStartingCards();
    character.sheet.attributes = attributes;
    character.sheet.hp.cur = character.sheet.hp.max = Number(job.生命点) || 6;

    characters.push(character);
    activeCharIndex = characters.length-1;
    saveLocal();
    nameInput.value = '';
    el('new-char-body-shape').value = '';
    allocation.reset();
    error.textContent = '';
    el('vault-creator-section').hidden = true;
    switchLayer('sheet',activeCharIndex);
  });

  el('btn-close-creator').addEventListener('click', () => {
    el('vault-creator-section').hidden = true;
    el('lobby-char-cards-container').querySelector('.vault-create-card')?.focus();
  });

  // 导入角色卡 JSON
  const importBtn = el('btn-hero-import');
  const fileInput = el('hero-import-file');
  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', importCharacterJson);
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
        <span style="color:var(--text-gold);"><strong>领域：</strong>${c.领域 || '未归类'}</span>
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
  const subs = (db.subclasses || []).filter(s => s.主职 === className && s.等级 === '基础');
  selSub.innerHTML = subs.map(s => `<option value="${s.ID}">${s.名称} (${s.等级 || '基础'})</option>`).join('');
}

function renderAll() {
  if (!curChar()) return;
  const c = curChar();
  renderSaveButton();
  renderLastRoll(c);
  const s = c.sheet;
  const stats = calculateStats(c);

  const current = {
    hp: Math.min(Math.max(0,s.hp.cur), stats.maxHp), stress: Math.min(Math.max(0,s.stress.cur), stats.maxStress),
    hope: Math.min(Math.max(0,s.hope.cur), stats.maxHope), armor: Math.min(Math.max(0,s.armorPips.cur), stats.armorMax)
  };
  // 1. Top Header Info
  el('cur-char-name').textContent = c.avatar_name || '无名角色';
  const clsObj = db?.classes?.find(x => x.ID === s.classId || x.名称 === s.classId);
  el('cur-char-class').textContent = `${clsObj?.名称 || '战士'} · Lv ${c.level}`;

  el('dash-name').textContent = c.avatar_name || '无名角色';
  el('dash-class').textContent = clsObj?.名称 || '战士';
  el('dash-ancestry').textContent = db?.ancestries?.find(item => item.ID === s.ancestryId)?.名称 ?? s.ancestryId?.split(':').at(-1) ?? '—';
  el('dash-level').textContent = `Lv ${c.level}`;

  const xpInfo = experience(c);
  const reqXp = xpInfo.required ?? 0;
  const curXp = xpInfo.points ?? 0;
  const isMaxLvl = c.level >= lastLevel;
  const xpDisplay = isMaxLvl ? 'MAX' : `${curXp.toLocaleString('zh-CN')} / ${reqXp.toLocaleString('zh-CN')} XP`;

  const dashXp = el('dash-xp');
  if (dashXp) {
    dashXp.textContent = isMaxLvl ? 'XP MAX' : `XP ${curXp.toLocaleString('zh-CN')} / ${reqXp.toLocaleString('zh-CN')}`;
    dashXp.classList.toggle('xp-ready', !isMaxLvl && curXp >= reqXp);
    dashXp.title = isMaxLvl ? '已达到最高等级' : `当前经验值 ${curXp}，升至下一级需要 ${reqXp} 经验`;
  }

  const genderEl = el('dash-gender');
  if (genderEl) {
    const gender = s.gender || '男';
    genderEl.textContent = gender;
    genderEl.className = 'gender-badge';
  }

  // 2. Combat Resource Tracks & Pips
  renderPips('hp', current.hp, stats.maxHp, 'filled-health');
  renderPips('stress', current.stress, stats.maxStress, 'filled-stress');
  renderPips('hope', current.hope, stats.maxHope, 'filled-hope');
  renderPips('armor', current.armor, stats.armorMax, 'filled-armor');

  el('hp-cur').textContent = current.hp;
  el('hp-max').textContent = stats.maxHp;
  el('stress-cur').textContent = current.stress;
  el('stress-max').textContent = stats.maxStress;
  el('hope-cur').textContent = current.hope;
  el('hope-max').textContent = stats.maxHope;
  el('armor-cur').textContent = current.armor;
  el('armor-remaining').textContent = stats.armorMax - current.armor;
  el('armor-max').textContent = stats.armorMax;

  el('threshold-a').textContent = stats.majorThreshold;
  el('threshold-b').textContent = stats.severeThreshold;
  el('threshold-c').textContent = stats.lethalThreshold;

  // Thresholds Dashboard Readout
  el('stat-armor-score').textContent = stats.baseArmor;
  el('stat-evasion').textContent = stats.values.evasion;
  el('evasion-breakdown').textContent = '基础与装备 ' + stats.automatic.evasion;
  for (const [id, key] of Object.entries(quickAdjustments)) el(id).value = adjustment(s, key);
  renderAdjustments(c, stats);
  renderInlineAdjustments(c, stats);
  el('stat-proficiency').textContent = stats.totalProf;
  renderAdvancements(c);

  // 3. Equipment Loadout Slots
  renderEquipmentSlots(stats);

  // 4. Attributes Column
  if (s.attributes) {
    for (const [attr, mod] of Object.entries(s.attributes)) {
      const modEl = el(`attr-mod-${attr}`);
      if (modEl) {
        modEl.value = stats.values[attr];
        modEl.readOnly = true;
        modEl.title = stats.gear[attr] ? `基础 ${mod} · 装备 ${stats.gear[attr]}` : '基础属性';
      }
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
  for (let i = 0; i < Math.min(max, 120); i++) {
    const pip = document.createElement('div');
    pip.className = `pip ${i < cur ? fillClass : ''}`;
    pip.title = `${type.toUpperCase()} 点数 ${i + 1}`;
    pip.addEventListener('click', () => {
      const c = curChar();
      c.sheet[type === 'armor' ? 'armorPips' : type].cur = i + 1 === cur ? i : i + 1;
      saveLocal();
      renderAll();
    });
    container.appendChild(pip);
  }
}

function renderEquipmentSlots(stats) {
  const c = curChar();
  const eq = c.sheet.equipment || {};


  const slotKeys = ['head', 'chest', 'waist', 'legs', 'feet', 'back', 'ring1', 'ring2', 'trinket1', 'trinket2', 'costume'];
  for (const k of slotKeys) {
    const itemEl = el(`slot-name-${k}`);
    if (itemEl) {
      const item = k === 'chest' && stats.isSuitActive ? stats.suitItem : eq[k];
      const locked = k !== 'chest' && suitCoversSlot(c.sheet,k);
      const control = itemEl.closest('[data-slot]');
      control?.classList.toggle('suit-locked',locked);
      if (control) control.setAttribute('aria-disabled',String(locked));
      itemEl.textContent = locked ? '套装占用' : item ? item.名称 : '空置';
      itemEl.style.color = item ? 'var(--text-main)' : 'var(--text-muted)';
      renderSlotArt(k, locked ? null : item, k === 'chest' && stats.isSuitActive ? 'suit' : k);
    }
  }

  // Weapons
  el('wp-main-name').textContent = eq.weapon_main?.名称 || '空手';
  el('wp-main-stats').textContent = weaponSummary(eq.weapon_main, stats.totalProf);

  el('wp-off-name').textContent = eq.weapon_off?.名称 || '空置';
  el('wp-off-stats').textContent = weaponSummary(eq.weapon_off, stats.totalProf);

  el('wp-spare-name').textContent = eq.weapon_spare?.名称 || '空置';
  el('wp-spare-stats').textContent = weaponSummary(eq.weapon_spare, stats.totalProf);
  for (const [slot, prefix] of [['weapon_main', 'main'], ['weapon_off', 'off'], ['weapon_spare', 'spare']]) {
    const item = eq[slot];
    renderSlotArt(slot, item);
    const notes = el('wp-' + prefix + '-feature');
    notes.innerHTML = renderMarkdown(item?.描述 || '');
    const issue = item && getEquipmentIssue(slot, item, c);
    if (issue) {
      const warning = document.createElement('strong');
      warning.textContent = issue;
      notes.append(warning);
    }
    notes.hidden = !item?.描述 && !issue;
  }
  renderAppearance(c);
}

function weaponSummary(item, proficiency) {
  if (!item) return '—';
  const damageType = item.伤害类型 ? ' ' + item.伤害类型 : '';
  return [item.属性 && '攻击：' + item.属性, item.距离, item.伤害 && '伤害：' + damageDice(item.伤害, proficiency) + damageType, item.负荷].filter(Boolean).join(' · ') || '—';
}

function hasSpellcastTrait(sheet) {
  return spellcastTraits(sheet).length > 0;
}

function spellcastTraits(sheet) {
  const ids = [sheet.subclassId, sheet.multiclass?.subclassId].filter(Boolean);
  return [...new Set((db?.subclasses ?? []).filter(item => ids.includes(item.ID))
    .map(item => item.施法属性?.trim()).filter(value => value && !/^(?:无|—|-|N\/A)$/.test(value)))];
}

function getEquipmentIssue(slot, item, character = curChar()) {
  return equipmentIssue(slot, item, character.sheet, tierForLevel(character.level), hasSpellcastTrait(character.sheet));
}

function renderSlotArt(slot, item, visualSlot = slot) {
  const icon = el(`slot-icon-${slot.replace('_', '-')}`);
  if (icon) decorateGear(icon.closest('[data-slot], [data-bag-slot]'), item, visualSlot);
  const slotElement = icon?.closest('[data-slot], [data-bag-slot]');
  if (slotElement) {
    slotElement.querySelector('.legacy-gear-marker')?.remove();
    if (item?.ID?.startsWith('装备:') && !item.ownedGearId) {
      const marker = document.createElement('small');
      marker.className = 'legacy-gear-marker';
      marker.textContent = '旧版物品';
      slotElement.append(marker);
    }
  }
  const source = item ? spriteUrl(itemArt(item)) : slotIconMap[slot] ?? './assets/icons/slot-pouch-1.svg';
  if (icon && source) {
    icon.style.backgroundImage = `url("${source}")`;
    icon.classList.toggle('pixel-item', Boolean(item));
  }
}

function decorateGear(node, item, slot = item?.slot) {
  if (!node) return;
  delete node.dataset.quality;
  delete node.dataset.suitTier;
  if (!item) return;
  const gear = readGear(item);
  node.dataset.quality = gear.quality || 'white';
  const tier = Number(item.suitTier ?? gear.suitTier ?? item.tier ?? item.位阶);
  const isSuit = Boolean(item.isSuitTier || gear.isSuitTier || slot === 'suit' || item.slot === 'suit' || gear.slot === 'suit');
  if (isSuit && [1, 2, 3, 4].includes(tier)) node.dataset.suitTier = tier;
}

function itemImage(item) {
  const img = document.createElement('img');
  img.className = 'pixel-item-image';
  img.src = spriteUrl(itemArt(item));
  img.alt = '';
  img.loading = 'lazy';
  return img;
}

function renderAppearance(character) {
  const link = el('fantasy-paperdoll-link');
  if (link) {
    link.hidden = !livePaperdollEnabled;
    if (livePaperdollEnabled) link.href = appearanceUrl(character).href;
  }
  setAppearanceFrame('paperdoll', character, true);
  updatePortraitModeButtons(character);
}

function renderFoundations(clsObj) {
  const c = curChar();
  const s = c.sheet;
  const canViewCommunity = currentUser?.role === 'gm';


  if (el('fn-char-name')) el('fn-char-name').value = c.avatar_name || '';
  if (s.ancestryId && el('fn-select-ancestry')) el('fn-select-ancestry').value = s.ancestryId;
  if (s.classId && el('fn-select-class')) el('fn-select-class').value = s.classId;
  updateSubclassOptions();
  if (s.subclassId && el('fn-select-subclass')) el('fn-select-subclass').value = s.subclassId;
  el('gm-notes-panel').hidden = !canViewCommunity || !c.updated_at;
  if (el('gm-note-dialog').open) el('gm-note-dialog').close();

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
  if (gmToggleBtn) gmToggleBtn.hidden = currentUser?.role !== 'gm';
  const lockedInputs = [
    el('fn-char-name'),
    el('fn-select-ancestry'),
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
    if (lockStatusEl) lockStatusEl.innerHTML = '<span class="lock-icon">🔒</span> 已锁定';
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
    const second = db?.classes?.find(item => item.ID === s.multiclass?.classId);
    if (second) {
      el('fn-class-trait-desc').innerHTML += '<hr>' + renderMarkdown(`**兼职：${second.名称} · ${s.multiclass.domain}**\n${second.职业特性 || ''}`);
    }
  }

  // Subclass
  const sc = db?.subclasses?.find(sub => sub.ID === s.subclassId);
  if (sc) {
    el('fn-subclass-title').textContent = cleanTitle(sc.描述, `${sc.名称} (${sc.等级 || '基础'})`);
    const extraIds = [...(s.subclassUpgradeIds ?? []), s.multiclass?.subclassId].filter(Boolean);
    const upgrades = extraIds.map(id => db.subclasses.find(card => card.ID === id)).filter(Boolean);
    el('fn-subclass-desc').innerHTML = [sc, ...upgrades].map(card =>
      renderMarkdown(`**${card.名称} · ${card.等级 || '基础'}**\n${card.描述 || ''}`)).join('<hr>');

    // Spellcasting Trait
    const spCard = el('spellcasting-card');
    const castingTraits = spellcastTraits(s);
    if (castingTraits.length) {
      spCard.hidden = false;
      el('sp-trait-title').textContent = '施法属性 · ' + castingTraits.join(' / ');
      el('sp-trait-desc').textContent = '施法检定使用所选施法属性。';
    } else {
      spCard.hidden = true;
    }
  }

  // Community
  const effects = el('character-effects');
  effects.replaceChildren();
  const names = {vulnerable:'脆弱',restrained:'束缚',hidden:'隐藏'};
  const recorded = [...(s.specialEffects ?? [])];
  for (const [key,name] of Object.entries(names)) {
    if (s.conditions?.[key] && !recorded.some(effect => effect.name === name)) recorded.push({name});
  }
  if (!recorded.length) {
    const empty = document.createElement('li');
    empty.textContent = '无特殊效果';
    effects.append(empty);
  }
  for (const effect of recorded) {
    const row = document.createElement('li');
    row.textContent = effect.description ? effect.name+' · '+effect.description : effect.name;
    effects.append(row);
  }
}

function renderDomainCards() {
  if (!curChar() || currentLayer !== 'sheet' || !el('page-skills').classList.contains('active')) return;
  const character = curChar();
  const sheet = character.sheet;
  const equipped = uniqueCards(sheet.equippedDomainCards);
  const equippedKeys = new Set(equipped.map(cardKey));
  const vault = uniqueCards([...sheet.vaultDomainCards, ...sheet.customDomainCards])
    .filter(card => !equippedKeys.has(cardKey(card)));
  const ownedKeys = new Set([...equipped, ...vault].map(cardKey));
  const domains = [...new Set((db?.domain_cards ?? []).map(card => card.领域).filter(Boolean))];

  el('equipped-cards-count').textContent = equipped.length;
  el('domain-owned-count').textContent = String(ownedKeys.size);
  el('equipped-cards-container').replaceChildren(...equipped.map(card => domainCard(card, 'equipped', character)));
  el('domain-vault-cards-container').replaceChildren(...vault.map(card => domainCard(card, 'vault', character)));
  for (const [id,count] of [['domain-empty-loadout',equipped.length],['domain-empty-vault',vault.length]])
    el(id).hidden = count > 0;
  const manager = el('domain-manager');
  manager.hidden = currentUser?.role !== 'gm';
  if (manager.hidden) {
    el('domain-catalog').replaceChildren();
    return;
  }
  const filterBar = el('domain-filters-bar');
  const sameCharacter = filterBar.dataset.character === character.id;
  const previousDomain = sameCharacter ? filterBar.querySelector('select')?.value : '';
  const previousQuery = sameCharacter ? filterBar.querySelector('input')?.value : '';
  filterBar.dataset.character = character.id;
  const choices = [{ value: '', label: '全部领域' }, ...[...new Set([...domains, sheet.multiclass?.domain].filter(Boolean))]
    .map(name => ({ value: name, label: name }))];
  const filter = document.createElement('select');
  filter.className = 'dw-select';
  filter.setAttribute('aria-label', '筛选领域图鉴');
  for (const option of choices) filter.add(new Option(option.label, option.value));
  const query = document.createElement('input');
  query.type = 'search';
  query.className = 'dw-input';
  query.placeholder = '搜索领域卡';
  query.setAttribute('aria-label', '搜索领域卡');
  if (choices.some(option => option.value === previousDomain)) filter.value = previousDomain;
  query.value = previousQuery ?? '';
  filterBar.replaceChildren(filter, query);
  function renderCatalog() {
    const keyword = query.value.trim().toLowerCase();
    const catalog = uniqueCards([...(db?.domain_cards ?? []), ...campaignResources.domainCards]);
    const filtered = catalog.filter(card => (!filter.value || card.领域 === filter.value)
      && (!keyword || card.名称?.toLowerCase().includes(keyword)));
    el('domain-catalog').replaceChildren(...filtered.map(card => {
      return domainCard(card,currentUser?.role === 'gm' && !ownedKeys.has(cardKey(card)) && character.updated_at ? 'grant' : 'reference',
        character,ownedKeys.has(cardKey(card)));
    }));
  }
  filter.addEventListener('change', renderCatalog);
  query.addEventListener('input', renderCatalog);
  renderCatalog();
}

function domainCard(card, action, character, owned = false) {
  const entry = document.createElement('article');
  entry.className = 'dh-card';
  const title = document.createElement('h4');
  title.className = 'dh-card-title';
  title.textContent = card.名称;
  const meta = document.createElement('p');
  const cost = recallCost(card);
  meta.textContent = `${card.领域 || '未归类'} · ${cardLevel(card)} 级 · ${card.属性 || card.类型 || '领域卡'} · 回想 ${cost} 压力`;
  const body = document.createElement('div');
  body.className = 'dh-card-desc';
  body.innerHTML = renderMarkdown(card.描述 || '');
  entry.append(title, meta, body);
  if (action === 'reference') {
    const note = document.createElement('small');
    note.textContent = owned ? '已获得' : '查阅';
    entry.append(note);
    return entry;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dw-btn dw-btn-outline';
  button.textContent = { equipped: '移回宝库', vault: '回想至配置', grant: '发放此卡' }[action];
  const swap = document.createElement('select');
  if (action === 'vault' && character.sheet.equippedDomainCards.length >= 5) {
    swap.setAttribute('aria-label', '选择移回宝库的卡');
    swap.add(new Option('选择移回宝库的卡', ''));
    for (const active of uniqueCards(character.sheet.equippedDomainCards)) swap.add(new Option(active.名称, cardKey(active)));
    entry.append(swap);
  }
  button.addEventListener('click', () => {
    const sheet = character.sheet;
    const key = cardKey(card);
    if (action === 'equipped') {
      sheet.equippedDomainCards = sheet.equippedDomainCards.filter(item => cardKey(item) !== key);
      sheet.vaultDomainCards = uniqueCards([...sheet.vaultDomainCards, card]);
    } else if (action === 'vault') {
      const active = uniqueCards(sheet.equippedDomainCards);
      const swapped = active.find(item => cardKey(item) === swap.value);
      if (active.length > 5 || active.length === 5 && !swapped) return alert('配置已满，请选择一张卡移回宝库。');
      const stressCost = el('domain-rest').checked ? 0 : cost;
      if (stressCost && sheet.stress.cur + stressCost > calculateStats(character).maxStress) return alert('可标记的压力点不足。');
      if (stressCost && !confirm(`标记 ${stressCost} 点压力并回想此卡？`)) return;
      sheet.stress.cur += stressCost;
      const vault = sheet.vaultDomainCards.filter(item => cardKey(item) !== key);
      sheet.vaultDomainCards = swapped ? uniqueCards([...vault, swapped]) : vault;
      sheet.equippedDomainCards = [...active.filter(item => item !== swapped), card];
    } else if (action === 'grant' && currentUser?.role === 'gm') {
      void deliver(characters.indexOf(character),'customDomainCards',card);
      return;
    }
    saveLocal();
    renderAll();
  });
  entry.append(button);
  if (currentUser?.role === 'gm' && (action === 'equipped' || action === 'vault')) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'dw-btn dw-btn-outline';
    remove.textContent = '移除';
    remove.onclick = () => {
      if (!confirm('移除「'+card.名称+'」？')) return;
      for (const field of ['equippedDomainCards','vaultDomainCards','customDomainCards'])
        character.sheet[field] = character.sheet[field].filter(item => cardKey(item) !== cardKey(card));
      saveLocal();
      renderDomainCards();
    };
    entry.append(remove);
  }
  return entry;
}

function containerCapacity(bag) {
  const capacity = Number(bag?.capacity ?? bag?.容量);
  return Number.isSafeInteger(capacity) && capacity > 0 ? capacity : 0;
}

function bagCapacity(bags) {
  const mainCap = containerCapacity(bags.main_bag);
  const p1Cap = containerCapacity(bags.pouch_1);
  const p2Cap = containerCapacity(bags.pouch_2);
  const s1Cap = containerCapacity(bags.satchel_1);
  const s2Cap = containerCapacity(bags.satchel_2);
  const extraCap = p1Cap + p2Cap + s1Cap + s2Cap;
  return { mainCap, p1Cap, p2Cap, s1Cap, s2Cap, extraCap, totalSlots: mainCap + extraCap };
}

function renderInventory(stats) {
  const c = curChar();
  const bags = c.sheet.bags || {};
  const { mainCap, p1Cap, p2Cap, s1Cap, s2Cap, extraCap, totalSlots } = bagCapacity(bags);


  el('bag-name-main').textContent = bags.main_bag?.名称 || '空置';
  el('bag-name-pouch1').textContent = bags.pouch_1 ? `${bags.pouch_1.名称} (+${p1Cap}格)` : '空腰带位 (0格)';
  el('bag-name-pouch2').textContent = bags.pouch_2 ? `${bags.pouch_2.名称} (+${p2Cap}格)` : '空腰带位 (0格)';
  el('bag-name-satchel1').textContent = bags.satchel_1 ? `${bags.satchel_1.名称} (+${s1Cap}格)` : '空挎包位 (0格)';
  el('bag-name-satchel2').textContent = bags.satchel_2 ? `${bags.satchel_2.名称} (+${s2Cap}格)` : '空挎包位 (0格)';
  for (const slot of ['main_bag', 'pouch_1', 'pouch_2', 'satchel_1', 'satchel_2']) renderSlotArt(slot, bags[slot]);

  // Visual Grid
  const grid = el('inventory-grid');
  grid.innerHTML = '';
  const items = storedItems(c.sheet);
  el('bag-usage').textContent = Math.min(items.length, totalSlots) + ' / ' + totalSlots + ' 格';

  const overflow = el('inventory-overflow');
  overflow.replaceChildren();
  overflow.hidden = items.length <= totalSlots;
  const note = el('inventory-space-note');
  note.hidden = totalSlots > 0 && overflow.hidden;
  note.textContent = overflow.hidden ? '尚无容器。' : '容量不足，溢出物品可取用。';
  const shownSlots = Math.max(items.length,Math.min(totalSlots,items.length+24));
  for (let i = 0; i < shownSlots; i++) {
    const item = items[i];
    const cell = document.createElement('div');
    cell.className = `grid-cell ${item ? 'occupied' : ''}`;
    if (item) {
      decorateGear(cell, item);
      cell.innerHTML = `
        <span class="cell-icon"></span>
        <span class="cell-name"></span>
        ${item.qty > 1 ? `<span class="cell-qty">x${item.qty}</span>` : ''}
      `;
      cell.querySelector('.cell-icon').append(itemImage(item));
      cell.querySelector('.cell-name').textContent = item.name + (item.slot === 'passive' ? (i < totalSlots ? ' · 生效' : ' · 未生效') : '');
      cell.title = `${item.name}: ${item.desc || '物品'}\n(点击操作)`;
      cell.addEventListener('click', () => {
        openItemActionModal(c.sheet.inventoryItems.indexOf(item));
      });
    } else {
      cell.innerHTML = `<span style="color:rgba(255,255,255,0.08);font-size:11px;">#${i + 1}</span>`;
      cell.addEventListener('click', () => {
        openItemPicker('loot');
      });
    }
    (i < totalSlots ? grid : overflow).appendChild(cell);
  }
  if (shownSlots < totalSlots) {
    const summary = document.createElement('p');
    summary.className = 'bag-empty-summary';
    summary.textContent = '另有 '+(totalSlots-shownSlots)+' 个空格';
    grid.append(summary);
  }

  // Currency
  const curr = c.sheet.currency;
  for (const unit of ['handfuls', 'bags', 'chests', 'diamonds']) el('coin-' + unit).value = curr[unit] ?? 0;
  const legacyWealth = el('legacy-wealth');
  legacyWealth.hidden = !curr.gold && !curr.dust;
  legacyWealth.textContent = '旧档记录：' + [curr.gold && `${curr.gold} 枚金币`, curr.dust && `${curr.dust} 粉末`].filter(Boolean).join(' · ');

  // Armor Formula Breakdown Readout
  const fb = el('armor-formula-breakdown');
  fb.textContent = '护甲上限 ' + stats.armorMax + ' · 装备与奇物 ' + stats.baseArmor + ' · 手动补正 ' + adjustment(c.sheet,'armor');

}

// Event Listeners Setup
const advancementOptions = {
  traits: ['两项未标记属性各 +1', 3, 1],
  hp: ['生命上限 +1', 2, 1],
  stress: ['压力上限 +1', 2, 1],
  gear: ['领取当前位阶制式装备', 1, 1],
  domain: ['额外选择一张领域卡', 1, 1],
  evasion: ['闪避 +1', 1, 1],
  subclass: ['取得下一张子职业卡', 1, 3],
  prof: ['熟练值 +1（占两项）', 1, 3],
  multiclass: ['兼职（占两项）', 1, 3],
};

function markedTraits(character, targetLevel) {
  const tier = tierForLevel(targetLevel);
  const marks = new Set(Object.entries(character.sheet.levelTraitMarks ?? {})
    .filter(([level]) => Number(level) <= targetLevel && tierForLevel(Number(level)) === tier)
    .flatMap(([, keys]) => keys));
  for (const [key, checked] of Object.entries(character.sheet.traitMarkOverrides?.[tier] ?? {})) {
    if (checked) marks.add(key); else marks.delete(key);
  }
  return marks;
}

function experience(character) {
  const entry = character.sheet.experience;
  return { points: entry?.points ?? 0, required: experienceThresholds[character.level] };
}

function canLevelUp(character) {
  const {points,required} = experience(character);
  return character.level < lastLevel && required > 0 && points >= required;
}

async function grantExperience() {
  const target = characters[workshopState.targetCharIndex];
  if (currentUser?.role !== 'gm' || !target?.updated_at || target.level >= lastLevel) return;
  const button = el('ws-grant-xp');
  const amount = el('ws-xp-amount').valueAsNumber;
  if (!Number.isSafeInteger(amount) || amount < 1) return alert('经验须为正整数。');
  button.disabled = true;
  try {
    await sendResource(target,'experience',amount);
    el('ws-xp-amount').value = '';
    alert('已发放给 '+target.avatar_name);
  } catch (error) { alert('未确认发放结果，请刷新核对：'+error.message); }
  finally { updateWorkshopTargetSelect(); }
}


function renderAdvancements(character) {
  const marked = markedTraits(character, character.level);
  document.querySelectorAll('[data-trait-mark]').forEach(input => {
    input.checked = marked.has(input.dataset.traitMark);
  });
  el('lvl-up').hidden = !canLevelUp(character);
  el('allocate-points').hidden = !(character.level >= 3 && (character.sheet.advancementPoints ?? 0) > 0);
  el('allocate-points').textContent = '分配升级点 · '+(character.sheet.advancementPoints ?? 0);
  const log = el('advancements-container');
  log.replaceChildren();
  for (const [level, choices] of Object.entries(character.sheet.levelAdvancements ?? {})) {
    if (!choices.length) continue;
    const line = document.createElement('p');
    line.textContent = `${level} 级 · ${choices.map(key => advancementOptions[key]?.[0] ?? key).join('、')}`;
    log.append(line);
  }
  log.closest('.levelup-bottom-bar').hidden = !log.childElementCount;
}

function standardRewards(tier) {
  const prefix = ['', '', '改良', '高级', '传奇'];
  const records = [...db.armor, ...db.weapons];
  return records.filter(item => {
    const family = item.名称.replace(/^(改良|高级|传奇)/,'');
    return Number(item.位阶) === tier && item.名称 === prefix[tier]+family &&
      [1,2,3,4].every(rank => records.some(record =>
        record.类型 === item.类型 && Number(record.位阶) === rank && record.名称 === prefix[rank]+family));
  });
}

function rewardSelectors(container, label, count, options) {
  return Array.from({length:count},(_,index) => {
    const row = document.createElement('label');
    const select = document.createElement('select');
    select.className = 'dw-select';
    select.append(new Option('请选择',''), ...options(index));
    row.append(label,select);
    container.append(row);
    return select;
  });
}

function advanceCharacter(levelUp = true) {
  const character = curChar();
  if (!character || (levelUp && !canLevelUp(character))) return;
  const proposed = structuredClone(character);
  const sheet = proposed.sheet;
  const startingLevel = character.level;
  const level = startingLevel + Number(levelUp);
  const budget = (sheet.advancementPoints ?? 0) + Number(levelUp);
  const tier = tierForLevel(level);
  const usedSlots = Object.values(sheet.levelAdvancementSlots ?? {}).flat();
  const dialog = el('level-dialog');
  const form = el('level-options');
  const nextSubclass = getNextSubclass(sheet);
  const alternateClasses = (db?.classes ?? []).filter(job => job.ID !== sheet.classId && job.名称 !== sheet.classId);
  const marked = markedTraits(character, level);
  const availableTraits = Object.entries(traits).filter(([key]) => !marked.has(key));
  form.replaceChildren();
  for (const [key, [label, slots, minTier]] of Object.entries(advancementOptions)) {
    if (key === 'subclass' && !nextSubclass || key === 'traits' && availableTraits.length < 2) continue;
    if (key === 'multiclass' && (sheet.multiclass || !alternateClasses.length)) continue;
    for (let origin = Math.max(2, minTier); origin <= tier; origin++) {
      if (key === 'subclass' && usedSlots.includes(origin + ':multiclass') ||
          key === 'multiclass' && usedSlots.includes(origin + ':subclass')) continue;
      const remaining = slots - usedSlots.filter(slot => slot === origin + ':' + key).length;
      if (remaining <= 0) continue;
      const repeats = key === 'traits' && availableTraits.length < 4 ? 1 : Math.min(2, remaining);
      for (let index = 0; index < repeats; index++) {
        const row = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = origin + ':' + key;
        row.append(input, ` 位阶 ${origin} · ${label}${repeats > 1 ? `（${index + 1}）` : ''}`);
        form.append(row);
      }
    }
  }
  const traitChoices = el('level-trait-options');
  traitChoices.replaceChildren(...availableTraits.map(([key, name]) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = key;
    label.append(input, ' ' + name);
    return label;
  }));
  const chosenSlots = () => [...form.querySelectorAll('input:checked')].map(input => input.value);
  const multiclassFields = el('level-multiclass-options');
  const secondClass = el('level-multiclass-class');
  const secondDomain = el('level-multiclass-domain');
  const secondSubclass = el('level-multiclass-subclass');
  secondClass.replaceChildren(...alternateClasses.map(job => new Option(job.名称, job.ID)));
  secondClass.onchange = () => {
    const job = alternateClasses.find(item => item.ID === secondClass.value);
    const domains = (job?.领域 ?? '').split(/[+、,，]/).map(name => name.trim()).filter(Boolean);
    secondDomain.replaceChildren(...domains.map(domain => new Option(domain, domain)));
    secondSubclass.replaceChildren(...(db?.subclasses ?? [])
      .filter(card => card.主职 === job?.名称 && card.等级 === '基础')
      .map(card => new Option(card.名称, card.ID)));
  };
  secondClass.onchange();
  multiclassFields.hidden = true;
  const rewards = el('level-rewards');
  const baseCardReward = Number(levelUp && rulesLevel(level) > rulesLevel(startingLevel));
  const gearPool = standardRewards(tier);
  let cardSelects, gearSelects;
  function renderRewards() {
    const priorCards = cardSelects?.map(select => select.value) ?? [];
    const priorGear = gearSelects?.map(select => select.value) ?? [];
    rewards.replaceChildren();
    const selected = chosenSlots();
    const domainCaps = selected.filter(slot => slot.endsWith(':domain'))
      .map(slot => Math.min(rulesLevel(level),[0,1,4,7,10][Number(slot.split(':')[0])]));
    if (baseCardReward) domainCaps.unshift(rulesLevel(level));
    const job = db.classes.find(item => item.ID === sheet.classId || item.名称 === sheet.classId);
    const domains = (job?.领域 ?? '').split(/[+、,，]/).map(domain => domain.trim());
    const extraDomain = selected.some(slot => slot.endsWith(':multiclass')) ? secondDomain.value : sheet.multiclass?.domain;
    const owned = new Set([...sheet.equippedDomainCards,...sheet.vaultDomainCards,...sheet.customDomainCards].map(cardKey));
    cardSelects = rewardSelectors(rewards,'领域卡 ',domainCaps.length,index =>
      uniqueCards(db.domain_cards).filter(card => !owned.has(cardKey(card)) && cardLevel(card) <=
        (domains.includes(card.领域) ? domainCaps[index] : extraDomain === card.领域
          ? Math.min(domainCaps[index],Math.ceil(rulesLevel(level)/2)) : 0))
        .map(card => new Option(card.名称+' · '+cardLevel(card)+' 级',cardKey(card))));
    gearSelects = rewardSelectors(rewards,'制式装备 ',selected.filter(slot => slot.endsWith(':gear')).length,
      () => gearPool.map(item => new Option(item.名称,item.ID)));
    cardSelects.forEach((select,index) => { if (priorCards[index]) select.value = priorCards[index]; });
    gearSelects.forEach((select,index) => { if (priorGear[index]) select.value = priorGear[index]; });
  }
  function renderLevelStats() {
    const draft = structuredClone(character);
    draft.level = level;
    const choices = chosenSlots().map(slot => slot.split(':')[1]);
    const recorded = draft.sheet.levelAdvancements ??= {};
    recorded[level] = [...(recorded[level] ?? []),...choices];
    if (choices.includes('traits')) {
      for (const input of traitChoices.querySelectorAll('input:checked')) draft.sheet.attributes[input.value]++;
    }
    const before = calculateStats(character).innate;
    const after = calculateStats(draft).innate;
    const labels = {...traits,hp:'生命上限',stress:'压力上限',evasion:'闪避',proficiency:'熟练值',major:'重度阈值',severe:'严重阈值',lethal:'致死阈值'};
    const differences = Object.entries(labels).filter(([key]) => before[key] !== after[key])
      .map(([key,label]) => label+' '+before[key]+' → '+after[key]);
    el('level-stat-preview').textContent = differences.join(' · ');
  }
  traitChoices.onchange = renderLevelStats;
  form.onchange = () => {
    traitChoices.hidden = !chosenSlots().some(slot => slot.endsWith(':traits'));
    multiclassFields.hidden = !chosenSlots().some(slot => slot.endsWith(':multiclass'));
    renderRewards();
    renderLevelStats();
  };
  const updateSecondClass = secondClass.onchange;
  secondClass.onchange = () => { updateSecondClass(); renderRewards(); };
  secondDomain.onchange = renderRewards;
  renderRewards();
  renderLevelStats();
  traitChoices.hidden = true;
  el('level-budget').textContent = '可用 '+budget+' 点。未使用的点数可保留。';
  el('level-dialog-title').textContent = (levelUp ? `升至 ${level} 级` : '分配升级点') + ' · T'+tier;
  el('level-dialog-save').onclick = async () => {
    if (curChar() !== character || character.level !== startingLevel || (levelUp && !canLevelUp(character)) || pendingWrites.has(character)) return;
    const slots = chosenSlots();
    const choices = slots.map(slot => slot.split(':')[1]);
    const cost = choices.reduce((total,key) => total + advancementCost(key),0);
    if (cost > budget || (!levelUp && !cost)) return alert('请选择可用点数内的升级选项。');
    if (choices.filter(key => key === 'multiclass').length > 1 ||
        slots.some(slot => slot.endsWith(':multiclass') && slots.includes(slot.replace(':multiclass',':subclass'))))
      return alert('兼职只能选择一次，且同一位阶的兼职与子职业升级互斥。');
    const selectedTraits = [...traitChoices.querySelectorAll('input:checked')].map(input => input.value);
    if (choices.includes('traits') && selectedTraits.length !== choices.filter(key => key === 'traits').length * 2) {
      return alert('每项属性提升须选择两项未标记属性。');
    }
    if (choices.filter(key => key === 'subclass').length > 1) return alert('每次只领取一张子职业升级卡。');
    if (choices.includes('multiclass') && (!secondClass.value || !secondDomain.value || !secondSubclass.value)) {
      return alert('请选择兼职职业、领域和子职业。');
    }
    const stats = calculateStats(character);
    if (stats.innate.hp + choices.filter(key => key === 'hp').length > 12 ||
        stats.innate.stress + choices.filter(key => key === 'stress').length > 12) return alert('生命和压力上限为 12。');
    const cards = cardSelects.map(select => db.domain_cards.find(card => cardKey(card) === select.value));
    const items = gearSelects.map(select => gearPool.find(item => item.ID === select.value));
    if (cards.some(card => !card) || new Set(cards.map(cardKey)).size !== cards.length)
      return alert('请选择不同的领域卡。');
    if (items.some(item => !item)) return alert('请选择制式装备。');
    proposed.sheet = structuredClone(character.sheet);
    const sheet = proposed.sheet;
    if (choices.includes('traits')) {
      for (const key of selectedTraits) sheet.attributes[key]++;
      sheet.levelTraitMarks = { ...sheet.levelTraitMarks, [level]: [...(sheet.levelTraitMarks?.[level] ?? []),...selectedTraits] };
      for (const key of selectedTraits) delete sheet.traitMarkOverrides?.[tier]?.[key];
    }
    if (choices.includes('subclass')) {
      sheet.subclassUpgradeIds = [...(sheet.subclassUpgradeIds ?? []), nextSubclass.ID];
    }
    if (choices.includes('multiclass')) {
      sheet.multiclass = { classId: secondClass.value, domain: secondDomain.value, subclassId: secondSubclass.value };
    }
    sheet.levelAdvancements = { ...sheet.levelAdvancements, [level]: [...(sheet.levelAdvancements?.[level] ?? []),...choices] };
    sheet.levelAdvancementSlots = { ...sheet.levelAdvancementSlots, [level]: [...(sheet.levelAdvancementSlots?.[level] ?? []),...slots] };
    sheet.vaultDomainCards.push(...cards);
    for (const item of items) {
      sheet.inventoryItems.push({
        resourceId:item.ID,name:item.名称,desc:item.描述,type:item.类型,tier:item.位阶,
        slot: {'护甲':'suit','主武器':'weapon_main','副武器':'weapon_off'}[item.类型],
        qty:1,ownedGearId:crypto.randomUUID()
      });
    }
    sheet.advancementPoints = budget-cost;
    proposed.level = level;
    const button = el('level-dialog-save');
    button.disabled = true;
    try {
      await persist(character,payload(proposed));
      character.level = level;
      character.sheet = sheet;
      saveLocal();
      dialog.close();
      renderAll();
    } catch (error) { alert('升级未保存：'+error.message); }
    finally { button.disabled = false; }
  };
  dialog.showModal();
}

function getNextSubclass(sheet) {
  const entries = db?.subclasses ?? [];
  const base = entries.find(card => card.ID === sheet.subclassId);
  if (!base) return null;
  const acquired = new Set(sheet.subclassUpgradeIds ?? []);
  return ['进阶', '精通'].map(rank => entries.find(card => card.名称 === base.名称 && card.主职 === base.主职 && card.等级 === rank))
    .find(card => card && !acquired.has(card.ID)) ?? null;
}

const quickAdjustments = {'evasion-adjustment':'evasion','proficiency-current':'proficiency','armor-limit':'armor'};
function writeAdjustment(key, value) {
  const sheet = curChar().sheet;
  const delta = Number(value);
  if (!Number.isSafeInteger(delta)) { renderAll(); return; }
  (sheet.adjustments ??= {})[key] = delta;
  saveLocal(); renderAll();
}
function renderAdjustments(character, stats) {
  const body = el('stat-calculations');
  body.replaceChildren();
  for (const [key,label] of Object.entries(gearEffects)) {
    const row = body.insertRow();
    row.insertCell().textContent = label;
    function input(cell, value, label, change) {
      const field = document.createElement('input');
      field.type = 'number'; field.step = '1'; field.value = value;
      field.setAttribute('aria-label',label); field.className = 'dw-input';
      field.onchange = () => change(Math.trunc(Number(field.value)) || 0);
      cell.append(field);
    }
    const base = row.insertCell();
    if (Object.hasOwn(traits,key)) input(base, character.sheet.attributes[key], label+'基础', value => {
      character.sheet.attributes[key] = value; saveLocal(); renderAll();
    });
    else base.textContent = stats.innate[key];
    row.insertCell().textContent = stats.gear[key] || 0;
    input(row.insertCell(), adjustment(character.sheet,key), label+'补正', value => writeAdjustment(key,value));
    row.insertCell().textContent = stats.values[key];
  }
}
function renderInlineAdjustments(character, stats) {
  const isGm = currentUser?.role === 'gm';
  const s = character.sheet;
  // 1. 控制 GM 专属内联微调控件的显隐
  document.querySelectorAll('.gm-only-control').forEach(elem => {
    elem.hidden = !isGm;
  });

  // 2. 六维属性卡内联数值与补正 Badge
  const traitKeys = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'];
  for (const trait of traitKeys) {
    const adjVal = adjustment(s, trait);
    const inputEl = document.querySelector(`[data-trait-input="${trait}"]`);
    if (inputEl && document.activeElement !== inputEl) inputEl.value = adjVal;

    const badgeEl = el(`adj-badge-${trait}`);
    if (badgeEl) {
      if (adjVal !== 0) {
        badgeEl.textContent = adjVal > 0 ? `+${adjVal}` : `${adjVal}`;
        badgeEl.hidden = false;
      } else {
        badgeEl.hidden = true;
      }
    }
  }

  // 3. HP 与 Stress 资源上限内联补正
  const hpInput = el('adj-input-hp');
  if (hpInput && document.activeElement !== hpInput) hpInput.value = adjustment(s, 'hp');
  const stressInput = el('adj-input-stress');
  if (stressInput && document.activeElement !== stressInput) stressInput.value = adjustment(s, 'stress');

  // 4. GM 待处理报修 Banner
  const gmBanner = el('gm-bug-banner');
  if (gmBanner) {
    if (isGm) {
      const reports = (s.bugReports || []).filter(r => r.status === 'open');
      if (reports.length > 0) {
        gmBanner.hidden = false;
        const countEl = el('gm-bug-count');
        if (countEl) countEl.textContent = reports.length;
        const textEl = el('gm-bug-text');
        if (textEl) {
          const latest = reports[reports.length - 1];
          textEl.textContent = `最新：${latest.reason || '无说明'}`;
          textEl.title = reports.map((r, i) => `${i + 1}. ${r.reason} (${r.date || ''})`).join('\n');
        }
      } else {
        gmBanner.hidden = true;
      }
    } else {
      gmBanner.hidden = true;
    }
  }
}
function setupEventListeners() {
  // Steppers: Level
  el('ws-grant-effect').onclick = async () => {
    const name = el('ws-effect-name').value.trim();
    const description = el('ws-effect-description').value.trim();
    if (!name) return alert('请输入效果名称。');
    const target = characters[workshopState.targetCharIndex];
    if (currentUser?.role !== 'gm' || !target?.updated_at) return alert('请选择已保存的角色。');
    const proposed = structuredClone(target);
    proposed.sheet.specialEffects = [...(proposed.sheet.specialEffects ?? []),{id:crypto.randomUUID(),name,description}];
    const button = el('ws-grant-effect');
    if (button.disabled) return;
    button.disabled = true;
    try {
      await persist(target,payload(proposed));
      target.sheet.specialEffects = proposed.sheet.specialEffects;
      saveLocal();
      el('ws-effect-name').value = '';
      el('ws-effect-description').value = '';
      alert('已发放给 '+target.avatar_name);
    } catch(error) { alert('发放失败：'+error.message); }
    finally { button.disabled = false; }
  };
  el('ws-grant-xp').onclick = grantExperience;
  el('allocate-points').onclick = () => advanceCharacter(false);
  el('lvl-up').addEventListener('click', () => {
    advanceCharacter();
  });


  for (const [key, cap] of Object.entries({hp:'maxHp', stress:'maxStress', hope:'maxHope', armor:'armorMax'})) {
    for (const [action, delta] of [['plus',1], ['minus',-1]]) {
      el(key + '-' + action).onclick = () => {
        const c = curChar(), max = calculateStats(c)[cap];
        const track = c.sheet[key === 'armor' ? 'armorPips' : key];
        track.cur = Math.max(0, Math.min(max, Math.min(max, track.cur) + delta));
        saveLocal(); renderAll();
      };
    }
  }
  for (const [id,key] of Object.entries(quickAdjustments)) {
    el(id).onchange = event => writeAdjustment(key,event.target.value);
  }
  document.querySelectorAll('[data-adjust]').forEach(button => {
    button.onclick = () => {
      const id = button.dataset.adjust;
      writeAdjustment(quickAdjustments[id], Number(el(id).value) + Number(button.dataset.delta));
    };
  });

  // GM Inline Trait Adjustments
  document.querySelectorAll('[data-trait-delta]').forEach(button => {
    button.onclick = () => {
      const trait = button.dataset.traitDelta;
      const current = adjustment(curChar().sheet, trait);
      const delta = Number(button.dataset.delta) || 0;
      writeAdjustment(trait, current + delta);
    };
  });
  document.querySelectorAll('[data-trait-input]').forEach(input => {
    input.onchange = () => {
      const trait = input.dataset.traitInput;
      writeAdjustment(trait, input.value);
    };
  });

  // GM Inline Track (HP / Stress) Adjustments
  document.querySelectorAll('[data-track-delta]').forEach(button => {
    button.onclick = () => {
      const track = button.dataset.trackDelta;
      const current = adjustment(curChar().sheet, track);
      const delta = Number(button.dataset.delta) || 0;
      writeAdjustment(track, current + delta);
    };
  });
  ['hp', 'stress'].forEach(track => {
    const input = el(`adj-input-${track}`);
    if (input) {
      input.onchange = () => writeAdjustment(track, input.value);
    }
  });

  // Player Bug Report Modal
  const bugModal = el('bug-report-modal');
  const btnOpenBug = el('btn-open-bug-report');
  if (btnOpenBug) {
    btnOpenBug.onclick = () => {
      el('bug-report-reason').value = '';
      if (bugModal) bugModal.hidden = false;
    };
  }
  const closeBug = () => { if (bugModal) bugModal.hidden = true; };
  const btnCloseBug = el('bug-report-close');
  if (btnCloseBug) btnCloseBug.onclick = closeBug;
  const btnCancelBug = el('bug-report-cancel');
  if (btnCancelBug) btnCancelBug.onclick = closeBug;

  const btnSubmitBug = el('btn-submit-bug-report');
  if (btnSubmitBug) {
    btnSubmitBug.onclick = async () => {
      const reason = el('bug-report-reason')?.value?.trim();
      if (!reason) return alert('请填写报修说明，以便主持人准确修订。');
      const c = curChar();
      c.sheet.bugReports ??= [];
      const report = {
        id: crypto.randomUUID(),
        reason,
        status: 'open',
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      c.sheet.bugReports.push(report);
      saveLocal();
      closeBug();
      alert('已成功向主持人提交报修！主持人打开您的角色卡时将收到醒目提醒。');
      if (c.updated_at) {
        try {
          await persist(c, payload(c));
        } catch (err) {
          console.warn('云端同步报修状态失败', err);
        }
      }
      renderAll();
    };
  }

  // GM Resolve Bug
  const btnResolveBug = el('btn-gm-resolve-bug');
  if (btnResolveBug) {
    btnResolveBug.onclick = async () => {
      const c = curChar();
      if (!c?.sheet?.bugReports?.length) return;
      c.sheet.bugReports.forEach(r => { r.status = 'resolved'; });
      saveLocal();
      if (c.updated_at) {
        try {
          await persist(c, payload(c));
        } catch (err) {
          console.warn('云端同步标记失败', err);
        }
      }
      renderAll();
      alert('已将当前角色的报修标记为已解决。');
    };
  }
  document.querySelectorAll('[data-trait-mark]').forEach(input => {
    input.addEventListener('change', () => {
      const character = curChar();
      const tier = tierForLevel(character.level);
      const overrides = character.sheet.traitMarkOverrides ??= {};
      overrides[tier] = { ...overrides[tier], [input.dataset.traitMark]: input.checked };
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
      if (currentUser?.role !== 'gm') return;
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

  el('gm-note-open').onclick = async () => {
    const c = curChar();
    if (currentUser?.role !== 'gm' || !c?.updated_at) return;
    try {
      const note = await readGmNote(c.id);
      if (curChar() !== c) return;
      el('fn-gm-notes').value = note?.body || '';
      el('gm-note-dialog').showModal();
      el('gm-note-save').onclick = async () => {
        try { await writeGmNote(c.id,el('fn-gm-notes').value,note); el('gm-note-dialog').close(); }
        catch (error) { alert(error.message); }
      };
    } catch (error) { alert(error.message); }
  };
  // Currency Inputs
  ['handfuls', 'bags', 'chests', 'diamonds'].forEach(type => {
    el(`coin-${type}`).addEventListener('change', e => {
      const c = curChar();
      c.sheet.currency[type] = Math.max(0, Math.trunc(Number(e.target.value)) || 0);
      e.target.value = c.sheet.currency[type];
      saveLocal();
    });
  });

  // Top Bar Actions & Two-Tier Layer Switching
  el('btn-back-vault')?.addEventListener('click', () => {
    switchLayer('vault');
  });
  el('btn-vault-refresh').onclick = async () => {
    try { reconcileAccount(await loadAccount(),true); updateSyncStatus(true,'云端已刷新'); }
    catch (err) { alert('刷新失败：' + err.message); }
  };
  el('btn-save-cloud').onclick = async () => {
    const c = curChar();
    if (!c || !db) return alert('请等规则资料加载后再保存。');
    saveErrorCharacter = null;
    const saving = persist(c);
    renderSaveButton();
    try { await saving; }
    catch (err) { saveErrorCharacter = c; alert(err.message); }
    finally { renderSaveButton(); }
  };

  // Fixed More Dropdown (Toggle class 'show' and close on outside click)
  const moreBtn = el('btn-more-toggle');
  const moreDropdown = el('more-dropdown');
  moreBtn.addEventListener('click', e => {
    e.stopPropagation();
    moreDropdown.hidden = !moreDropdown.classList.toggle('show');
  });
  document.addEventListener('click', e => {
    if (moreDropdown.classList.contains('show') && !moreDropdown.contains(e.target) && e.target !== moreBtn) {
      moreDropdown.hidden = true; moreDropdown.classList.remove('show');
    }
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
  if (el('ws-item-slot') && el('ws-item-slot').tagName === 'SELECT') {
    for (const [value, label] of Object.entries(gearSlots).filter(([key]) => key !== 'wrists')) el('ws-item-slot').add(new Option(label, value));
  }
  for (const [value, label] of Object.entries(qualities)) el('ws-item-quality').add(new Option(label, value));

  // 绑定计算块折叠开关
  [
    ['ws-toggle-weapon-block', 'ws-weapon-fields'],
    ['ws-toggle-armor-block', 'ws-armor-fields'],
    ['ws-toggle-modifiers-block', 'ws-gear-fields']
  ].forEach(([toggleId, fieldsId]) => {
    const toggle = el(toggleId);
    const fields = el(fieldsId);
    if (toggle && fields) {
      toggle.addEventListener('change', () => {
        fields.hidden = !toggle.checked;
        updateItemPreview();
      });
    }
  });

  // 绑定背包被动生效开关
  el('ws-toggle-passive-bag')?.addEventListener('change', updateItemPreview);

  // 绑定可装备槽位复选框变化
  document.querySelectorAll('input[name="ws-allowed-slot"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = getSelectedAllowedSlots();
      const hasContainer = selected.some(s => ['main_bag', 'pouch_1', 'pouch_2', 'satchel_1', 'satchel_2'].includes(s));
      if (el('ws-container-label')) el('ws-container-label').hidden = !hasContainer;
      if (el('ws-item-slot')) el('ws-item-slot').value = selected[0] || '';
      updateItemPreview();
    });
  });

  // 绑定槽位预设按钮
  document.querySelectorAll('.ws-slot-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      applySlotPreset(preset);
      updateItemPreview();
    });
  });
  if (el('ws-gear-fields')) {
    el('ws-gear-fields').innerHTML = '';
    for (const [key, title] of Object.entries(gearEffects)) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.id = 'gear-effect-' + key;
      input.type = 'number';
      input.step = '1';
      input.min = '-99';
      input.max = '99';
      input.className = 'dw-input';
      input.addEventListener('input', updateItemPreview);
      input.addEventListener('change', updateItemPreview);
      label.append(title, input);
      el('ws-gear-fields').append(label);
    }
  }
  for (const trait of Object.values(traits)) el('ws-weapon-trait')?.add(new Option(trait));
  for (const [value, label] of Object.entries(itemAppearances)) appearanceSelect?.add(new Option(label, value));
  ['ws-item-name', 'ws-item-type', 'ws-item-tier', 'ws-item-subcat', 'ws-item-stats', 'ws-item-desc', 'ws-item-appearance', 'ws-item-slot', 'ws-item-quality', 'ws-item-avatar-visual'].forEach(id => {
    el(id)?.addEventListener('input', updateItemPreview);
    el(id)?.addEventListener('change', updateItemPreview);
  });

  // 绑定品质药丸按钮点击 (白色/绿色/蓝色/紫色/橙色/红色渐变与边框)
  document.querySelectorAll('.ws-quality-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.quality;
      document.querySelectorAll('.ws-quality-pill').forEach(b => b.classList.toggle('active', b === btn));
      if (el('ws-item-quality')) el('ws-item-quality').value = q;
      updateItemPreview();
    });
  });

  // 绑定制式套装位阶开关与四档鎏金边框 (黑铁/黄铜/白银/黄金)
  el('ws-toggle-suit-tier')?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    if (el('ws-suit-tier-container')) el('ws-suit-tier-container').hidden = !isChecked;
    if (isChecked && (!el('ws-item-suit-tier')?.value || el('ws-item-suit-tier').value === '')) {
      el('ws-item-suit-tier').value = '1';
      document.querySelectorAll('.ws-tier-pill').forEach(b => b.classList.toggle('active', b.dataset.tier === '1'));
    }
    updateItemPreview();
  });

  document.querySelectorAll('.ws-tier-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.tier;
      document.querySelectorAll('.ws-tier-pill').forEach(b => b.classList.toggle('active', b === btn));
      if (el('ws-item-suit-tier')) el('ws-item-suit-tier').value = t;
      updateItemPreview();
    });
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

  // Status Effect Workbench Buttons
  el('btn-ws-dispatch-effect')?.addEventListener('click', () => handleWorkshopEffectSubmit(true));
  el('btn-ws-save-effect')?.addEventListener('click', () => handleWorkshopEffectSubmit(false));
  el('btn-ws-clear-all-effects')?.addEventListener('click', clearAllCharacterEffects);

  document.querySelectorAll('.status-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleQuickCondition(btn.dataset.cond));
  });

  ['ws-armor-value', 'ws-armor-major', 'ws-armor-severe'].forEach(id => {
    el(id)?.addEventListener('input', updateItemPreview);
    el(id)?.addEventListener('change', updateItemPreview);
  });


  // Add Item to Bag
  initPortraitListeners();
  el('ws-catalog').onclick = () => openItemPicker('loot');
  el('btn-loot-catalog').addEventListener('click', () => openItemPicker('loot'));
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
    if (item && !item.slot) {
      if (item.qty > 1) {
        item.qty -= 1;
      } else {
        c.sheet.inventoryItems.splice(activeBagItemIndex, 1);
      }
      saveLocal();
      renderAll();
      el('item-action-modal').hidden = true;
    }
  });
  el('item-action-delete').addEventListener('click', () => {
    if (activeBagItemIndex === null) return;
    const c = curChar();
    const item = c.sheet.inventoryItems[activeBagItemIndex];
    if (item && confirm(`确定要丢弃【${item.name}】吗？`)) {
      c.sheet.inventoryItems.splice(activeBagItemIndex, 1);
      if (item.ownedGearId) for (const slots of [c.sheet.equipment,c.sheet.bags]) for (const [slot,equipped] of Object.entries(slots)) {
        if (equipped?.ownedGearId === item.ownedGearId) slots[slot] = null;
      }
      saveLocal();
      renderAll();
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

  el('item-action-title').textContent = item.name;
  const desc = el('item-action-desc');
  desc.innerHTML = renderMarkdown(item.desc || '');
  el('item-qty-plus').hidden = Boolean(item.ownedGearId);
  el('item-qty-minus').hidden = Boolean(item.ownedGearId);
  if (item.slot) {
    const attributes = document.createElement('p');
    const location = item.slot === 'passive' && storedItems(c.sheet).indexOf(item) >= bagCapacity(c.sheet.bags).totalSlots
      ? '背包奇物 · 当前在溢出区' : gearSlots[item.slot];
    if (location?.includes('溢出') && bagCapacity(c.sheet.bags).totalSlots > 0) {
      const move = document.createElement('button');
      move.textContent = '移入背包首格'; move.onclick = () => {
        c.sheet.inventoryItems.splice(index,1); c.sheet.inventoryItems.unshift(item);
        el('item-action-modal').hidden = true; saveLocal(); renderAll();
      }; desc.append(move);
    }
    attributes.textContent = [location, gearFormula(item)].filter(Boolean).join(' · ');
    desc.prepend(attributes);
  }
  el('item-qty-val').textContent = item.qty || 1;
  el('item-action-use').hidden = Boolean(item.slot);
  el('item-qty-plus').hidden = Boolean(item.slot);
  el('item-qty-minus').hidden = Boolean(item.slot);
  el('item-action-modal').hidden = false;
}

// Cached picker candidates
let currentPickerCandidates = [];

// Item Picker Modal Logic
function openItemPicker(slotKey) {
  if (slotKey !== 'chest' && suitCoversSlot(curChar()?.sheet,slotKey)) return;
  currentPickerSlot = slotKey;
  el('item-picker-modal').hidden = false;
  const isLoot = slotKey === 'loot';
  el('picker-title').textContent = isLoot ? '物品图鉴' : `选择装备 · ${getSlotTitle(slotKey)}`;
  const search = el('picker-search-input');
  search.value = '';
  search.placeholder = isLoot ? '搜索物品' : '搜索装备';
  el('picker-unequip-btn').hidden = isLoot;

  let candidates;
  if (isLoot) {
    candidates = [...(db?.weapons || []), ...(db?.armor || []), ...(db?.loot || [])];
  } else {
    const sheet = curChar().sheet;
    const assigned = new Set(Object.entries({...sheet.equipment,...sheet.bags})
      .filter(([key]) => key !== slotKey && !(slotKey === 'chest' && key === 'suit')).map(([,item]) => item?.ownedGearId));
    candidates = sheet.inventoryItems.filter(item => item?.ownedGearId && !assigned.has(item.ownedGearId) && (slotMatches(item,slotKey) || (slotKey === 'chest' && slotMatches(item,'suit'))))
      .map(item => item.resourceId ? {...sourceItem(item.resourceId), ownedGearId:item.ownedGearId, slot:item.slot, avatarVisualId:item.avatarVisualId, suitTier:item.suitTier, isSuitTier:item.isSuitTier, quality:item.quality} : ({
        名称: item.name || item.名称,
        描述: item.desc || item.描述,
        位阶: item.tier || item.位阶,
        品类: item.type || item.品类,
        容量: item.capacity || item.容量,
        属性: item.weapon?.trait || item.属性,
        伤害: item.weapon?.damage || item.伤害,
        距离: item.weapon?.range || item.距离,
        伤害类型: item.weapon?.kind || item.伤害类型,
        负荷: item.weapon?.burden || item.负荷,
        护甲值: item.护甲值,
        基础护甲: item.基础护甲 || item.护甲值,
        重度阈值: item.重度阈值,
        严重阈值: item.严重阈值,
        allowedSlots: item.allowedSlots,
        passiveInBag: item.passiveInBag,
        ownedGearId: item.ownedGearId,
        appearance: item.appearance,
        ...readGear(item)
      }));
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
    decorateGear(card, item, currentPickerSlot);
    const catalog = currentPickerSlot === 'loot';
    const grant = catalog && currentUser?.role === 'gm' && currentLayer === 'workshop';
    const issue = currentPickerSlot === 'loot' ? '' : getEquipmentIssue(currentPickerSlot, item);
    card.innerHTML = `
      <div class="picker-item-title"></div>
      <div class="picker-item-stats">${item.护甲值 ? `+${item.护甲值} 护甲` : ''} ${item.伤害 ? weaponSummary(item, catalog ? 1 : calculateStats(curChar()).totalProf) : ''} ${item.容量 ? `容量 +${item.容量}格` : ''}</div>
      <div class="picker-item-desc">${renderMarkdown(item.描述 || '')}</div>
      <button type="button" class="picker-item-equip-btn" ${issue ? 'disabled' : ''}>${currentPickerSlot === 'loot' ? '放入背包' : '装备'}</button>
    `;
    const action = card.querySelector('button');
    action.hidden = catalog && !grant;
    if (grant) action.textContent = '发放';
    const title = card.querySelector('.picker-item-title');
    title.textContent = item.名称;
    title.prepend(itemImage(item));
    const formula = gearFormula(item);
    if (formula) {
      const summary = document.createElement('p');
      summary.textContent = formula;
      title.after(summary);
    }
    if (issue) {
      const reason = document.createElement('p');
      reason.textContent = issue;
      card.append(reason);
    }
    action.addEventListener('click', async () => {
      if (issue) return;
      if (catalog) {
        if (!grant || !await grantSourceItem(item)) return;
      } else {
        equipItemToSlot(currentPickerSlot, item);
      }
      el('item-picker-modal').hidden = true;
    });
    list.appendChild(card);
  });
}

function sourceItem(id) {
  return [db.weapons,db.armor,db.loot].flat().find(row => row.ID === id);
}
function grantSourceItem(record) {
  const relics = {神行遗宝:'agility',强力遗宝:'strength',控制遗宝:'finesse',调和遗宝:'instinct',魅力遗宝:'presence',启迪遗宝:'knowledge'};
  const wearable = {奥术斗篷:'back',湖行者长靴:'feet',寂静戒指:'ring',抵抗戒指:'ring',
    镇静吊坠:'trinket',空刃护符:'trinket',匿踪护身符:'trinket',闪烁飞虫吊坠:'trinket'};
  const target = characters[workshopState.targetCharIndex];
  if (record.描述?.includes('不能同时持有其他遗宝') && target?.sheet.inventoryItems.some(i => sourceItem(i.resourceId)?.描述?.includes('不能同时持有其他遗宝'))) {
    alert('该角色已持有遗宝。'); return false;
  }
  const slot = {'主武器':'weapon_main','副武器':'weapon_off','护甲':'suit'}[record.类型] || wearable[record.名称] || (relics[record.名称] ? 'passive' : '');
  const item = {resourceId:record.ID,name:record.名称,desc:record.描述,type:record.类型,
    tier:record.位阶, modifiers:relics[record.名称] ? {[relics[record.名称]]:1} : {},slot,qty:1,ownedGearId:slot ? crypto.randomUUID() : undefined};
  return deliver(workshopState.targetCharIndex,'inventoryItems',item);
}

function equipItemToSlot(slotKey, item) {
  const c = curChar();
  if (slotKey === 'chest' && item.slot === 'suit') slotKey = 'suit';
  if ((slotKey !== 'chest' && suitCoversSlot(c.sheet,slotKey)) || getEquipmentIssue(slotKey,item,c)) return;
  if (slotKey === 'chest' && c.sheet.equipment.suit) {
    preserveOldEquipment(c,'suit');
    c.sheet.equipment.suit = null;
  }
  if (slotKey === 'suit') for (const slot of suitSlots) {
    preserveOldEquipment(c,slot);
    c.sheet.equipment[slot] = null;
  }
  preserveOldEquipment(c,slotKey);
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

function preserveOldEquipment(c,slot) {
  const old = c.sheet.equipment[slot] ?? c.sheet.bags[slot];
  if (old && !old.ownedGearId && old.ID && sourceItem(old.ID)) {
    c.sheet.inventoryItems.push({resourceId:old.ID,name:old.名称,desc:old.描述,qty:1,
      ownedGearId:crypto.randomUUID(),slot:({'主武器':'weapon_main','副武器':'weapon_off','护甲':'suit'})[old.类型]});
  }
}

function unequipCurrentSlot() {
  if (!currentPickerSlot) return;
  const c = curChar();
  const slot = currentPickerSlot === 'chest' && suitCoversSlot(c.sheet,'chest') ? 'suit' : currentPickerSlot;
  preserveOldEquipment(c,slot);
  if (Object.hasOwn(c.sheet.bags,slot)) c.sheet.bags[slot] = null;
  else c.sheet.equipment[slot] = null;
  el('item-picker-modal').hidden = true;
  saveLocal();
  renderAll();
}

function getSlotTitle(k) {
  const titles = {
    head: '头部', chest: '身躯', legs: '腿部', feet: '足部', back: '背部',
    ring1: '戒指1', ring2: '戒指2', trinket1: '饰品1', trinket2: '饰品2',
    suit: '套装护甲', costume: '外观时装',
    weapon_main: '主手武器', weapon_off: '副手装备', weapon_spare: '备用武器',
    main_bag: '主背包', pouch_1: '腰包1', pouch_2: '腰包2', satchel_1: '挎包1', satchel_2: '挎包2'
  };
  return titles[k] || k;
}

// Duality Dice Rolling Logic (1d12 Hope + 1d12 Fear)
function rollHistoryKey(character) {
  return `daggerworld.roll-history.v1:${JSON.stringify([owner ?? 'local', character.id])}`;
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
  const mod = calculateStats(c).values[attr];

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

  const target = characters[workshopState.targetCharIndex] ?? characters[0];
  el('ws-grant-xp').disabled = !target?.updated_at || target.level >= lastLevel;
  el('ws-xp-required').textContent = target && target.level < lastLevel ? '下一级 '+experience(target).required.toLocaleString('zh-CN')+' 经验' : '';

  for (const button of document.querySelectorAll('[data-action="dispatch"]')) {
    button.disabled = !target?.updated_at;
    button.textContent = target ? '发放给 ' + target.avatar_name : '发放';
  }

  for (const id of ['btn-ws-dispatch-item', 'btn-ws-dispatch-card']) {
    const button = el(id);
    button.disabled = !target?.updated_at;
    button.textContent = target ? '保存并发放给 ' + target.avatar_name : '保存并发放';
  }
  sel.innerHTML = '';
  if (!characters.length) {
    sel.innerHTML = '<option value="0">暂无角色（请先创角）</option>';
    if (meta) meta.innerHTML = '<span class="f-badge">暂无角色</span>';
    return;
  }

  characters.forEach((char, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${char.avatar_name || '未命名'} (Lv.${char.level || 1} ${char.sheet.classId || '冒险者'})`;
    if (idx === workshopState.targetCharIndex) opt.selected = true;
    sel.appendChild(opt);
  });

  if (!characters[workshopState.targetCharIndex]) workshopState.targetCharIndex = 0;
  const c = characters[workshopState.targetCharIndex];
  if (c && meta) {
    const invCount = (c.sheet.inventoryItems || []).length;
    const equippedCards = (c.sheet.equippedDomainCards || []).length;
    const vaultCards = (c.sheet.customDomainCards || []).length;
    meta.textContent = '累计经验 '+experience(c).points.toLocaleString('zh-CN')+' · 背包 '+invCount+' 件 · 随身卡 '+equippedCards+'/5 · 秘藏 '+vaultCards+' 张';
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

// 辅助：获取所有选中的允许槽位
function getSelectedAllowedSlots() {
  return Array.from(document.querySelectorAll('input[name="ws-allowed-slot"]:checked')).map(cb => cb.value);
}

// 辅助：应用槽位预设
function applySlotPreset(preset) {
  const cbs = document.querySelectorAll('input[name="ws-allowed-slot"]');
  if (preset === 'clear') {
    cbs.forEach(cb => cb.checked = false);
  } else {
    cbs.forEach(cb => cb.checked = false);
    const map = {
      weapon_dual: ['weapon_main', 'weapon_off'],
      weapon_twohand: ['weapon_main'],
      rings: ['ring1', 'ring2'],
      trinkets: ['trinket1', 'trinket2'],
      armor_body: ['chest']
    };
    const targets = map[preset] || [];
    cbs.forEach(cb => {
      if (targets.includes(cb.value)) cb.checked = true;
    });
    if (preset === 'weapon_twohand' && el('ws-weapon-burden')) {
      el('ws-weapon-burden').value = '双手';
      if (el('ws-toggle-weapon-block')) {
        el('ws-toggle-weapon-block').checked = true;
        if (el('ws-weapon-fields')) el('ws-weapon-fields').hidden = false;
      }
    }
  }
  const selected = getSelectedAllowedSlots();
  const hasContainer = selected.some(s => ['main_bag', 'pouch_1', 'pouch_2', 'satchel_1', 'satchel_2'].includes(s));
  if (el('ws-container-label')) el('ws-container-label').hidden = !hasContainer;
  if (el('ws-item-slot')) el('ws-item-slot').value = selected[0] || '';
}

// 实时更新卡牌表单预览（安全空函数实现）
function updateCardPreview() {
  // 目前工坊卡牌预览保留安全接口，防止事件绑定或跨层切换时抛出空引用
}

// 实时更新物品表单预览
function updateItemPreview() {
  const name = el('ws-item-name')?.value?.trim() || '未命名物品';
  const type = el('ws-item-type')?.value || '战利品';
  const subcat = el('ws-item-subcat')?.value?.trim() || '';
  const tier = Number(el('ws-item-tier')?.value) || 1;
  const userStats = el('ws-item-stats')?.value?.trim() || '';
  const desc = el('ws-item-desc')?.value?.trim() || '无特殊机制说明。';

  const allowedSlots = getSelectedAllowedSlots();
  const passiveInBag = el('ws-toggle-passive-bag')?.checked ?? false;
  const weaponActive = el('ws-toggle-weapon-block')?.checked ?? false;
  const armorActive = el('ws-toggle-armor-block')?.checked ?? false;
  const modActive = el('ws-toggle-modifiers-block')?.checked ?? false;

  // 动态拼装属性概览
  const statParts = [];
  if (weaponActive) {
    const trait = el('ws-weapon-trait')?.value || '力量';
    const dice = el('ws-weapon-damage')?.value?.trim() || 'd6';
    const range = el('ws-weapon-range')?.value || '近战';
    const kind = el('ws-weapon-kind')?.value || '物理';
    const burden = el('ws-weapon-burden')?.value || '单手';
    statParts.push(`${range} · ${trait} · ${dice} ${kind} · ${burden}`);
  }
  if (armorActive) {
    const val = Number(el('ws-armor-value')?.value) || 0;
    const maj = Number(el('ws-armor-major')?.value) || 0;
    const sev = Number(el('ws-armor-severe')?.value) || 0;
    const armorTerms = [];
    if (val) armorTerms.push(`+${val} 护甲`);
    if (maj || sev) armorTerms.push(`阈值 +${maj}/+${sev}`);
    if (armorTerms.length) statParts.push(armorTerms.join(' · '));
  }
  if (modActive) {
    const gear = workshopGear();
    const formula = gearFormula(gear);
    if (formula) statParts.push(formula);
  }
  if (passiveInBag) {
    statParts.push('🎒 背包生效');
  }
  if (allowedSlots.length) {
    const slotNames = allowedSlots.map(s => gearSlots[s] || s).join('/');
    statParts.push(`部位: ${slotNames}`);
  }

  const effectiveStats = userStats || (statParts.join(' | ') || '无数值调整');

  if (el('ws-prev-name')) el('ws-prev-name').textContent = name;
  if (el('ws-prev-tag')) el('ws-prev-tag').textContent = `${type} ${subcat ? '· ' + subcat : ''} · T${tier}${passiveInBag ? ' [被动]' : ''}`;
  if (el('ws-prev-stats')) el('ws-prev-stats').textContent = effectiveStats;
  if (el('ws-prev-desc')) el('ws-prev-desc').innerHTML = renderMarkdown(desc);

  const gear = workshopGear();
  decorateGear(el('ws-item-preview'), { ...gear, tier });
  el('ws-prev-icon')?.replaceChildren(itemImage({ name, type, subcat, appearance: el('ws-item-appearance')?.value }));
}

// 提交物品创制 / 编辑 (保存或发放)
function workshopGear() {
  const modActive = el('ws-toggle-modifiers-block')?.checked ?? true;
  const modifiers = {};
  if (modActive) {
    for (const key of Object.keys(gearEffects)) {
      const val = Number(el('gear-effect-' + key)?.value);
      if (Number.isInteger(val) && val !== 0) modifiers[key] = val;
    }
  }
  const allowedSlots = getSelectedAllowedSlots();
  const passiveInBag = el('ws-toggle-passive-bag')?.checked ?? false;
  const quality = el('ws-item-quality')?.value || 'white';
  const avatarVisualId = el('ws-item-avatar-visual')?.value?.trim() || undefined;
  const isSuitTier = Boolean(el('ws-toggle-suit-tier')?.checked);
  const suitTier = isSuitTier ? (Number(el('ws-item-suit-tier')?.value) || 1) : undefined;

  return readGear({
    capacity: Number(el('ws-container-cap')?.value),
    slot: allowedSlots[0] || (passiveInBag ? 'passive' : ''),
    allowedSlots,
    passiveInBag,
    quality,
    avatarVisualId,
    isSuitTier,
    suitTier,
    modifiers
  });
}

function fillWorkshopGear(item = {}) {
  const allowed = Array.isArray(item.allowedSlots) && item.allowedSlots.length > 0
    ? item.allowedSlots
    : (item.slot ? [item.slot] : []);

  // 1. 回显槽位复选框
  document.querySelectorAll('input[name="ws-allowed-slot"]').forEach(cb => {
    cb.checked = allowed.includes(cb.value);
  });
  if (el('ws-item-slot')) el('ws-item-slot').value = allowed[0] || '';

  // 2. 回显背包被动开关
  const isPassive = Boolean(item.passiveInBag || item.slot === 'passive');
  if (el('ws-toggle-passive-bag')) el('ws-toggle-passive-bag').checked = isPassive;

  // 3. 回显品质与容量
  const currentQuality = item.quality || 'white';
  if (el('ws-item-quality')) el('ws-item-quality').value = currentQuality;
  document.querySelectorAll('.ws-quality-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.quality === currentQuality);
  });

  const isSuitTier = Boolean(item.isSuitTier || item.suitTier || (item.slot === 'suit' && item.tier));
  const suitTierVal = Number(item.suitTier || item.tier || 1);
  if (el('ws-toggle-suit-tier')) el('ws-toggle-suit-tier').checked = isSuitTier;
  if (el('ws-suit-tier-container')) el('ws-suit-tier-container').hidden = !isSuitTier;
  if (el('ws-item-suit-tier')) el('ws-item-suit-tier').value = isSuitTier ? String(suitTierVal) : '';
  document.querySelectorAll('.ws-tier-pill').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.tier) === suitTierVal);
  });

  if (el('ws-item-avatar-visual')) {
    el('ws-item-avatar-visual').value = item.avatarVisualId || '';
  }

  if (el('ws-container-cap')) el('ws-container-cap').value = item.capacity ?? item.容量 ?? '';
  const hasContainer = allowed.some(s => ['main_bag', 'pouch_1', 'pouch_2', 'satchel_1', 'satchel_2'].includes(s));
  if (el('ws-container-label')) el('ws-container-label').hidden = !hasContainer;

  // 4. 回显武器计算块
  const hasWeapon = Boolean(item.weapon || item.伤害 || item.damage || item.weaponSlot);
  if (el('ws-toggle-weapon-block')) {
    el('ws-toggle-weapon-block').checked = hasWeapon;
    if (el('ws-weapon-fields')) el('ws-weapon-fields').hidden = !hasWeapon;
  }
  for (const key of ['trait', 'damage', 'range', 'kind', 'burden']) {
    const field = el('ws-weapon-' + key);
    if (!field) continue;
    const cnMap = { trait: '属性', damage: '伤害', range: '距离', kind: '伤害类型', burden: '负荷' };
    field.value = item.weapon?.[key] ?? item[cnMap[key]] ?? (field.options?.[0]?.value || '');
  }

  // 5. 回显护甲计算块
  const armorVal = item.护甲值 ?? item.基础护甲 ?? item.armor ?? '';
  const majorVal = item.重度阈值 ?? item.majorThreshold ?? item.major ?? '';
  const severeVal = item.严重阈值 ?? item.severeThreshold ?? item.severe ?? '';
  const hasArmor = Boolean(armorVal || majorVal || severeVal);
  if (el('ws-toggle-armor-block')) {
    el('ws-toggle-armor-block').checked = hasArmor;
    if (el('ws-armor-fields')) el('ws-armor-fields').hidden = !hasArmor;
  }
  if (el('ws-armor-value')) el('ws-armor-value').value = armorVal || 0;
  if (el('ws-armor-major')) el('ws-armor-major').value = majorVal || 0;
  if (el('ws-armor-severe')) el('ws-armor-severe').value = severeVal || 0;

  // 6. 回显属性修正块
  const gear = readGear(item);
  let hasModifiers = false;
  for (const key of Object.keys(gearEffects)) {
    const input = el('gear-effect-' + key);
    if (input) {
      const val = gear.modifiers[key] ?? '';
      input.value = val;
      if (val) hasModifiers = true;
    }
  }
  if (el('ws-toggle-modifiers-block')) {
    el('ws-toggle-modifiers-block').checked = hasModifiers;
    if (el('ws-gear-fields')) el('ws-gear-fields').hidden = !hasModifiers;
  }
}

function handleWorkshopItemSubmit(isDispatch) {
  const name = el('ws-item-name')?.value?.trim();
  if (!name) return alert('请输入物品名称！');

  const type = el('ws-item-type')?.value || '战利品';
  const subcat = el('ws-item-subcat')?.value?.trim() || '';
  const tier = Number(el('ws-item-tier')?.value) || 1;
  const userStats = el('ws-item-stats')?.value?.trim() || '';
  const desc = el('ws-item-desc')?.value?.trim() || '';
  const icon = resolveItemIcon(name, type, subcat);

  const allowedSlots = getSelectedAllowedSlots();
  const passiveInBag = el('ws-toggle-passive-bag')?.checked ?? false;
  const weaponActive = el('ws-toggle-weapon-block')?.checked ?? false;
  const armorActive = el('ws-toggle-armor-block')?.checked ?? false;
  const modActive = el('ws-toggle-modifiers-block')?.checked ?? false;

  const gear = workshopGear();
  const hasContainer = allowedSlots.some(s => ['main_bag', 'pouch_1', 'pouch_2', 'satchel_1', 'satchel_2'].includes(s));
  if (hasContainer && !gear.capacity) return alert('检测到容器槽位，请填写容器容量（1–999格）。');

  // 武器块校验与收集
  let weapon = undefined;
  if (weaponActive) {
    weapon = Object.fromEntries(
      ['trait', 'damage', 'range', 'kind', 'burden'].map(key => [key, el('ws-weapon-' + key)?.value?.trim() || ''])
    );
    const damagePattern = /^\d*d[1-9]\d*(?:[+-](?:\d*d[1-9]\d*|\d+))*$/;
    if (weapon.damage && !damagePattern.test(weapon.damage)) {
      return alert('武器伤害骰格式错误，请输入如 d8+2、1d10 等表达式。');
    }
  }

  // 护甲块收集
  const armorVal = armorActive ? (Number(el('ws-armor-value')?.value) || 0) : 0;
  const majorVal = armorActive ? (Number(el('ws-armor-major')?.value) || 0) : 0;
  const severeVal = armorActive ? (Number(el('ws-armor-severe')?.value) || 0) : 0;

  // 自动属性概要
  const statParts = [];
  if (weaponActive && weapon) statParts.push(`${weapon.range} · ${weapon.trait} · ${weapon.damage || '—'} ${weapon.kind} · ${weapon.burden}`);
  if (armorActive && (armorVal || majorVal || severeVal)) {
    const terms = [];
    if (armorVal) terms.push(`+${armorVal} 护甲`);
    if (majorVal || severeVal) terms.push(`阈值 +${majorVal}/+${severeVal}`);
    statParts.push(terms.join(' · '));
  }
  if (modActive && gearFormula(gear)) statParts.push(gearFormula(gear));
  if (passiveInBag) statParts.push('🎒 背包生效');
  if (allowedSlots.length) statParts.push(`部位: ${allowedSlots.map(s => gearSlots[s] || s).join('/')}`);
  const effectiveStats = userStats || (statParts.join(' | ') || '');

  const editId = el('ws-item-edit-id')?.value;
  const isEquipment = allowedSlots.length > 0 || passiveInBag;

  const item = {
    id: editId || `vari_${Date.now()}`,
    name,
    名称: name,
    type,
    品类: type,
    subcat,
    tier,
    位阶: tier,
    stats: effectiveStats,
    desc,
    描述: desc,
    icon,
    appearance: validAppearance(el('ws-item-appearance')?.value),
    slot: allowedSlots[0] || (passiveInBag ? 'passive' : ''),
    allowedSlots,
    passiveInBag,
    quality: gear.quality,
    avatarVisualId: gear.avatarVisualId || undefined,
    isSuitTier: gear.isSuitTier,
    suitTier: gear.suitTier,
    modifiers: gear.modifiers,
    capacity: gear.capacity,
    容量: gear.capacity,
    weapon,
    // 武器字段直接展平映射
    ...(weaponActive && weapon ? {
      属性: weapon.trait,
      距离: weapon.range,
      伤害: weapon.damage,
      伤害类型: weapon.kind,
      负荷: weapon.burden
    } : {}),
    // 护甲字段直接展平映射
    ...(armorActive && (armorVal || majorVal || severeVal) ? {
      护甲值: armorVal,
      基础护甲: armorVal,
      重度阈值: majorVal,
      严重阈值: severeVal
    } : {}),
    qty: 1,
    ownedGearId: isEquipment ? (editId || crypto.randomUUID()) : undefined
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
  const target = characters[charIndex];
  if (!target) return alert('未找到目标角色！');
  if (!target.sheet.inventoryItems) target.sheet.inventoryItems = [];

  const formattedDesc = item.stats ? `**【${item.type} · ${item.subcat || '标准'}】** ${item.stats}\n\n${item.desc || item.描述 || ''}` : (item.desc || item.描述 || '');
  const isEquipment = (item.allowedSlots && item.allowedSlots.length > 0) || item.slot || item.passiveInBag;
  const gear = readGear(item);

  return deliver(charIndex, 'inventoryItems', {
    name: item.name || item.名称,
    名称: item.name || item.名称,
    desc: formattedDesc,
    描述: formattedDesc,
    qty: 1,
    icon: item.icon || resolveItemIcon(item.name || item.名称, item.type, item.subcat),
    appearance: validAppearance(item.appearance),
    type: item.type || item.品类 || '战利品',
    品类: item.type || item.品类 || '战利品',
    subcat: item.subcat,
    tier: item.tier || item.位阶 || 1,
    位阶: item.tier || item.位阶 || 1,
    stats: item.stats,
    slot: item.slot || gear.slot || (item.passiveInBag ? 'passive' : ''),
    allowedSlots: gear.allowedSlots,
    passiveInBag: gear.passiveInBag,
    quality: gear.quality,
    avatarVisualId: item.avatarVisualId || gear.avatarVisualId || undefined,
    isSuitTier: Boolean(item.isSuitTier || gear.isSuitTier),
    suitTier: item.suitTier ?? gear.suitTier,
    modifiers: gear.modifiers,
    capacity: gear.capacity,
    容量: gear.capacity,
    weapon: item.weapon,
    属性: item.属性 ?? item.weapon?.trait,
    距离: item.距离 ?? item.weapon?.range,
    伤害: item.伤害 ?? item.weapon?.damage,
    伤害类型: item.伤害类型 ?? item.weapon?.kind,
    负荷: item.负荷 ?? item.weapon?.burden,
    护甲值: item.护甲值 ?? gear.modifiers?.armor ?? 0,
    基础护甲: item.基础护甲 ?? item.护甲值 ?? 0,
    重度阈值: item.重度阈值 ?? gear.modifiers?.major ?? 0,
    严重阈值: item.严重阈值 ?? gear.modifiers?.severe ?? 0,
    ownedGearId: isEquipment ? crypto.randomUUID() : undefined
  });


}

function dispatchCardToCharacter(card, charIndex) {
  return deliver(charIndex,'customDomainCards',card);
}

async function deliver(index,field,item) {
  const target = characters[index];
  if (currentUser?.role !== 'gm' || !target?.updated_at) {
    alert('请选择已经保存到云端的角色。'); return false;
  }
  try {
    await sendResource(target,field,item);
    updateWorkshopTargetSelect();
    if (currentLayer === 'sheet') renderAll();
    alert('已发放至 '+target.avatar_name+'。');
    return true;
  } catch (error) {
    alert('未确认发放结果，请刷新核对：'+error.message);
    return false;
  }
}

async function sendResource(target,field,item) {
  if (pendingWrites.has(target)) throw new Error('角色正在同步。');
  pendingWrites.add(target);
  try {
    const remote = normalizeCharacter(await grantCharacterResource(target.id,field,item));
    const clean = baselines[target.id] && compareSnapshot(JSON.parse(baselines[target.id]),payload(target));
    if (clean) {
      Object.assign(target,remote);
      baselines[target.id] = JSON.stringify(payload(target));
    } else mergeIncomingGrants(target,remote);
    saveLocal();
  } finally {
    pendingWrites.delete(target);
    renderSaveButton();
  }
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
  fillWorkshopGear(item);

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
  fillWorkshopGear();

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

// ==========================================================================
// 主持人状态细节与特殊效果控制中枢 (Status & Special Effects Engine)
// ==========================================================================

function renderActiveCharacterEffects() {
  const container = el('ws-active-effects-list');
  const countEl = el('ws-active-effects-count');
  if (!container) return;

  const target = characters[workshopState.targetCharIndex];
  if (!target) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px;">请先选定目标角色。</div>';
    if (countEl) countEl.textContent = '0';
    return;
  }

  const s = target.sheet || {};
  const conditions = s.conditions || {};
  const specialEffects = s.specialEffects || [];

  const conditionLabels = {
    vulnerable: { name: '脆弱', desc: '受到的所有伤害翻倍（或受到攻击具有额外希望骰）', type: '条件' },
    restrained: { name: '束缚', desc: '速度降为0，敏捷检定处于劣势', type: '条件' },
    hidden: { name: '隐藏', desc: '无法被直接选为目标，下次攻击具有优势', type: '条件' },
    prone: { name: '倒下', desc: '近战攻击对其有优势，移动前须消耗移动力起身', type: '条件' }
  };

  document.querySelectorAll('.status-quick-btn').forEach(btn => {
    const condKey = btn.dataset.cond;
    btn.classList.toggle('active', Boolean(conditions[condKey]));
  });

  const allActive = [];
  for (const [key, meta] of Object.entries(conditionLabels)) {
    if (conditions[key]) {
      allActive.push({ isCondition: true, condKey: key, ...meta });
    }
  }
  for (const fx of specialEffects) {
    allActive.push({ isCondition: false, ...fx });
  }

  if (countEl) countEl.textContent = allActive.length;

  if (!allActive.length) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:12px;text-align:center;">该角色目前无在身状态或特殊效果。</div>';
    return;
  }

  container.innerHTML = '';
  allActive.forEach(item => {
    const card = document.createElement('div');
    card.className = 'active-effect-card';
    const tagClass = item.type === '减益' ? 'debuff' : item.type === '增益' ? 'buff' : item.type === '印记' ? 'mark' : item.type === '特质' ? 'trait' : 'condition';
    card.innerHTML = `
      <div class="active-effect-left">
        <div class="active-effect-title-row">
          <strong>${item.name}</strong>
          <span class="effect-badge-tag ${tagClass}">${item.type || '效果'}</span>
          ${item.duration ? `<span class="active-effect-duration">⏳ ${item.duration}</span>` : ''}
          ${item.modifiers ? `<span style="font-size:11px;color:var(--text-gold);">${item.modifiers}</span>` : ''}
        </div>
        <div class="active-effect-desc">${renderMarkdown(item.description || item.desc || '')}</div>
      </div>
      <button type="button" class="dw-btn dw-btn-outline ws-btn-mini ws-btn-danger" data-action="remove-effect" title="解除此状态">✕ 解除</button>
    `;
    card.querySelector('[data-action="remove-effect"]').addEventListener('click', async () => {
      await removeCharacterEffect(item);
    });
    container.appendChild(card);
  });
}

async function removeCharacterEffect(effectItem) {
  const target = characters[workshopState.targetCharIndex];
  if (!target) return;
  const proposed = structuredClone(target);
  if (!proposed.sheet) proposed.sheet = {};

  if (effectItem.isCondition) {
    if (!proposed.sheet.conditions) proposed.sheet.conditions = {};
    proposed.sheet.conditions[effectItem.condKey] = false;
  } else {
    proposed.sheet.specialEffects = (proposed.sheet.specialEffects || []).filter(e => e.id !== effectItem.id && e.name !== effectItem.name);
  }

  try {
    if (target.updated_at && currentUser?.role === 'gm') {
      await persist(target, payload(proposed));
    }
    target.sheet.conditions = proposed.sheet.conditions;
    target.sheet.specialEffects = proposed.sheet.specialEffects;
    saveLocal();
    renderActiveCharacterEffects();
    renderAll();
  } catch (err) {
    alert('解除状态失败：' + err.message);
  }
}

async function clearAllCharacterEffects() {
  const target = characters[workshopState.targetCharIndex];
  if (!target) return;
  if (!confirm(`确定清除【${target.avatar_name}】身上的全部在身状态与特殊效果吗？`)) return;

  const proposed = structuredClone(target);
  if (!proposed.sheet) proposed.sheet = {};
  proposed.sheet.conditions = { vulnerable: false, restrained: false, hidden: false, prone: false };
  proposed.sheet.specialEffects = [];

  try {
    if (target.updated_at && currentUser?.role === 'gm') {
      await persist(target, payload(proposed));
    }
    target.sheet.conditions = proposed.sheet.conditions;
    target.sheet.specialEffects = proposed.sheet.specialEffects;
    saveLocal();
    renderActiveCharacterEffects();
    renderAll();
    alert(`已清除【${target.avatar_name}】的全部状态！`);
  } catch (err) {
    alert('清除失败：' + err.message);
  }
}

async function toggleQuickCondition(condKey) {
  const target = characters[workshopState.targetCharIndex];
  if (!target) return alert('请先选定目标角色。');
  const proposed = structuredClone(target);
  if (!proposed.sheet) proposed.sheet = {};
  if (!proposed.sheet.conditions) proposed.sheet.conditions = {};
  proposed.sheet.conditions[condKey] = !proposed.sheet.conditions[condKey];

  try {
    if (target.updated_at && currentUser?.role === 'gm') {
      await persist(target, payload(proposed));
    }
    target.sheet.conditions = proposed.sheet.conditions;
    saveLocal();
    renderActiveCharacterEffects();
    renderAll();
  } catch (err) {
    alert('切换状态失败：' + err.message);
  }
}

async function handleWorkshopEffectSubmit(isDispatch) {
  const name = el('ws-effect-name-full')?.value?.trim();
  if (!name) return alert('请输入状态名称！');

  const type = el('ws-effect-type')?.value || '减益';
  const duration = el('ws-effect-duration')?.value?.trim() || '';
  const modifiers = el('ws-effect-modifiers')?.value?.trim() || '';
  const desc = el('ws-effect-desc-full')?.value?.trim() || '';
  const editId = el('ws-effect-edit-id')?.value;

  const effectObj = {
    id: editId || `effect_${Date.now()}`,
    name,
    type,
    duration,
    modifiers,
    desc,
    description: modifiers ? `**【${type}${duration ? ' · ' + duration : ''}】** ${modifiers}\n\n${desc}` : desc
  };

  if (!campaignResources.statusEffects) campaignResources.statusEffects = [];
  const exIdx = campaignResources.statusEffects.findIndex(e => (editId ? e.id === editId : e.name === name));
  if (exIdx >= 0) campaignResources.statusEffects[exIdx] = effectObj;
  else campaignResources.statusEffects.push(effectObj);
  saveCampaignResources();

  if (isDispatch) {
    const target = characters[workshopState.targetCharIndex];
    if (!target) return alert('未找到目标角色！');
    const proposed = structuredClone(target);
    if (!proposed.sheet) proposed.sheet = {};
    proposed.sheet.specialEffects = [...(proposed.sheet.specialEffects || []), {
      id: crypto.randomUUID(),
      name,
      type,
      duration,
      modifiers,
      desc,
      description: effectObj.description
    }];

    try {
      if (target.updated_at && currentUser?.role === 'gm') {
        await persist(target, payload(proposed));
      }
      target.sheet.specialEffects = proposed.sheet.specialEffects;
      saveLocal();
      renderActiveCharacterEffects();
      renderAll();
      alert(`已成功发放状态【${name}】给【${target.avatar_name}】！`);
    } catch (err) {
      return alert('发放状态失败：' + err.message);
    }
  } else {
    alert(editId ? `已更新战役状态【${name}】！` : `已保存状态【${name}】至战役状态库！`);
  }

  // Reset form
  if (el('ws-effect-edit-id')) el('ws-effect-edit-id').value = '';
  if (el('ws-effect-name-full')) el('ws-effect-name-full').value = '';
  if (el('ws-effect-duration')) el('ws-effect-duration').value = '';
  if (el('ws-effect-modifiers')) el('ws-effect-modifiers').value = '';
  if (el('ws-effect-desc-full')) el('ws-effect-desc-full').value = '';

  renderWorkshopLibrary();
}

function loadEffectToEdit(effectObj) {
  switchWorkshopWorkbenchTab('status-effect');
  if (el('ws-effect-edit-id')) el('ws-effect-edit-id').value = effectObj.id;
  if (el('ws-effect-name-full')) el('ws-effect-name-full').value = effectObj.name;
  if (el('ws-effect-type')) el('ws-effect-type').value = effectObj.type || '减益';
  if (el('ws-effect-duration')) el('ws-effect-duration').value = effectObj.duration || '';
  if (el('ws-effect-modifiers')) el('ws-effect-modifiers').value = effectObj.modifiers || '';
  if (el('ws-effect-desc-full')) el('ws-effect-desc-full').value = effectObj.desc || '';

  const banner = el('ws-edit-banner');
  const targetLabel = el('ws-editing-target-name');
  if (banner) banner.hidden = false;
  if (targetLabel) targetLabel.textContent = `状态效果：${effectObj.name}`;
}

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

  // 4. 过滤状态效果
  let matchedEffects = statusEffects;
  if (filter !== 'all' && filter !== '状态效果') {
    matchedEffects = [];
  }
  if (q) {
    matchedEffects = matchedEffects.filter(e =>
      (e.name || '').toLowerCase().includes(q) ||
      (e.desc || '').toLowerCase().includes(q) ||
      (e.modifiers || '').toLowerCase().includes(q)
    );
  }

  const grandTotal = matchedItems.length + matchedCards.length + matchedDomains.length + matchedEffects.length;
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
    decorateGear(cardEl, item);
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
        <button type="button" class="ws-btn-mini ws-btn-gold" data-action="dispatch">发放</button>
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
        <button type="button" class="ws-btn-mini ws-btn-gold" data-action="dispatch">发放</button>
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
      ...readGear(item),
      weapon: item.weapon,
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
            ...readGear(v),
            weapon: v.weapon,
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
function importCharacterJson(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!imported.sheet) throw new Error('无效的角色卡格式');
      delete imported.updated_at; delete imported.owner_id; delete imported.notes;
      delete imported.sheet.experience;
      delete imported.sheet.advancementPoints;
      imported.id = 'imported_' + Date.now();
      characters.push(normalizeCharacter(imported));
      activeCharIndex = characters.length - 1;
      saveLocal();
      switchLayer('sheet',activeCharIndex);
      alert(`已成功导入角色【${imported.avatar_name}】！`);
    } catch (err) {
      alert('导入失败：' + err.message);
    }
  };
  reader.readAsText(file);
}

// ==========================================
// 角色立绘自定义与轮廓切换控制模块
// ==========================================

let tempPortrait = {
  dataUrl: '',
  zoom: 1.0,
  offsetX: 0,
  offsetY: 0
};
let isDraggingPortrait = false;
let portraitDragStart = { x: 0, y: 0 };
let portraitDragInitial = { x: 0, y: 0 };

function updatePortraitModeButtons(character = curChar()) {
  const mode = character?.sheet?.portraitMode === 'custom' ? 'custom' : 'paperdoll';
  const hasCustom = Boolean(character?.sheet?.customPortrait?.dataUrl);
  
  const btnDoll = el('btn-mode-paperdoll');
  const btnCus = el('btn-mode-custom');
  if (btnDoll) btnDoll.classList.toggle('active', mode === 'paperdoll');
  if (btnCus) {
    btnCus.classList.toggle('active', mode === 'custom');
    btnCus.title = hasCustom ? '已配置自定义立绘（点击切换）' : '点击上传自定义立绘';
  }
}

function promptUploadCustomPortrait() {
  const fileInput = el('portrait-file-input');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  } else {
    openPortraitEditorModal();
  }
}

function switchPortraitMode(targetMode) {
  const c = curChar();
  if (!c || !c.sheet) return;

  if (targetMode === 'custom') {
    if (!c.sheet.customPortrait?.dataUrl) {
      // 尚未上传过立绘：直接唤起本地选择图片
      promptUploadCustomPortrait();
      return;
    }
    c.sheet.portraitMode = 'custom';
  } else {
    c.sheet.portraitMode = 'paperdoll';
  }

  saveLocal();
  renderAppearance(c);
}

function openPortraitEditorModal() {
  const c = curChar();
  const existing = c?.sheet?.customPortrait || {};
  tempPortrait = {
    dataUrl: existing.dataUrl || '',
    zoom: Number(existing.zoom) || 1.0,
    offsetX: Number(existing.offsetX) || 0,
    offsetY: Number(existing.offsetY) || 0
  };

  const modal = el('portrait-editor-modal');
  if (!modal) return;
  modal.hidden = false;

  // 回显滑块与预览
  if (el('slider-portrait-zoom')) el('slider-portrait-zoom').value = tempPortrait.zoom;
  if (el('slider-portrait-x')) el('slider-portrait-x').value = tempPortrait.offsetX;
  if (el('slider-portrait-y')) el('slider-portrait-y').value = tempPortrait.offsetY;

  applyPortraitCropPreview();
}

function closePortraitEditorModal() {
  const modal = el('portrait-editor-modal');
  if (modal) modal.hidden = true;
}

function applyPortraitCropPreview() {
  const img = el('portrait-crop-img');
  const empty = el('portrait-crop-empty');
  const valZoom = el('val-portrait-zoom');
  const valX = el('val-portrait-x');
  const valY = el('val-portrait-y');

  if (valZoom) valZoom.textContent = Math.round(tempPortrait.zoom * 100) + '%';
  if (valX) valX.textContent = (tempPortrait.offsetX > 0 ? '+' : '') + tempPortrait.offsetX + '%';
  if (valY) valY.textContent = (tempPortrait.offsetY > 0 ? '+' : '') + tempPortrait.offsetY + '%';

  if (!tempPortrait.dataUrl) {
    if (img) img.hidden = true;
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;
  if (img) {
    img.hidden = false;
    if (img.src !== tempPortrait.dataUrl) img.src = tempPortrait.dataUrl;
    img.style.transform = `scale(${tempPortrait.zoom}) translate(${tempPortrait.offsetX}%, ${tempPortrait.offsetY}%)`;
  }
}

function handlePortraitFileSelect(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('请选择有效的图片文件（JPG、PNG、WebP 等）。');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const rawDataUrl = e.target.result;
    compressAndScaleImage(rawDataUrl, 850, 1100, 0.88, optimizedDataUrl => {
      tempPortrait.dataUrl = optimizedDataUrl;
      tempPortrait.zoom = 1.0;
      tempPortrait.offsetX = 0;
      tempPortrait.offsetY = 0;
      if (el('slider-portrait-zoom')) el('slider-portrait-zoom').value = 1.0;
      if (el('slider-portrait-x')) el('slider-portrait-x').value = 0;
      if (el('slider-portrait-y')) el('slider-portrait-y').value = 0;
      openPortraitEditorModal();
      applyPortraitCropPreview();
    });
  };
  reader.readAsDataURL(file);
}

function compressAndScaleImage(dataUrl, maxWidth, maxHeight, quality, callback) {
  const img = new Image();
  img.onload = () => {
    let width = img.width;
    let height = img.height;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    let output = canvas.toDataURL('image/webp', quality);
    if (!output || output.length > dataUrl.length || output.startsWith('data:image/png')) {
      output = canvas.toDataURL('image/jpeg', quality);
    }
    callback(output);
  };
  img.src = dataUrl;
}

function savePortraitCustomization() {
  if (!tempPortrait.dataUrl) {
    alert('请先选择并上传一张本地图片！');
    return;
  }

  const c = curChar();
  if (!c || !c.sheet) return;

  c.sheet.customPortrait = {
    dataUrl: tempPortrait.dataUrl,
    zoom: tempPortrait.zoom,
    offsetX: tempPortrait.offsetX,
    offsetY: tempPortrait.offsetY
  };
  c.sheet.portraitMode = 'custom';

  saveLocal();
  renderAppearance(c);
  closePortraitEditorModal();
}

let hasInitPortraitListeners = false;
function initPortraitListeners() {
  if (hasInitPortraitListeners) return;
  hasInitPortraitListeners = true;

  el('btn-mode-paperdoll')?.addEventListener('click', () => switchPortraitMode('paperdoll'));
  el('btn-mode-custom')?.addEventListener('click', () => switchPortraitMode('custom'));
  el('btn-open-portrait-setting')?.addEventListener('click', openPortraitEditorModal);
  el('portrait-modal-close')?.addEventListener('click', closePortraitEditorModal);
  el('btn-cancel-portrait')?.addEventListener('click', closePortraitEditorModal);
  el('btn-save-portrait')?.addEventListener('click', savePortraitCustomization);

  // 点击空立绘提示区直接打开选图
  el('portrait-crop-empty')?.addEventListener('click', promptUploadCustomPortrait);
  // 点击纸娃娃舞台区域（若已是自定义立绘）直接打开调整模态框
  el('paperdoll')?.addEventListener('click', () => {
    const c = curChar();
    if (c?.sheet?.portraitMode === 'custom' || c?.sheet?.customPortrait?.dataUrl) {
      openPortraitEditorModal();
    }
  });

  // 点击遮罩空白区域或按 ESC 退出弹窗
  el('portrait-editor-modal')?.addEventListener('click', e => {
    if (e.target === el('portrait-editor-modal')) closePortraitEditorModal();
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !el('portrait-editor-modal')?.hidden) closePortraitEditorModal();
  });

  el('btn-select-portrait-file')?.addEventListener('click', promptUploadCustomPortrait);
  el('portrait-file-input')?.addEventListener('change', handlePortraitFileSelect);

  el('btn-reset-portrait-adjust')?.addEventListener('click', () => {
    tempPortrait.zoom = 1.0;
    tempPortrait.offsetX = 0;
    tempPortrait.offsetY = 0;
    if (el('slider-portrait-zoom')) el('slider-portrait-zoom').value = 1.0;
    if (el('slider-portrait-x')) el('slider-portrait-x').value = 0;
    if (el('slider-portrait-y')) el('slider-portrait-y').value = 0;
    applyPortraitCropPreview();
  });

  el('slider-portrait-zoom')?.addEventListener('input', e => {
    tempPortrait.zoom = parseFloat(e.target.value) || 1.0;
    applyPortraitCropPreview();
  });

  el('slider-portrait-x')?.addEventListener('input', e => {
    tempPortrait.offsetX = parseInt(e.target.value, 10) || 0;
    applyPortraitCropPreview();
  });

  el('slider-portrait-y')?.addEventListener('input', e => {
    tempPortrait.offsetY = parseInt(e.target.value, 10) || 0;
    applyPortraitCropPreview();
  });

  // 鼠标与触屏手势拖拽平移视口
  const viewport = el('portrait-crop-viewport');
  if (viewport) {
    const handleDragStart = (clientX, clientY) => {
      if (!tempPortrait.dataUrl) return;
      isDraggingPortrait = true;
      portraitDragStart = { x: clientX, y: clientY };
      portraitDragInitial = { x: tempPortrait.offsetX, y: tempPortrait.offsetY };
    };

    const handleDragMove = (clientX, clientY) => {
      if (!isDraggingPortrait) return;
      const dx = clientX - portraitDragStart.x;
      const dy = clientY - portraitDragStart.y;
      const sensitivity = 0.5;
      tempPortrait.offsetX = Math.max(-100, Math.min(100, Math.round(portraitDragInitial.x + dx * sensitivity)));
      tempPortrait.offsetY = Math.max(-100, Math.min(100, Math.round(portraitDragInitial.y + dy * sensitivity)));

      if (el('slider-portrait-x')) el('slider-portrait-x').value = tempPortrait.offsetX;
      if (el('slider-portrait-y')) el('slider-portrait-y').value = tempPortrait.offsetY;
      applyPortraitCropPreview();
    };

    const handleDragEnd = () => {
      isDraggingPortrait = false;
    };

    viewport.addEventListener('mousedown', e => handleDragStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => handleDragMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', handleDragEnd);

    viewport.addEventListener('touchstart', e => {
      const touch = e.touches?.[0];
      if (touch) handleDragStart(touch.clientX, touch.clientY);
    }, { passive: true });
    window.addEventListener('touchmove', e => {
      if (!isDraggingPortrait) return;
      const touch = e.touches?.[0];
      if (touch) handleDragMove(touch.clientX, touch.clientY);
    }, { passive: true });
    window.addEventListener('touchend', handleDragEnd);
  }
}

// ==========================================
// 启动应用入口（确保所有模块、变量与监听器完全就绪后安全点火）
// ==========================================
try {
  await init();
} catch (err) {
  console.error('角色库启动异常，已自动进入本地安全模式:', err);
  updateSyncStatus(false, '本地就绪');
  try { switchLayer('vault'); } catch {}
}
