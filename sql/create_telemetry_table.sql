-- Skill recommendation telemetry: tracks when a jobseeker clicks/accepts a
-- suggested skill chip during Step 5 of registration. Used to measure the
-- effectiveness of each suggestion layer.

create table if not exists public.skill_recommendation_telemetry (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid,                               -- nullable: guest registrations have no user yet
  skill_name  text        not null,
  source      text        not null
                check (source in ('deterministic', 'ai_enrichment', 'demand_side')),
  category    text,                               -- inferred job category at time of click
  created_at  timestamptz not null default now()
);

-- Enable RLS
alter table public.skill_recommendation_telemetry enable row level security;

-- Anyone (anon + authenticated) may insert rows — registration happens before
-- the user has a verified session, so we can't require auth here.
create policy "telemetry_insert_open"
  on public.skill_recommendation_telemetry
  for insert
  with check (true);

-- No reads via the client — analytics are done via the service_role key or
-- the Supabase dashboard, both of which bypass RLS.
