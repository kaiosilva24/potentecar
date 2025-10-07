-- Add production_loss and material_loss columns to production_entries table
ALTER TABLE production_entries 
ADD COLUMN IF NOT EXISTS production_loss INTEGER,
ADD COLUMN IF NOT EXISTS material_loss JSONB;

-- Add index for production_loss for better performance
CREATE INDEX IF NOT EXISTS idx_production_entries_production_loss ON production_entries(production_loss);

-- Update realtime publication to ensure new columns are included
alter publication supabase_realtime drop table production_entries;
alter publication supabase_realtime add table production_entries;
