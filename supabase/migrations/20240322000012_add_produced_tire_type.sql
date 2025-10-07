-- Add support for produced_tire item type in stock_items table
-- This allows us to separate produced tires from generic products

-- Update the item_type column to allow 'produced_tire' as a valid value
-- Note: In PostgreSQL, we don't need to explicitly define enum constraints
-- The application will handle the validation

-- Add a comment to document the new item type
COMMENT ON COLUMN stock_items.item_type IS 'Type of item: material, product, or produced_tire';

-- Enable realtime for stock_items table if not already enabled
alter publication supabase_realtime add table stock_items;
