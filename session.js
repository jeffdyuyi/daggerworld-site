// 统一数据接入层适配器：支持自建主机 (Host Server API) 优先、离线单机 (LocalStorage) 容灾降级、以及远端 Supabase 备用通道。

const SUPABASE_BASE = 'https://quuxyynioqsgxtzszqkv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AIkAuVVn3kspau2qtPTB-w_SaX9qnwz';
const STORAGE_KEY = 'daggerworld.session.v1';
const OFFLINE_CHARS_KEY = 'daggerworld.offline_characters.v1';

let cachedHostState = null; // null | true | false
let detectedHostOrigin = '';
let refreshPending;

/**
 * 探测自建主机 (Host Server) 是否在线就绪
 */
export async function detectHostServer(forceCheck = false) {
  if (cachedHostState !== null && !forceCheck) return cachedHostState;
  
  // 1. 先探测当前同源 /api/health
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.ok === true) {
        cachedHostState = true;
        detectedHostOrigin = '';
        return true;
      }
    }
  } catch {
    // ignore
  }

  // 2. 若同源未响应，且在本地或 file 协议环境下，回退探测自建权威主机默认端口 (2567)
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:')
  ) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('http://localhost:2567/api/health', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.ok === true) {
          cachedHostState = true;
          detectedHostOrigin = 'http://localhost:2567';
          return true;
        }
      }
    } catch {
      // ignore
    }
  }

  cachedHostState = false;
  detectedHostOrigin = '';
  return false;
}

export function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

// -------------------------------------------------------------
// 1. Supabase 备用网络请求驱动
// -------------------------------------------------------------
async function supabaseJsonRequest(path, options, token) {
  const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = 'Bearer ' + token;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(SUPABASE_BASE + path, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      const error = new Error(body?.error_description || body?.message || body?.error || '请求失败，请稍后重试。');
      error.status = response.status;
      throw error;
    }
    return body;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const error = new Error('云端网络连接超时 (海外节点无响应)');
      error.status = 408;
      throw error;
    }
    throw err;
  }
}

function subjectFromJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
  } catch {
    return `user_${Date.now().toString(36)}`;
  }
}

