-- Contact submissions captured from the landing page
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT NOT NULL,
  source TEXT DEFAULT 'landing'
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to submit contact" ON contact_submissions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow authenticated read contact" ON contact_submissions
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE INDEX contact_submissions_created_at_idx ON contact_submissions (created_at DESC);

-- Subscription signups captured from the footer form
CREATE TABLE IF NOT EXISTS subscription_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  email TEXT NOT NULL,
  source TEXT DEFAULT 'landing'
);

ALTER TABLE subscription_signups ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX subscription_signups_email_idx ON subscription_signups (email);

CREATE POLICY "Allow anyone to submit subscription" ON subscription_signups
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow authenticated read subscription" ON subscription_signups
FOR SELECT
USING (auth.role() = 'authenticated');

