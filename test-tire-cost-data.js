// Teste para verificar dados do TireCostManager no localStorage
console.log('🔍 [Teste TireCost] Verificando dados do TireCostManager...');

// Função para listar todos os dados relacionados a pneus no localStorage
function checkTireCostData() {
  console.log('📊 [Teste TireCost] Verificando localStorage...');
  
  const allKeys = Object.keys(localStorage);
  const tireKeys = allKeys.filter(key => 
    key.includes('tire') || 
    key.includes('Tire') || 
    key.includes('cost') || 
    key.includes('Cost') ||
    key.includes('analysis') ||
    key.includes('Analysis')
  );
  
  console.log(`🔑 [Teste TireCost] Chaves relacionadas a pneus encontradas: ${tireKeys.length}`);
  
  tireKeys.forEach(key => {
    try {
      const data = localStorage.getItem(key);
      const parsed = JSON.parse(data);
      console.log(`📋 [Teste TireCost] ${key}:`, parsed);
    } catch (error) {
      console.log(`📋 [Teste TireCost] ${key}: ${data} (não é JSON)`);
    }
  });
  
  // Verificar chaves específicas dos produtos
  const productNames = ['175 70 14 P6', '175 65 14 P1'];
  
  productNames.forEach(productName => {
    const productKey = `tireAnalysis_${productName.toLowerCase().replace(/\s+/g, "_")}`;
    const data = localStorage.getItem(productKey);
    
    console.log(`🎯 [Teste TireCost] ${productName}:`);
    console.log(`   - Chave: ${productKey}`);
    console.log(`   - Dados: ${data ? 'Encontrados' : 'Não encontrados'}`);
    
    if (data) {
      try {
        const parsed = JSON.parse(data);
        console.log(`   - Custo por pneu: R$ ${parsed.costPerTire || 'N/A'}`);
        console.log(`   - Dados completos:`, parsed);
      } catch (error) {
        console.log(`   - Erro ao parsear: ${error.message}`);
      }
    }
  });
  
  // Verificar custo médio sincronizado
  const avgCostData = localStorage.getItem('dashboard_averageCostPerTire');
  console.log(`💰 [Teste TireCost] Custo médio sincronizado:`, avgCostData ? JSON.parse(avgCostData) : 'Não encontrado');
}

// Função para simular dados de teste se não existirem
function createTestData() {
  console.log('🧪 [Teste TireCost] Criando dados de teste...');
  
  const testData = [
    {
      name: '175 70 14 P6',
      costPerTire: 93.65
    },
    {
      name: '175 65 14 P1', 
      costPerTire: 77.45
    }
  ];
  
  testData.forEach(product => {
    const productKey = `tireAnalysis_${product.name.toLowerCase().replace(/\s+/g, "_")}`;
    const analysisData = {
      costPerTire: product.costPerTire,
      timestamp: Date.now(),
      source: 'test-data'
    };
    
    localStorage.setItem(productKey, JSON.stringify(analysisData));
    console.log(`✅ [Teste TireCost] Dados criados para ${product.name}: R$ ${product.costPerTire}`);
  });
  
  // Criar custo médio se não existir
  if (!localStorage.getItem('dashboard_averageCostPerTire')) {
    const avgCostData = {
      value: 85.55,
      timestamp: Date.now(),
      source: 'test-data'
    };
    localStorage.setItem('dashboard_averageCostPerTire', JSON.stringify(avgCostData));
    console.log('✅ [Teste TireCost] Custo médio criado: R$ 85,55');
  }
}

// Executar testes
checkTireCostData();

// Se não houver dados, criar dados de teste
const hasData = localStorage.getItem('tireanalysis_175_70_14_p6') || 
                localStorage.getItem('dashboard_averageCostPerTire');

if (!hasData) {
  console.log('⚠️ [Teste TireCost] Nenhum dado encontrado, criando dados de teste...');
  createTestData();
  
  setTimeout(() => {
    console.log('🔄 [Teste TireCost] Verificando dados após criação...');
    checkTireCostData();
  }, 1000);
} else {
  console.log('✅ [Teste TireCost] Dados encontrados no localStorage!');
}

console.log('🧪 [Teste TireCost] Teste concluído. Recarregue a página para ver os novos valores no tooltip!');
