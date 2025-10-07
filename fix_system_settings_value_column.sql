-- Script para corrigir o tipo da coluna 'value' na tabela 'system_settings'
-- Altera a coluna 'value' para o tipo TEXT para permitir o armazenamento de objetos JSON.

ALTER TABLE public.system_settings
ALTER COLUMN value TYPE TEXT;
-- O erro indica que a coluna está como NUMERIC quando deveria ser TEXT

-- Primeiro, vamos verificar o tipo atual da coluna
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'system_settings' AND column_name = 'value';

-- Alterar o tipo da coluna de NUMERIC para TEXT
ALTER TABLE system_settings 
ALTER COLUMN value TYPE TEXT;

-- Verificar se a alteração foi aplicada
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'system_settings' AND column_name = 'value';

-- Opcional: Limpar dados existentes se houver algum problema
-- DELETE FROM system_settings WHERE key = 'stock_chart_colors';
