import { dataManager } from './dataManager';

/**
 * Gerenciador de lucro da produção
 * Responsável por calcular e adicionar o lucro da produção ao baseline do lucro empresarial
 */
export class ProductionProfitManager {
  
  /**
   * Função para calcular a diferença entre custo por pneu (receita) e custo dos materiais
   * e adicionar ao baseline do lucro empresarial para manter o lucro inalterado
   */
  static async addProductionProfitToBaseline(
    productName: string, 
    quantityProduced: number, 
    materialsConsumed: Array<{
      material_id: string;
      material_name: string;
      quantity_consumed: number;
      unit: string;
    }>,
    stockItems: Array<{
      item_id: string;
      item_name: string;
      item_type: string;
      unit_cost: number;
      quantity: number;
    }>
  ): Promise<boolean> {
    try {
      console.log('🏭 [ProductionProfitManager] Calculando diferença de produção para adicionar ao baseline...');
      console.log('📊 [ProductionProfitManager] Parâmetros recebidos:', {
        productName,
        quantityProduced,
        materialsCount: materialsConsumed.length,
        stockItemsCount: stockItems.length
      });

      // 1. Obter custo por pneu (receita) do produto
      const costPerTire = await this.getSpecificProductCost(productName);
      console.log(`💰 [ProductionProfitManager] Custo por pneu (receita) para "${productName}": R$ ${costPerTire.toFixed(2)}`);

      // 2. Calcular custo total dos materiais consumidos
      let totalMaterialCost = 0;
      
      for (const material of materialsConsumed) {
        const stockItem = stockItems.find(
          item => item.item_id === material.material_id && item.item_type === "material"
        );
        
        if (stockItem) {
          const materialCost = material.quantity_consumed * stockItem.unit_cost;
          totalMaterialCost += materialCost;
          console.log(`📦 [ProductionProfitManager] Material "${material.material_name}": ${material.quantity_consumed} x R$ ${stockItem.unit_cost.toFixed(2)} = R$ ${materialCost.toFixed(2)}`);
        } else {
          console.warn(`⚠️ [ProductionProfitManager] Material não encontrado no estoque: ${material.material_name}`);
        }
      }

      // 3. Calcular custo por unidade dos materiais
      const materialCostPerUnit = quantityProduced > 0 ? totalMaterialCost / quantityProduced : 0;
      console.log(`📊 [ProductionProfitManager] Custo total dos materiais: R$ ${totalMaterialCost.toFixed(2)}`);
      console.log(`📊 [ProductionProfitManager] Custo por unidade dos materiais: R$ ${materialCostPerUnit.toFixed(2)}`);

      // 4. Calcular diferença (lucro por unidade)
      const profitPerUnit = costPerTire - materialCostPerUnit;
      const totalProfit = profitPerUnit * quantityProduced;
      
      console.log(`💡 [ProductionProfitManager] Análise da produção:`);
      console.log(`   • Custo/Pneu (Receita): R$ ${costPerTire.toFixed(2)}`);
      console.log(`   • Materiais por unidade: R$ ${materialCostPerUnit.toFixed(2)}`);
      console.log(`   • Diferença por unidade: R$ ${profitPerUnit.toFixed(2)}`);
      console.log(`   • Quantidade produzida: ${quantityProduced}`);
      console.log(`   • Lucro total da produção: R$ ${totalProfit.toFixed(2)}`);

      // 5. Se há lucro, adicionar ao baseline
      if (totalProfit > 0) {
        const currentBaseline = await dataManager.loadBusinessValueBaseline();
        
        if (currentBaseline !== null) {
          const newBaseline = currentBaseline + totalProfit;
          const success = await dataManager.saveBusinessValueBaseline(newBaseline);
          
          if (success) {
            console.log(`✅ [ProductionProfitManager] Baseline atualizado com sucesso!`);
            console.log(`   • Baseline anterior: R$ ${currentBaseline.toFixed(2)}`);
            console.log(`   • Lucro adicionado: R$ ${totalProfit.toFixed(2)}`);
            console.log(`   • Novo baseline: R$ ${newBaseline.toFixed(2)}`);
            
            // Recalcular lucro empresarial para manter sincronização
            await dataManager.calculateBusinessProfit();
            
            // Mostrar alerta de sucesso para o usuário
            alert(`🎉 LUCRO DA PRODUÇÃO ADICIONADO AO BASELINE!\n\n` +
                  `📊 ANÁLISE DA PRODUÇÃO:\n` +
                  `• Produto: ${productName}\n` +
                  `• Quantidade: ${quantityProduced} unidades\n` +
                  `• Custo/Pneu (Receita): R$ ${costPerTire.toFixed(2)}\n` +
                  `• Materiais por unidade: R$ ${materialCostPerUnit.toFixed(2)}\n` +
                  `• Diferença por unidade: R$ ${profitPerUnit.toFixed(2)}\n\n` +
                  `💰 IMPACTO NO BASELINE:\n` +
                  `• Lucro total adicionado: R$ ${totalProfit.toFixed(2)}\n` +
                  `• Baseline anterior: R$ ${currentBaseline.toFixed(2)}\n` +
                  `• Novo baseline: R$ ${newBaseline.toFixed(2)}\n\n` +
                  `✅ O lucro empresarial permanece inalterado!`);
            
            return true;
          } else {
            console.error('❌ [ProductionProfitManager] Falha ao salvar novo baseline');
            return false;
          }
        } else {
          console.warn('⚠️ [ProductionProfitManager] Baseline não definido, não é possível adicionar lucro da produção');
          console.log('💡 [ProductionProfitManager] Confirme o balanço empresarial primeiro para habilitar esta funcionalidade');
          
          alert(`⚠️ BASELINE NÃO DEFINIDO\n\n` +
                `Para que o lucro da produção seja automaticamente adicionado ao baseline, ` +
                `você precisa primeiro confirmar o balanço empresarial.\n\n` +
                `📋 COMO FAZER:\n` +
                `1. Vá em Configurações\n` +
                `2. Clique em "Confirmar Balanço Empresarial"\n` +
                `3. Após isso, todas as produções terão o lucro automaticamente adicionado ao baseline\n\n` +
                `💡 Isso garante que o lucro empresarial não seja alterado ao gerar produção!`);
          
          return false;
        }
      } else if (totalProfit < 0) {
        console.log(`⚠️ [ProductionProfitManager] Produção com prejuízo detectada (R$ ${totalProfit.toFixed(2)})`);
        console.log(`💡 [ProductionProfitManager] Não será adicionado ao baseline pois é prejuízo`);
        
        alert(`⚠️ PRODUÇÃO COM PREJUÍZO DETECTADA!\n\n` +
              `📊 ANÁLISE DA PRODUÇÃO:\n` +
              `• Produto: ${productName}\n` +
              `• Quantidade: ${quantityProduced} unidades\n` +
              `• Custo/Pneu (Receita): R$ ${costPerTire.toFixed(2)}\n` +
              `• Materiais por unidade: R$ ${materialCostPerUnit.toFixed(2)}\n` +
              `• Prejuízo por unidade: R$ ${Math.abs(profitPerUnit).toFixed(2)}\n` +
              `• Prejuízo total: R$ ${Math.abs(totalProfit).toFixed(2)}\n\n` +
              `💡 O baseline não foi alterado pois a produção teve prejuízo.\n` +
              `Verifique os custos dos materiais ou o preço de venda.`);
        
        return true;
      } else {
        console.log(`ℹ️ [ProductionProfitManager] Produção sem lucro nem prejuízo (diferença: R$ ${totalProfit.toFixed(2)})`);
        return true;
      }

    } catch (error) {
      console.error('❌ [ProductionProfitManager] Erro ao adicionar lucro da produção ao baseline:', error);
      alert(`❌ ERRO ao processar lucro da produção:\n\n${error}\n\nVerifique o console para mais detalhes.`);
      return false;
    }
  }

