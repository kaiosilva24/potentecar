-- Create warranty_entries table to track individual warranty details
CREATE TABLE IF NOT EXISTS warranty_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  salesperson_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  warranty_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint to customers table
ALTER TABLE warranty_entries 
ADD CONSTRAINT fk_warranty_entries_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_warranty_entries_customer_id ON warranty_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranty_entries_warranty_date ON warranty_entries(warranty_date);

-- Enable realtime for warranty_entries
ALTER PUBLICATION supabase_realtime ADD TABLE warranty_entries;
