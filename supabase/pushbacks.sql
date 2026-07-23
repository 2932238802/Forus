create table if not exists public.pushbacks (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  note text,
  owner text not null default 'you',
  created_at timestamptz default now()
);

alter table public.pushbacks enable row level security;

drop policy if exists "anon all pushbacks" on public.pushbacks;
create policy "anon all pushbacks" on public.pushbacks for all to anon using (true) with check (true);

alter publication supabase_realtime add table public.pushbacks;
