create schema if not exists daggerworld_private;
create table daggerworld_private.invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (length(code_hash) = 64),
  login text unique,
  role text not null check (role in ('gm','player')),
  enabled boolean not null default true
);
revoke all on schema daggerworld_private from public, anon, authenticated;
create function public.bind_daggerworld_invite(p_hash text,p_login text)
returns table (invite_id uuid, member_role text)
language sql security invoker set search_path = '' as $$
  update daggerworld_private.invites i set login = p_login
  where i.code_hash = p_hash and i.enabled and (i.login is null or i.login = p_login)
  returning i.id, i.role;
$$;
grant usage on schema daggerworld_private to service_role;
grant select, update on daggerworld_private.invites to service_role;
revoke all on function public.bind_daggerworld_invite(text,text) from public, anon, authenticated;
grant execute on function public.bind_daggerworld_invite(text,text) to service_role;