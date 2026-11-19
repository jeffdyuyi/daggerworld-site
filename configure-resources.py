import json
from pathlib import Path

root = Path(__file__).resolve().parent
upstream = root / "pbdh-upstream" if (root / "pbdh-upstream").exists() else (root / ".pbdh-upstream")
package = upstream / "public/system-packages/daggerheart-core"
assets = package / "resources"
tables = ("classes", "subclasses", "ancestries", "communities", "domain-cards", "weapons", "armor", "loot")
def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))
def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")

source = root / "campaign-resources.json"
if not source.exists():
    external = Path(r"E:/匕首心/框架与模组/重返__匕首世界/图片和附件")
    original = read(next(external.glob("*rrr*.json")))
    allowed = {"守护者","游荡者","战士","法师","德鲁伊","游侠","吟游诗人","神使","术士","邪术师","格斗家","噬罪者","审判官","奇术师"}
    write(source, {**{key:original[key] for key in ("profession","community","domain")},
                   "subclass":[x for x in original["subclass"] if x["主职"] in allowed]})

original = read(source)
profession = []
for row in original["profession"]:
    name = row["名称"]
    profession.append({"ID":"职业:"+name,"名称":name,"描述":row["简介"] if row["简介"]!="N/A" else "",
        "职业物品":"","领域":row["领域1"]+"+"+row["领域2"],"闪避值":row["起始闪避"],
        "生命点":row["起始生命"],"希望特性":row["希望特性"],"职业特性":row["职业特性"]})
subclasses = []
for row in original["subclass"]:
    level = {"基石":"基础","专精":"进阶","大师":"精通"}[row["等级"]]
    name, parent = row["子职业"], row["主职"]
    subclasses.append({"ID":f"子职:{parent}:{name}:{level}","主职":parent,"名称":name,"等级":level,
        "施法属性":row["施法"],"描述":row["描述"]})
domains = [{"ID":f"领域卡:{x['领域']}:{x['名称']}","名称":x["名称"],"类型":"领域卡","领域":x["领域"],
    "等级":f"{x['等级']}级","属性":x["属性"],"回想":f"{x['回想']}⚡","描述":x["描述"]} for x in original["domain"]]
communities = [{"ID":"社群:"+x["名称"],"名称":x["名称"],"类型":"社群","简介":x["简介"],
    "描述":x["特性"]+x["描述"]} for x in original["community"]]

def merge(name, additions, keep=lambda row: True):
    output={x["ID"]:x for x in read(assets/f"{name}.json") if keep(x)}
    for item in additions:
        output[item["ID"]]=item
    write(assets/f"{name}.json", list(output.values()))

srdf = root/"srd-additions.json"
srd = read(srdf) if srdf.exists() else {"classes":[],"subclasses":[],"domains":[]}
merge("classes", profession+srd["classes"], lambda x:x["名称"] not in {"刺客","女巫","灵巫"})
live_classes={x["名称"] for x in read(assets/"classes.json")}
merge("subclasses", [x for x in subclasses+srd["subclasses"] if x["主职"] in live_classes], lambda x:x["主职"] in live_classes)
merge("ancestries", [], lambda x:x["名称"]!="械灵")
write(assets/"communities.json", communities)
merge("domain-cards", domains+srd["domains"])
skin = package/"skins/daggerworld"
skin.mkdir(exist_ok=True)
kimi_css_path = package/"skins/skin-KimiK3/skin.css"
if kimi_css_path.exists():
    skin_css = kimi_css_path.read_text(encoding="utf-8")
else:
    skin_css = (skin/"skin.css").read_text(encoding="utf-8") if (skin/"skin.css").exists() else ""
if "--skin-cinnabar" not in skin_css:
    skin_css += """
:scope {
  --skin-cinnabar: #853b2b;
  --skin-cinnabar-deep: #5d2e27;
  --skin-pine: #713e32;
  --skin-pine-deep: #512c25;
  --framework-accent: #743c2f;
  --framework-accent-active: #925240;
  --framework-canvas: #e8dcc4;
  --framework-surface: #fff6e4;
}
"""
(skin/"skin.css").write_text(skin_css,encoding="utf-8")
manifest = read(package/"manifest.json")
base = next((x for x in manifest.get("skins", []) if x["ID"]=="skin-KimiK3"), None)
if not base:
    base = next((x for x in manifest.get("skins", []) if x["ID"]=="daggerworld"), {
        "ID": "daggerworld", "名称": "匕首世界", "css": "skins/daggerworld/skin.css", "推荐框架配色": "dark"
    })
manifest["skins"]=[x for x in manifest.get("skins", []) if x["ID"]!="daggerworld"]
manifest["skins"].append({**base,"ID":"daggerworld","名称":"匕首世界","css":"skins/daggerworld/skin.css"})
manifest["defaultSkin"]="daggerworld"
manifest["名称"]="匕首世界 · 内测角色卡"
manifest["版本"]="1.2.0"
write(package/"manifest.json",manifest)
print("可选主职", len(live_classes), "秘密卡", len(domains), "框架社群", len(communities))

