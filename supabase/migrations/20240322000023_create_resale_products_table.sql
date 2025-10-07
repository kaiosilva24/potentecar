-- Create resale_products table
CREATE TABLE IF NOT EXISTS resale_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  supplier_id UUID,
  supplier_name TEXT NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  profit_margin DECIMAL(5,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  category TEXT,
  description TEXT,
  min_stock_level INTEGER,
  max_stock_level INTEGER,
  current_stock INTEGER,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint to suppliers table
ALTER TABLE resale_products 
ADD CONSTRAINT fk_resale_products_supplier 
FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resale_products_name ON resale_products(name);
CREATE INDEX IF NOT EXISTS idx_resale_products_sku ON resale_products(sku);
CREATE INDEX IF NOT EXISTS idx_resale_products_supplier ON resale_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_resale_products_archived ON resale_products(archived);
CREATE INDEX IF NOT EXISTS idx_resale_products_category ON resale_products(category);

-- Enable realtime for the table
alter publication supabase_realtime add table resale_products;
