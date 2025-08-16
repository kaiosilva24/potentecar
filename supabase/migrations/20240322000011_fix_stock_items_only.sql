-- Fix stock_items table specifically without affecting other tables

-- Remove only stock_items related triggers
DROP TRIGGER IF EXISTS update_stock_items_updated_at ON stock_items;
DROP TRIGGER IF EXISTS set_updated_at ON stock_items;
DROP TRIGGER IF EXISTS handle_updated_at ON stock_items;
DROP TRIGGER IF EXISTS update_stock_items_last_updated ON stock_items;
DROP TRIGGER IF EXISTS stock_items_updated_at ON stock_items;
DROP TRIGGER IF EXISTS trigger_updated_at ON stock_items;
DROP TRIGGER IF EXISTS trigger_update_stock_items_last_updated ON stock_items;

-- Remove updated_at column from stock_items only
ALTER TABLE stock_items DROP COLUMN IF EXISTS updated_at;

-- Ensure last_updated column exists with proper type and default
DO $$
BEGIN
    -- Check if last_updated column exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_items' 
        AND column_name = 'last_updated'
    ) THEN
        ALTER TABLE stock_items ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ELSE
        -- Update existing column to ensure proper type and default
        ALTER TABLE stock_items 
        ALTER COLUMN last_updated TYPE TIMESTAMP WITH TIME ZONE,
        ALTER COLUMN last_updated SET DEFAULT NOW();
    END IF;
END $$;

-- Create a specific function for stock_items last_updated
CREATE OR REPLACE FUNCTION update_stock_items_last_updated_only()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger with a unique name for stock_items
CREATE TRIGGER trigger_stock_items_last_updated_only
    BEFORE UPDATE ON stock_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_items_last_updated_only();

-- Verify the table structure
DO $$
BEGIN
    -- Check if updated_at column still exists and log it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_items' 
        AND column_name = 'updated_at'
    ) THEN
        RAISE NOTICE 'WARNING: updated_at column still exists in stock_items table';
    ELSE
        RAISE NOTICE 'SUCCESS: updated_at column has been removed from stock_items table';
    END IF;
    
    -- Verify last_updated column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_items' 
        AND column_name = 'last_updated'
    ) THEN
        RAISE NOTICE 'SUCCESS: last_updated column exists in stock_items table';
    ELSE
        RAISE NOTICE 'ERROR: last_updated column does not exist in stock_items table';
    END IF;
END $$;

-- Enable realtime for stock_items if not already enabled
DO $$
BEGIN
    -- Check if table is already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'stock_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE stock_items;
        RAISE NOTICE 'SUCCESS: stock_items added to realtime publication';
    ELSE
        RAISE NOTICE 'INFO: stock_items already in realtime publication';
    END IF;
END $$;
