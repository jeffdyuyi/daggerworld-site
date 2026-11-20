create table public.adventure_board_cards (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('journal','npc','clue')),
  title text not null check (length(trim(title)) between 1 and 120),
  body text not null default '' check (length(body) <= 20000),
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.adventure_board_cards enable row level security;
revoke all on public.adventure_board_cards from public, anon, authenticated;
grant select, insert, update, delete on public.adventure_board_cards to authenticated;
create policy adventure_board_members on public.adventure_board_cards for all to authenticated
using (exists (select 1 from public.campaign_members where user_id = (select auth.uid())))
with check (exists (select 1 from public.campaign_members where user_id = (select auth.uid())));
create function public.version_adventure_board_card() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revision := old.revision+1;
  new.updated_at := now();
  return new;
end;
$$;
create trigger adventure_board_version before update on public.adventure_board_cards
for each row execute function public.version_adventure_board_card();
