-- p_entries: [{ "itemId": uuid, "level": "low" | "out" }]
-- 반환: 이번 제출로 보고가 연결된 이슈들
create function public.submit_reports(
  p_session_id text,
  p_reporter_name text,
  p_entries jsonb,
  p_memo text default null
)
returns setof public.stock_issues
language plpgsql
set search_path = ''
as $$
declare
  v_entry jsonb;
  v_item_id uuid;
  v_level text;
  v_issue public.stock_issues;
  v_issue_ids uuid[] := '{}';
begin
  -- session_id가 null인 행은 공용 시드 데이터이므로 보고로 만들 수 없다
  if p_session_id is null then
    raise exception 'p_session_id is required';
  end if;

  for v_entry in select * from jsonb_array_elements(p_entries) loop
    v_item_id := (v_entry ->> 'itemId')::uuid;
    v_level := v_entry ->> 'level';

    -- 없는 행은 for update로 잠글 수 없어서, 생성을 먼저 시도한다.
    -- 동시 제출 시 뒤의 트랜잭션은 앞의 커밋을 기다렸다가 아무것도 하지 않는다.
    insert into public.stock_issues (session_id, item_id, level)
    values (p_session_id, v_item_id, v_level)
    on conflict ((coalesce(session_id, '')), item_id) where status <> 'resolved'
    do nothing;

    select * into v_issue
    from public.stock_issues
    where session_id = p_session_id
      and item_id = v_item_id
      and status <> 'resolved'
    for update;

    -- 단계는 low → out으로만 올린다
    if v_issue.level = 'low' and v_level = 'out' then
      update public.stock_issues set level = 'out' where id = v_issue.id;
    end if;

    insert into public.stock_reports (session_id, issue_id, item_id, level, reporter_name, memo)
    values (p_session_id, v_issue.id, v_item_id, v_level, p_reporter_name, p_memo);

    v_issue_ids := array_append(v_issue_ids, v_issue.id);
  end loop;

  return query
    select * from public.stock_issues where id = any (v_issue_ids);
end;
$$;

-- Supabase는 public 함수를 anon에게도 기본 공개하므로 서버(service_role)만 남긴다
revoke execute on function public.submit_reports(text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_reports(text, text, jsonb, text) to service_role;
