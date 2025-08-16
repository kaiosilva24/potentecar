
-- Create resale_products_stock table
CREATE TABLE IF NOT EXISTS resale_products_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resale_product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  profit_margin DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resale_product_id)
);

-- Add foreign key constraint to resale_products table
ALTER TABLE resale_products_stock 
ADD CONSTRAINT fk_resale_products_stock_product 
FOREIGN KEY (resale_product_id) REFERENCES resale_products(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resale_products_stock_product_id ON resale_products_stock(resale_product_id);
CREATE INDEX IF NOT EXISTS idx_resale_products_stock_quantity ON resale_products_stock(quantity);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE resale_products_stock;

-- Add RLS policies
ALTER TABLE resale_products_stock ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to select
CREATE POLICY "Allow authenticated users to view resale products stock" ON resale_products_stock
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy to allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert resale products stock" ON resale_products_stock
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy to allow authenticated users to update
CREATE POLICY "Allow authenticated users to update resale products stock" ON resale_products_stock
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy to allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete resale products stock" ON resale_products_stock
    FOR DELETE USING (auth.role() = 'authenticated');
