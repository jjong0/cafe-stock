-- 카운트를 1 올린 뒤 한도 이내인지 반환한다. 한도를 넘긴 시도도 카운트에 포함된다.
create function public.increment_usage(
  p_key text,
  p_day date,
  p_limit int
)
returns boolean
language sql
set search_path = ''
as $$
  insert into public.api_usage as u (key, day, count)
  values (p_key, p_day, 1)
  on conflict (key, day) do update set count = u.count + 1
  returning u.count <= p_limit;
$$;

revoke execute on function public.increment_usage(text, date, int) from public, anon, authenticated;
grant execute on function public.increment_usage(text, date, int) to service_role;
