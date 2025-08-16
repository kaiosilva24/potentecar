-- Add category field to products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;

-- Enable realtime for categories table
alter publication supabase_realtime add table categories;
