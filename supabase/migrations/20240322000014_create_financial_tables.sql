-- Create fixed_costs table
CREATE TABLE IF NOT EXISTS fixed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create variable_costs table
CREATE TABLE IF NOT EXISTS variable_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cash_flow_entries table
CREATE TABLE IF NOT EXISTS cash_flow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  reference_id UUID,
  reference_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create salespeople table
CREATE TABLE IF NOT EXISTS salespeople (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  contact TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fixed_costs_archived ON fixed_costs(archived);
CREATE INDEX IF NOT EXISTS idx_variable_costs_archived ON variable_costs(archived);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_type ON cash_flow_entries(type);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_date ON cash_flow_entries(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_category ON cash_flow_entries(category);
CREATE INDEX IF NOT EXISTS idx_salespeople_archived ON salespeople(archived);

-- Enable realtime for financial tables
alter publication supabase_realtime add table fixed_costs;
alter publication supabase_realtime add table variable_costs;
alter publication supabase_realtime add table cash_flow_entries;
alter publication supabase_realtime add table salespeople;

-- Create triggers for updated_at
CREATE TRIGGER update_fixed_costs_updated_at BEFORE UPDATE ON fixed_costs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_variable_costs_updated_at BEFORE UPDATE ON variable_costs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salespeople_updated_at BEFORE UPDATE ON salespeople FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
