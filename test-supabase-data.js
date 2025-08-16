// Script para verificar dados dos produtos finais no Supabase
console.log('🔍 [Teste Supabase] Verificando dados dos produtos finais...');

// Função para verificar dados no Supabase
async function checkSupabaseData() {
  try {
    console.log('📊 [Teste Supabase] Conectando ao Supabase...');
    
    // Verificar se dataManager está disponível
    if (typeof dataManager === 'undefined') {
      console.error('❌ [Teste Supabase] dataManager não está disponível');
      return;
    }
    
    // 1. Verificar produtos
    console.log('📦 [Teste Supabase] Buscando produtos...');
    const products = await dataManager.loadProducts();
    console.log(`📦 [Teste Supabase] Produtos encontrados: ${products.length}`);
    
    const targetProducts = products.filter(p => 
      p.name.includes('175 70 14') || p.name.includes('175 65 14')
    );
    
    console.log('🎯 [Teste Supabase] Produtos alvo encontrados:', targetProducts.map(p => ({
      id: p.id,
      name: p.name,
      unit: p.unit
    })));
    
    // 2. Verificar stock_items
    console.log('📊 [Teste Supabase] Buscando stock_items...');
    const stockItems = await dataManager.loadStockItems();
    console.log(`📊 [Teste Supabase] Stock items encontrados: ${stockItems.length}`);
    
    const productStockItems = stockItems.filter(item => 
      item.item_type === 'product' && 
      targetProducts.some(p => p.id === item.item_id)
    );
    
    console.log('🎯 [Teste Supabase] Stock items dos produtos alvo:', productStockItems.map(item => ({
      id: item.id,
      item_id: item.item_id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      total_value: item.total_value,
      min_level: item.min_level,
      max_level: item.max_level
    })));
    
    // 3. Comparar com valores esperados
    console.log('💰 [Teste Supabase] Comparando com valores esperados...');
    
    const expectedValues = {
      '175 70 14 P6': { costPerTire: 93.65, quantity: 1, totalValue: 93.65 },
      '175 65 14 P1': { costPerTire: 77.45, quantity: 1, totalValue: 77.45 }
    };
    
    targetProducts.forEach(product => {
      const stockItem = productStockItems.find(item => item.item_id === product.id);
      const productKey = product.name.includes('P6') ? '175 70 14 P6' : '175 65 14 P1';
      const expected = expectedValues[productKey];
      
      console.log(`\n🔍 [Teste Supabase] Análise para ${product.name}:`);
      console.log(`   - ID do produto: ${product.id}`);
      console.log(`   - Stock item encontrado: ${stockItem ? 'Sim' : 'Não'}`);
      
      if (stockItem) {
        console.log(`   - Quantidade no DB: ${stockItem.quantity} (esperado: ${expected.quantity})`);
        console.log(`   - Unit cost no DB: R$ ${stockItem.unit_cost} (esperado: R$ ${expected.costPerTire})`);
        console.log(`   - Total value no DB: R$ ${stockItem.total_value} (esperado: R$ ${expected.totalValue})`);
        console.log(`   - Min level: ${stockItem.min_level}`);
        
        // Verificar se valores estão corretos
        const quantityMatch = stockItem.quantity === expected.quantity;
        const costMatch = Math.abs(stockItem.unit_cost - expected.costPerTire) < 0.01;
        const totalMatch = Math.abs(stockItem.total_value - expected.totalValue) < 0.01;
        
        console.log(`   - ✅ Quantidade correta: ${quantityMatch}`);
        console.log(`   - ✅ Custo correto: ${costMatch}`);
        console.log(`   - ✅ Total correto: ${totalMatch}`);
        
        if (!costMatch || !totalMatch) {
          console.log(`   - 🔧 Necessário atualizar: unit_cost=${expected.costPerTire}, total_value=${expected.totalValue}`);
        }
      } else {
        console.log(`   - ❌ Stock item não encontrado para este produto`);
      }
    });
    
    // 4. Verificar se há outros dados relacionados
    console.log('\n📋 [Teste Supabase] Verificando outras tabelas relacionadas...');
    
    // Verificar se há dados em production_entries, sales, etc.
    try {
      const tables = ['production_entries', 'sales', 'defective_tire_sales'];
      for (const table of tables) {
        try {
          const data = await dataManager.supabase.from(table).select('*').limit(5);
          console.log(`📊 [Teste Supabase] ${table}: ${data.data?.length || 0} registros`);
        } catch (error) {
          console.log(`📊 [Teste Supabase] ${table}: Erro ao consultar`);
        }
      }
    } catch (error) {
      console.log('📊 [Teste Supabase] Erro ao verificar outras tabelas:', error.message);
    }
    
  } catch (error) {
    console.error('❌ [Teste Supabase] Erro ao verificar dados:', error);
  }
}

// Função para atualizar dados no Supabase se necessário
async function updateSupabaseData() {
  try {
    console.log('🔧 [Teste Supabase] Iniciando atualização de dados...');
    
    const products = await dataManager.loadProducts();
    const stockItems = await dataManager.loadStockItems();
    
    const updates = [
      {
        productName: '175 70 14 P6',
        costPerTire: 93.65,
        quantity: 1,
        totalValue: 93.65
      },
      {
        productName: '175 65 14 P1',
        costPerTire: 77.45,
        quantity: 1,
        totalValue: 77.45
      }
    ];
    
    for (const update of updates) {
      const product = products.find(p => p.name.includes(update.productName));
      if (product) {
        const stockItem = stockItems.find(item => 
          item.item_id === product.id && item.item_type === 'product'
        );
        
        if (stockItem) {
          console.log(`🔧 [Teste Supabase] Atualizando ${update.productName}...`);
          
          const updateData = {
            quantity: update.quantity,
            unit_cost: update.costPerTire,
            total_value: update.totalValue,
            last_updated: new Date().toISOString()
          };
          
          const result = await dataManager.updateStockItem(stockItem.id, updateData);
          console.log(`✅ [Teste Supabase] ${update.productName} atualizado:`, result ? 'Sucesso' : 'Erro');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ [Teste Supabase] Erro ao atualizar dados:', error);
  }
}

// Executar verificação
checkSupabaseData();

// Adicionar função global para atualizar se necessário
window.updateSupabaseStockData = updateSupabaseData;

console.log('🧪 [Teste Supabase] Verificação iniciada. Para atualizar dados, execute: updateSupabaseStockData()');
