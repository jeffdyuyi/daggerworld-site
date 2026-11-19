"""Build DH player pages using upstream modules and their existing data IDs."""

import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent
upstream = root / "pbdh-upstream"
if not upstream.exists():
    upstream = root / ".pbdh-upstream"
package = upstream / "public/system-packages/daggerheart-core"
layouts = package / "layouts"

def modules(*ids):
    return "".join(f'<pb-module id="{id}"></pb-module>' for id in ids)


def panel(title, content, guide=None, icon=None):
    marker = f' data-guide-region-id="{guide}"' if guide else ""
    icon_tag = f'<span class="dw-panel-icon">{icon}</span>' if icon else ""
    return f'<section class="dw-panel"{marker}><h2>{icon_tag}{title}</h2>{content}</section>'


def grid(content, cls="dw-grid"):
    return f'<div class="{cls}">{content}</div>'


def equipment_slot(title, key, position):
    has_picker = key in ("armor", "primary-weapon", "secondary-weapon", "backup-weapon-1", "backup-weapon-2")
    picker = modules(f"pick-{key}") if has_picker else ""
    return (
        f'<article class="dw-slot dw-slot-{position}">'
        f'<h3><span class="dw-slot-icon dw-slot-icon-{key}"></span>{title}</h3>'
        f'{modules(f"{key}-name")}{picker}{modules(f"{key}-description")}'
        f'</article>'
    )


def write_page(id, title, label, body, hidden=False):
    path = f"layouts/dw-{id}.html"
    (package / path).write_text(
        f'<main class="dw-page"><header class="dw-page-heading"><p>{label}</p><h1>{title}</h1></header>{body}</main>',
        encoding="utf-8",
    )
    res = {"ID": id, "名称": title, "打印": True,
           "layout": {"类型": "htmlTemplate", "html": path, "css": "layouts/dw-sheet.css"}}
    if hidden:
        res["默认隐藏"] = True
    return res


story = (layouts / "character-story.html").read_text(encoding="utf-8")
questions = re.search(r'<section class="question-layout".*?</section>', story, re.S).group()
advancement = re.search(r'<section class="advancement-region".*?</section>', story, re.S).group()

# -------------------------------------------------------------
# 1. 【概览】 (Overview)
# 顶部: 化身登记 + 战斗状态
# 中部: 左侧 3/4 随身装备与环形纸娃娃 + 右侧 1/4 属性与防御看板
# 底部: 升级选项
# -------------------------------------------------------------
top_status = (
    '<section class="dw-tabletop-dashboard" data-guide-region-id="guide-resources">'
    + '<div class="dw-dash-identity">'
    + '<h2>化身登记</h2>'
    + '<div class="dw-dash-id-grid">' + modules("character-name", "level") + '</div>'
    + '</div>'
    + '<div class="dw-dash-combat">'
    + '<h2>战斗状态与资源池</h2>'
    + '<div class="dw-dash-resources-grid">' + modules("hp", "stress", "hope", "armor-slots") + '</div>'
    + '</div>'
    + '</section>'
)

paper_doll = (
    '<div class="dw-loadout-v2">'
    + '<div class="dw-figure"><img src="assets/daggerworld/figure.png" alt="化身装配轮廓"></div>'
    # 左列：防具散件
    + equipment_slot("头部", "head", "head")
    + equipment_slot("身躯/护甲", "armor", "chest")
    + equipment_slot("背部", "back", "back")
    + equipment_slot("腕部", "wrists", "wrists")
    + equipment_slot("腿部", "legs", "legs")
    + equipment_slot("足部", "feet", "feet")
    # 右列：武器与饰品
    + equipment_slot("主武器", "primary-weapon", "main")
    + equipment_slot("副武器", "secondary-weapon", "off")
    + equipment_slot("备用武器", "backup-weapon-1", "spare")
    + equipment_slot("戒指一", "ring-1", "ring1")
    + equipment_slot("戒指二", "ring-2", "ring2")
    + equipment_slot("饰品一", "trinket-1", "trinket1")
    + equipment_slot("饰品二", "trinket-2", "trinket2")
    # 底栏：套装与外观
    + equipment_slot("套装主槽（装备后覆盖防具散件）", "suit", "suit")
    + equipment_slot("外观时装（独立外显无数值）", "costume", "costume")
    + '</div>'
)

