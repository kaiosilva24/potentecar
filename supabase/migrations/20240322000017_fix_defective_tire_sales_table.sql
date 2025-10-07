-- Fix defective_tire_sales table structure and add proper indexes

-- Ensure the table exists with correct structure
CREATE TABLE IF NOT EXISTS defective_tire_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tire_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    sale_value NUMERIC NOT NULL CHECK (sale_value >= 0),
    description TEXT,
    sale_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_defective_tire_sales_created_at ON defective_tire_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_defective_tire_sales_sale_date ON defective_tire_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_defective_tire_sales_tire_name ON defective_tire_sales(tire_name);

-- Enable realtime (only if not already added)
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'defective_tire_sales'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE defective_tire_sales;
    END IF;
END $;

-- Add helpful comments
COMMENT ON TABLE defective_tire_sales IS 'Stores sales of defective tires';
COMMENT ON COLUMN defective_tire_sales.tire_name IS 'Name/type of the defective tire';
COMMENT ON COLUMN defective_tire_sales.quantity IS 'Number of tires sold';
COMMENT ON COLUMN defective_tire_sales.unit_price IS 'Price per tire unit';
COMMENT ON COLUMN defective_tire_sales.sale_value IS 'Total sale value (quantity * unit_price)';
COMMENT ON COLUMN defective_tire_sales.description IS 'Optional description of the defect or sale details';
COMMENT ON COLUMN defective_tire_sales.sale_date IS 'Date when the sale occurred';
