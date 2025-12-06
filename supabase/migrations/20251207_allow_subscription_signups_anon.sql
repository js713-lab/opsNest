-- Allow anonymous inserts (and reads) into subscription_signups for the demo/front-end.
-- NOTE: This is demo-friendly only. Lock this down with proper auth in production.

-- Ensure RLS is on
ALTER TABLE subscription_signups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow anon insert into subscription_signups" ON subscription_signups;
DROP POLICY IF EXISTS "Allow anon select subscription_signups" ON subscription_signups;

-- Allow anon to insert
CREATE POLICY "Allow anon insert into subscription_signups"
ON subscription_signups
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to read their submissions (demo: all)
CREATE POLICY "Allow anon select subscription_signups"
ON subscription_signups
FOR SELECT
TO anon
USING (true);

-- Allow anon update (optional, for demo to avoid RLS errors on upserts)
DROP POLICY IF EXISTS "Allow anon update subscription_signups" ON subscription_signups;
CREATE POLICY "Allow anon update subscription_signups"
ON subscription_signups
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

