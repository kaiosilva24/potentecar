-- Remove any triggers that try to use updated_at on stock_items
DROP TRIGGER IF EXISTS update_stock_items_updated_at ON stock_items;
DROP TRIGGER IF EXISTS set_updated_at ON stock_items;
DROP TRIGGER IF EXISTS handle_updated_at ON stock_items;

-- Remove updated_at column if it exists
ALTER TABLE stock_items DROP COLUMN IF EXISTS updated_at;

-- Ensure last_updated column exists and has proper default
ALTER TABLE stock_items ALTER COLUMN last_updated SET DEFAULT NOW();

-- Create trigger for last_updated instead
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for stock_items using last_updated
DROP TRIGGER IF EXISTS update_stock_items_last_updated ON stock_items;
CREATE TRIGGER update_stock_items_last_updated
    BEFORE UPDATE ON stock_items
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();

-- Enable realtime (only if not already added)
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'stock_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE stock_items;
    END IF;
END $;
