-- Add updated_at column back to stock_items table
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for stock_items
DROP TRIGGER IF EXISTS update_stock_items_updated_at ON stock_items;
CREATE TRIGGER update_stock_items_updated_at
    BEFORE UPDATE ON stock_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
alter publication supabase_realtime add table stock_items;
