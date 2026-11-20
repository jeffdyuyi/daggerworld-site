import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Excalidraw, convertToExcalidrawElements, CaptureUpdateAction} from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import './style.css';
import {appearanceRequest, loadAdventureCards, readSession} from '../session.js';

const table = '/rest/v1/adventure_canvas';
const categories = {journal:'冒险笔记',npc:'NPC 记录',clue:'线索墙'};
const owner = readSession()?.owner;
const request = (path,options) => appearanceRequest(owner,path,options);

async function readCanvas() {
  const rows = await request(table+'?id=eq.1&select=scene,revision');
  if (!rows[0]) throw new Error('线索画布不可用。');
  return rows[0];
}

function sceneSignature(elements,files) {
  return elements.map(item => [item.id,item.version,item.versionNonce,item.isDeleted].join(':')).join('|') +
    '/' + Object.keys(files ?? {}).sort().join(',');
}

function CanvasPage() {
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

  async function refreshCards() {
    try { setCards(await loadAdventureCards()); }
    catch (error) { setStatus('记录读取失败：'+error.message); }
  }

  async function reload() {
    if (lock.current || (dirty && !window.confirm('载入云端版本会放弃本次未保存修改。继续？'))) return;
    lock.current = true;
    setBusy(true);
    try {
      const row = await readCanvas();
      setEditor(null);
      ready.current = false;
      baseline.current = null;
      current.current = null;
      setRecord(row);
      setEditorKey(key => key+1);
      setDirty(false);
      setStatus('已载入云端画布');
    } catch (error) { setStatus(error.message); }
    finally { lock.current = false; setBusy(false); }
  }

  useEffect(() => {
    void reload();
    void refreshCards();
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload',warn);
    return () => window.removeEventListener('beforeunload',warn);
  }, [dirty]);

  function onChange(elements,_state,files) {
    if (!ready.current) return;
    const signature = sceneSignature(elements,files);
    if (baseline.current === null) baseline.current = signature;
    current.current = signature;
    setDirty(signature !== baseline.current);
  }

  async function save() {
    if (!editor || !record || lock.current) return;
    lock.current = true;
    setBusy(true);
    const elements = editor.getSceneElementsIncludingDeleted();
    const imageIds = new Set(elements.filter(element => !element.isDeleted && element.type === 'image').map(element => element.fileId));
    const allFiles = editor.getFiles();
    const files = Object.fromEntries(Object.entries(allFiles).filter(([id]) => imageIds.has(id)));
    const savedSignature = sceneSignature(elements,allFiles);
    const body = JSON.stringify({scene:{elements,files}});
    try {
      if (new Blob([body]).size > 7900000) throw new Error('画布超过保存上限，请减少大型图片。');
      const rows = await request(table+'?id=eq.1&revision=eq.'+record.revision+'&select=revision',{
        method:'PATCH',headers:{Prefer:'return=representation'},body,
      });
      if (!rows.length) throw new Error('云端已有更新。可先从画布菜单导出此版本，再载入云端版本。');
      baseline.current = savedSignature;
      setRecord(old => ({...old,revision:rows[0].revision}));
      setDirty(current.current !== savedSignature);
      setStatus('已保存到云端');
    } catch (error) { setStatus('保存失败：'+error.message); }
    finally { lock.current = false; setBusy(false); }
  }

  function insertRecord() {
    const card = cards.find(item => item.id === cardId);
    if (!editor || !card) return;
    const state = editor.getAppState();
    const x = Math.round(-state.scrollX + 45 + (editor.getSceneElements().length % 6)*35);
    const y = Math.round(-state.scrollY + 55 + (editor.getSceneElements().length % 6)*35);
    const link = new URL('#record-'+card.id,window.location.href).href;
    const added = convertToExcalidrawElements([{
      type:'rectangle', x, y, width:250, height:100,
      backgroundColor:'#ffe8a3', fillStyle:'solid', strokeColor:'#694926',
      label:{text:categories[card.category]+'\n'+card.title.slice(0,42), fontSize:17},
      link, customData:{adventureRecordId:card.id},
    }]);
    editor.updateScene({elements:[...editor.getSceneElementsIncludingDeleted(),...added],captureUpdate:CaptureUpdateAction.IMMEDIATELY});
    editor.scrollToContent(added,{animate:true});
  }

  async function openRecord(id) {
    setReading({title:'读取记录…',body:''});
    try {
      const newest = await loadAdventureCards();
      setCards(newest);
      setReading(newest.find(card => card.id === id) ?? {title:'记录已移除',body:''});
    } catch (error) { setReading({title:'读取失败',body:error.message}); }
  }

  return <div className="canvas-layout">
    <header className="canvas-toolbar">
      <a href="../editor/#adventure">‹ 冒险记录</a>
      <strong>线索画布</strong>
      <button type="button" disabled={busy || !editor || !dirty} onClick={save}>保存画布</button>
      <button type="button" disabled={busy} onClick={reload}>载入云端</button>
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
    <div className="canvas-editor">
      {record && <Excalidraw key={editorKey}
        langCode="zh-CN"
        excalidrawAPI={api => {
          if (!ready.current) {
            ready.current = true;
            baseline.current = sceneSignature(record.scene.elements ?? [],record.scene.files ?? {});
            current.current = baseline.current;
          }
          setEditor(api);
        }}
        initialData={{...record.scene,scrollToContent:true}}
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

if (owner) createRoot(document.getElementById('canvas-root')).render(<CanvasPage/>);
else window.location.replace('../account.html');