  /**
   * Função auxiliar para obter custo específico de um produto
   */
  private static async getSpecificProductCost(productName: string): Promise<number> {
    try {
      // PRIORIDADE 1: Buscar dados específicos salvos pelo TireCostManager
      const productKey = `tireAnalysis_${productName.toLowerCase().replace(/\s+/g, "_")}`;
      const savedAnalysis = localStorage.getItem(productKey);

      if (savedAnalysis) {
        try {
          const analysis = JSON.parse(savedAnalysis);
          if (analysis.costPerTire && analysis.costPerTire > 0) {
            console.log(`✅ [ProductionProfitManager] Custo específico encontrado para "${productName}": R$ ${analysis.costPerTire.toFixed(2)}`);
            return analysis.costPerTire;
          }
        } catch (parseError) {
          console.warn(`⚠️ [ProductionProfitManager] Erro ao parsear análise específica para "${productName}":`, parseError);
        }
      }

      // PRIORIDADE 2: Fallback para custo médio
      const averageCost = await dataManager.loadAverageTireCost();
      console.log(`📊 [ProductionProfitManager] Usando custo médio para "${productName}": R$ ${averageCost.toFixed(2)}`);
      return averageCost;

    } catch (error) {
      console.error(`❌ [ProductionProfitManager] Erro ao buscar custo específico para "${productName}":`, error);
      return 0;
    }
  }

