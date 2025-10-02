-- Tabela para histórico de alterações do sistema
-- Permite desfazer e refazer mudanças em qualquer tabela

CREATE TABLE IF NOT EXISTS change_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type VARCHAR(10) NOT NULL CHECK (operation_type IN ('CREATE', 'UPDATE', 'DELETE')),
  table_name VARCHAR(100) NOT NULL,
  record_id VARCHAR(100) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  description TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_change_history_timestamp ON change_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_change_history_table_name ON change_history(table_name);
CREATE INDEX IF NOT EXISTS idx_change_history_record_id ON change_history(record_id);
CREATE INDEX IF NOT EXISTS idx_change_history_operation_type ON change_history(operation_type);
CREATE INDEX IF NOT EXISTS idx_change_history_user_id ON change_history(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações para usuários autenticados
CREATE POLICY "Allow all operations for authenticated users" ON change_history
  FOR ALL USING (auth.role() = 'authenticated');

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_change_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_change_history_updated_at
  BEFORE UPDATE ON change_history
  FOR EACH ROW
  EXECUTE FUNCTION update_change_history_updated_at();

-- Comentários para documentação
COMMENT ON TABLE change_history IS 'Histórico de todas as alterações realizadas no sistema para permitir desfazer/refazer operações';
COMMENT ON COLUMN change_history.operation_type IS 'Tipo de operação: CREATE, UPDATE ou DELETE';
COMMENT ON COLUMN change_history.table_name IS 'Nome da tabela que foi alterada';
COMMENT ON COLUMN change_history.record_id IS 'ID do registro que foi alterado';
COMMENT ON COLUMN change_history.old_data IS 'Dados antes da alteração (para UPDATE e DELETE)';
COMMENT ON COLUMN change_history.new_data IS 'Dados após a alteração (para CREATE e UPDATE)';
COMMENT ON COLUMN change_history.user_id IS 'ID do usuário que realizou a alteração';
COMMENT ON COLUMN change_history.description IS 'Descrição da alteração realizada';
COMMENT ON COLUMN change_history.timestamp IS 'Timestamp da alteração';

-- Função para limpar histórico antigo automaticamente
CREATE OR REPLACE FUNCTION cleanup_old_change_history()
RETURNS void AS $$
BEGIN
  DELETE FROM change_history 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Histórico de alterações antigo limpo automaticamente';
END;
$$ LANGUAGE plpgsql;

-- Exemplo de como usar a função de limpeza (pode ser executado manualmente ou via cron)
-- SELECT cleanup_old_change_history();
