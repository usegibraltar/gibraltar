create table if not exists public.early_access_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'landing_page',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.early_access_signups enable row level security;

drop policy if exists "No public reads for early access signups" on public.early_access_signups;
drop policy if exists "No public writes for early access signups" on public.early_access_signups;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_early_access_signups_updated_at on public.early_access_signups;

create trigger set_early_access_signups_updated_at
before update on public.early_access_signups
for each row
execute function public.set_updated_at();
