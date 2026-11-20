create or replace function public.guard_character_experience()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  previous jsonb;
  points bigint;
  required bigint;
begin
  if exists (select 1 from public.campaign_members where user_id = (select auth.uid()) and role = 'gm') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.level is distinct from 1 or new.sheet ? 'experience' then
      raise exception '新角色从 1 级、0 经验开始。';
    end if;
    return new;
  end if;

  previous := old.sheet->'experience';
  if new.level is not distinct from old.level then
    if new.sheet->'experience' is distinct from previous then
      raise exception '经验不可自行修改。';
    end if;
    return new;
  end if;

  points := (previous->>'points')::bigint;
  required := (previous->>'required')::bigint;
  if new.level is distinct from old.level + 1 or old.level >= 10
      or points is null or required is null or required < 1 or points < required
      or (previous->>'level')::integer is distinct from old.level
      or new.sheet->'experience' is distinct from jsonb_build_object('points', points-required) then
    raise exception '未达到升级条件，请刷新角色资料。';
  end if;
  return new;
end;
$$;

create trigger guard_character_experience
before insert or update on public.characters
for each row execute function public.guard_character_experience();
