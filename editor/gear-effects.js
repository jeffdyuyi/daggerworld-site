import { traits } from './sheet-rules.js';

export const gearSlots = {
  weapon_main: '主手', weapon_off: '副手', weapon_spare: '备用武器',
  chest: '躯干', head: '头部', wrists: '腕部', feet: '足部', waist: '腰部', legs: '腿部',
  back: '背部', ring: '戒指', ring1: '戒指 1', ring2: '戒指 2',
  trinket: '饰品', trinket1: '饰品 1', trinket2: '饰品 2',
  main_bag: '主背包', pouch: '腰包', pouch_1: '腰包 1', pouch_2: '腰包 2',
  satchel: '挎包', satchel_1: '挎包 1', satchel_2: '挎包 2',
  suit: '套装', costume: '时装', passive: '背包奇物',
};

export const gearEffects = {
  armor: '护甲上限', ...traits, evasion: '闪避', proficiency: '熟练值',
  major: '重度阈值', severe: '严重阈值', lethal: '致死阈值',
  hp: '生命槽', stress: '压力槽',
};

export const qualities = { white: '白', green: '绿', blue: '蓝', purple: '紫', orange: '橙', red: '红' };

export function readGear(item) {
  const allowed = Array.isArray(item?.allowedSlots) ? item.allowedSlots : (item?.slot ? [item.slot] : []);
  const slot = Object.hasOwn(gearSlots, item?.slot) ? item.slot : (allowed[0] || '');
  const quality = Object.hasOwn(qualities, item?.quality) ? item.quality : 'white';
  const passiveInBag = Boolean(item?.passiveInBag || item?.slot === 'passive');
  const modifiers = {};

  if (item?.modifiers) {
    if (Array.isArray(item.modifiers)) {
      for (const m of item.modifiers) {
        if (m && m.target && Object.hasOwn(gearEffects, m.target)) {
          const val = Number(m.value);
          if (Number.isInteger(val) && Math.abs(val) <= 99 && val) modifiers[m.target] = (modifiers[m.target] || 0) + val;
        }
      }
    } else if (typeof item.modifiers === 'object') {
      for (const key of Object.keys(gearEffects)) {
        const value = Number(item.modifiers[key]);
        if (Number.isInteger(value) && Math.abs(value) <= 99 && value) modifiers[key] = value;
      }
    }
  }

  const capacity = Number(item?.capacity);
  const container = ['main_bag', 'pouch', 'satchel', 'pouch_1', 'pouch_2', 'satchel_1', 'satchel_2'].some(k => allowed.includes(k) || slot === k);
  const avatarVisualId = typeof item?.avatarVisualId === 'string' ? item.avatarVisualId.trim() : undefined;
  const suitTier = [1, 2, 3, 4].includes(Number(item?.suitTier)) ? Number(item.suitTier) : undefined;
  const isSuitTier = Boolean(item?.isSuitTier || suitTier);
  return {
    slot,
    allowedSlots: allowed,
    passiveInBag,
    quality,
    modifiers,
    ...(container && Number.isInteger(capacity) && capacity > 0 && capacity <= 999 ? { capacity } : {}),
    ...(avatarVisualId ? { avatarVisualId } : {}),
    ...(suitTier ? { suitTier } : {}),
    ...(isSuitTier ? { isSuitTier } : {})
  };
}

export function slotMatches(item, slot) {
  if (!item) return false;
  const allowed = Array.isArray(item.allowedSlots) && item.allowedSlots.length > 0
    ? item.allowedSlots
    : (item.slot ? [item.slot] : []);
  if (!allowed.length) return false;

  const normSlot = slot.replace(/_?[12]$/, '');
  for (const s of allowed) {
    if (s === slot || s === normSlot) return true;
    if (slot === 'weapon_spare' && (s === 'weapon_main' || s === 'weapon_off' || s === 'weapon_spare')) return true;
    if (s === 'ring' && (slot === 'ring1' || slot === 'ring2' || slot === 'ring')) return true;
    if (s === 'trinket' && (slot === 'trinket1' || slot === 'trinket2' || slot === 'trinket')) return true;
    if (s === 'pouch' && (slot === 'pouch_1' || slot === 'pouch_2' || slot === 'pouch')) return true;
    if (s === 'satchel' && (slot === 'satchel_1' || slot === 'satchel_2' || slot === 'satchel')) return true;
    if (s.replace(/_?[12]$/, '') === normSlot) return true;
  }
  return false;
}

export const suitSlots = ['head', 'chest', 'legs', 'feet'];
export function suitCoversSlot(sheet, slot) {
  const suit = sheet?.equipment?.suit;
  return Boolean(suit && suitSlots.includes(slot) && (!suit.ownedGearId ||
    sheet.inventoryItems?.some(item => item?.ownedGearId === suit.ownedGearId && item.slot === 'suit' && (item.qty ?? 1) > 0)));
}

export function storedItems(sheet) {
  const worn = new Set(Object.values({ ...sheet.equipment, ...sheet.bags }).map(i => i?.ownedGearId).filter(Boolean));
  return (sheet.inventoryItems ?? []).filter(i => i && !worn.has(i.ownedGearId));
}

export function totalGearEffects(sheet, capacity = Infinity) {
  const inventory = (sheet.inventoryItems ?? []).filter(item => item && (item.qty ?? 1) > 0);
  const owned = new Map(inventory.filter(item => item.ownedGearId).map(item => [item.ownedGearId, item]));
  const active = new Set();

  for (const [slot, item] of Object.entries({ ...sheet.equipment, ...sheet.bags })) {
    if (!item) continue;
    const held = item.ownedGearId ? owned.get(item.ownedGearId) : null;
    const effectiveItem = held || item;
    if (!suitCoversSlot(sheet, slot) && slot !== 'weapon_spare') {
      if (held ? slotMatches(held, slot) : true) {
        active.add(effectiveItem);
      }
    }
  }

  for (const item of storedItems(sheet).slice(0, capacity)) {
    if ((item?.slot === 'passive' || item?.passiveInBag) && (item.qty ?? 1) > 0) active.add(item);
  }

  const result = {};
  for (const item of active) {
    for (const [key, value] of Object.entries(readGear(item).modifiers)) {
      result[key] = (result[key] ?? 0) + value;
    }
  }
  return result;
}

export function gearFormula(item) {
  const parts = [];
  const gear = readGear(item);
  for (const [key, value] of Object.entries(gear.modifiers)) {
    if (gearEffects[key] && value) {
      parts.push(`${gearEffects[key]} ${value > 0 ? '+' : ''}${value}`);
    }
  }
  return parts.join(' · ');
}
