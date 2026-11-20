import json
from pathlib import Path

import argparse
parser = argparse.ArgumentParser()
parser.add_argument("resources", type=Path, help="PbDH 核心包 resources 目录")
core_res = parser.parse_args().resources
root = Path(__file__).resolve().parent
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
    "loot": dedup(loot)
}

(editor_data / "database.json").write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")
print("Database compiled successfully into editor/data/database.json:")
for k, v in db.items():
    print(f"  - {k}: {len(v)} items")
