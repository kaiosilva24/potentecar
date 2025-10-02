/**
 * Função de teste manual para verificar a correção dos custos de pneus
 * Execute no console do navegador: window.testTireCostFix()
 */

import { ensureTireCostExists, DEFAULT_TIRE_COSTS, clearDefaultTireCosts, initializeDefaultTireCosts } from './defaultTireCosts';

export const testTireCostFix = async () => {
  console.log('🧪 [TestTireCostFix] Iniciando teste manual...');
  
  const problematicProduct = "165 70 13";
  const productKey = `tireAnalysis_${problematicProduct.toLowerCase().replace(/\s+/g, "_")}`;
  
  console.log('📋 [TestTireCostFix] Informações do teste:', {
    produto: problematicProduct,
    chave: productKey,
    totalProdutosPadrao: DEFAULT_TIRE_COSTS.length
  });
  
  // 1. Verificar estado inicial
  console.log('\n1️⃣ [TestTireCostFix] Verificando estado inicial...');
  const initialData = localStorage.getItem(productKey);
  console.log('Estado inicial:', {
    temDados: !!initialData,
    dadosLength: initialData?.length || 0,
    dados: initialData ? JSON.parse(initialData) : null
  });
  
  // 2. Limpar dados existentes
  console.log('\n2️⃣ [TestTireCostFix] Limpando dados existentes...');
  localStorage.removeItem(productKey);
  console.log('Dados removidos');
  
  // 3. Testar função ensureTireCostExists
  console.log('\n3️⃣ [TestTireCostFix] Testando ensureTireCostExists...');
  const cost = ensureTireCostExists(problematicProduct);
  console.log('Resultado:', {
    custo: cost,
    sucesso: cost > 0
  });
  
  // 4. Verificar se foi salvo
  console.log('\n4️⃣ [TestTireCostFix] Verificando se foi salvo...');
  const savedData = localStorage.getItem(productKey);
  const parsedData = savedData ? JSON.parse(savedData) : null;
  console.log('Dados salvos:', {
    temDados: !!savedData,
    dadosLength: savedData?.length || 0,
    custo: parsedData?.costPerTire || 0,
    fonte: parsedData?.source || 'N/A',
    isPadrao: parsedData?.isDefault || false
  });
  
  // 5. Testar inicialização completa
  console.log('\n5️⃣ [TestTireCostFix] Testando inicialização completa...');
  await initializeDefaultTireCosts();
  
  // 6. Verificar todos os produtos problemáticos
  console.log('\n6️⃣ [TestTireCostFix] Verificando produtos problemáticos...');
  const problematicProducts = ["165 70 13", "205 55 16", "195 55 16", "175 70 14"];
  
  const results = problematicProducts.map(productName => {
    const key = `tireAnalysis_${productName.toLowerCase().replace(/\s+/g, "_")}`;
    const data = localStorage.getItem(key);
    const parsed = data ? JSON.parse(data) : null;
    
    return {
      produto: productName,
      chave: key,
      inicializado: !!data,
      custo: parsed?.costPerTire || 0,
      fonte: parsed?.source || 'N/A'
    };
  });
  
  console.table(results);
  
  // 7. Resultado final
  const sucessos = results.filter(r => r.inicializado && r.custo > 0).length;
  const total = results.length;
  
  console.log(`\n🎯 [TestTireCostFix] Resultado final: ${sucessos}/${total} produtos inicializados (${Math.round(sucessos/total*100)}%)`);
  
  if (sucessos === total) {
    console.log('✅ [TestTireCostFix] TESTE PASSOU! Todos os produtos foram inicializados corretamente.');
  } else {
    console.log('❌ [TestTireCostFix] TESTE FALHOU! Alguns produtos não foram inicializados.');
  }
  
  return {
    sucesso: sucessos === total,
    taxa: Math.round(sucessos/total*100),
    resultados: results
  };
};

// Expor função globalmente para teste manual
declare global {
  interface Window {
    testTireCostFix: typeof testTireCostFix;
  }
}

if (typeof window !== 'undefined') {
  window.testTireCostFix = testTireCostFix;
}