equip_section = panel("随身装配与纸娃娃", paper_doll, "guide-loadout")

stats_section = (
    panel("核心属性", grid(modules("agility", "strength", "finesse", "instinct", "presence", "knowledge"), "dw-stats-col-grid"), "guide-traits")
    + panel("防御与阈值", grid(modules("evasion", "armor-value", "major-threshold", "severe-threshold", "proficiency"), "dw-stats-col-grid"))
)

overview_middle = f'<div class="dw-overview-body"><div class="dw-overview-equip">{equip_section}</div><div class="dw-overview-stats">{stats_section}</div></div>'
overview_page = top_status + overview_middle + panel("升级选项与研修进阶", advancement)

# -------------------------------------------------------------
# 2. 【基石】 (Foundations)
# 种族特性A+B、社群归属、职业/子职核心、施法高光专区、形象与身世
# -------------------------------------------------------------
spellcast_focus = (
    '<div class="dw-spellcast-banner">'
    '<h3>✦ 施法焦点与秘法属性 ✦</h3>'
    '<p>若你的职业具备施法特性，法术检定以关键施法属性（知识、风度或本能）为基底，施展高环秘奥需承受相应风险与代价。</p>'
    '</div>'
)

foundations_page = (
    grid(panel("种族血脉", modules("ancestry-name", "pick-ancestry"), "guide-ancestry")
         + panel("社群归属", modules("community-name", "pick-community"), "guide-community"))
    + panel("职业研修与流派", grid(modules("class-name", "pick-class", "pick-subclass")), "guide-class")
    + spellcast_focus
    + grid(panel("职业核心能力", modules("class-feature"))
         + panel("希望战术能力", modules("class-hope-feature")))
    + grid(panel("化身形象", modules("character-avatar"))
         + panel("身世见闻与备忘", modules("background-story", "event-log")))
    + questions
)

# -------------------------------------------------------------
# 3. 【技能】 (Skills & Powers)
# 领域卡牌库、职业领域默认限制、主持人特许开关、原创卡入口
# -------------------------------------------------------------
skill_tools = (
    '<div class="dw-skill-controls">'
    + grid(modules("pick-domain-card", "pick-other-resources"))
    + '<div class="dw-gm-override-box">'
    + '<span class="dw-gm-badge">👑 主持人特许模式（全领域与自制牌已就绪）</span>'
    + '<p class="dw-gm-note">默认受职业所属双领域筛选限制。主持人可通过管理特权解锁更多领域或注入专属秘奥。</p>'
    + '</div>'
    + '</div>'
)

skills_page = (
    panel("领域卡选取与配置", skill_tools)
    + panel("已习得领域能力牌组", f'<div class="dw-table">{modules("character-card-table")}</div>', "guide-domain-cards")
)

# -------------------------------------------------------------
# 4. 【背包】 (Grid Inventory)
# 10格基础自带背包、可替换大包、2腰包+2挎包扩展槽位、网格化背包陈列、金币
# -------------------------------------------------------------
bag_loadout = grid(
    equipment_slot("主背负包（基础10格/可换大包）", "main-bag", "main-bag")
    + equipment_slot("腰包一（扩展）", "pouch-1", "pouch")
    + equipment_slot("腰包二（扩展）", "pouch-2", "pouch")
    + equipment_slot("挎包一（扩展）", "satchel-1", "satchel")
    + equipment_slot("挎包二（扩展）", "satchel-2", "satchel")
)

bag_grid_slots = "".join(f'<div class="dw-grid-slot" title="储物格 {i}"><span>{i}</span></div>' for i in range(1, 11))
bag_preview = f'<div class="dw-inventory-grid-wrap"><h3>背包储物网格（基础 10 格 + 扩容格）</h3><div class="dw-grid-slots-preview">{bag_grid_slots}</div></div>'

