-- Add warranty_loss column to production_entries table
ALTER TABLE production_entries 
ADD COLUMN IF NOT EXISTS warranty_loss INTEGER DEFAULT 0;

-- Add index for warranty_loss for better performance
CREATE INDEX IF NOT EXISTS idx_production_entries_warranty_loss ON production_entries(warranty_loss);

-- Update realtime publication to ensure new column is included
ALTER PUBLICATION supabase_realtime DROP TABLE production_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE production_entries;

-- Add helpful comment
COMMENT ON COLUMN production_entries.warranty_loss IS 'Number of products lost due to warranty claims';
