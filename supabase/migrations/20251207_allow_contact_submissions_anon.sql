-- Allow anonymous inserts (and reads) into contact_submissions for the landing form (demo-friendly).
-- NOTE: Lock down with proper auth in production.

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies if re-running
DROP POLICY IF EXISTS "Allow anyone to submit contact" ON contact_submissions;
DROP POLICY IF EXISTS "Allow authenticated read contact" ON contact_submissions;
DROP POLICY IF EXISTS "Allow anon insert contact_submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Allow anon select contact_submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Allow anon update contact_submissions" ON contact_submissions;

-- Allow anon insert
CREATE POLICY "Allow anon insert contact_submissions"
ON contact_submissions
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon select (demo: all)
CREATE POLICY "Allow anon select contact_submissions"
ON contact_submissions
FOR SELECT
TO anon
USING (true);

-- Allow anon update (optional; helps if upserts are used)
CREATE POLICY "Allow anon update contact_submissions"
ON contact_submissions
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

