-- Run once in Supabase → SQL Editor
-- Links each created ID to a browser device token for re-issue / delete

ALTER TABLE public.citizens
  ADD COLUMN IF NOT EXISTS owner_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS citizens_owner_token_unique
  ON public.citizens (owner_token)
  WHERE owner_token IS NOT NULL;
