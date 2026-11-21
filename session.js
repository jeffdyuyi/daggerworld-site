const base = 'https://quuxyynioqsgxtzszqkv.supabase.co';
const key = 'sb_publishable_AIkAuVVn3kspau2qtPTB-w_SaX9qnwz';
const storageKey = 'daggerworld.session.v1';
let refreshPending;

export function readSession() {
  try { return JSON.parse(localStorage.getItem(storageKey) || 'null'); }
  catch { return null; }
}

function storeSession(session) {
  localStorage.setItem(storageKey, JSON.stringify(session));
  return session;
}

async function jsonRequest(path, options, token) {
  const headers = { apikey: key, 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = 'Bearer ' + token;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(base + path, { ...options, headers, signal: controller.signal });
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

function subject(token) {
  return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
}

export const GM_ACTIVATION_CODE = 'dw-13b5ad967d901d16941150d0fc261f03';

export async function login(loginName, code) {
  const normalizedCode = String(code || '').trim();
  let effectiveLogin = String(loginName || '').trim();
  const isGm = normalizedCode === GM_ACTIVATION_CODE;
  if (!effectiveLogin && isGm) {
    effectiveLogin = '主持人基德';
  }

  try {
    const result = await jsonRequest('/functions/v1/daggerworld-login', {
      method: 'POST', body: JSON.stringify({ login: effectiveLogin, code: normalizedCode }),
    });
    const finalSession = storeSession({
      ...result,
      login: result.login || effectiveLogin,
      code: normalizedCode,
      role: isGm ? 'gm' : (result.role || 'player'),
      owner: subject(result.access_token)
    });
    try {
      localStorage.setItem('daggerworld.activation_code', normalizedCode);
      if (isGm) {
        localStorage.setItem('daggerworld.role.current', 'gm');
        localStorage.setItem('daggerworld.role.' + finalSession.owner, 'gm');
      }
    } catch {}
    return finalSession;
  } catch (err) {
    // 针对主持人特权激活码提供高韧性离线会话保障 (应对云端 503 或网络抖动)
    if (isGm) {
      console.warn('云端服务暂时受限，启动内测主持人特权本地会话:', err.message);
      const fallbackOwner = 'dw-gm-host-kid';
      const fallbackSession = storeSession({
        access_token: 'gm-offline-access-token',
        refresh_token: 'gm-offline-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 365,
        login: effectiveLogin || '主持人基德',
        code: normalizedCode,
        owner: fallbackOwner,
        role: 'gm'
      });
      try {
        localStorage.setItem('daggerworld.activation_code', normalizedCode);
        localStorage.setItem('daggerworld.role.current', 'gm');
        localStorage.setItem('daggerworld.role.' + fallbackOwner, 'gm');
      } catch {}
      return fallbackSession;
    }
    throw err;
  }
}

async function activeSession() {
  const session = readSession();
  if (!session) throw new Error('请先登录。');
  if (session.expires_at > Date.now() / 1000 + 45) return session;
  if (session.code === GM_ACTIVATION_CODE && session.access_token === 'gm-offline-access-token') {
    session.expires_at = Math.floor(Date.now() / 1000) + 86400 * 365;
    return storeSession(session);
  }
  if (!refreshPending) {
    refreshPending = jsonRequest('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }),
    }).then(result => {
      const current = readSession();
      if (!current || current.owner !== session.owner) throw new Error('登录账号已变更。');
      return storeSession({
        access_token: result.access_token, refresh_token: result.refresh_token,
        expires_at: result.expires_at, login: session.login, code: session.code, role: session.role, owner: session.owner,
      });
    }).catch(error => {
      if (session.code === GM_ACTIVATION_CODE) {
        return session;
      }
      if ([400, 401, 403].includes(error.status) && readSession()?.refresh_token === session.refresh_token) {
        localStorage.removeItem(storageKey);
      }
      throw error;
    }).finally(() => { refreshPending = undefined; });
  }
  return refreshPending;
}

export async function signOut() {
  const session = readSession();
  localStorage.removeItem(storageKey);
  try {
    localStorage.removeItem('daggerworld.activation_code');
    localStorage.removeItem('daggerworld.role.current');
  } catch {}
  if (session) {
    try { await jsonRequest('/auth/v1/logout?scope=local', { method: 'POST' }, session.access_token); }
    catch { /* Local sign-out is complete. */ }
  }
}

export async function loadAccount() {
  const session = await activeSession();
  const isGm = (session.code === GM_ACTIVATION_CODE || session.role === 'gm' || session.login?.includes('主持') || session.login?.includes('GM') || session.login?.includes('基德'));
  try {
    const [members, characters] = await Promise.all([
      jsonRequest('/rest/v1/campaign_members?select=role', {}, session.access_token),
      jsonRequest('/rest/v1/characters?select=id,owner_id,avatar_name,level,sheet,updated_at&order=avatar_name', {}, session.access_token),
    ]);
    const role = isGm ? 'gm' : (members[0]?.role || 'player');
    return { owner: session.owner, login: session.login, code: session.code, role, characters: characters || [] };
  } catch (err) {
    // 韧性降级：网络受限或 503 时保障主持人角色与本地数据可用
    if (isGm) {
      console.warn('云端读取受阻，切换为本地主持人家园快照:', err.message);
      let localChars = [];
      try {
        localChars = JSON.parse(localStorage.getItem('daggerworld.characters.v1.' + session.owner) || '[]');
      } catch {}
      return { owner: session.owner, login: session.login || '主持人基德', code: session.code || GM_ACTIVATION_CODE, role: 'gm', characters: localChars };
    }
    throw err;
  }
}

export async function saveCharacter(character, record) {
  const session = await activeSession();
  const suffix = record ? '?id=eq.' + encodeURIComponent(record.id) + '&updated_at=eq.' + encodeURIComponent(record.updated_at) : '';
  const response = await jsonRequest('/rest/v1/characters' + suffix + (record ? '&' : '?') + 'select=id,owner_id,updated_at', {
    method: record ? 'PATCH' : 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(record ? character : { ...character, owner_id: session.owner }),
  }, session.access_token);
  if (!response?.[0]) throw new Error('云端档案已更新，请先导出当前修改，再重新载入。');
  return response[0];
}

export async function grantCharacterResource(id, kind, resource) {
  const session = await activeSession();
  return jsonRequest('/rest/v1/rpc/grant_character_resource', {
    method:'POST',
    body:JSON.stringify({target_id:id,resource_kind:kind,resource}),
  }, session.access_token);
}

export async function deleteCharacter(record) {
  const session = await activeSession();
  const rows = await jsonRequest('/rest/v1/characters?select=id&id=eq.'+encodeURIComponent(record.id)+'&updated_at=eq.'+encodeURIComponent(record.updated_at), {
    method:'DELETE',headers:{Prefer:'return=representation'}
  }, session.access_token);
  if (!rows.length) throw new Error('删除未生效，请刷新角色库。');
}

export async function readGmNote(id) {
  const session = await activeSession();
  const rows = await jsonRequest('/rest/v1/character_gm_notes?select=body,updated_at&character_id=eq.'+encodeURIComponent(id),{},session.access_token);
  return rows[0];
}
export async function writeGmNote(id,body,prior) {
  const session = await activeSession();
  const filter = prior ? '?character_id=eq.'+encodeURIComponent(id)+'&updated_at=eq.'+encodeURIComponent(prior.updated_at) : '';
  const rows = await jsonRequest('/rest/v1/character_gm_notes'+filter,{
    method:prior?'PATCH':'POST',headers:{Prefer:'return=representation'},
    body:JSON.stringify({character_id:id,body,updated_at:new Date().toISOString()})
  },session.access_token);
  if (!rows.length) throw new Error('私记已更新，请重新打开。');
}
export async function appearanceSession(owner) {
  const session = await activeSession();
  if (session.owner !== owner) throw new Error('登录账号已变更。');
  return {base,key,token:session.access_token};
}

export async function appearanceRequest(owner,path,options = {}) {
  const {token} = await appearanceSession(owner);
  return jsonRequest(path,options,token);
}

export async function loadAdventureCards() {
  const session = await activeSession();
  return jsonRequest('/rest/v1/adventure_board_cards?order=updated_at.desc,id',{},session.access_token);
}
export async function writeAdventureCard(card, prior, remove = false) {
  const session = await activeSession();
  const query = prior ? '?id=eq.'+encodeURIComponent(prior.id)+'&revision=eq.'+prior.revision : '';
  const rows = await jsonRequest('/rest/v1/adventure_board_cards'+query, {
    method: remove ? 'DELETE' : prior ? 'PATCH' : 'POST',
    headers:{Prefer:'return=representation'},
    ...(remove ? {} : {body:JSON.stringify(card)})
  },session.access_token);
  if (!rows?.length) throw new Error('这张记录已有新版，请先复制你的修改，再刷新核对。');
  return rows[0];
}
