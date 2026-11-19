import json
from pathlib import Path

root = Path(r"C:\Users\iason\.gemini\antigravity\brain\36b8ad73-5e08-45a9-99b4-7c7aca44b633\scratch\repo")
core_res = Path(r"E:\DND\深水城2026\匕首世界站点\.pbdh-upstream\public\system-packages\daggerheart-core\resources")
editor_dir = root / "editor"
editor_data = editor_dir / "data"
editor_data.mkdir(parents=True, exist_ok=True)

def read_json(p):
    return json.loads(p.read_text(encoding="utf-8-sig"))

ancestries = read_json(core_res / "ancestries.json")
armor = read_json(core_res / "armor.json")
classes = read_json(core_res / "classes.json")
communities = read_json(core_res / "communities.json")
domain_cards = read_json(core_res / "domain-cards.json")
loot = read_json(core_res / "loot.json")
subclasses = read_json(core_res / "subclasses.json")
weapons = read_json(core_res / "weapons.json")

# Add modular armor pieces and backpacks to loot/armor
modular_gear = [
    {"ID": "装备:头盔:皮制头盔", "名称": "皮制头盔", "类型": "头部", "部位": "head", "护甲值": 0, "重度阈值": 1, "严重阈值": 1, "描述": "基础硬化皮革头盔，略微提升伤害耐受力。"},
    {"ID": "装备:头盔:铁铸战盔", "名称": "铁铸战盔", "类型": "头部", "部位": "head", "护甲值": 1, "重度阈值": 1, "严重阈值": 1, "描述": "深水城警卫标准头盔，提供+1护甲与伤害阈值加成。"},
    {"ID": "装备:身躯:游侠轻甲身躯", "名称": "游侠胸甲", "类型": "身躯", "部位": "chest", "护甲值": 1, "重度阈值": 1, "严重阈值": 2, "描述": "轻便的皮制护胸，适合敏捷型角色。"},
    {"ID": "装备:身躯:重骑兵胸甲", "名称": "重骑兵胸甲", "类型": "身躯", "部位": "chest", "护甲值": 2, "重度阈值": 2, "严重阈值": 3, "描述": "厚重的精钢锻造胸甲，大幅抵御严重伤害。"},
    {"ID": "装备:腕部:游荡者护腕", "名称": "游荡者护腕", "类型": "腕部", "部位": "wrists", "护甲值": 0, "重度阈值": 1, "严重阈值": 0, "描述": "利于暗器施展的精巧护腕。"},
    {"ID": "装备:腕部:钢制护臂", "名称": "钢制护臂", "类型": "腕部", "部位": "wrists", "护甲值": 1, "重度阈值": 0, "严重阈值": 1, "描述": "沉稳的钢护臂，能招架近身横扫。"},
    {"ID": "装备:腿部:皮护膝护胫", "名称": "皮护腿", "类型": "腿部", "部位": "legs", "护甲值": 0, "重度阈值": 1, "严重阈值": 1, "描述": "保护膝关节与胫骨的轻装。"},
    {"ID": "装备:腿部:骑士板甲护胫", "名称": "骑士板甲护胫", "类型": "腿部", "部位": "legs", "护甲值": 1, "重度阈值": 1, "严重阈值": 2, "描述": "重装铠甲的下半身防护。"},
    {"ID": "装备:足部:暗影软靴", "名称": "暗影软靴", "类型": "足部", "部位": "feet", "护甲值": 0, "重度阈值": 0, "严重阈值": 1, "描述": "步伐无声，并附带避险缓冲。"},
    {"ID": "装备:足部:重甲钢靴", "名称": "重甲钢靴", "类型": "足部", "部位": "feet", "护甲值": 1, "重度阈值": 1, "严重阈值": 0, "描述": "踩地如磐石，抵挡下盘重击。"},
    {"ID": "装备:背部:旅行者斗篷", "名称": "旅行者斗篷", "类型": "背部", "部位": "back", "护甲值": 0, "重度阈值": 1, "严重阈值": 1, "描述": "防风御寒，附带轻微偏斜伤害效果。"},
    {"ID": "装备:背部:暗影帷幕斗篷", "名称": "暗影帷幕斗篷", "类型": "背部", "部位": "back", "护甲值": 1, "重度阈值": 1, "严重阈值": 2, "描述": "深水城隐秘工匠缝制的魔法斗篷。"},
    {"ID": "装备:戒指:守护银戒", "名称": "守护银戒", "类型": "戒指", "部位": "ring", "护甲值": 1, "重度阈值": 0, "严重阈值": 0, "描述": "铭刻了防护法印的古朴银戒，提供1点额外护甲槽。"},
    {"ID": "装备:戒指:坚毅指环", "名称": "坚毅指环", "类型": "戒指", "部位": "ring", "护甲值": 0, "重度阈值": 1, "严重阈值": 1, "描述": "提升佩戴者的抗击打意志。"},
    {"ID": "装备:饰品:希望挂坠", "名称": "希望挂坠", "类型": "饰品", "部位": "trinket", "护甲值": 0, "重度阈值": 0, "严重阈值": 1, "描述": "晨曦神殿的祝福符印。"},
    {"ID": "装备:饰品:战意徽记", "名称": "战意徽记", "类型": "饰品", "部位": "trinket", "护甲值": 1, "重度阈值": 1, "严重阈值": 0, "描述": "老兵的徽记，激发坚韧防御。"},
    {"ID": "装备:行囊:扩展腰包", "名称": "拓展皮质腰包", "类型": "腰包", "部位": "pouch", "容量": 2, "描述": "可挂载在腰带两侧，每个为背包扩容2格。"},
    {"ID": "装备:行囊:大容量挎包", "名称": "深水城旅者挎包", "类型": "挎包", "部位": "satchel", "容量": 4, "描述": "斜挎在身侧的坚韧帆布包，每个为背包扩容4格。"},
    {"ID": "装备:行囊:巨匠精工大背包", "名称": "巨匠扩容主背包", "类型": "背包", "部位": "main-bag", "容量": 16, "描述": "替换初始的10格基础背包，提供16格超大主空间。"}
]