inventory_page = (
    panel("背负装载系统", bag_loadout, "guide-equipment")
    + panel("行装物品栏", bag_preview + modules("pick-inventory-item", "inventory"), "guide-inventory")
    + panel("随身财产", grid(modules("handful-gold", "bag-gold", "chest-gold")))
)

# -------------------------------------------------------------
# 5. 【经历与特性】 (对玩家隐藏，仅作为主持人人格备注)
# -------------------------------------------------------------
experiences = "".join(
    f'<div class="dw-experience">{modules(f"experience-{number}", f"experience-modifier-{number}")}</div>'
    for number in range(1, 6)
)
traits_page = panel("人格经历与特性（主持人专属记录）", experiences, "guide-experiences")

# -------------------------------------------------------------
# 写入 pages.json
# -------------------------------------------------------------
pages_path = package / "pages.json"
special_pages = [page for page in json.loads(pages_path.read_text(encoding="utf-8")) if page.get("默认隐藏") and page.get("ID") not in ("character-main", "character-story", "domain-deck", "equipment", "traits", "class-build")]

pages = [
    write_page("character-main", "概览", "状态、配装与潜能", overview_page),
    write_page("character-story", "基石", "血统传承与职业机能", foundations_page),
    write_page("domain-deck", "技能", "领域能力与秘奥牌组", skills_page),
    write_page("equipment", "背包", "背负系统与网格物品栏", inventory_page),
    write_page("traits", "经历与特性", "人格印记（主持人记录）", traits_page, hidden=True),
]

pages_path.write_text(json.dumps(pages + special_pages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# -------------------------------------------------------------
# 扩展 modules.json 注册新槽位字段
# -------------------------------------------------------------
modules_path = package / "modules.json"
definitions = json.loads(modules_path.read_text(encoding="utf-8"))
existing_ids = {d["ID"] for d in definitions}

new_slots = [
    ("head", "头部防具"), ("back", "背部斗篷"), ("wrists", "腕部护手"),
    ("legs", "腿部防具"), ("feet", "足部战靴"),
    ("ring-1", "戒指一"), ("ring-2", "戒指二"),
    ("trinket-1", "饰品一"), ("trinket-2", "饰品二"),
    ("suit", "套装主槽（整套覆盖）"), ("costume", "外观时装（独立外显）"),
    ("main-bag", "主背包（基础10格/可换大包）"),
    ("pouch-1", "腰包一"), ("pouch-2", "腰包二"),
    ("satchel-1", "挎包一"), ("satchel-2", "挎包二"),
]

for slot_id, label in new_slots:
    name_id = f"{slot_id}-name"
    desc_id = f"{slot_id}-description"
    if name_id not in existing_ids:
        definitions.append({"ID": name_id, "类型": "freeText", "标签": label, "默认值": ""})
        existing_ids.add(name_id)
    if desc_id not in existing_ids:
        definitions.append({"ID": desc_id, "类型": "longText", "标签": f"{label}描述", "默认值": ""})
        existing_ids.add(desc_id)

starting_values = {"inventory": "", "handful-gold": 0}
for definition in definitions:
    if definition["ID"] in starting_values:
        definition["默认值"] = starting_values[definition["ID"]]

modules_path.write_text(json.dumps(definitions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# -------------------------------------------------------------
# 更新 manifest.json
# -------------------------------------------------------------
manifest_path = package / "manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest["skins"] = [{
    "ID": "daggerworld", "名称": "匕首世界", "css": "skins/daggerworld/skin.css",
    "推荐框架配色": "dark",
}]
manifest["shell"] = {"html": "layouts/dw-shell.html", "css": "layouts/dw-sheet.css"}
manifest.pop("questionnaireCharacterCreation", None)
manifest["版本"] = "1.3.0"
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

(layouts / "dw-shell.html").write_text(
    '<main class="dw-workspace"><pb-page-outlet></pb-page-outlet></main>', encoding="utf-8",
)

print("design-sheet.py completed successfully: 4 pages generated + traits hidden")
