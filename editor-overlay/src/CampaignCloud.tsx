import { useEffect, useState } from "react";
import { useRuntimeStore } from "./store/runtimeStore";
import type { CharacterData } from "./domain/characterData";
import { loadAccount, readSession, saveCharacter, deleteCharacter, signOut } from "../campaign-session.js";

type Row = { id: string; owner_id: string; avatar_name: string; level: number; sheet: CharacterData; notes: string; updated_at: string };
type Account = { owner: string; login: string; role: string; characters: Row[] };

export default function CampaignCloud() {
  const data = useRuntimeStore(state => state.characterData);
  const system = useRuntimeStore(state => state.currentPackage);
  const boot = useRuntimeStore(state => state.bootStatus);
  const [account, setAccount] = useState<Account>();
  const [record, setRecord] = useState<Row>();
  const [notes, setNotes] = useState("");
  const [target, setTarget] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("正在读取角色库档案…");
  const [vaultOpen, setVaultOpen] = useState(false);

  useEffect(() => {
    if (!readSession()) { location.replace("../account.html"); return; }
    let active = true;
    loadAccount().then(value => {
      if (!active) return;
      setAccount(value);
      const defaultId = value.role === "gm" ? "" : (value.characters[0]?.id ?? "new");
      setTarget(defaultId);
      setStatus(value.role === "gm" ? "【主持人权限】请选择要视察的化身。" : value.characters.length ? `角色库已就绪（共 ${value.characters.length} 位化身）。` : "角色库为空，已开辟新化身草稿。");
    }).catch(error => {
      if (active) setStatus(error.message);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!account || boot !== "ready") return;
    let active = true;

    if (target === "new" || (!target && account.role === "player")) {
      setRecord(undefined);
      setNotes("");
      setReady(true);
      void useRuntimeStore.getState().createCharacterSave("新化身");
      setStatus("【新建化身草稿】编辑下方各页面后，点击「保存到角色库」完成登记。");
      return;
    }

    const row = account.characters.find(item => item.id === target);
    setReady(false);
    setRecord(row);
    setNotes(row?.notes ?? "");
    if (!row) {
      setReady(account.role === "player");
      return;
    }

    const file = new File([JSON.stringify(row.sheet)], "cloud-character.json", { type: "application/json" });
    useRuntimeStore.getState().importCharacterDataFromFile(file).then(() => {
      if (!active) return;
      const current = useRuntimeStore.getState();
      if (current.importError || current.pendingCharacterConversion || current.pendingCharacterFormatSelection) {
        setStatus(current.importError ?? "此云端档案需要手动导入转换。");
        return;
      }
      setReady(true);
      setStatus(`已载入化身档案：${row.avatar_name} (Lv.${row.level})`);
    }).catch(error => { if (active) setStatus(error.message); });
    return () => { active = false; };
  }, [account, boot, target]);

  async function handleSwitch(newTarget: string) {
    if (newTarget === target) return;
    setTarget(newTarget);
  }

  async function save() {
    if (!account || !ready || !data) return;
    const rawName = data.character.values["character-name"];
    const name = typeof rawName === "string" ? rawName.trim() : "";
    const level = Number(data.character.values.level ?? 1);
    if (!name || !Number.isInteger(level) || level < 1 || level > 10) {
      setStatus("请在下方【概览】页填写角色姓名，并确认等级在 1 至 10 之间。");
      return;
    }
    if (!record && level !== 1) { setStatus("首次登记入库的新化身须从 1 级开始。"); return; }
    if (data.systemPackage.id !== "daggerheart-core" || system?.manifest.ID !== "daggerheart-core") {
      setStatus("请切回匕首世界的规则包再保存。");
      return;
    }
    setBusy(true);
    try {
      const row: Row = await saveCharacter({ avatar_name: name, level, sheet: data, notes }, record);
      const freshAccount = await loadAccount();
      setAccount(freshAccount);
      setRecord(row);
      setTarget(row.id);
      setStatus(`化身【${name}】已成功同步至角色库！`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存到角色库失败。");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(char: Row) {
    if (!window.confirm(`确定要从角色库中永久注销化身【${char.avatar_name}】吗？此操作不可逆。`)) return;
    setBusy(true);
    try {
      await deleteCharacter(char.id);
      const freshAccount = await loadAccount();
      setAccount(freshAccount);
      if (target === char.id) {
        setTarget(freshAccount.characters[0]?.id ?? "new");
      }
      setStatus(`化身【${char.avatar_name}】已从角色库注销。`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "删除失败。");
    } finally {
      setBusy(false);
    }
  }

  const activeAvatarName = record ? `${record.avatar_name} (Lv.${record.level})` : "新化身草稿 (Lv.1)";

  return (
    <>
      <aside className="campaign-cloud" aria-label="匕首世界角色管理">
        <div className="campaign-cloud__inner">
          <div className="campaign-cloud__nav">
            <span className="dw-lib-badge">🗡️ 匕首世界角色库</span>
            <span className="dw-user-tag">{account?.role === "gm" ? "👑 主持人" : "冒险者"}：<strong>{account?.login ?? "..."}</strong></span>
            <button
              type="button"
              className="dw-vault-btn"
              onClick={() => setVaultOpen(true)}
              title="打开角色库档案室查看名下所有化身"
            >
              📂 角色库档案室 ({account?.characters.length ?? 0})
            </button>
          </div>

          <div className="campaign-cloud__switcher">
            <label className="dw-switch-label">
              <span>当前化身：</span>
              <select
                aria-label="选择化身"
                value={target}
                disabled={busy}
                onChange={e => void handleSwitch(e.target.value)}
              >
                <option value="new">＋ 新建化身草稿...</option>
                {account?.characters.map(row => (
                  <option key={row.id} value={row.id}>
                    {row.avatar_name} (Lv.{row.level})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="dw-new-avatar-btn"
              disabled={busy}
              onClick={() => void handleSwitch("new")}
              title="新建一个全新化身"
            >
              ＋ 新建化身
            </button>
            <button
              type="button"
              className="dw-save-btn"
              disabled={!ready || busy || !data}
              onClick={() => void save()}
            >
              {busy ? "保存中…" : "💾 保存到角色库"}
            </button>
            <button
              type="button"
              className="dw-logout-btn"
              disabled={busy}
              onClick={() => void signOut().finally(() => location.replace("../account.html"))}
            >
              退出
            </button>
          </div>

          <div className="campaign-cloud__status">
            <span role="status" className="dw-cloud-status-text">{status}</span>
          </div>
        </div>

        <details className="campaign-cloud__notes">
          <summary>个人团务笔记（{activeAvatarName} · 私密备忘）</summary>
          <textarea
            aria-label="个人团务笔记"
            disabled={!ready || busy}
            rows={3}
            maxLength={20000}
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder="在此记录此化身的秘密、誓约、主持人暗投线索或战役动机…"
          />
        </details>
      </aside>

      {/* 角色库档案室浮层面板 (Character Vault Modal) */}
      {vaultOpen && (
        <div className="dw-vault-modal-backdrop" onClick={() => setVaultOpen(false)}>
          <div className="dw-vault-modal" onClick={e => e.stopPropagation()}>
            <header className="dw-vault-header">
              <div className="dw-vault-title">
                <h2>匕首世界 · 冒险者角色库</h2>
                <p>管理账号 <strong>{account?.login}</strong> 名下的全部化身档案（共 {account?.characters.length ?? 0} 个化身）</p>
              </div>
              <button
                type="button"
                className="dw-vault-close"
                onClick={() => setVaultOpen(false)}
                aria-label="关闭档案室"
              >
                ✕
              </button>
            </header>

            <div className="dw-vault-content">
              <div className="dw-vault-grid">
                {/* 新建化身卡片 */}
                <div
                  className="dw-vault-card dw-vault-card--new"
                  onClick={() => { void handleSwitch("new"); setVaultOpen(false); }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="dw-vault-new-icon">＋</div>
                  <h3>开辟新化身</h3>
                  <p>创建全新的 1 级冒险者草稿并登记入库</p>
                </div>

                {/* 已有化身卡片列表 */}
                {account?.characters.map(c => {
                  const isActive = target === c.id;
                  const cClass = (c.sheet?.character?.values?.["class-name"] as string) || "未选职业";
                  const cAncestry = (c.sheet?.character?.values?.["ancestry-name"] as string) || "未选种族";
                  const updatedText = c.updated_at ? new Date(c.updated_at).toLocaleDateString("zh-CN") : "刚刚";

                  return (
                    <article
                      key={c.id}
                      className={`dw-vault-card ${isActive ? "is-active" : ""}`}
                    >
                      {isActive && <span className="dw-card-badge">正在编辑</span>}
                      <div className="dw-card-header">
                        <span className="dw-card-level">Lv.{c.level}</span>
                        <h3 className="dw-card-name">{c.avatar_name}</h3>
                      </div>
                      <div className="dw-card-tags">
                        <span className="dw-tag">{cAncestry}</span>
                        <span className="dw-tag">{cClass}</span>
                      </div>
                      <div className="dw-card-meta">
                        <small>最近存档：{updatedText}</small>
                      </div>
                      <div className="dw-card-actions">
                        <button
                          type="button"
                          className="dw-card-load-btn"
                          disabled={isActive || busy}
                          onClick={() => { void handleSwitch(c.id); setVaultOpen(false); }}
                        >
                          {isActive ? "当前化身" : "载入角色卡"}
                        </button>
                        <button
                          type="button"
                          className="dw-card-del-btn"
                          disabled={busy}
                          onClick={() => void handleDelete(c)}
                          title="注销化身"
                        >
                          注销
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
