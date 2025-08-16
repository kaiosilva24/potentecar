-- Remove stock_items from realtime publication if it exists
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS stock_items;

-- Add stock_items back to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE stock_items;
