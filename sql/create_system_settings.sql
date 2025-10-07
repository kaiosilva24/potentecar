-- Criar tabela system_settings para armazenar configurações do sistema
-- Incluindo o custo médio por pneu para sincronização em tempo real

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    value DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para busca rápida por chave
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

-- Inserir valor inicial do custo médio por pneu
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'average_tire_cost',
    101.09,
    'Custo médio por pneu calculado pelo sistema financeiro'
)
ON CONFLICT (key) DO NOTHING;

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY IF NOT EXISTS "Allow read access to system_settings" 
ON public.system_settings FOR SELECT 
TO authenticated 
USING (true);

-- Política para permitir escrita para usuários autenticados
CREATE POLICY IF NOT EXISTS "Allow write access to system_settings" 
ON public.system_settings FOR ALL 
TO authenticated 
USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER IF NOT EXISTS update_system_settings_updated_at 
    BEFORE UPDATE ON public.system_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.system_settings IS 'Configurações do sistema para valores dinâmicos';
COMMENT ON COLUMN public.system_settings.key IS 'Chave única da configuração';
COMMENT ON COLUMN public.system_settings.value IS 'Valor numérico da configuração';
COMMENT ON COLUMN public.system_settings.description IS 'Descrição da configuração';
