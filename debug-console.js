// COLE ESTE CÓDIGO NO CONSOLE DO NAVEGADOR E PRESSIONE ENTER

console.log('🔍 [DEBUG] Script de debug carregado!');

// Função para debug dos valores
async function debugStockValues() {
  console.log('🔍 [DEBUG] Executando verificação de valores...');
  
  try {
    // Verificar se o supabase está disponível
    if (typeof window.supabase === 'undefined') {
      console.error('❌ [DEBUG] Supabase não encontrado. Tentando importar...');
      
      // Tentar acessar via módulos globais
      const supabaseModule = await import('/src/supabase/supabase.ts');
      window.supabase = supabaseModule.supabase;
    }
    
    // Buscar dados diretamente do Supabase
    const { data: stockItems, error } = await window.supabase
      .from('stock_items')
      .select('*')
      .order('item_name');
    
    if (error) {
      console.error('❌ [DEBUG] Erro ao buscar dados:', error);
      return;
    }
    
    console.log(`✅ [DEBUG] Encontrados ${stockItems.length} itens de estoque:`);
    console.table(stockItems.map(item => ({
      Nome: item.item_name,
      Tipo: item.item_type,
      Quantidade: item.quantity,
      'Custo Unit.': `R$ ${item.unit_cost.toFixed(2)}`,
      'Valor Total': `R$ ${(item.quantity * item.unit_cost).toFixed(2)}`,
      'Atualizado': item.last_updated
    })));
    
    // Calcular valor total manualmente
    const totalManual = stockItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_cost);
    }, 0);
    
    console.log('📊 [DEBUG] COMPARAÇÃO DE VALORES:');
    console.log(`🔢 Cálculo Manual: R$ ${totalManual.toFixed(2)}`);
    
    // Verificar localStorage
    console.log('🗄 [DEBUG] Verificando localStorage...');
    let hasStockCache = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('stock') || key.includes('value') || key.includes('dashboard'))) {
        console.log(`🗎 localStorage[${key}]:`, localStorage.getItem(key));
        hasStockCache = true;
      }
    }
    
    if (!hasStockCache) {
      console.log('✅ [DEBUG] Nenhum cache de estoque encontrado no localStorage');
    }
    
    // Verificar se há dataManager disponível
    try {
      if (typeof window.dataManager !== 'undefined') {
        const totalDataManager = await window.dataManager.calculateTotalStockValue();
        console.log(`🔧 DataManager: R$ ${totalDataManager.toFixed(2)}`);
        console.log(`🎯 Valores iguais: ${totalManual === totalDataManager ? '✅ SIM' : '❌ NÃO'}`);
      } else {
        console.log('⚠️ [DEBUG] DataManager não disponível no escopo global');
      }
    } catch (error) {
      console.log('⚠️ [DEBUG] Erro ao acessar dataManager:', error.message);
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro geral:', error);
  }
}

// Disponibilizar função globalmente
window.debugStockValues = debugStockValues;

console.log('✅ [DEBUG] Para executar o debug, digite: debugStockValues()');
console.log('🔍 [DEBUG] Ou simplesmente: debugStockValues()');
