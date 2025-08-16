-- Add quantity and unit_price columns to defective_tire_sales table
-- This ensures compatibility with the frontend interface

ALTER TABLE defective_tire_sales 
ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_price decimal(10,2) DEFAULT 0.00;

-- Update existing records to have proper quantity and unit_price values
-- Assume quantity = 1 and unit_price = sale_value for existing records
UPDATE defective_tire_sales 
SET 
  quantity = 1,
  unit_price = sale_value
WHERE quantity IS NULL OR unit_price IS NULL;

-- Add constraints to ensure data integrity
ALTER TABLE defective_tire_sales 
ALTER COLUMN quantity SET NOT NULL,
ALTER COLUMN unit_price SET NOT NULL;

-- Add check constraints
ALTER TABLE defective_tire_sales 
ADD CONSTRAINT check_quantity_positive CHECK (quantity > 0),
ADD CONSTRAINT check_unit_price_positive CHECK (unit_price > 0),
ADD CONSTRAINT check_sale_value_positive CHECK (sale_value > 0);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_defective_tire_sales_sale_date ON defective_tire_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_defective_tire_sales_tire_name ON defective_tire_sales(tire_name);

-- Enable realtime for the table (only if not already added)
DO $
BEGIN
    -- Check if table is already in the publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'defective_tire_sales'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE defective_tire_sales;
    END IF;
END $;
