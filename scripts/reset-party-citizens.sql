-- Run in Supabase -> SQL Editor right before the party goes live.
-- Deletes all rows and resets citizen_number so the next insert is TOMO-0180.
--
-- Important: a plain DELETE does not reset the identity sequence. Use TRUNCATE
-- with RESTART IDENTITY (or ALTER TABLE ... RESTART WITH 180) instead.

truncate table party_citizens restart identity;
