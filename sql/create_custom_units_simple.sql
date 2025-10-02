-- SQL CORRETO para criar tabela custom_units
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- Deletar se existir
DROP TABLE IF EXISTS custom_units CASCADE;

-- Criar com a estrutura EXATA que o sistema espera
CREATE TABLE custom_units (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    unit_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE custom_units ENABLE ROW LEVEL SECURITY;

-- Política simples
CREATE POLICY "custom_units_policy" ON custom_units FOR ALL USING (true);
