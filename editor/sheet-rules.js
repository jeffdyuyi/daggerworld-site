export const traits = {
  agility: '敏捷', strength: '力量', finesse: '灵巧',
  instinct: '本能', presence: '风采', knowledge: '知识',
};
export const startingModifiers = [-1, 0, 0, 1, 1, 2];

export function tierForLevel(level) {
  return 1 + [2, 5, 8].filter(milestone => level >= milestone).length;
}

export function damageDice(expression, proficiency) {
  if (!expression) return '';
  return expression.replace(/(\d*)d(\d+)/gi, (_, count, faces) => `${(Number(count) || 1) * proficiency}d${faces}`);
}

export function equipmentIssue(slot, item, sheet, tier, canCast) {
  if (Number(item.位阶) > tier) return '装备位阶超过角色位阶。';
  if (slot !== 'weapon_main' && slot !== 'weapon_off') return '';
  if (item.伤害类型 === '魔法' && !canCast) return '需要施法属性才能使用魔法伤害武器。';
  const other = sheet.equipment?.[slot === 'weapon_main' ? 'weapon_off' : 'weapon_main'];
  if (other && (other.负荷 === '双手' || item.负荷 === '双手')) return '双手武器占用双手，请先卸下另一手的装备。';
  return '';
}

export function cardKey(card) {
  return card.ID || card.名称;
}

export function uniqueCards(cards) {
  return [...new Map(cards.filter(Boolean).map(card => [cardKey(card), card])).values()];
}

export function cardLevel(card) {
  return Number(String(card.等级 ?? '').match(/\d+/)?.[0]) || 1;
}

export function recallCost(card) {
  return Number(String(card.回想 ?? '').match(/\d+/)?.[0]) || 0;
}

export function unspentCardLevels(level, ownedCards, advancementSlots) {
  const limits = [1, ...Array.from({ length: level }, (_, index) => index + 1)];
  for (const [atLevel, slots] of Object.entries(advancementSlots ?? {})) {
    if (Number(atLevel) > level) continue;
    for (const slot of slots) {
      const [tier, option] = slot.split(':');
      if (option === 'domain') limits.push(Math.min(Number(atLevel), [0, 1, 4, 7, 10][Number(tier)] ?? 0));
    }
  }
  limits.sort((a, b) => a - b);
  for (const rank of ownedCards.map(cardLevel).sort((a, b) => b - a)) {
    const index = limits.findIndex(limit => limit >= rank);
    if (limits.length) limits.splice(index < 0 ? limits.length - 1 : index, 1);
  }
  return limits;
}
