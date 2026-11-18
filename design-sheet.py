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


SLOT_ICONS = {
    "armor": '<svg class="dw-slot-icon" viewBox="0 0 512 512"><path d="M256 16c25 24 100 72 150 72v96c0 96-75 240-150 312c-75-72-150-216-150-312V88c50 0 125-48 150-72"/></svg>',
    "primary-weapon": '<svg class="dw-slot-icon" viewBox="0 0 512 512"><path d="M19.75 14.438c59.538 112.29 142.51 202.35 232.28 292.718l3.626 3.75l.063-.062c21.827 21.93 44.04 43.923 66.405 66.25c-18.856 14.813-38.318 29.41-58.437 43.813L243.5 401l-14.156-14.156c-17.76-17.762-35.496-35.495-53.25-53.25c-35.534-35.53-71.066-71.067-106.6-106.6l-3.75-3.75l-4.28 3.5c-14.814 12.115-29.41 24.593-43.813 37.344l-4.656 4.125l5.594 2.813c97.77 48.884 179.88 123.63 260.655 204.406l3.625 3.625l.063-.062c21.827 21.93 44.04 43.923 66.406 66.25c-18.856 14.813-38.318 29.41-58.438 43.813l-4.656 3.344l5.312 2.125c14.887 5.955 29.807 11.59 44.75 16.906l5.22 1.844l1.843-5.218c5.316-14.943 10.95-29.863 16.906-44.75l2.125-5.313l3.344-4.656c14.403-20.12 29-39.582 43.813-58.438l.062-.062c22.327 22.366 44.32 44.578 66.25 66.406l3.75 3.625l3.625-3.625c80.776-80.775 155.522-162.885 204.406-260.656l2.813-5.594l-4.125-4.656c-12.75-14.403-25.23-29-37.344-43.813l-3.5-4.28l-3.75 3.75c-35.533 35.533-71.07 71.066-106.6 106.6c-17.754 17.754-35.488 35.49-53.25 53.25L401 243.5l-20.094 20.188c-14.403 20.12-29 39.58-43.813 58.437c-22.327-22.366-44.32-44.578-66.25-66.406l-.062-.062l-3.75-3.625l-3.625 3.625c-90.368 89.77-180.428 172.742-292.72 232.28z"/></svg>',
    "secondary-weapon": '<svg class="dw-slot-icon" viewBox="0 0 512 512"><path d="m405.47 18.094l-31.407 31.406l78.844 78.844l31.406-31.406zM357.72 65.844L307.343 116.22l40.313 40.312l50.375-50.375zm-66.72 66.718L240.626 182.94l30.906 30.905l50.375-50.375zm-66.718 66.72l-50.375 50.374l30.906 30.906l50.375-50.375zm-66.72 66.718l-50.374 50.375l30.906 30.906l50.375-50.375zm-66.718 66.72L40.47 383.094l30.905 30.906l50.375-50.375zM24.03 400.125l-14.47 78.22l78.22-14.47l-15.064-15.062l-48.687-48.687z"/></svg>',
    "backup-weapon-1": '<svg class="dw-slot-icon" viewBox="0 0 512 512"><path d="M19.75 14.438c59.538 112.29 142.51 202.35 232.28 292.718l3.626 3.75l.063-.062c21.827 21.93 44.04 43.923 66.405 66.25c-18.856 14.813-38.318 29.41-58.437 43.813L243.5 401l-14.156-14.156c-17.76-17.762-35.496-35.495-53.25-53.25c-35.534-35.53-71.066-71.067-106.6-106.6l-3.75-3.75l-4.28 3.5c-14.814 12.115-29.41 24.593-43.813 37.344l-4.656 4.125l5.594 2.813c97.77 48.884 179.88 123.63 260.655 204.406l3.625 3.625l.063-.062c21.827 21.93 44.04 43.923 66.406 66.25c-18.856 14.813-38.318 29.41-58.438 43.813l-4.656 3.344l5.312 2.125c14.887 5.955 29.807 11.59 44.75 16.906l5.22 1.844l1.843-5.218c5.316-14.943 10.95-29.863 16.906-44.75l2.125-5.313l3.344-4.656c14.403-20.12 29-39.582 43.813-58.438l.062-.062c22.327 22.366 44.32 44.578 66.25 66.406l3.75 3.625l3.625-3.625c80.776-80.775 155.522-162.885 204.406-260.656l2.813-5.594l-4.125-4.656c-12.75-14.403-25.23-29-37.344-43.813l-3.5-4.28l-3.75 3.75c-35.533 35.533-71.07 71.066-106.6 106.6c-17.754 17.754-35.488 35.49-53.25 53.25L401 243.5l-20.094 20.188c-14.403 20.12-29 39.58-43.813 58.437c-22.327-22.366-44.32-44.578-66.25-66.406l-.062-.062l-3.75-3.625l-3.625 3.625c-90.368 89.77-180.428 172.742-292.72 232.28z"/></svg>',
    "backup-weapon-2": '<svg class="dw-slot-icon" viewBox="0 0 512 512"><path d="m405.47 18.094l-31.407 31.406l78.844 78.844l31.406-31.406zM357.72 65.844L307.343 116.22l40.313 40.312l50.375-50.375zm-66.72 66.718L240.626 182.94l30.906 30.905l50.375-50.375zm-66.718 66.72l-50.375 50.374l30.906 30.906l50.375-50.375zm-66.72 66.718l-50.374 50.375l30.906 30.906l50.375-50.375zm-66.718 66.72L40.47 383.094l30.905 30.906l50.375-50.375zM24.03 400.125l-14.47 78.22l78.22-14.47l-15.064-15.062l-48.687-48.687z"/></svg>'
}


def equipment_slot(title, key, position):
    icon = SLOT_ICONS.get(key, "")
    return (
        f'<article class="dw-slot dw-slot-{position}"><h3>{icon}{title}</h3>'
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
