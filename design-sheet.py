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


def panel(title, content, guide=None):
    marker = f' data-guide-region-id="{guide}"' if guide else ""
    return f'<section class="dw-panel"{marker}><h2>{title}</h2>{content}</section>'


def grid(content):
    return f'<div class="dw-grid">{content}</div>'


def equipment_slot(title, key, position):
    return (
        f'<article class="dw-slot dw-slot-{position}"><h3>{title}</h3>'
        + modules(f"{key}-name", f"pick-{key}", f"{key}-description")
        + "</article>"
    )


def write_page(id, title, label, body):
    path = f"layouts/dw-{id}.html"
    (package / path).write_text(
        f'<main class="dw-page"><header class="dw-page-heading"><p>{label}</p><h1>{title}</h1></header>{body}</main>',
        encoding="utf-8",
    )
    return {"ID": id, "名称": title, "打印": True,
            "layout": {"类型": "htmlTemplate", "html": path, "css": "layouts/dw-sheet.css"}}


story = (layouts / "character-story.html").read_text(encoding="utf-8")
questions = re.search(r'<section class="question-layout".*?</section>', story, re.S).group()
advancement = re.search(r'<section class="advancement-region".*?</section>', story, re.S).group()

overview = (
    panel("化身登记", grid(modules("character-name", "level")))
    + panel("战斗状态", grid(modules("hp", "stress", "hope", "armor-slots")), "guide-resources")
    + panel("防御与伤害阈值", grid(modules("evasion", "armor-value", "major-threshold", "severe-threshold")))
    + panel("属性", grid(modules("agility", "strength", "finesse", "instinct", "presence", "knowledge")), "guide-traits")
)
origins = (
    grid(panel("种族", modules("ancestry-name", "pick-ancestry"), "guide-ancestry")
         + panel("社群", modules("community-name", "pick-community"), "guide-community"))
    + grid(panel("角色形象", modules("character-avatar"))
         + panel("背景与见闻", modules("background-story", "event-log")))
    + questions
)
career = (
    panel("职业与子职", grid(modules("class-name", "pick-class", "pick-subclass")), "guide-class")
    + grid(panel("职业能力", modules("class-feature"))
         + panel("希望能力", modules("class-hope-feature")))
    + advancement
)
experiences = "".join(
    f'<div class="dw-experience">{modules(f"experience-{number}", f"experience-modifier-{number}")}</div>'
    for number in range(1, 6)
)
traits = panel("经历", experiences, "guide-experiences")
cards = panel(
    "选择与整理卡牌",
    grid(modules("pick-domain-card", "pick-other-resources"))
    + f'<div class="dw-table">{modules("character-card-table")}</div>',
    "guide-domain-cards",
)
gear = (
    '<div class="dw-loadout"><div class="dw-figure"><img src="assets/daggerworld/figure.png" alt="人体装备位置示意"></div>'
    + equipment_slot("护甲", "armor", "torso")
    + equipment_slot("主武器", "primary-weapon", "main")
    + equipment_slot("副武器", "secondary-weapon", "off")
    + "</div>"
)
inventory = (
    panel("随身装备", modules("proficiency") + gear, "guide-equipment")
    + panel("物品栏", modules("pick-inventory-item", "inventory"), "guide-inventory")
    + panel("金币", grid(modules("handful-gold", "bag-gold", "chest-gold")))
    + panel("备用武器", grid(
        equipment_slot("备用武器一", "backup-weapon-1", "spare")
        + equipment_slot("备用武器二", "backup-weapon-2", "spare")))
)

pages_path = package / "pages.json"
special_pages = [page for page in json.loads(pages_path.read_text(encoding="utf-8")) if page.get("默认隐藏")]
pages = [
    write_page("character-main", "化身总览", "登记与战斗状态", overview),
    write_page("character-story", "出身档案", "出身、形象与关系", origins),
    write_page("class-build", "职业研修", "职业能力与升级", career),
    write_page("traits", "经历与特性", "经历及其调整值", traits),
    write_page("domain-deck", "领域卡", "卡牌选择与配置", cards),
    write_page("equipment", "行装背包", "装备、储备与金币", inventory),
]
pages_path.write_text(json.dumps(pages + special_pages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

manifest_path = package / "manifest.json"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest["skins"] = [{
    "ID": "daggerworld", "名称": "匕首世界", "css": "skins/daggerworld/skin.css",
    "推荐框架配色": "dark",
}]
manifest["shell"] = {"html": "layouts/dw-shell.html", "css": "layouts/dw-sheet.css"}
manifest.pop("questionnaireCharacterCreation", None)
manifest["版本"] = "1.1.0"
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(layouts / "dw-shell.html").write_text(
    '<main class="dw-workspace"><pb-page-outlet></pb-page-outlet></main>', encoding="utf-8",
)

# DH begins with an empty inventory. Existing character values keep their IDs.
modules_path = package / "modules.json"
definitions = json.loads(modules_path.read_text(encoding="utf-8"))
starting_values = {"inventory": "", "handful-gold": 0}
for definition in definitions:
    if definition["ID"] in starting_values:
        definition["默认值"] = starting_values[definition["ID"]]
modules_path.write_text(json.dumps(definitions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
