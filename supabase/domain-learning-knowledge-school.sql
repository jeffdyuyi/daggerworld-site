create or replace function public.guard_character_domain_learning() returns trigger
language plpgsql set search_path = '' as $$
declare
  baseline jsonb := '{}'::jsonb;
  old_level int := 0;
  allowed int;
  learned int := 0;
  card_id text;
  domains text[];
  max_rank int := (new.level+1)/2;
begin
  if exists(select 1 from public.campaign_members where user_id=(select auth.uid()) and role='gm') then return new; end if;
  if tg_op = 'UPDATE' then baseline := old.sheet; old_level := old.level; end if;
  if coalesce(new.sheet->'customDomainCards','[]') is distinct from coalesce(baseline->'customDomainCards','[]') then
    raise exception '发放领域卡须由管理端处理。';
  end if;
  if tg_op = 'INSERT' then
    allowed := case when new.sheet->>'classId'='职业:法师'
      and new.sheet->>'subclassId'='子职:法师:知识学派:基础' then 3 else 2 end;
  else
    allowed := greatest(0,max_rank-(old_level+1)/2)
      + jsonb_array_length(jsonb_path_query_array(new.sheet,'$.levelAdvancementSlots.*[*] ? (@ like_regex ":domain$")'))
      - jsonb_array_length(jsonb_path_query_array(baseline,'$.levelAdvancementSlots.*[*] ? (@ like_regex ":domain$")'));
  end if;
  select c.domains into domains from daggerworld_rules.class_domains c
  where c.id=case when tg_op='INSERT' then new.sheet->>'classId' else baseline->>'classId' end;
  for card_id in
    select coalesce(card->>'ID',card->>'名称')
      from jsonb_array_elements(coalesce(new.sheet->'equippedDomainCards','[]')||coalesce(new.sheet->'vaultDomainCards','[]')) t(card)
    except
    select coalesce(card->>'ID',card->>'名称')
      from jsonb_array_elements(coalesce(baseline->'equippedDomainCards','[]')||coalesce(baseline->'vaultDomainCards','[]')||coalesce(baseline->'customDomainCards','[]')) t(card)
  loop
    learned := learned+1;
    if learned > allowed or not exists (
      select 1 from daggerworld_rules.card_levels c where c.id=card_id
      and ((c.domain=any(domains) and c.rank<=max_rank)
        or (c.domain=new.sheet->'multiclass'->>'domain' and c.rank <= (max_rank+1)/2 and new.level>=9))
    ) then raise exception '只能在创角或升级时领取符合条件的领域卡。'; end if;
  end loop;
  return new;
end;
$$;
