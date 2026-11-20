import { traits } from './sheet-rules.js';

export const gearSlots = {
  weapon_main: '主手', weapon_off: '副手', chest: '躯干', head: '头部',
  wrists: '腕部', feet: '足部', waist: '腰部', legs: '腿部', ring: '戒指',
  trinket: '饰品', back: '背部', suit: '套装', passive: '背包奇物',
};

export const gearEffects = {
  armor: '护甲上限', ...traits, evasion: '闪避', proficiency: '熟练值',
  major: '重度阈值', severe: '严重阈值', lethal: '致死阈值',
  hp: '生命槽', stress: '压力槽',
};

export const qualities = { white: '白', green: '绿', blue: '蓝', purple: '紫', orange: '橙', red: '红' };

export function readGear(item) {
  const slot = Object.hasOwn(gearSlots, item?.slot) ? item.slot : '';
  const quality = Object.hasOwn(qualities, item?.quality) ? item.quality : 'white';
  const modifiers = {};
  if (slot) for (const key of Object.keys(gearEffects)) {
    const value = Number(item.modifiers?.[key]);
    if (Number.isInteger(value) && Math.abs(value) <= 99 && value) modifiers[key] = value;
  }
  return { slot, quality, modifiers };
}

export function slotMatches(item, slot) {
  const part = item.slot;
  if (slot === 'weapon_spare') return part === 'weapon_main' || part === 'weapon_off';
  return part === slot.replace(/[12]$/, '');
}

export function totalGearEffects(sheet, capacity = Infinity) {
  const inventory = (sheet.inventoryItems ?? []).filter(item => item && (item.qty ?? 1) > 0);
  const owned = new Map(inventory.filter(item => item.ownedGearId).map(item => [item.ownedGearId, item]));
  const active = new Set();
  for (const [slot, item] of Object.entries(sheet.equipment ?? {})) {
    const held = owned.get(item?.ownedGearId);
    if (slot !== 'weapon_spare' && held && slotMatches(held, slot)) active.add(held);
  }
  for (const item of (sheet.inventoryItems ?? []).slice(0, capacity)) {
    if (item?.slot === 'passive' && (item.qty ?? 1) > 0) active.add(item);
  }
  const result = {};
  for (const item of active) {
    for (const [key, value] of Object.entries(readGear(item).modifiers)) result[key] = (result[key] ?? 0) + value;
  }
  return result;
}

export function gearFormula(item) {
  return Object.entries(readGear(item).modifiers)
    .map(([key, value]) => gearEffects[key] + ' ' + (value > 0 ? '+' : '') + value).join(' · ');
}
