// Script de debug para verificar valores do dashboard
console.log('🔍 [Debug Dashboard] Iniciando verificação dos valores...');

// Função para testar valores do dataManager
async function testDataManagerValues() {
  try {
    console.log('📊 [Debug Dashboard] Testando dataManager...');
    
    // Verificar se dataManager está disponível
    if (typeof dataManager === 'undefined') {
      console.error('❌ [Debug Dashboard] dataManager não está disponível');
      return;
    }
    
    console.log('✅ [Debug Dashboard] dataManager encontrado');
    
    // Testar loadTotalStockValue
    console.log('🔍 [Debug Dashboard] Testando loadTotalStockValue...');
    const totalStockValue = await dataManager.loadTotalStockValue();
    console.log(`📊 [Debug Dashboard] Total Stock Value: R$ ${totalStockValue.toFixed(2)}`);
    
    // Testar loadAverageResaleProfit
    console.log('🔍 [Debug Dashboard] Testando loadAverageResaleProfit...');
    const averageResaleProfit = await dataManager.loadAverageResaleProfit();
    console.log(`📊 [Debug Dashboard] Average Resale Profit: R$ ${averageResaleProfit.toFixed(2)}`);
    
    // Verificar localStorage
    console.log('🔍 [Debug Dashboard] Verificando localStorage...');
    const resaleValueKey = 'resale_total_stock_value';
    const resaleValue = localStorage.getItem(resaleValueKey);
    console.log(`📊 [Debug Dashboard] localStorage[${resaleValueKey}]: ${resaleValue}`);
    
    // Verificar dados do Supabase diretamente
    console.log('🔍 [Debug Dashboard] Testando Supabase diretamente...');
    if (typeof supabase !== 'undefined') {
      const { data: stockItems } = await supabase
        .from('stock_items')
        .select('*');
      
      console.log(`📊 [Debug Dashboard] Stock Items encontrados: ${stockItems?.length || 0}`);
      
      if (stockItems && stockItems.length > 0) {
        stockItems.forEach(item => {
          console.log(`  - ${item.item_name} (${item.item_type}): Qtd ${item.quantity}, Custo ${item.unit_cost}, Total ${item.total_value}`);
        });
      }
    } else {
      console.warn('⚠️ [Debug Dashboard] supabase não está disponível');
    }
    
  } catch (error) {
    console.error('❌ [Debug Dashboard] Erro ao testar valores:', error);
  }
}

// Função para verificar o hook useMetrics
function testMetricsHook() {
  console.log('🔍 [Debug Dashboard] Verificando hook useMetrics...');
  
  // Tentar acessar o componente React que usa o hook
  const metricsGridElement = document.querySelector('[data-testid="metrics-grid"]');
  if (metricsGridElement) {
    console.log('✅ [Debug Dashboard] MetricsGrid encontrado no DOM');
  } else {
    console.warn('⚠️ [Debug Dashboard] MetricsGrid não encontrado no DOM');
  }
  
  // Verificar se há elementos com valores zerados
  const currencyElements = document.querySelectorAll('[data-format="currency"]');
  console.log(`📊 [Debug Dashboard] Elementos de moeda encontrados: ${currencyElements.length}`);
  
  currencyElements.forEach((element, index) => {
    const text = element.textContent || '';
    console.log(`  - Elemento ${index + 1}: "${text}"`);
    if (text.includes('R$ 0,00')) {
      console.warn(`⚠️ [Debug Dashboard] Valor zerado encontrado: "${text}"`);
    }
  });
}

// Executar testes
console.log('🚀 [Debug Dashboard] Executando testes...');

// Aguardar um pouco para garantir que a página carregou
setTimeout(() => {
  testDataManagerValues();
  testMetricsHook();
}, 2000);

// Disponibilizar funções globalmente
window.testDataManagerValues = testDataManagerValues;
window.testMetricsHook = testMetricsHook;

console.log('✅ [Debug Dashboard] Script carregado. Execute testDataManagerValues() ou testMetricsHook() manualmente se necessário.');
