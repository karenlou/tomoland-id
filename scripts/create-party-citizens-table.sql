-- Run once in Supabase -> SQL Editor, before the /party kiosk can save anything.
-- Isolated table for the launch party kiosk so entries don't mix with the main
-- directory during the event. citizen_number starts at 180 per the brief.
--
-- Before go-live (after clearing test data), run scripts/reset-party-citizens.sql
-- so numbering restarts at TOMO-0180. DELETE alone does not reset the sequence.
--
-- After the event, migrate entries into the main table with:
--
--   insert into citizens (name, relation_to_tomo, place_of_issue, photo_url)
--   select name, relation_to_tomo, place_of_issue, photo_url
--   from party_citizens
--   order by created_at asc;
--
-- (citizens assigns its own fresh citizen_number/tomoland_id, so those columns
-- are deliberately not copied.)

create table if not exists party_citizens (
  id uuid primary key default gen_random_uuid(),
  citizen_number bigint generated always as identity (start with 180),
  name text not null,
  relation_to_tomo text not null,
  place_of_issue text not null default 'San Francisco, CA',
  photo_url text,
  created_at timestamptz not null default now(),
  tomoland_id text generated always as
    ('TOMO-' || lpad(citizen_number::text, 4, '0')) stored
);

alter table party_citizens enable row level security;

create policy "public read party" on party_citizens
  for select using (true);

create policy "public insert party" on party_citizens
  for insert with check (true);
