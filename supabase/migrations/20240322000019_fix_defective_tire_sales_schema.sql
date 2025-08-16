-- Fix defective_tire_sales table schema and ensure columns exist
-- This migration ensures the table has all required columns

-- First, check if the table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS defective_tire_sales (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tire_name text NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    unit_price decimal(10,2) NOT NULL DEFAULT 0.00,
    sale_value decimal(10,2) NOT NULL,
    description text,
    sale_date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
    -- Add quantity column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'defective_tire_sales' AND column_name = 'quantity') THEN
        ALTER TABLE defective_tire_sales ADD COLUMN quantity integer DEFAULT 1;
    END IF;
    
    -- Add unit_price column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'defective_tire_sales' AND column_name = 'unit_price') THEN
        ALTER TABLE defective_tire_sales ADD COLUMN unit_price decimal(10,2) DEFAULT 0.00;
    END IF;
END $$;

-- Update existing records to have proper values
UPDATE defective_tire_sales 
SET 
    quantity = COALESCE(quantity, 1),
    unit_price = COALESCE(unit_price, sale_value)
WHERE quantity IS NULL OR unit_price IS NULL;

-- Set NOT NULL constraints
ALTER TABLE defective_tire_sales 
ALTER COLUMN quantity SET NOT NULL,
ALTER COLUMN unit_price SET NOT NULL;

-- Add check constraints (drop first if they exist)
DO $$
BEGIN
    -- Drop existing constraints if they exist
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'defective_tire_sales' AND constraint_name = 'check_quantity_positive') THEN
        ALTER TABLE defective_tire_sales DROP CONSTRAINT check_quantity_positive;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'defective_tire_sales' AND constraint_name = 'check_unit_price_positive') THEN
        ALTER TABLE defective_tire_sales DROP CONSTRAINT check_unit_price_positive;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'defective_tire_sales' AND constraint_name = 'check_sale_value_positive') THEN
        ALTER TABLE defective_tire_sales DROP CONSTRAINT check_sale_value_positive;
    END IF;
END $$;

-- Add check constraints
ALTER TABLE defective_tire_sales 
ADD CONSTRAINT check_quantity_positive CHECK (quantity > 0),
ADD CONSTRAINT check_unit_price_positive CHECK (unit_price > 0),
ADD CONSTRAINT check_sale_value_positive CHECK (sale_value > 0);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_defective_tire_sales_sale_date ON defective_tire_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_defective_tire_sales_tire_name ON defective_tire_sales(tire_name);
CREATE INDEX IF NOT EXISTS idx_defective_tire_sales_created_at ON defective_tire_sales(created_at);

-- Enable realtime for the table
DO $$
BEGIN
    -- Check if table is already in the publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'defective_tire_sales'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE defective_tire_sales;
    END IF;
END $$;
