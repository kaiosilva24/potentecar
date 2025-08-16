// Script de teste para debug do cadastro de dívidas
// Execute com: node test_debt.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yrxixhpnepuccpvungnc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyeGl4aHBuZXB1Y2NwdnVuZ25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM0MDk1NzMsImV4cCI6MjAzODk4NTU3M30.7YNOqPKNhNMJKzFYOQaOxjdFUFJvJZjlXYJJdCKHOJg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDebtCreation() {
  console.log('🔍 [TEST] Iniciando teste de cadastro de dívida...');
  
  // 1. Verificar se a tabela existe
  console.log('📋 [TEST] Verificando se tabela "debts" existe...');
  try {
    const { data: tables, error: tablesError } = await supabase
      .from('debts')
      .select('*')
      .limit(1);
    
    if (tablesError) {
      console.error('❌ [TEST] Erro ao acessar tabela debts:', tablesError);
      return;
    }
    
    console.log('✅ [TEST] Tabela "debts" existe e é acessível');
    console.log('📊 [TEST] Dados existentes:', tables);
  } catch (error) {
    console.error('❌ [TEST] Erro geral ao verificar tabela:', error);
    return;
  }
  
  // 2. Tentar inserir uma dívida de teste
  console.log('💾 [TEST] Tentando inserir dívida de teste...');
  
  const testDebt = {
    description: 'Teste de dívida via script',
    total_amount: 1000.00,
    paid_amount: 0,
    remaining_amount: 1000.00,
    due_date: '2025-12-31',
    status: 'em_dia',
    category: 'Teste',
    creditor: 'Credor Teste'
  };
  
  console.log('📝 [TEST] Dados da dívida:', testDebt);
  
  try {
    const { data, error } = await supabase
      .from('debts')
      .insert([testDebt])
      .select();
    
    if (error) {
      console.error('❌ [TEST] Erro ao inserir dívida:', error);
      console.error('❌ [TEST] Detalhes do erro:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ [TEST] Dívida inserida com sucesso!');
      console.log('📥 [TEST] Dados retornados:', data);
      
      // 3. Verificar se a dívida foi realmente salva
      console.log('🔍 [TEST] Verificando se dívida foi salva...');
      const { data: savedDebt, error: selectError } = await supabase
        .from('debts')
        .select('*')
        .eq('id', data[0].id);
      
      if (selectError) {
        console.error('❌ [TEST] Erro ao verificar dívida salva:', selectError);
      } else {
        console.log('✅ [TEST] Dívida confirmada no banco:', savedDebt);
      }
    }
  } catch (error) {
    console.error('❌ [TEST] Erro geral ao inserir:', error);
  }
}

// Executar teste
testDebtCreation().then(() => {
  console.log('🏁 [TEST] Teste finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 [TEST] Erro fatal:', error);
  process.exit(1);
});
