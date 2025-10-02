-- Script SQL para criar a tabela business_value_history no Supabase
-- Execute este script no Supabase SQL Editor

-- Criar tabela business_value_history
CREATE TABLE IF NOT EXISTS business_value_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  business_value DECIMAL(15,2) NOT NULL,
  baseline_value DECIMAL(15,2),
  profit_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE business_value_history ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir todas as operações para usuários autenticados
CREATE POLICY "Allow all operations for authenticated users" ON business_value_history
  FOR ALL USING (auth.role() = 'authenticated');

-- Criar índice para melhor performance em consultas por data
CREATE INDEX IF NOT EXISTS idx_business_value_history_date ON business_value_history(date);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_business_value_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER trigger_update_business_value_history_updated_at
  BEFORE UPDATE ON business_value_history
  FOR EACH ROW
  EXECUTE FUNCTION update_business_value_history_updated_at();

-- Comentários para documentação
COMMENT ON TABLE business_value_history IS 'Histórico diário de valores empresariais e lucros';
COMMENT ON COLUMN business_value_history.date IS 'Data do registro (formato YYYY-MM-DD)';
COMMENT ON COLUMN business_value_history.business_value IS 'Valor empresarial total do dia';
COMMENT ON COLUMN business_value_history.baseline_value IS 'Valor baseline para cálculo de lucro (pode ser nulo)';
COMMENT ON COLUMN business_value_history.profit_value IS 'Lucro calculado (business_value - baseline_value)';