// -------------------------------------------------------------
// 2. 自建主机 (Host Server) REST API 驱动
// -------------------------------------------------------------
async function hostJsonRequest(path, options = {}, token) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const fullUrl = detectedHostOrigin ? `${detectedHostOrigin}${path}` : path;
  const res = await fetch(fullUrl, { ...options, headers });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(body?.message || body?.error || `主机请求错误 (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return body;
}

// -------------------------------------------------------------
// 3. 离线单机 (Local-First Offline) 纯本地存储驱动
// -------------------------------------------------------------
function getLocalOfflineCharacters() {
  try {
    const raw = localStorage.getItem(OFFLINE_CHARS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: 'local_sample_ranger_01',
      avatar_name: '阿尔瓦 (先遣游侠)',
      level: 1,
      sheet: {
        name: '阿尔瓦',
        race: '人类',
        class: '游侠',
        subclass: '先遣者',
        attributes: { agility: 2, strength: 1, finesse: 1, instinct: 1, presence: 0, knowledge: 0 },
        currentHp: 6,
        maxHp: 6,
        currentHope: 2,
        currentStress: 0
      },
      updated_at: new Date().toISOString()
    }
  ];
}

function saveLocalOfflineCharacters(chars) {
  try {
    localStorage.setItem(OFFLINE_CHARS_KEY, JSON.stringify(chars));
  } catch {}
}

// -------------------------------------------------------------
// 4. 统一对外接口定义
// -------------------------------------------------------------
export async function login(loginName, code) {
  const login = String(loginName ?? '').trim();
  const invitation = String(code ?? '').trim();
  const isHost = await detectHostServer();

  // A. 自建主机模式
  if (isHost) {
    const res = await hostJsonRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ login, code: invitation })
    });
    return storeSession({
      mode: 'host',
      access_token: res.token || 'host-session-token',
      login: res.login || login,
      role: res.role || 'player',
      owner: res.owner || `owner_${login}`,
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 7
    });
  }

  // B. 尝试远端 Supabase 登录
  try {
    const result = await supabaseJsonRequest('/functions/v1/daggerworld-login', {
      method: 'POST',
      body: JSON.stringify({ login, code: invitation }),
    });
    return storeSession({
      mode: 'supabase',
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_at: result.expires_at,
      login: result.login || login,
      owner: subjectFromJwt(result.access_token),
    });
  } catch (err) {
    // C. 离线/单机降级容灾：若云端不可达或网络中断，以本地离线模式登入
    console.warn('云端登录不可达，降级为离线单机模式：', err.message);
    const role = invitation.toLowerCase().includes('gm') || login.toLowerCase().includes('gm') || login.toLowerCase().includes('kidd') ? 'gm' : 'player';
    return storeSession({
      mode: 'offline',
      access_token: 'offline-local-token',
      login,
      role,
      owner: `offline_${login || 'guest'}`,
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 30
    });
  }
}

export async function activeSession() {
  const session = readSession();
  if (!session) throw new Error('请先登录。');
  if (session.mode === 'host' || session.mode === 'offline') {
    return session;
  }
  // Supabase Token 续签
  if (session.expires_at > Date.now() / 1000 + 45) return session;
  if (!refreshPending) {
    refreshPending = supabaseJsonRequest('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }),
    }).then(result => {
      const current = readSession();
      if (!current || current.owner !== session.owner) throw new Error('登录账号已变更。');
      return storeSession({
        mode: 'supabase',
        access_token: result.access_token, refresh_token: result.refresh_token,
        expires_at: result.expires_at, login: session.login, owner: session.owner,
      });
    }).catch(error => {
      if ([400, 401, 403].includes(error.status) && readSession()?.refresh_token === session.refresh_token) {
        localStorage.removeItem(STORAGE_KEY);
      }
      throw error;
    }).finally(() => { refreshPending = undefined; });
  }
  return refreshPending;
}

export async function signOut() {
  const session = readSession();
  localStorage.removeItem(STORAGE_KEY);
  try {
    localStorage.removeItem('daggerworld.activation_code');
    localStorage.removeItem('daggerworld.role.current');
  } catch {}
  if (session?.mode === 'supabase') {
    try { await supabaseJsonRequest('/auth/v1/logout?scope=local', { method: 'POST' }, session.access_token); }
    catch {}
  }
}

export async function loadAccount() {
  const session = await activeSession();
  const isHost = session.mode === 'host' || await detectHostServer();

  // A. 自建主机
  if (isHost && session.mode !== 'offline') {
    const data = await hostJsonRequest('/api/account', {}, session.access_token);
    return {
      owner: data.owner || session.owner,
      login: data.login || session.login,
      role: data.role || session.role || 'player',
      characters: data.characters || []
    };
  }

  // B. 离线模式
  if (session.mode === 'offline') {
    return {
      owner: session.owner,
      login: session.login,
      role: session.role || 'player',
      characters: getLocalOfflineCharacters()
    };
  }

  // C. Supabase 备用
  try {
    const [members, characters] = await Promise.all([
      supabaseJsonRequest('/rest/v1/campaign_members?select=role', {}, session.access_token),
      supabaseJsonRequest('/rest/v1/characters?select=id,owner_id,avatar_name,level,sheet,updated_at&order=avatar_name', {}, session.access_token),
    ]);
    if (!members.length) throw new Error('此账号尚无内测档案权限。');
    return { owner: session.owner, login: session.login, role: members[0].role, characters };
  } catch (err) {
    console.warn('读取云端档案失败，降级展示本地离线档案：', err.message);
    return {
      owner: session.owner,
      login: session.login,
      role: session.role || 'player',
      characters: getLocalOfflineCharacters()
    };
  }
}

export async function saveCharacter(character, record) {
  const session = await activeSession();
  const isHost = session.mode === 'host' || await detectHostServer();

  // A. 自建主机
  if (isHost && session.mode !== 'offline') {
    return hostJsonRequest('/api/characters', {
      method: 'POST',
      body: JSON.stringify({ character, record })
    }, session.access_token);
  }

  // B. 离线模式
  if (session.mode === 'offline') {
    const chars = getLocalOfflineCharacters();
    const id = record?.id || character.id || `char_${Date.now()}`;
    const updated = {
      id,
      owner_id: session.owner,
      avatar_name: character.avatar_name || character.sheet?.name || '冒险者',
      level: character.level || character.sheet?.level || 1,
      sheet: character.sheet || character,
      updated_at: new Date().toISOString()
    };
    const nextChars = [updated, ...chars.filter(c => c.id !== id)];
    saveLocalOfflineCharacters(nextChars);
    return updated;
  }

  // C. Supabase 备用
  const suffix = record ? '?id=eq.' + encodeURIComponent(record.id) + '&updated_at=eq.' + encodeURIComponent(record.updated_at) : '';
  const response = await supabaseJsonRequest('/rest/v1/characters' + suffix + (record ? '&' : '?') + 'select=id,owner_id,updated_at', {
    method: record ? 'PATCH' : 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(record ? character : { ...character, owner_id: session.owner }),
  }, session.access_token);
  if (!response?.[0]) throw new Error('云端档案已更新，请先导出当前修改，再重新载入。');
  return response[0];
}

export async function grantCharacterResource(id, kind, resource) {
  const session = await activeSession();
  const isHost = session.mode === 'host' || await detectHostServer();

  if (isHost && session.mode !== 'offline') {
    return hostJsonRequest(`/api/characters/${encodeURIComponent(id)}/grant`, {
      method: 'POST',
      body: JSON.stringify({ kind, resource })
    }, session.access_token);
  }

  if (session.mode === 'offline') {
    console.log('离线模式资源本地记录：', { id, kind, resource });
    return { ok: true, offline: true };
  }

  return supabaseJsonRequest('/rest/v1/rpc/grant_character_resource', {
    method: 'POST',
    body: JSON.stringify({ target_id: id, resource_kind: kind, resource }),
  }, session.access_token);
}

export async function deleteCharacter(record) {
  const session = await activeSession();
  const isHost = session.mode === 'host' || await detectHostServer();

  if (isHost && session.mode !== 'offline') {
    return hostJsonRequest(`/api/characters/${encodeURIComponent(record.id)}`, {
      method: 'DELETE'
    }, session.access_token);
  }

  if (session.mode === 'offline') {
    const chars = getLocalOfflineCharacters();
    saveLocalOfflineCharacters(chars.filter(c => c.id !== record.id));
    return;
  }

  const rows = await supabaseJsonRequest('/rest/v1/characters?select=id&id=eq.' + encodeURIComponent(record.id) + '&updated_at=eq.' + encodeURIComponent(record.updated_at), {
    method: 'DELETE', headers: { Prefer: 'return=representation' }
  }, session.access_token);
  if (!rows.length) throw new Error('删除未生效，请刷新角色库。');
}

export async function readGmNote(id) {
  const session = await activeSession();
  const isHost = session.mode === 'host' || await detectHostServer();

  if (isHost && session.mode !== 'offline') {
    return hostJsonRequest(`/api/characters/${encodeURIComponent(id)}/gm-note`, {}, session.access_token);
  }

  if (session.mode === 'offline') {
    const raw = localStorage.getItem(`daggerworld.gm_note.${id}`);
    return raw ? JSON.parse(raw) : { body: '', updated_at: new Date().toISOString() };
  }

  const rows = await supabaseJsonRequest('/rest/v1/character_gm_notes?select=body,updated_at&character_id=eq.' + encodeURIComponent(id), {}, session.access_token);
  return rows[0];
}

export async function writeGmNote(id, body, prior) {
  const session = await activeSession();
  const isHost = session.mode === 'host' || await detectHostServer();

  if (isHost && session.mode !== 'offline') {
    return hostJsonRequest(`/api/characters/${encodeURIComponent(id)}/gm-note`, {
      method: 'POST',
      body: JSON.stringify({ body, prior })
    }, session.access_token);
  }

  if (session.mode === 'offline') {
    localStorage.setItem(`daggerworld.gm_note.${id}`, JSON.stringify({ body, updated_at: new Date().toISOString() }));
    return;
  }

  const filter = prior ? '?character_id=' + encodeURIComponent(id) + '&updated_at=eq.' + encodeURIComponent(prior.updated_at) : '';
  const rows = await supabaseJsonRequest('/rest/v1/character_gm_notes' + filter, {
    method: prior ? 'PATCH' : 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ character_id: id, body, updated_at: new Date().toISOString() })
  }, session.access_token);
  if (!rows.length) throw new Error('私记已更新，请重新打开。');
}

export async function loadAdventureCards() {
  const session = readSession();
  const isHost = session?.mode === 'host' || await detectHostServer();
  if (isHost && session?.mode !== 'offline') {
    return hostJsonRequest('/api/adventure-cards', {}, session?.access_token);
  }
  const active = await activeSession();
  if (active.mode === 'offline') {
    try {
      const raw = localStorage.getItem('daggerworld.adventure_cards.v1');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  return supabaseJsonRequest('/rest/v1/adventure_board_cards?order=updated_at.desc,id', {}, active.access_token);
}

export async function writeAdventureCard(card, prior, remove = false) {
  const session = readSession();
  const isHost = session?.mode === 'host' || await detectHostServer();
  if (isHost && session?.mode !== 'offline') {
    return hostJsonRequest('/api/adventure-cards', {
      method: remove ? 'DELETE' : 'POST',
      body: JSON.stringify({ card, prior, remove })
    }, session?.access_token);
  }
  const active = await activeSession();
  if (active.mode === 'offline') {
    let cards = [];
    try { cards = JSON.parse(localStorage.getItem('daggerworld.adventure_cards.v1') || '[]'); } catch {}
    if (remove) {
      cards = cards.filter(c => c.id !== card.id);
    } else {
      const updated = { ...card, id: card.id || `card_${Date.now()}`, updated_at: new Date().toISOString(), revision: (prior?.revision || 0) + 1 };
      cards = [updated, ...cards.filter(c => c.id !== updated.id)];
    }
    localStorage.setItem('daggerworld.adventure_cards.v1', JSON.stringify(cards));
    return card;
  }
  const query = prior ? '?id=eq.' + encodeURIComponent(prior.id) + '&revision=eq.' + prior.revision : '';
  const rows = await supabaseJsonRequest('/rest/v1/adventure_board_cards' + query, {
    method: remove ? 'DELETE' : prior ? 'PATCH' : 'POST',
    headers: { Prefer: 'return=representation' },
    ...(remove ? {} : { body: JSON.stringify(card) })
  }, active.access_token);
  if (!rows?.length) throw new Error('这张记录已有新版，请先复制你的修改，再刷新核对。');
  return rows[0];
}

export async function appearanceSession(owner) {
  const session = await activeSession();
  if (owner && session.owner && session.owner !== owner) throw new Error('登录账号已变更。');
  return { base: SUPABASE_BASE, key: SUPABASE_KEY, token: session.access_token };
}

export async function readAdventureCanvas(boardId = 'mmo_global_whiteboard') {
  const session = readSession();
  const isHost = session?.mode === 'host' || await detectHostServer();
  if (isHost && session?.mode !== 'offline') {
    const q = boardId ? `?id=${encodeURIComponent(boardId)}` : '';
    return hostJsonRequest(`/api/whiteboard${q}`, {}, session?.access_token);
  }
  const active = await activeSession();
  return supabaseJsonRequest('/rest/v1/adventure_canvas?id=eq.1&select=scene,revision', {}, active.access_token).then(rows => rows[0]);
}

export async function writeAdventureCanvas(scene, priorRevision, boardId = 'mmo_global_whiteboard') {
  const session = readSession();
  const isHost = session?.mode === 'host' || await detectHostServer();
  if (isHost && session?.mode !== 'offline') {
    return hostJsonRequest('/api/whiteboard', {
      method: 'POST',
      body: JSON.stringify({ id: boardId, scene })
    }, session?.access_token);
  }
  const active = await activeSession();
  const body = JSON.stringify({ scene });
  const rows = await supabaseJsonRequest('/rest/v1/adventure_canvas?id=eq.1&revision=eq.' + priorRevision + '&select=revision', {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body
  }, active.access_token);
  return rows[0];
}

export async function appearanceRequest(owner, path, options = {}) {
  const { token } = await appearanceSession(owner);
  return supabaseJsonRequest(path, options, token);
}
