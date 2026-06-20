-- Standardize all directory names to uppercase.
-- Run once in Supabase -> SQL Editor.

UPDATE public.citizens
SET name = upper(trim(name))
WHERE name <> upper(trim(name));

-- Optional — keep party kiosk names consistent before migration.
UPDATE public.party_citizens
SET name = upper(trim(name))
WHERE name <> upper(trim(name));

-- Verify — should return no rows.
SELECT name
FROM public.citizens
WHERE name <> upper(trim(name))
LIMIT 20;
