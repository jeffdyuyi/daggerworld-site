create or replace function public.grant_character_resource(target_id uuid, resource_kind text, resource jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_sheet jsonb;
  target_level integer;
  result jsonb;
  field_name text;
  points bigint;
  item_key text;
begin
  if not exists (select 1 from public.campaign_members where user_id = (select auth.uid()) and role = 'gm') then
    raise exception '无权发放资源。' using errcode = '42501';
  end if;

  select c.sheet, c.level into strict target_sheet,target_level
  from public.characters c where c.id = target_id for update;
  case resource_kind
    when 'experience' then
      if target_level >= 20 or jsonb_typeof(resource) is distinct from 'number' or resource::text !~ '^[1-9][0-9]*$' then
        raise exception '经验须为正整数，满级角色无法领取。';
      end if;
      points := coalesce((target_sheet->'experience'->>'points')::bigint,0) + resource::text::bigint;
      if points > 9007199254740991 then raise exception '经验超出范围。'; end if;
      target_sheet := jsonb_set(target_sheet,'{experience}',jsonb_build_object('points',points));
    when 'inventoryItems', 'customDomainCards' then
      if jsonb_typeof(resource) is distinct from 'object' then raise exception '无效的资源。'; end if;
      field_name := resource_kind;
      if field_name = 'customDomainCards' then
        item_key := coalesce(resource->>'ID', resource->>'名称');
        if item_key is null then raise exception '领域卡缺少编号。'; end if;
        if exists (
          select 1 from jsonb_array_elements(coalesce(target_sheet->field_name,'[]')) a(item)
          where coalesce(item->>'ID',item->>'名称') = item_key
        ) then raise exception '角色已持有这张卡。'; end if;
      end if;
      target_sheet := jsonb_set(target_sheet,array[field_name],
        coalesce(target_sheet->field_name,'[]') || jsonb_build_array(resource));
    else raise exception '无效的资源类型。';
  end case;
  update public.characters c set sheet = target_sheet where c.id = target_id
  returning jsonb_build_object('id',c.id,'owner_id',c.owner_id,'avatar_name',c.avatar_name,
    'level',c.level,'sheet',c.sheet,'updated_at',c.updated_at) into strict result;
  return result;
end;
$$;
revoke execute on function public.grant_character_resource(uuid,text,jsonb) from public, anon;
grant execute on function public.grant_character_resource(uuid,text,jsonb) to authenticated;
