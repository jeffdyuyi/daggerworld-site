from pathlib import Path
import shutil
root=Path(__file__).resolve().parent
up=root/"pbdh-upstream"
def edit(path,old,new):
    s=path.read_text(encoding="utf-8")
    if new in s:return
    if old not in s:raise ValueError(f"找不到编辑点: {path}")
    path.write_text(s.replace(old,new,1),encoding="utf-8")
edit(root/"index.html",'href="https://app.notion.com/p/41ca6baa33a78175aa22e878048ae75e" target="_blank" rel="noopener noreferrer">玩家预约登录','href="./account.html">注册／登录')
edit(root/"index.html",'</script></body>','</script><script type="module" src="./portal-account.js"></script></body>')
edit(up/"vite.config.ts",'base: "/pbdh/",','base: "/daggerworld-site/editor/",')
edit(up/"vite.config.ts",'".pbdh-files.json"','"pbdh-files.json"')
unused = up / ".unused-preset-packages"
unused.mkdir(exist_ok=True)
for preset in (up / "public/system-packages").iterdir():
    if preset.is_dir() and preset.name != "daggerheart-core":
        shutil.move(str(preset), unused / preset.name)
edit(up/"src"/"App.tsx",'import { useRuntimeStore } from "./store/runtimeStore";','import { useRuntimeStore } from "./store/runtimeStore";\nimport CampaignCloud from "./CampaignCloud";')
edit(up/"src"/"App.tsx",'      {bootStatus === "loading" ? (','      <CampaignCloud />\n      {bootStatus === "loading" ? (')
edit(up/"src"/"storage"/"storageService.ts",'const db = new PbDHDatabase();','const sessionOwner = (() => {\n  try { return JSON.parse(localStorage.getItem("daggerworld.session.v1") ?? "null")?.owner; } catch { return null; }\n})();\nconst db = new PbDHDatabase(typeof sessionOwner === "string" ? "daggerworld-sheet-" + sessionOwner : "daggerworld-sheet-local");')
edit(up/"src"/"main.tsx",'import "./styles/print.css";','import "./styles/print.css";\nimport "./styles/campaign-cloud.css";\nimport { loadAccount } from "../campaign-session.js";')
edit(up/"src"/"main.tsx",'createRoot(document.getElementById("root")!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n);','const root = createRoot(document.getElementById("root")!);\nroot.render(<aside className="campaign-cloud">正在读取冒险者档案…</aside>);\nvoid loadAccount().then(() => root.render(<StrictMode><App /></StrictMode>)).catch(() => {\n  root.render(<aside className="campaign-cloud">无法载入云端档案。 <a href="../account.html">返回冒险者中心</a></aside>);\n});')
shutil.copyfile(root/"session.js",up/"campaign-session.js")
