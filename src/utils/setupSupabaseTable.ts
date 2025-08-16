import { supabase } from '../../supabase/supabase';

/**
 * Script para criar automaticamente a tabela system_settings no Supabase
 * Este script resolve os erros 404 dos cards do dashboard
 */

export async function setupSystemSettingsTable(): Promise<boolean> {
  try {
    console.log('🚀 [SetupSupabase] Verificando tabela system_settings...');
    
    // Usar any para contornar restrições de TypeScript
    const { error } = await (supabase as any).from('system_settings').select('*').limit(1);
    
    if (error) {
      console.log('❌ [SetupSupabase] Tabela system_settings não existe!');
      console.log('📝 [SetupSupabase] INSTRUÇÕES PARA CORRIGIR:');
      console.log('📝 [SetupSupabase] 1. Acesse: https://supabase.com/dashboard');
      console.log('📝 [SetupSupabase] 2. Selecione seu projeto: yrxixhpnepuccpvungnc');
      console.log('📝 [SetupSupabase] 3. Vá para SQL Editor');
      console.log('📝 [SetupSupabase] 4. Execute o arquivo: create_system_settings_table.sql');
      console.log('📝 [SetupSupabase] 5. Recarregue a página após executar');
      return false;
    }
    
    console.log('✅ [SetupSupabase] Tabela system_settings existe e está acessível!');
    return true;
    
  } catch (error) {
    console.error('❌ [SetupSupabase] Erro ao verificar tabela:', error);
    console.log('📝 [SetupSupabase] Execute o SQL manualmente no Supabase Dashboard');
    return false;
  }
}

/**
 * Verificar se a tabela system_settings existe e tem dados
 */
export async function checkSystemSettingsTable(): Promise<boolean> {
  try {
    console.log('🔍 [SetupSupabase] Verificando tabela system_settings...');

    // Usar any para contornar restrições de TypeScript
    const { data, error } = await (supabase as any)
      .from('system_settings')
      .select('key, value')
      .limit(1);

    if (error) {
      console.warn('⚠️ [SetupSupabase] Tabela system_settings não existe ou não acessível:', error.message);
      return false;
    }

    console.log('✅ [SetupSupabase] Tabela system_settings existe e está acessível!');
    return true;

  } catch (error) {
    console.error('❌ [SetupSupabase] Erro ao verificar tabela:', error);
    return false;
  }
}

/**
 * Setup da tabela debts no Supabase
 */
export async function setupDebtsTable(): Promise<boolean> {
  try {
    console.log('🚀 [SetupSupabase] Verificando tabela debts...');
    
    // Verificar se a tabela existe
    const { error } = await (supabase as any).from('debts').select('*').limit(1);
    
    if (error) {
      console.log('❌ [SetupSupabase] Tabela debts não existe!');
      console.log('📝 [SetupSupabase] INSTRUÇÕES PARA CRIAR TABELA DEBTS:');
      console.log('📝 [SetupSupabase] 1. Acesse: https://supabase.com/dashboard');
      console.log('📝 [SetupSupabase] 2. Selecione seu projeto: yrxixhpnepuccpvungnc');
      console.log('📝 [SetupSupabase] 3. Vá para SQL Editor');
      console.log('📝 [SetupSupabase] 4. Execute o seguinte SQL:');
      console.log(`
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

-- Enable RLS
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON debts
  FOR ALL USING (auth.role() = 'authenticated');
      `);
      console.log('📝 [SetupSupabase] 5. Recarregue a página após executar');
      return false;
    }
    
    console.log('✅ [SetupSupabase] Tabela debts existe e está acessível!');
    return true;
    
  } catch (error) {
    console.error('❌ [SetupSupabase] Erro ao verificar tabela debts:', error);
    console.log('📝 [SetupSupabase] Execute o SQL manualmente no Supabase Dashboard');
    return false;
  }
}

/**
 * Setup da tabela tire_cost_history no Supabase
 */
export async function setupTireCostHistoryTable(): Promise<boolean> {
  try {
    console.log('🚀 [SetupSupabase] Verificando tabela tire_cost_history...');
    
    // Verificar se a tabela existe
    const { error } = await (supabase as any).from('tire_cost_history').select('*').limit(1);
    
    if (error) {
      console.log('❌ [SetupSupabase] Tabela tire_cost_history não existe!');
      console.log('📝 [SetupSupabase] INSTRUÇÕES PARA CRIAR TABELA TIRE_COST_HISTORY:');
      console.log('📝 [SetupSupabase] 1. Acesse: https://supabase.com/dashboard');
      console.log('📝 [SetupSupabase] 2. Selecione seu projeto: yrxixhpnepuccpvungnc');
      console.log('📝 [SetupSupabase] 3. Vá para SQL Editor');
      console.log('📝 [SetupSupabase] 4. Execute o seguinte SQL:');
      console.log(`
CREATE TABLE IF NOT EXISTS tire_cost_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  average_cost_per_tire DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tire_cost_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON tire_cost_history
  FOR ALL USING (auth.role() = 'authenticated');

-- Create index for better performance on date queries
CREATE INDEX IF NOT EXISTS idx_tire_cost_history_date ON tire_cost_history(date);
      `);
      console.log('📝 [SetupSupabase] 5. Recarregue a página após executar');
      return false;
    }
    
    console.log('✅ [SetupSupabase] Tabela tire_cost_history existe e está acessível!');
    return true;
    
  } catch (error) {
    console.error('❌ [SetupSupabase] Erro ao verificar tabela tire_cost_history:', error);
    console.log('📝 [SetupSupabase] Execute o SQL manualmente no Supabase Dashboard');
    return false;
  }
}

/**
 * Função principal para configurar tudo automaticamente
 */
export async function autoSetupSupabase(): Promise<boolean> {
  try {
    console.log('🚀 [AutoSetupSupabase] Iniciando configuração automática...');
    
    // Verificar e configurar system_settings
    const systemSettingsOk = await setupSystemSettingsTable();
    
    // Verificar e configurar debts
    const debtsOk = await setupDebtsTable();
    
    // Verificar e configurar tire_cost_history
    const tireCostHistoryOk = await setupTireCostHistoryTable();
    
    if (!systemSettingsOk) {
      console.log('❌ [AutoSetupSupabase] Falha na configuração de system_settings');
    }
    
    if (!debtsOk) {
      console.log('❌ [AutoSetupSupabase] Falha na configuração de debts');
    }
    
    const allOk = systemSettingsOk && debtsOk;
    
    if (allOk) {
      console.log('✅ [AutoSetupSupabase] Configuração automática concluída com sucesso!');
    } else {
      console.log('⚠️ [AutoSetupSupabase] Configuração parcial - algumas tabelas precisam ser criadas manualmente');
    }
    
    return allOk;
    
  } catch (error) {
    console.error('❌ [AutoSetupSupabase] Erro na configuração automática:', error);
    return false;
  }
}
