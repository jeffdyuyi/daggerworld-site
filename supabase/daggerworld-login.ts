const website = 'https://jeffdyuyi.github.io';
const base = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey = Deno.env.get('SUPABASE_ANON_KEY')!;

function headers(key: string) {
  return { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
}

async function post(path: string, key: string, data: object, extra = {}) {
  return fetch(base + path, { method: 'POST', headers: { ...headers(key), ...extra }, body: JSON.stringify(data) });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const cors = {
    'Access-Control-Allow-Origin': website,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
  };
  const json = (body: object, status = 200) => Response.json(body, { status, headers: cors });
  if (origin && origin !== website) return json({ error: '访问来源无效。' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: '请使用登录表单。' }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 1024) return json({ error: '输入过长。' }, 400);
    const data = JSON.parse(raw);
    const login = typeof data.login === 'string' ? data.login.trim().normalize('NFKC').toLowerCase() : '';
    const code = typeof data.code === 'string' ? data.code.trim().toLowerCase() : '';
    const invalid = () => json({ error: '账号名或邀请码无效。' }, 401);
    if (!login || login.length > 100 || /[\u0000-\u001f\u007f]/.test(login) || !/^dw-[0-9a-f]{32}$/.test(code)) return invalid();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const binding = await post('/rest/v1/rpc/bind_daggerworld_invite', serviceKey, { p_hash: hash, p_login: login });
    if (binding.status === 409) return invalid();
    if (!binding.ok) throw Error('invite binding failed');
    const [invite] = await binding.json();
    if (!invite) return invalid();
    const email = invite.invite_id + '@daggerworld.invalid';
    const link = await post('/auth/v1/admin/generate_link', serviceKey, { type: 'magiclink', email });
    if (!link.ok) throw Error('could not establish account');
    const details = await link.json();
    const auth = await post('/auth/v1/verify', publicKey, { type: 'email', token_hash: details.hashed_token });
    if (auth.status === 429) return json({error:'登录请求过于频繁，请稍后重试。'},429);
    if (!auth.ok) { console.warn('verify rejected', auth.status, (await auth.json()).error_code); throw Error('could not verify session'); }
    const session = await auth.json();
    const membership = await post('/rest/v1/campaign_members?on_conflict=user_id', serviceKey, {
      user_id: session.user.id, role: invite.member_role,
    }, { Prefer: 'resolution=ignore-duplicates' });
    if (!membership.ok) { console.warn('membership rejected', membership.status, (await membership.json()).code); throw Error('could not register membership'); }
    return json({ access_token: session.access_token, refresh_token: session.refresh_token, expires_at: session.expires_at, login });
  } catch {
    return json({ error: '登录服务暂时不可用，请稍后重试。' }, 503);
  }
});
