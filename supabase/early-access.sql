create table if not exists public.early_access_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'landing_page',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  approved_by text,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.early_access_signups
  add column if not exists status text not null default 'pending',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists rejected_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'early_access_signups_status_check'
  ) then
    alter table public.early_access_signups
      add constraint early_access_signups_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end;
$$;

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

create table if not exists public.gmail_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  user_email text not null,
  gmail_email text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  scope text,
  token_type text,
  expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gmail_connections enable row level security;

drop policy if exists "No public reads for gmail connections" on public.gmail_connections;
drop policy if exists "No public writes for gmail connections" on public.gmail_connections;

drop trigger if exists set_gmail_connections_updated_at on public.gmail_connections;

create trigger set_gmail_connections_updated_at
before update on public.gmail_connections
for each row
execute function public.set_updated_at();

create table if not exists public.gmail_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text not null,
  gmail_email text not null,
  gmail_message_id text not null,
  gmail_thread_id text not null,
  internal_date text,
  from_email text,
  subject text,
  date_header text,
  snippet text,
  triage_category text not null check (triage_category in ('booking', 'pricing', 'complaint', 'follow_up', 'general', 'low_priority')),
  triage_urgency text not null check (triage_urgency in ('high', 'medium', 'low')),
  triage_needs_reply boolean not null,
  triage_reason text not null,
  triage_model text,
  ai_summary text,
  summary_model text,
  summarized_at timestamptz,
  is_junk boolean not null default false,
  junked_at timestamptz,
  triaged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gmail_messages
  add column if not exists user_id uuid,
  add column if not exists user_email text,
  add column if not exists gmail_email text,
  add column if not exists gmail_message_id text,
  add column if not exists gmail_thread_id text,
  add column if not exists internal_date text,
  add column if not exists from_email text,
  add column if not exists subject text,
  add column if not exists date_header text,
  add column if not exists snippet text,
  add column if not exists triage_category text,
  add column if not exists triage_urgency text,
  add column if not exists triage_needs_reply boolean,
  add column if not exists triage_reason text,
  add column if not exists triage_model text,
  add column if not exists ai_summary text,
  add column if not exists summary_model text,
  add column if not exists summarized_at timestamptz,
  add column if not exists is_junk boolean not null default false,
  add column if not exists junked_at timestamptz,
  add column if not exists triaged_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gmail_messages_triage_category_check'
  ) then
    alter table public.gmail_messages
      add constraint gmail_messages_triage_category_check
      check (triage_category in ('booking', 'pricing', 'complaint', 'follow_up', 'general', 'low_priority'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'gmail_messages_triage_urgency_check'
  ) then
    alter table public.gmail_messages
      add constraint gmail_messages_triage_urgency_check
      check (triage_urgency in ('high', 'medium', 'low'));
  end if;
end;
$$;

create unique index if not exists gmail_messages_user_message_id_key
on public.gmail_messages (user_id, gmail_message_id);

alter table public.gmail_messages enable row level security;

drop policy if exists "No public reads for gmail messages" on public.gmail_messages;
drop policy if exists "No public writes for gmail messages" on public.gmail_messages;

drop trigger if exists set_gmail_messages_updated_at on public.gmail_messages;

create trigger set_gmail_messages_updated_at
before update on public.gmail_messages
for each row
execute function public.set_updated_at();

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  user_email text not null,
  business_name text,
  business_type text,
  reply_tone text,
  services text,
  booking_link text,
  phone text,
  hours text,
  never_promise text,
  voice_profile text,
  voice_sample_count integer not null default 0,
  voice_learned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_profiles
  add column if not exists voice_profile text,
  add column if not exists voice_sample_count integer not null default 0,
  add column if not exists voice_learned_at timestamptz;

alter table public.business_profiles enable row level security;

drop policy if exists "No public reads for business profiles" on public.business_profiles;
drop policy if exists "No public writes for business profiles" on public.business_profiles;

drop trigger if exists set_business_profiles_updated_at on public.business_profiles;

create trigger set_business_profiles_updated_at
before update on public.business_profiles
for each row
execute function public.set_updated_at();

create table if not exists public.gmail_draft_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text not null,
  gmail_email text not null,
  source_message_id text not null,
  source_thread_id text,
  source_subject text,
  draft_id text,
  draft_message_id text,
  reply_snapshot text,
  variant_label text,
  variant_instruction text,
  sent_at timestamptz,
  sent_message_id text,
  status text not null default 'created' check (status in ('created', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.gmail_draft_events
  add column if not exists source_subject text,
  add column if not exists reply_snapshot text,
  add column if not exists variant_label text,
  add column if not exists variant_instruction text,
  add column if not exists sent_at timestamptz,
  add column if not exists sent_message_id text;

alter table public.gmail_draft_events enable row level security;

drop policy if exists "No public reads for gmail draft events" on public.gmail_draft_events;
drop policy if exists "No public writes for gmail draft events" on public.gmail_draft_events;

create table if not exists public.follow_up_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text not null,
  gmail_email text,
  source_message_id text not null,
  source_thread_id text,
  source_subject text,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.follow_up_reminders enable row level security;

drop policy if exists "No public reads for follow up reminders" on public.follow_up_reminders;
drop policy if exists "No public writes for follow up reminders" on public.follow_up_reminders;

create table if not exists public.user_onboarding_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text not null,
  event_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, event_key)
);

alter table public.user_onboarding_events enable row level security;

drop policy if exists "No public reads for user onboarding events" on public.user_onboarding_events;
drop policy if exists "No public writes for user onboarding events" on public.user_onboarding_events;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  event_type text not null,
  target_user_id uuid,
  target_email text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_events enable row level security;

drop policy if exists "No public reads for audit events" on public.audit_events;
drop policy if exists "No public writes for audit events" on public.audit_events;
