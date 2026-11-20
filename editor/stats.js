import { slotMatches, totalGearEffects, suitCoversSlot } from './gear-effects.js';
import { traits, tierForLevel, rulesLevel } from './sheet-rules.js';

const integer = value => Number.isSafeInteger(Number(value)) ? Number(value) : 0;
const legacy = { armor:'armorLimitAdjustment', proficiency:'proficiencyAdjustment', evasion:'evasionAdjustment' };
export const adjustment = (sheet,key) => integer(sheet.adjustments?.[key] ?? sheet[legacy[key]]);

export function sheetStats(character, job, capacity) {
  const s = character.sheet, level = character.level;
  const gear = totalGearEffects(s, capacity);
  const choices = Object.entries(s.levelAdvancements ?? {}).filter(([rank]) => Number(rank) <= level)
    .flatMap(([,items]) => items);
  const count = key => choices.filter(x => x === key).length +
    (s.advancements ?? []).filter(x => typeof x === 'string' && (x === key || (['hp','stress'].includes(key) && x.startsWith(key)))).length;
  const innate = {...s.attributes, hp: integer(job?.生命点 || 6)+count('hp'), stress:6+count('stress'),
    evasion:integer(job?.闪避值)+count('evasion'), proficiency:tierForLevel(level)+count('prof'),
    armor:0, major:rulesLevel(level), severe:rulesLevel(level)*2};
  const seen = new Set();
  let suitItem = null;
  for (const [slot,item] of Object.entries(s.equipment ?? {})) {
    if (!item || suitCoversSlot(s,slot) || ['weapon_spare','costume'].includes(slot)) continue;
    if (item.ownedGearId) {
      if (seen.has(item.ownedGearId) || !s.inventoryItems?.some(i => i?.ownedGearId === item.ownedGearId && slotMatches(i,slot) && (i.qty ?? 1)>0)) continue;
      seen.add(item.ownedGearId);
    }
    if (slot === 'suit') suitItem = item;
    for (const [key,field] of [['armor','护甲值'],['major','重度阈值'],['severe','严重阈值']]) {
      gear[key] = (gear[key] || 0) + integer(item[field] ?? (key === 'armor' ? item.基础护甲 : 0));
    }
    // Only unconditional features in the original resource records.
    if (!/^(主武器|副武器|护甲):/.test(item.ID || '')) continue;
    const feature = item.描述 || '';
    if (!/^:red\[\*\*(保护|壁垒|两用|极重|重型|巨型|破坏|勇气|灵活|困难)\*\*\]/.test(feature)) continue;
    for (const [key, label] of [['armor','护甲值'],['evasion','闪避值'],['major','重度伤害阈值'],['severe','严重伤害阈值'],['agility','敏捷']]) {
      const match = feature.replace(/\s/g,'').match(new RegExp(label+'([+-]\\d+)|([+-]\\d+)'+label));
      if (match) gear[key] = (Number(gear[key]) || 0) + Number(match[1] || match[2]);
    }
    if (feature.includes('所有属性以及闪避值-1')) for (const key of Object.keys(traits)) gear[key] = (gear[key] || 0)-1;
  }
  const automatic = {}, values = {};
  for (const [key,base] of Object.entries(innate)) {
    automatic[key] = base + (gear[key] || 0);
    values[key] = automatic[key] + adjustment(s,key);
  }
  for (const key of ['hp','stress','major']) values[key] = Math.max(1,values[key]);
  for (const key of ['armor','proficiency','evasion']) values[key] = Math.max(0,values[key]);
  values.severe = Math.max(values.major+1,values.severe);
  innate.lethal = values.severe*2;
  automatic.lethal = innate.lethal+(gear.lethal || 0);
  values.lethal = Math.max(values.severe+1,automatic.lethal+adjustment(s,'lethal'));
  return {innate,automatic,values,gear,suitItem,isSuitActive:Boolean(suitItem),baseArmor:automatic.armor,
    armorMax:values.armor,majorThreshold:values.major,severeThreshold:values.severe,lethalThreshold:values.lethal,
    maxHp:values.hp,maxStress:values.stress,maxHope:6+count('hope'),totalProf:values.proficiency};
}
