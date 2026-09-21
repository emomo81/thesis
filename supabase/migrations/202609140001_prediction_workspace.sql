-- Apply once using Supabase SQL editor or supabase db push.
begin;
create table public.prediction_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  stage text not null check (stage in ('enrollment', 'semester1', 'semester2')),
  row_count integer not null check (row_count between 1 and 250),
  model_version text not null check (model_version ~ '^[a-f0-9]{64}$'),
  results jsonb not null check (jsonb_typeof(results) = 'array' and jsonb_array_length(results) = row_count),
  warnings jsonb not null default '[]' check (jsonb_typeof(warnings) = 'array'),
  check (octet_length(results::text) < 250000),
  check (octet_length(warnings::text) < 25000)
);
create index prediction_runs_user_created on public.prediction_runs(user_id, created_at desc);
alter table public.prediction_runs enable row level security;
revoke all on public.prediction_runs from anon;
grant select, insert, delete on public.prediction_runs to authenticated;
revoke update on public.prediction_runs from authenticated;
create policy "Read own results" on public.prediction_runs for select to authenticated using ((select auth.uid()) = user_id);
create policy "Save own results" on public.prediction_runs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Delete own results" on public.prediction_runs for delete to authenticated using ((select auth.uid()) = user_id);

-- Atomic, database-backed quota: works across Vercel instances. No browser writes.
create table public.prediction_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  requests integer not null,
  rows_used integer not null
);
alter table public.prediction_usage enable row level security;
revoke all on public.prediction_usage from anon, authenticated;
create or replace function public.consume_prediction_quota(requested_rows integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  affected integer;
begin
  if uid is null or requested_rows < 1 or requested_rows > 250 then
    raise exception 'Invalid quota request';
  end if;
  insert into public.prediction_usage as usage(user_id, window_start, requests, rows_used)
  values (uid, now(), 1, requested_rows)
  on conflict (user_id) do update set
    window_start = case when usage.window_start <= now() - interval '1 hour' then now() else usage.window_start end,
    requests = case when usage.window_start <= now() - interval '1 hour' then 1 else usage.requests + 1 end,
    rows_used = case when usage.window_start <= now() - interval '1 hour' then requested_rows else usage.rows_used + requested_rows end
  where usage.window_start <= now() - interval '1 hour'
     or (usage.requests < 30 and usage.rows_used + requested_rows <= 3000);
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;
revoke all on function public.consume_prediction_quota(integer) from public, anon;
grant execute on function public.consume_prediction_quota(integer) to authenticated;
create or replace function public.prediction_summary()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('runs', count(*), 'profiles', coalesce(sum(row_count), 0))
  from public.prediction_runs where user_id = (select auth.uid());
$$;
revoke all on function public.prediction_summary() from public, anon;
grant execute on function public.prediction_summary() to authenticated;
commit;
