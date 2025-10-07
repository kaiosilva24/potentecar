-- Criar tabela system_settings para armazenar configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela criada sem valores iniciais fixos
-- Os valores serão inseridos automaticamente quando calculados pelo sistema
-- Funciona como checkpoint: salva o último valor calculado e carrega ao iniciar

-- Habilitar RLS (Row Level Security)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura e escrita para usuários autenticados
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_settings' 
    AND policyname = 'Allow authenticated users to read system_settings'
  ) THEN
    CREATE POLICY "Allow authenticated users to read system_settings" ON system_settings
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_settings' 
    AND policyname = 'Allow authenticated users to update system_settings'
  ) THEN
    CREATE POLICY "Allow authenticated users to update system_settings" ON system_settings
      FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_settings' 
    AND policyname = 'Allow authenticated users to insert system_settings'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert system_settings" ON system_settings
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Comentários para documentação
COMMENT ON TABLE system_settings IS 'Tabela para armazenar configurações dinâmicas do sistema';
COMMENT ON COLUMN system_settings.key IS 'Chave única da configuração';
COMMENT ON COLUMN system_settings.value IS 'Valor numérico da configuração';
COMMENT ON COLUMN system_settings.description IS 'Descrição da configuração';
