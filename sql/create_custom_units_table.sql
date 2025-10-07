-- Criação da tabela custom_units para unidades personalizadas
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- Primeiro, deletar a tabela se existir (para recriação limpa)
DROP TABLE IF EXISTS public.custom_units CASCADE;

-- Criar a tabela
CREATE TABLE public.custom_units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(20) NOT NULL,
    description TEXT,
    conversion_factor DECIMAL(10,6) DEFAULT 1.0,
    base_unit VARCHAR(20) DEFAULT 'un',
    category VARCHAR(50) DEFAULT 'custom',
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.custom_units ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações
CREATE POLICY "Enable all operations for custom_units" ON public.custom_units
    FOR ALL USING (true);

-- Tabela criada com sucesso!
-- Agora você pode usar a tabela custom_units no sistema

-- Inserir algumas unidades padrão como exemplo (opcional)
-- INSERT INTO public.custom_units (name, abbreviation, description, conversion_factor, base_unit, category) VALUES
--     ('Metro Quadrado', 'm²', 'Unidade de área', 1.0, 'm', 'area'),
--     ('Metro Cúbico', 'm³', 'Unidade de volume', 1.0, 'm', 'volume'),
--     ('Centímetro', 'cm', 'Unidade de comprimento', 0.01, 'm', 'length'),
--     ('Milímetro', 'mm', 'Unidade de comprimento', 0.001, 'm', 'length'),
--     ('Tonelada', 't', 'Unidade de peso', 1000.0, 'kg', 'weight'),
--     ('Pacote', 'pct', 'Unidade de embalagem', 1.0, 'un', 'packaging'),
--     ('Caixa', 'cx', 'Unidade de embalagem', 1.0, 'un', 'packaging'),
--     ('Dúzia', 'dz', 'Conjunto de 12 unidades', 12.0, 'un', 'quantity');

-- Comentários para documentação
COMMENT ON TABLE public.custom_units IS 'Tabela para armazenar unidades de medida personalizadas';
COMMENT ON COLUMN public.custom_units.name IS 'Nome completo da unidade';
COMMENT ON COLUMN public.custom_units.abbreviation IS 'Abreviação da unidade';
COMMENT ON COLUMN public.custom_units.conversion_factor IS 'Fator de conversão para a unidade base';
COMMENT ON COLUMN public.custom_units.base_unit IS 'Unidade base para conversão';
COMMENT ON COLUMN public.custom_units.category IS 'Categoria da unidade (weight, length, volume, etc.)';
