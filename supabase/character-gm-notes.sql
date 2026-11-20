create table public.character_gm_notes (
 character_id uuid primary key references public.characters(id) on delete cascade,
 body text not null default '', updated_at timestamptz not null default now()
);
alter table public.character_gm_notes enable row level security;
revoke all on public.character_gm_notes from public, anon, authenticated;
grant select,insert,update on public.character_gm_notes to authenticated;
create policy gm_notes_only on public.character_gm_notes for all to authenticated
 using (exists(select 1 from public.campaign_members where user_id=(select auth.uid()) and role='gm'))
 with check (exists(select 1 from public.campaign_members where user_id=(select auth.uid()) and role='gm'));
insert into public.character_gm_notes(character_id,body) select id, notes from public.characters where coalesce(notes,'')<>'';
revoke select on public.characters from authenticated;
revoke select(notes),insert(notes),update(notes) on public.characters from authenticated;
grant select(id,owner_id,avatar_name,level,sheet,updated_at) on public.characters to authenticated;
grant delete on public.characters to authenticated;
create policy character_delete on public.characters for delete to authenticated using (exists(select 1 from public.campaign_members where user_id=(select auth.uid()) and (role='gm' or user_id=characters.owner_id)));
