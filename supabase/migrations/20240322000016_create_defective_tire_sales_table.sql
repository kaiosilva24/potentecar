-- Create defective_tire_sales table
CREATE TABLE IF NOT EXISTS defective_tire_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tire_name TEXT NOT NULL,
  sale_value DECIMAL(10,2) NOT NULL CHECK (sale_value >= 0),
  description TEXT,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable realtime for defective_tire_sales
ALTER PUBLICATION supabase_realtime ADD TABLE defective_tire_sales;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_defective_tire_sales_sale_date ON defective_tire_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_defective_tire_sales_tire_name ON defective_tire_sales(tire_name);
CREATE INDEX IF NOT EXISTS idx_defective_tire_sales_created_at ON defective_tire_sales(created_at DESC);
