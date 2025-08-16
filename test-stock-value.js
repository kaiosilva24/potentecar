// Teste simples para verificar o cálculo do valor total do estoque
import { dataManager } from './src/utils/dataManager.js';

async function testStockValue() {
  try {
    console.log('🧪 Testando cálculo do valor total do estoque...');
    
    // Calcular valor total
    const totalValue = await dataManager.calculateTotalStockValue();
    console.log(`📊 Valor total calculado: R$ ${totalValue.toFixed(2)}`);
    
    // Salvar valor
    const saved = await dataManager.saveTotalStockValue(totalValue);
    console.log(`💾 Valor salvo: ${saved}`);
    
    // Carregar valor salvo
    const loadedValue = await dataManager.loadTotalStockValue();
    console.log(`📥 Valor carregado: R$ ${loadedValue.toFixed(2)}`);
    
    console.log('✅ Teste concluído!');
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testStockValue();
