-- Script SQL para criar a tabela debts no Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- Criar tabela debts
CREATE TABLE IF NOT EXISTS debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  remaining_amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'em_dia' CHECK (status IN ('em_dia', 'vencida', 'paga')),
  category TEXT DEFAULT 'Outros',
  creditor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações para usuários autenticados
CREATE POLICY "Allow all operations for authenticated users" ON debts
  FOR ALL USING (auth.role() = 'authenticated');

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);
CREATE INDEX IF NOT EXISTS idx_debts_category ON debts(category);
CREATE INDEX IF NOT EXISTS idx_debts_created_at ON debts(created_at);

-- Inserir dados de exemplo (opcional - remova se não quiser dados de teste)
INSERT INTO debts (description, total_amount, paid_amount, remaining_amount, due_date, status, category, creditor) VALUES
  ('Financiamento de equipamentos', 50000.00, 15000.00, 35000.00, '2025-12-31', 'em_dia', 'Financiamento', 'Banco XYZ'),
  ('Fornecedor de matéria-prima', 8000.00, 0.00, 8000.00, '2025-08-20', 'em_dia', 'Fornecedor', 'Borracha Ltda')
ON CONFLICT (id) DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 'Tabela debts criada com sucesso!' as status;
SELECT COUNT(*) as total_debts FROM debts;
