// Teste de sincronização em tempo real entre componentes
console.log('🧪 [Teste] Iniciando teste de sincronização em tempo real...');

// Simular evento do StockCharts
function testStockChartsEvent() {
  console.log('📡 [Teste] Disparando evento stockChartsDataUpdated...');
  
  const event = new CustomEvent('stockChartsDataUpdated', {
    detail: {
      source: 'StockCharts-Test',
      timestamp: Date.now(),
      finalProductsData: [
        { name: 'Produto Teste 1', quantity: 10, value: 100 },
        { name: 'Produto Teste 2', quantity: 5, value: 50 }
      ]
    }
  });
  
  window.dispatchEvent(event);
  console.log('✅ [Teste] Evento disparado com sucesso');
}

// Simular evento do Supabase Realtime
function testSupabaseRealtimeEvent() {
  console.log('⚡ [Teste] Disparando evento stockChartsRealTimeUpdate...');
  
  const event = new CustomEvent('stockChartsRealTimeUpdate', {
    detail: {
      source: 'Supabase-Test',
      timestamp: Date.now(),
      payload: {
        eventType: 'UPDATE',
        table: 'stock_items',
        new: { id: 'test-123', quantity: 15 }
      }
    }
  });
  
  window.dispatchEvent(event);
  console.log('✅ [Teste] Evento Supabase disparado com sucesso');
}

// Configurar listeners de teste
function setupTestListeners() {
  console.log('🔔 [Teste] Configurando listeners de teste...');
  
  window.addEventListener('stockChartsDataUpdated', (event) => {
    console.log('📡 [Teste] Evento stockChartsDataUpdated recebido:', event.detail);
  });
  
  window.addEventListener('stockChartsRealTimeUpdate', (event) => {
    console.log('⚡ [Teste] Evento stockChartsRealTimeUpdate recebido:', event.detail);
  });
  
  console.log('✅ [Teste] Listeners configurados');
}

// Executar teste
setupTestListeners();

// Aguardar um pouco e disparar eventos de teste
setTimeout(() => {
  testStockChartsEvent();
}, 1000);

setTimeout(() => {
  testSupabaseRealtimeEvent();
}, 2000);

console.log('🧪 [Teste] Teste configurado. Aguarde os eventos...');
