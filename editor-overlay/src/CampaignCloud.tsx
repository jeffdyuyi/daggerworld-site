import { useEffect, useState } from "react";
import { useRuntimeStore } from "./store/runtimeStore";
import type { CharacterData } from "./domain/characterData";
import { loadAccount, readSession, saveCharacter, signOut } from "../campaign-session.js";

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
  const [status, setStatus] = useState("正在读取云端档案…");

  useEffect(() => {
    if (!readSession()) { location.replace("../account.html"); return; }
    let active = true;
    loadAccount().then(value => {
      if (!active) return;
      setAccount(value);
      setTarget(value.role === "gm" ? "" : value.characters[0]?.id ?? "");
      setStatus(value.role === "gm" ? "选择要查看的角色。" : "");
    }).catch(error => {
      if (active) setStatus(error.message);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!account || boot !== "ready") return;
    let active = true;
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
      setStatus("已载入云端档案。");
    }).catch(error => { if (active) setStatus(error.message); });
    return () => { active = false; };
  }, [account, boot, target]);

  async function save() {
    if (!account || !ready || !data) return;
    const rawName = data.character.values["character-name"];
    const name = typeof rawName === "string" ? rawName.trim() : "";
    const level = Number(data.character.values.level ?? 1);
    if (!name || !Number.isInteger(level) || level < 1 || level > 10) {
      setStatus("填写角色名，并确认等级在 1 至 10 之间。");
      return;
    }
    if (!record && level !== 1) { setStatus("首次登记的角色从 1 级开始。"); return; }
    if (data.systemPackage.id !== "daggerheart-core" || system?.manifest.ID !== "daggerheart-core") {
      setStatus("请切回匕首世界的规则包再保存。");
      return;
    }
    setBusy(true);
    try {
      const row: Row = await saveCharacter({ avatar_name: name, level, sheet: data, notes }, record);
      setRecord(row);
      setStatus("已保存到云端。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setBusy(false);
    }
  }

  return <aside className="campaign-cloud" aria-label="匕首世界角色管理">
    <div className="campaign-cloud__actions">
      <a href="../index.html">← 匕首世界官网</a>
      <strong>{account?.role === "gm" ? "主持人档案" : record ? "角色管理" : "录入角色卡"}</strong>
      {account?.role === "gm" && <select aria-label="选择角色" value={target} disabled={busy}
        onChange={event => setTarget(event.target.value)}>
        <option value="">选择角色</option>
        {account.characters.map(row => <option key={row.id} value={row.id}>{row.avatar_name}</option>)}
      </select>}
      <button type="button" disabled={!ready || busy || !data} onClick={() => void save()}>{busy ? "保存中…" : "保存到云端"}</button>
      <button type="button" disabled={busy} onClick={() => void signOut().finally(() => location.replace("../account.html"))}>退出</button>
      <span role="status">{status}</span>
    </div>
    <details><summary>个人团务笔记</summary>
      <textarea aria-label="个人团务笔记" disabled={!ready || busy} rows={4} maxLength={20000} value={notes}
        onChange={event => setNotes(event.target.value)} placeholder="写下冒险见闻或下次想追查的问题。" />
    </details>
  </aside>;
}

