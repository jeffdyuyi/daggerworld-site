create table public.adventure_canvas (
  id integer primary key check (id = 1),
  scene jsonb not null default '{"elements":[],"files":{}}'::jsonb
    check (jsonb_typeof(scene) = 'object' and octet_length(scene::text) <= 8000000),
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.adventure_canvas(id) values (1);
alter table public.adventure_canvas enable row level security;
revoke all on public.adventure_canvas from public, anon, authenticated;
grant select on public.adventure_canvas to authenticated;
grant update(scene) on public.adventure_canvas to authenticated;
create policy adventure_canvas_members on public.adventure_canvas for all to authenticated
using (exists(select 1 from public.campaign_members where user_id=(select auth.uid())))
with check (exists(select 1 from public.campaign_members where user_id=(select auth.uid())));
create trigger version_adventure_canvas before update on public.adventure_canvas
for each row execute function public.version_adventure_board_card();
