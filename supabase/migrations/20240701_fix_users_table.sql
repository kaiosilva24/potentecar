-- Check if users table exists, if not create it
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  image TEXT,
  name TEXT,
  token_identifier TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  user_id TEXT
);

-- Enable realtime for users table
alter publication supabase_realtime add table users;

-- Create policy for users table
DROP POLICY IF EXISTS "Public access" ON users;
CREATE POLICY "Public access"
ON users FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert their own data" ON users;
CREATE POLICY "Users can insert their own data"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data"
ON users FOR UPDATE
USING (auth.uid() = id);