# Merge campaign-resources.json
camp_file = root / "campaign-resources.json"
if camp_file.exists():
    camp = read_json(camp_file)
    for row in camp.get("profession", []):
        name = row["名称"]
        classes.append({
            "ID": "职业:" + name,
            "名称": name,
            "描述": row.get("简介", "") if row.get("简介") != "N/A" else "",
            "领域": row.get("领域1", "") + "+" + row.get("领域2", ""),
            "闪避值": row.get("起始闪避", 9),
            "生命点": row.get("起始生命", 6),
            "希望特性": row.get("希望特性", ""),
            "职业特性": row.get("职业特性", "")
        })
    for row in camp.get("subclass", []):
        lvl_map = {"基石": "基础", "专精": "进阶", "大师": "精通"}
        level = lvl_map.get(row.get("等级"), "基础")
        subclasses.append({
            "ID": f"子职:{row.get('主职')}:{row.get('子职业')}:{level}",
            "主职": row.get("主职"),
            "名称": row.get("子职业"),
            "等级": level,
            "施法属性": row.get("施法", ""),
            "描述": row.get("描述", "")
        })
    for row in camp.get("domain", []):
        domain_cards.append({
            "ID": f"领域卡:{row.get('领域')}:{row.get('名称')}",
            "名称": row.get("名称"),
            "类型": "领域卡",
            "领域": row.get("领域"),
            "等级": f"{row.get('等级')}级",
            "属性": row.get("属性", ""),
            "回想": f"{row.get('回想', 0)}⚡",
            "描述": row.get("描述", "")
        })
    for row in camp.get("community", []):
        communities.append({
            "ID": "社群:" + row.get("名称"),
            "名称": row.get("名称"),
            "类型": "社群",
            "简介": row.get("简介", ""),
            "描述": row.get("特性", "") + row.get("描述", "")
        })

srd_file = root / "srd-additions.json"
if srd_file.exists():
    srd = read_json(srd_file)
    classes.extend(srd.get("classes", []))
    subclasses.extend(srd.get("subclasses", []))
    domain_cards.extend(srd.get("domains", []))

def dedup(lst):
    seen = set()
    res = []
    for item in lst:
        iid = item.get("ID") or item.get("名称")
        if iid not in seen:
            seen.add(iid)
            res.append(item)
    return res

# Clean and dedup live classes
live_classes = [c for c in dedup(classes) if c.get("名称") not in {"刺客", "女巫", "灵巫"}]
live_class_names = {c["名称"] for c in live_classes}
live_subclasses = [sc for sc in dedup(subclasses) if sc.get("主职") in live_class_names]

db = {
    "classes": live_classes,
    "subclasses": live_subclasses,
    "ancestries": [a for a in dedup(ancestries) if a.get("名称") != "械灵"],
    "communities": dedup(communities),
    "domain_cards": dedup(domain_cards),
    "weapons": dedup(weapons),
    "armor": dedup(armor),
    "modular_gear": modular_gear,
    "loot": dedup(loot)
}

(editor_data / "database.json").write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
print("Database compiled successfully into editor/data/database.json:")
for k, v in db.items():
    print(f"  - {k}: {len(v)} items")
