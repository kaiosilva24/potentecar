// Script para debug dos valores - executar no console do browser
console.log('🔍 [DEBUG] Iniciando verificação de valores...');

// Função para verificar valores diretamente do Supabase
async function debugValues() {
  try {
    // Importar supabase
    const { supabase } = await import('../supabase/supabase.js');
    const { dataManager } = await import('../utils/dataManager.js');
    
    console.log('📊 [DEBUG] Verificando dados do estoque...');
    
    // 1. Buscar itens de estoque diretamente
    const { data: stockItems, error } = await supabase
      .from('stock_items')
      .select('*')
      .order('item_name');
    
    if (error) {
      console.error('❌ [DEBUG] Erro:', error);
      return;
    }
    
    console.log(`✅ [DEBUG] Encontrados ${stockItems.length} itens:`);
    console.table(stockItems.map(item => ({
      Nome: item.item_name,
      Tipo: item.item_type,
      Quantidade: item.quantity,
      'Custo Unit.': `R$ ${item.unit_cost.toFixed(2)}`,
      'Valor Total': `R$ ${(item.quantity * item.unit_cost).toFixed(2)}`,
      'Última Atualização': item.last_updated
    })));
    
    // 2. Calcular valor total manualmente
    const totalValue = stockItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_cost);
    }, 0);
    
    console.log(`💰 [DEBUG] VALOR TOTAL CALCULADO MANUALMENTE: R$ ${totalValue.toFixed(2)}`);
    
    // 3. Verificar o que o dataManager retorna
    console.log('🔧 [DEBUG] Testando dataManager...');
    const dataManagerValue = await dataManager.calculateTotalStockValue();
    console.log(`💰 [DEBUG] VALOR DO DATAMANAGER: R$ ${dataManagerValue.toFixed(2)}`);
    
    // 4. Verificar localStorage
    console.log('🗄️ [DEBUG] Verificando localStorage...');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('stock') || key.includes('value') || key.includes('dashboard'))) {
        console.log(`📦 [DEBUG] localStorage[${key}]:`, localStorage.getItem(key));
      }
    }
    
    // 5. Comparar valores
    console.log('\n📊 [DEBUG] RESUMO COMPARATIVO:');
    console.log(`🔢 Cálculo Manual: R$ ${totalValue.toFixed(2)}`);
    console.log(`🔧 DataManager: R$ ${dataManagerValue.toFixed(2)}`);
    console.log(`🟰 Valores iguais: ${totalValue === dataManagerValue ? '✅ SIM' : '❌ NÃO'}`);
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro geral:', error);
  }
}

// Executar debug
debugValues();

// Também disponibilizar como função global
window.debugValues = debugValues;
