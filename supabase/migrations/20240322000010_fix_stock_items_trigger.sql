-- Remove ALL triggers that might be using updated_at
DROP TRIGGER IF EXISTS update_stock_items_updated_at ON stock_items;
DROP TRIGGER IF EXISTS set_updated_at ON stock_items;
DROP TRIGGER IF EXISTS handle_updated_at ON stock_items;
DROP TRIGGER IF EXISTS update_stock_items_last_updated ON stock_items;
DROP TRIGGER IF EXISTS stock_items_updated_at ON stock_items;
DROP TRIGGER IF EXISTS trigger_updated_at ON stock_items;

-- Remove any functions that might be using updated_at
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS set_updated_at();
DROP FUNCTION IF EXISTS handle_updated_at();

-- Ensure updated_at column is completely removed
ALTER TABLE stock_items DROP COLUMN IF EXISTS updated_at;

-- Ensure last_updated column exists with proper type and default
ALTER TABLE stock_items 
ALTER COLUMN last_updated TYPE TIMESTAMP WITH TIME ZONE,
ALTER COLUMN last_updated SET DEFAULT NOW();

-- Create a clean function for last_updated
CREATE OR REPLACE FUNCTION update_stock_items_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger with a unique name
CREATE TRIGGER trigger_update_stock_items_last_updated
    BEFORE UPDATE ON stock_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_items_last_updated();

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
