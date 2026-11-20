create or replace function public.guard_character_experience()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  thresholds constant bigint[] := array[0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
  previous jsonb;
  earned integer := 0;
  spent integer;
begin
  if exists (select 1 from public.campaign_members where user_id = (select auth.uid()) and role = 'gm') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.level is distinct from 1 or new.sheet ? 'experience' or new.sheet ? 'advancementPoints' then
      raise exception '新角色从 1 级、0 经验开始。';
    end if;
    return new;
  end if;

  previous := old.sheet->'experience';
  if new.sheet->'experience' is distinct from previous then
    raise exception '经验不可自行修改。';
  end if;
  if new.level is distinct from old.level then
    if new.level is distinct from old.level + 1 or new.level > 20
       or coalesce((previous->>'points')::bigint,0) < thresholds[new.level] then
      raise exception '未达到升级条件，请刷新角色资料。';
    end if;
    earned := 1;
  end if;

  if earned = 0
     and new.sheet->'levelAdvancementSlots' is not distinct from old.sheet->'levelAdvancementSlots'
     and new.sheet->'advancementPoints' is not distinct from old.sheet->'advancementPoints' then
    return new;
  end if;
  if exists (
    select 1
    from jsonb_each(coalesce(old.sheet->'levelAdvancementSlots','{}')) as old_slot(rank,slots)
    where not coalesce(new.sheet->'levelAdvancementSlots'->old_slot.rank,'[]') @> old_slot.slots
  ) then raise exception '已保存的升级选项不可撤回。'; end if;
  select coalesce(sum(case when split_part(slot, ':', 2) in ('prof','multiclass') then 2 else 1 end),0)
  into spent
  from (
    select rank, slot from jsonb_each(coalesce(new.sheet->'levelAdvancementSlots','{}')) e(rank,slots), jsonb_array_elements_text(slots) a(slot)
    except all
    select rank, slot from jsonb_each(coalesce(old.sheet->'levelAdvancementSlots','{}')) e(rank,slots), jsonb_array_elements_text(slots) a(slot)
  ) changes;
  if coalesce((new.sheet->>'advancementPoints')::integer,0) < 0
     or coalesce((new.sheet->>'advancementPoints')::integer,0)
       <> coalesce((old.sheet->>'advancementPoints')::integer,0) + earned - spent then
    raise exception '升级点数不符。';
  end if;
  return new;
end;
$$;
