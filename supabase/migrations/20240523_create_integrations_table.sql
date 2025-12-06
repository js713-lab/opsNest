-- Create table for storing integration configurations
CREATE TABLE IF NOT EXISTS integrations_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    provider TEXT NOT NULL, -- e.g., 'anthropic', 'coderabbit'
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- stores apiKey, environment, etc.
    is_active BOOLEAN DEFAULT TRUE,
    
    -- In a real multi-user app, you would add a user_id column
    -- user_id UUID REFERENCES auth.users(id),
    
    UNIQUE(provider)
);

-- Enable Row Level Security (RLS)
ALTER TABLE integrations_config ENABLE ROW LEVEL SECURITY;

-- Create policies (For demo purposes, allowing public access, but strictly restricts in prod)
-- Since we are using the 'anon' key in the frontend, we need a policy that allows anon access
-- WARNING: This is insecure for production data. In production, use auth.uid() checks.

-- Allow anonymous select
CREATE POLICY "Allow public read access" 
ON integrations_config FOR SELECT 
TO anon 
USING (true);

-- Allow anonymous insert/update
CREATE POLICY "Allow public insert/update access" 
ON integrations_config FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON integrations_config FOR UPDATE
TO anon
USING (true);

