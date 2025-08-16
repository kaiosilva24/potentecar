CREATE TABLE IF NOT EXISTS cost_simulations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  simulation_type TEXT NOT NULL CHECK (simulation_type IN ('single', 'multiple')),
  cost_options JSONB NOT NULL DEFAULT '{}',
  simulation_data JSONB NOT NULL DEFAULT '{}',
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_simulations_created_at ON cost_simulations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_simulations_name ON cost_simulations(name);
CREATE INDEX IF NOT EXISTS idx_cost_simulations_type ON cost_simulations(simulation_type);

alter publication supabase_realtime add table cost_simulations;