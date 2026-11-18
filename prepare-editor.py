from pathlib import Path
import shutil
root=Path(__file__).resolve().parent
up=root/"pbdh-upstream" if (root/"pbdh-upstream").exists() else (root / ".pbdh-upstream")
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
shutil.copytree(root / "editor-overlay", up, dirs_exist_ok=True)
top_bar = up / "src/rendering/app/AppTopBar.tsx"
source = top_bar.read_text(encoding="utf-8")
interface = source[source.index("interface AppTopBarProps"):source.index("export function AppTopBar")]
top_bar.write_text(
    'import type { ChangeEvent, RefObject } from "react";\n'
    + "\n".join(line for line in source.splitlines() if line.startswith("import type {") and 'from "react"' not in line)
    + "\n\n" + interface
    + """export function AppTopBar(props: AppTopBarProps) {
  return (
    <header className="top-bar">
      <div className="brand-block">
        <span className="brand-mark" aria-hidden="true">匕</span>
        <div><p className="eyebrow">匕首世界</p><h1>化身档案</h1></div>
      </div>
      <nav className="dw-tools" aria-label="角色卡工具">
        <a href="../index.html#archive" target="_blank" rel="noopener">游戏图鉴</a>
        <button className="menu-trigger" type="button" onClick={props.onValidation}
          disabled={!props.characterDataAvailable || props.validationStatus === "running"}>
          {props.validationStatus === "running" ? "检查中" : "检查角色卡"}
        </button>
        <details>
          <summary>更多</summary>
          <button className="menu-trigger" type="button" disabled={!props.characterDataAvailable} onClick={() => props.onBeginOutput("print")}>打印 PDF</button>
          <button className="menu-trigger" type="button" disabled={!props.characterDataAvailable} onClick={() => props.onBeginOutput("json")}>导出角色备份</button>
        </details>
      </nav>
    </header>
  );
}
""",
    encoding="utf-8",
)
edit(up / "src/main.tsx", 'import { loadAccount } from "../campaign-session.js";',
     'import { loadAccount } from "../campaign-session.js";\nimport "./styles/campaign-navigation.css";')
edit(up / "src/store/workflows/packageActivation.ts",
     'const installedResourceExtensions = await environment.dependencies.storage\n      .listResourceExtensions(systemPackage.manifest.ID);\n    const extensionAssets = await environment.dependencies.storage\n      .loadResourceExtensionAssets(systemPackage.manifest.ID);',
     'const installedResourceExtensions: never[] = [];\n    const extensionAssets: RuntimePackageAsset[] = [];')
edit(up / "src/store/slices/packageSlice.ts",
     'if (sessionStorage.getItem(authorPreviewSessionKey) === "active") {\n          await restoreAuthorPreview(environment, set);\n          return;\n        }',
     'sessionStorage.removeItem(authorPreviewSessionKey);')
edit(up / "src/store/slices/packageSlice.ts",
     'if (!cachedPackage) {',
     'if (!cachedPackage || cachedPackage.manifest.ID !== "daggerheart-core") {')
edit(up / "src/App.tsx",
     '{packageIssues.length > 0 ? <PackageIssuePanel issues={packageIssues} /> : null}',
     '{packageIssues.some((issue) => issue.code !== "UNUSED_PACKAGE_IMAGE") ? (\n'
     '        <PackageIssuePanel issues={packageIssues.filter((issue) => issue.code !== "UNUSED_PACKAGE_IMAGE")} />\n'
     '      ) : null}')
