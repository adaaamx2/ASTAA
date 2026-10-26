-- Required by the existing studio repository and generation locks.
-- Does not replace existing rows or grant browser access.
create table if not exists public.kv_store_4bc3557f (
  key text primary key,
  value jsonb not null
);
alter table public.kv_store_4bc3557f enable row level security;
revoke all on public.kv_store_4bc3557f from anon, authenticated;
grant all on public.kv_store_4bc3557f to service_role;