  /**
   * Função para remover lucro da produção do baseline quando uma produção for excluída
   */
  static async removeProductionProfitFromBaseline(
    productName: string, 
    quantityProduced: number, 
    materialsConsumed: Array<{
      material_id: string;
      material_name: string;
      quantity_consumed: number;
      unit: string;
    }>,
    stockItems: Array<{
      item_id: string;
      item_name: string;
      item_type: string;
      unit_cost: number;
      quantity: number;
    }>
  ): Promise<boolean> {
    try {
      console.log('🔄 [ProductionProfitManager] Removendo lucro da produção do baseline...');
      console.log('📊 [ProductionProfitManager] Parâmetros recebidos para reversão:', {
        productName,
        quantityProduced,
        materialsCount: materialsConsumed.length,
        stockItemsCount: stockItems.length
      });

      // 1. Obter custo por pneu (receita) do produto
      const costPerTire = await this.getSpecificProductCost(productName);
      console.log(`💰 [ProductionProfitManager] Custo por pneu (receita) para "${productName}": R$ ${costPerTire.toFixed(2)}`);

      // 2. Calcular custo total dos materiais consumidos
      let totalMaterialCost = 0;
      
      for (const material of materialsConsumed) {
        const stockItem = stockItems.find(
          item => item.item_id === material.material_id && item.item_type === "material"
        );
        
        if (stockItem) {
          const materialCost = material.quantity_consumed * stockItem.unit_cost;
          totalMaterialCost += materialCost;
          console.log(`📦 [ProductionProfitManager] Material "${material.material_name}": ${material.quantity_consumed} x R$ ${stockItem.unit_cost.toFixed(2)} = R$ ${materialCost.toFixed(2)}`);
        } else {
          console.warn(`⚠️ [ProductionProfitManager] Material não encontrado no estoque: ${material.material_name}`);
        }
      }

      // 3. Calcular custo por unidade dos materiais
      const materialCostPerUnit = quantityProduced > 0 ? totalMaterialCost / quantityProduced : 0;
      console.log(`📊 [ProductionProfitManager] Custo total dos materiais: R$ ${totalMaterialCost.toFixed(2)}`);
      console.log(`📊 [ProductionProfitManager] Custo por unidade dos materiais: R$ ${materialCostPerUnit.toFixed(2)}`);

      // 4. Calcular diferença (lucro por unidade) que foi adicionada anteriormente
      const profitPerUnit = costPerTire - materialCostPerUnit;
      const totalProfitToRemove = profitPerUnit * quantityProduced;
      
      console.log(`💡 [ProductionProfitManager] Análise da produção excluída:`);
      console.log(`   • Custo/Pneu (Receita): R$ ${costPerTire.toFixed(2)}`);
      console.log(`   • Materiais por unidade: R$ ${materialCostPerUnit.toFixed(2)}`);
      console.log(`   • Diferença por unidade: R$ ${profitPerUnit.toFixed(2)}`);
      console.log(`   • Quantidade produzida: ${quantityProduced}`);
      console.log(`   • Lucro total a remover: R$ ${totalProfitToRemove.toFixed(2)}`);

      // 5. Se há lucro que foi adicionado anteriormente, remover do baseline
      if (totalProfitToRemove > 0) {
        const currentBaseline = await dataManager.loadBusinessValueBaseline();
        
        if (currentBaseline !== null) {
          const newBaseline = currentBaseline - totalProfitToRemove;
          const success = await dataManager.saveBusinessValueBaseline(newBaseline);
          
          if (success) {
            console.log(`✅ [ProductionProfitManager] Baseline atualizado com sucesso após exclusão!`);
            console.log(`   • Baseline anterior: R$ ${currentBaseline.toFixed(2)}`);
            console.log(`   • Lucro removido: R$ ${totalProfitToRemove.toFixed(2)}`);
            console.log(`   • Novo baseline: R$ ${newBaseline.toFixed(2)}`);
            
            // Recalcular lucro empresarial para manter sincronização
            await dataManager.calculateBusinessProfit();
            
            // Mostrar alerta de sucesso para o usuário
            alert(`🔄 LUCRO DA PRODUÇÃO REMOVIDO DO BASELINE!\n\n` +
                  `📊 PRODUÇÃO EXCLUÍDA:\n` +
                  `• Produto: ${productName}\n` +
                  `• Quantidade: ${quantityProduced} unidades\n` +
                  `• Custo/Pneu (Receita): R$ ${costPerTire.toFixed(2)}\n` +
                  `• Materiais por unidade: R$ ${materialCostPerUnit.toFixed(2)}\n` +
                  `• Diferença por unidade: R$ ${profitPerUnit.toFixed(2)}\n\n` +
                  `💰 IMPACTO NO BASELINE:\n` +
                  `• Lucro total removido: R$ ${totalProfitToRemove.toFixed(2)}\n` +
                  `• Baseline anterior: R$ ${currentBaseline.toFixed(2)}\n` +
                  `• Novo baseline: R$ ${newBaseline.toFixed(2)}\n\n` +
                  `✅ O lucro empresarial foi ajustado corretamente!`);
            
            return true;
          } else {
            console.error('❌ [ProductionProfitManager] Falha ao salvar novo baseline após exclusão');
            return false;
          }
        } else {
          console.warn('⚠️ [ProductionProfitManager] Baseline não definido, não é possível remover lucro da produção');
          return false;
        }
      } else if (totalProfitToRemove < 0) {
        console.log(`⚠️ [ProductionProfitManager] Produção excluída tinha prejuízo (R$ ${totalProfitToRemove.toFixed(2)})`);
        console.log(`💡 [ProductionProfitManager] Não há lucro para remover do baseline`);
        return true;
      } else {
        console.log(`ℹ️ [ProductionProfitManager] Produção excluída não tinha lucro nem prejuízo`);
        return true;
      }

    } catch (error) {
      console.error('❌ [ProductionProfitManager] Erro ao remover lucro da produção do baseline:', error);
      alert(`❌ ERRO ao processar remoção do lucro da produção:\n\n${error}\n\nVerifique o console para mais detalhes.`);
      return false;
    }
  }

  /**
   * Função para verificar se o baseline está definido
   */
  static async isBaselineDefined(): Promise<boolean> {
    try {
      const baseline = await dataManager.loadBusinessValueBaseline();
      return baseline !== null;
    } catch (error) {
      console.error('❌ [ProductionProfitManager] Erro ao verificar baseline:', error);
      return false;
    }
  }

  /**
   * Função para obter informações do baseline atual
   */
  static async getBaselineInfo(): Promise<{baseline: number | null, businessValue: number, profit: number}> {
    try {
      const baseline = await dataManager.loadBusinessValueBaseline();
      const businessValue = await dataManager.loadBusinessValue();
      const profit = await dataManager.loadBusinessProfit();
      
      return {
        baseline,
        businessValue,
        profit
      };
    } catch (error) {
      console.error('❌ [ProductionProfitManager] Erro ao obter informações do baseline:', error);
      return {
        baseline: null,
        businessValue: 0,
        profit: 0
      };
    }
  }
}

export default ProductionProfitManager;
