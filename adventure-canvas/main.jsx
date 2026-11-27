import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Excalidraw, convertToExcalidrawElements, CaptureUpdateAction} from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import './style.css';
import {detectHostServer, loadAdventureCards, readSession, readAdventureCanvas, writeAdventureCanvas} from '../session.js';

const categories = {journal:'冒险笔记',npc:'NPC 记录',clue:'线索墙'};
const categoryColors = {journal:'#ffe8a3',npc:'#bae6fd',clue:'#fecdd3'};
const owner = readSession()?.owner;
const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;

async function readCanvas(boardId) {
  const data = await readAdventureCanvas(boardId);
  if (!data) throw new Error('线索画布不可用。');
  return data;
}

function sceneSignature(elements,files) {
  return elements.map(item => [item.id,item.version,item.versionNonce,item.isDeleted].join(':')).join('|') +
    '/' + Object.keys(files ?? {}).sort().join(',');
}

function CanvasPage() {
  const [boardId,setBoardId] = useState('mmo_global_whiteboard');
  const [viewMode,setViewMode] = useState(false);
  const [record,setRecord] = useState(null);
  const [cards,setCards] = useState([]);
  const [cardId,setCardId] = useState('');
  const [reading,setReading] = useState(null);
  const [status,setStatus] = useState('加载中…');
  const [busy,setBusy] = useState(false);
  const [dirty,setDirty] = useState(false);
  const [editor,setEditor] = useState(null);
  const [editorKey,setEditorKey] = useState(0);

  const baseline = useRef(null);
  const current = useRef(null);
  const ready = useRef(false);
  const lock = useRef(false);
  const autoSaveTimer = useRef(null);
  const editorRef = useRef(null);
  const recordRef = useRef(null);
  const boardIdRef = useRef(boardId);

  editorRef.current = editor;
  recordRef.current = record;
  boardIdRef.current = boardId;

  async function refreshCards() {
    try { setCards(await loadAdventureCards()); }
    catch (error) { setStatus('记录读取失败：'+error.message); }
  }

  function mergeSceneElements(localEls, remoteEls) {
    const byId = new Map();
    for (const el of localEls || []) {
      if (el?.id) byId.set(el.id, el);
    }
    for (const el of remoteEls || []) {
      if (!el?.id) continue;
      const cur = byId.get(el.id);
      if (!cur || (el.version ?? 0) > (cur.version ?? 0) || (el.version === cur.version && el.isDeleted && !cur.isDeleted)) {
        byId.set(el.id, el);
      }
    }
    return Array.from(byId.values());
  }

  async function reload(targetBoardId = boardIdRef.current, force = false, skipSameRevision = false) {
    if (lock.current || (!force && dirty && !isEmbedded && !window.confirm('载入最新版本会放弃本次未保存修改。继续？'))) return;
    lock.current = true;
    setBusy(true);
    try {
      const row = await readCanvas(targetBoardId);
      const canMergeInPlace =
        editorRef.current &&
        ready.current &&
        targetBoardId === boardIdRef.current &&
        recordRef.current;
      if (canMergeInPlace) {
        if (
          skipSameRevision &&
          row.revision &&
          recordRef.current?.revision &&
          row.revision <= recordRef.current.revision
        ) {
          return;
        }
        const localEls = editorRef.current.getSceneElementsIncludingDeleted();
        const remoteEls = row.scene?.elements ?? [];
        const merged = mergeSceneElements(localEls, remoteEls);
        const remoteFiles = row.scene?.files ?? {};
        if (Object.keys(remoteFiles).length > 0 && typeof editorRef.current.addFiles === 'function') {
          editorRef.current.addFiles(Object.values(remoteFiles));
        }
        editorRef.current.updateScene({
          elements: merged,
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        const nextSig = sceneSignature(merged, { ...editorRef.current.getFiles(), ...remoteFiles });
        baseline.current = nextSig;
        current.current = nextSig;
        setRecord(row);
        setDirty(false);
        setStatus('已同步本地主机');
        return;
      }
      setEditor(null);
      ready.current = false;
      baseline.current = null;
      current.current = null;
      setRecord(row);
      setEditorKey(key => key+1);
      setDirty(false);
      setStatus('已同步本地主机');
    } catch (error) { setStatus(error.message); }
    finally { lock.current = false; setBusy(false); }
  }

  async function save(silent = false) {
    const ed = editorRef.current;
    const rec = recordRef.current;
    if (!ed || !rec || lock.current) return;
    lock.current = true;
    if (!silent) setBusy(true);
    const elements = ed.getSceneElementsIncludingDeleted();
    const imageIds = new Set(elements.filter(element => !element.isDeleted && element.type === 'image').map(element => element.fileId));
    const allFiles = ed.getFiles();
    const files = Object.fromEntries(Object.entries(allFiles).filter(([id]) => imageIds.has(id)));
    const savedSignature = sceneSignature(elements,allFiles);
    const body = JSON.stringify({scene:{elements,files}});
    try {
      if (new Blob([body]).size > 7900000) throw new Error('画布超过保存上限，请减少大型图片。');
      const res = await writeAdventureCanvas({elements,files}, rec.revision, boardIdRef.current);
      baseline.current = savedSignature;
      if (res?.revision) {
        setRecord(old => old ? {...old,revision:res.revision} : old);
      }
      setDirty(current.current !== savedSignature);
      setStatus('已自动落盘到本地主机');
      if (isEmbedded) {
        window.parent?.postMessage({type:'DAGGERWORLD_CANVAS_SAVED', boardId: boardIdRef.current, revision: res?.revision}, '*');
      }
    } catch (error) { setStatus('保存失败：'+error.message); }
    finally { lock.current = false; if (!silent) setBusy(false); }
  }

  function insertCardObject(card) {
    const ed = editorRef.current;
    if (!ed || !card) return;
    const state = ed.getAppState();
    const count = ed.getSceneElements().length;
    const x = Math.round(-state.scrollX + 60 + (count % 5)*45);
    const y = Math.round(-state.scrollY + 60 + (count % 4)*45);
    const link = new URL('#record-'+card.id,window.location.href).href;
    const catLabel = categories[card.category] || '线索';
    const preview = card.body ? '\n' + String(card.body).slice(0, 36).replace(/\n/g, ' ') : '';
    const added = convertToExcalidrawElements([{
      type:'rectangle', x, y, width:270, height:115,
      backgroundColor: categoryColors[card.category] || '#ffe8a3',
      fillStyle:'solid', strokeColor:'#694926',
      label:{text:`[${catLabel}] ${String(card.title || '').slice(0,28)}${preview}`, fontSize:15},
      link, customData:{adventureRecordId:card.id},
    }]);
    ed.updateScene({elements:[...ed.getSceneElementsIncludingDeleted(),...added],captureUpdate:CaptureUpdateAction.IMMEDIATELY});
    ed.scrollToContent(added,{animate:true});
    window.setTimeout(() => void save(true), 150);
  }

  useEffect(() => {
    void reload('mmo_global_whiteboard', true);
    if (!isEmbedded) void refreshCards();

    const onMsg = event => {
      const data = event?.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'DAGGERWORLD_CANVAS_RELOAD') {
        void reload(data.boardId || boardIdRef.current, true, true);
      } else if (data.type === 'DAGGERWORLD_CANVAS_SWITCH_BOARD' && data.boardId) {
        setBoardId(data.boardId);
        void reload(data.boardId, true);
      } else if (data.type === 'DAGGERWORLD_INSERT_CARD' && data.card) {
        insertCardObject(data.card);
      } else if (data.type === 'DAGGERWORLD_SET_VIEW_MODE') {
        setViewMode(Boolean(data.viewMode));
      }
    };
    window.addEventListener('message', onMsg);
    return () => {
      window.removeEventListener('message', onMsg);
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!dirty || isEmbedded) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload',warn);
    return () => window.removeEventListener('beforeunload',warn);
  }, [dirty]);

  function onChange(elements,_state,files) {
    if (!ready.current) return;
    const signature = sceneSignature(elements,files);
    if (baseline.current === null) baseline.current = signature;
    current.current = signature;
    const changed = signature !== baseline.current;
    setDirty(changed);
    if (changed && isEmbedded) {
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = window.setTimeout(() => {
        void save(true);
      }, 900);
    }
  }

  function insertRecord() {
    const card = cards.find(item => item.id === cardId);
    if (card) insertCardObject(card);
  }

  async function openRecord(id) {
    if (isEmbedded) {
      window.parent?.postMessage({type:'DAGGERWORLD_OPEN_CARD', cardId: id}, '*');
      return;
    }
    setReading({title:'读取记录…',body:''});
    try {
      const newest = await loadAdventureCards();
      setCards(newest);
      setReading(newest.find(card => card.id === id) ?? {title:'记录已移除',body:''});
    } catch (error) { setReading({title:'读取失败',body:error.message}); }
  }

  return <div className={isEmbedded ? 'canvas-layout embedded' : 'canvas-layout'}>
    {!isEmbedded && (
      <>
        <header className="canvas-toolbar">
          <a href="../editor/#adventure">‹ 冒险记录</a>
          <strong>线索画布</strong>
          <button type="button" disabled={busy || !editor || !dirty} onClick={() => void save(false)}>保存画布</button>
          <button type="button" disabled={busy} onClick={() => void reload(boardId, false)}>载入最新</button>
          <span role="status">{busy ? '同步中…' : dirty ? '有未保存修改 · '+status : status}</span>
        </header>
        <div className="canvas-tools">
          <label>冒险记录 <select value={cardId} onChange={event => setCardId(event.target.value)}>
            <option value="">选择记录</option>
            {cards.map(card => <option key={card.id} value={card.id}>{categories[card.category]} · {card.title}</option>)}
          </select></label>
          <button type="button" disabled={!cardId || !editor} onClick={insertRecord}>放到画布</button>
          <button type="button" disabled={!cardId} onClick={() => openRecord(cardId)}>查看正文</button>
          <button type="button" onClick={refreshCards}>刷新记录</button>
        </div>
      </>
    )}
    <div className="canvas-editor">
      {record && <Excalidraw key={editorKey}
        langCode="zh-CN"
        viewModeEnabled={viewMode}
        excalidrawAPI={api => {
          if (!ready.current) {
            ready.current = true;
            baseline.current = sceneSignature(record.scene?.elements ?? [],record.scene?.files ?? {});
            current.current = baseline.current;
            if (isEmbedded) {
              window.parent?.postMessage({type:'DAGGERWORLD_CANVAS_READY', boardId: boardIdRef.current}, '*');
            }
          }
          setEditor(api);
        }}
        initialData={{...(record.scene || {}),scrollToContent:true}}
        onChange={onChange}
        onLinkOpen={(element,event) => {
          const id = element.customData?.adventureRecordId;
          if (id) { event.preventDefault(); void openRecord(id); }
        }}
      />}
    </div>
    {reading && <div className="record-popover" role="dialog" aria-label="记录正文">
      <button type="button" onClick={() => setReading(null)}>关闭</button>
      <h2>{reading.title}</h2><p>{reading.body}</p>
    </div>}
  </div>;
}

(async () => {
  const hasHost = await detectHostServer();
  if (owner || isEmbedded || hasHost) {
    createRoot(document.getElementById('canvas-root')).render(<CanvasPage/>);
  } else {
    window.location.replace('../account.html');
  }
})();
