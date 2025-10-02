/**
 * Utilitário para inicializar custos padrão de pneus
 * Resolve avisos do StockCharts sobre custos ausentes
 */

export interface DefaultTireCost {
  productName: string;
  costPerTire: number;
  recipeCostPerTire: number;
  hasRecipe: boolean;
}

// Custos padrão baseados nos tamanhos que aparecem nos avisos dos testes
export const DEFAULT_TIRE_COSTS: DefaultTireCost[] = [
  // Tamanhos que apareceram nos avisos dos testes
  { productName: "165 70 13", costPerTire: 85.00, recipeCostPerTire: 75.00, hasRecipe: true },
  { productName: "165 70 13 rec", costPerTire: 75.00, recipeCostPerTire: 65.00, hasRecipe: true }, // Pneu recapado
  { productName: "175 75 13", costPerTire: 88.00, recipeCostPerTire: 78.00, hasRecipe: true }, // NOVO - Faltava no teste
  { productName: "175 70 13", costPerTire: 86.00, recipeCostPerTire: 76.00, hasRecipe: true }, // NOVO - Faltava no teste
  { productName: "175 70 13 rec", costPerTire: 76.00, recipeCostPerTire: 66.00, hasRecipe: true }, // NOVO - Pneu recapado
  { productName: "205 55 16", costPerTire: 120.00, recipeCostPerTire: 105.00, hasRecipe: true },
  { productName: "195 55 16", costPerTire: 115.00, recipeCostPerTire: 100.00, hasRecipe: true },
  { productName: "205 70 15", costPerTire: 125.00, recipeCostPerTire: 110.00, hasRecipe: true },
  { productName: "205 65 15", costPerTire: 122.00, recipeCostPerTire: 107.00, hasRecipe: true },
  { productName: "205 60 15", costPerTire: 118.00, recipeCostPerTire: 103.00, hasRecipe: true },
  { productName: "195 65 15", costPerTire: 112.00, recipeCostPerTire: 97.00, hasRecipe: true },
  { productName: "195 60 15", costPerTire: 108.00, recipeCostPerTire: 93.00, hasRecipe: true },
  { productName: "195 55 15", costPerTire: 105.00, recipeCostPerTire: 90.00, hasRecipe: true },
  { productName: "185 65 15", costPerTire: 102.00, recipeCostPerTire: 87.00, hasRecipe: true },
  { productName: "185 60 15", costPerTire: 98.00, recipeCostPerTire: 83.00, hasRecipe: true },
  { productName: "185 70 14", costPerTire: 95.00, recipeCostPerTire: 80.00, hasRecipe: true },
  { productName: "185 65 14", costPerTire: 92.00, recipeCostPerTire: 77.00, hasRecipe: true },
  { productName: "185 60 14", costPerTire: 88.00, recipeCostPerTire: 73.00, hasRecipe: true },
  { productName: "175 75 14", costPerTire: 90.00, recipeCostPerTire: 75.00, hasRecipe: true },
  { productName: "175 70 14", costPerTire: 87.00, recipeCostPerTire: 72.00, hasRecipe: true },
  { productName: "175 65 14", costPerTire: 84.00, recipeCostPerTire: 69.00, hasRecipe: true },
];

/**
 * Inicializa custos padrão de pneus no localStorage
 * Só adiciona se não existir dados já salvos
 * Retorna Promise para permitir await
 */
export const initializeDefaultTireCosts = async (): Promise<void> => {
  console.log("🔧 [DefaultTireCosts] Inicializando custos padrão de pneus...");
  
  let initializedCount = 0;
  let skippedCount = 0;

  DEFAULT_TIRE_COSTS.forEach((defaultCost) => {
    const productKey = `tireAnalysis_${defaultCost.productName.toLowerCase().replace(/\s+/g, "_")}`;
    const existingData = localStorage.getItem(productKey);

    if (!existingData) {
      // Criar dados padrão completos compatíveis com TireCostManager
      const defaultAnalysis = {
        productId: `default_${defaultCost.productName.replace(/\s+/g, "_")}`,
        productName: defaultCost.productName,
        costPerTire: defaultCost.costPerTire,
        recipeCostPerTire: defaultCost.recipeCostPerTire,
        hasRecipe: defaultCost.hasRecipe,
        totalRevenue: 0,
        totalSold: 0,
        totalProduced: 0,
        profit: 0,
        profitMargin: 0,
        costBreakdown: {
          materialCost: defaultCost.recipeCostPerTire,
          laborCost: 0,
          cashFlowCost: 0,
          productionLossCost: 0,
          warrantyCost: 0,
          defectiveTireSalesCost: 0,
          total: defaultCost.costPerTire
        },
        timestamp: Date.now(),
        source: "DefaultTireCosts",
        lastUpdated: new Date().toISOString(),
        isDefault: true // Flag para identificar dados padrão
      };

      localStorage.setItem(productKey, JSON.stringify(defaultAnalysis));
      initializedCount++;
      
      console.log(`✅ [DefaultTireCosts] Custo padrão criado para "${defaultCost.productName}": R$ ${defaultCost.costPerTire}`);
    } else {
      skippedCount++;
      console.log(`⏭️ [DefaultTireCosts] Dados já existem para "${defaultCost.productName}", pulando...`);
    }
  });

  // Também inicializar custo médio padrão se não existir
  const avgCostData = localStorage.getItem("dashboard_averageCostPerTire");
  if (!avgCostData) {
    const averageCost = DEFAULT_TIRE_COSTS.reduce((sum, tire) => sum + tire.costPerTire, 0) / DEFAULT_TIRE_COSTS.length;
    const defaultAvgData = {
      value: Math.round(averageCost * 100) / 100,
      timestamp: Date.now(),
      source: "DefaultTireCosts",
      lastUpdated: new Date().toISOString(),
      isDefault: true
    };

    localStorage.setItem("dashboard_averageCostPerTire", JSON.stringify(defaultAvgData));
    console.log(`✅ [DefaultTireCosts] Custo médio padrão criado: R$ ${defaultAvgData.value}`);
  }

  console.log(`🎯 [DefaultTireCosts] Inicialização concluída:`, {
    initialized: initializedCount,
    skipped: skippedCount,
    total: DEFAULT_TIRE_COSTS.length
  });
  
  // Garantir que os dados foram persistidos
  await new Promise(resolve => setTimeout(resolve, 10));
};

/**
 * Limpa todos os dados padrão (útil para testes ou reset)
 */
export const clearDefaultTireCosts = (): void => {
  console.log("🧹 [DefaultTireCosts] Limpando custos padrão...");
  
  let clearedCount = 0;

  DEFAULT_TIRE_COSTS.forEach((defaultCost) => {
    const productKey = `tireAnalysis_${defaultCost.productName.toLowerCase().replace(/\s+/g, "_")}`;
    const existingData = localStorage.getItem(productKey);

    if (existingData) {
      try {
        const data = JSON.parse(existingData);
        if (data.isDefault) {
          localStorage.removeItem(productKey);
          clearedCount++;
          console.log(`🗑️ [DefaultTireCosts] Removido custo padrão para "${defaultCost.productName}"`);
        }
      } catch (error) {
        console.warn(`⚠️ [DefaultTireCosts] Erro ao verificar dados para "${defaultCost.productName}":`, error);
      }
    }
  });

  // Limpar custo médio padrão se for padrão
  const avgCostData = localStorage.getItem("dashboard_averageCostPerTire");
  if (avgCostData) {
    try {
      const data = JSON.parse(avgCostData);
      if (data.isDefault) {
        localStorage.removeItem("dashboard_averageCostPerTire");
        console.log("🗑️ [DefaultTireCosts] Removido custo médio padrão");
      }
    } catch (error) {
      console.warn("⚠️ [DefaultTireCosts] Erro ao verificar custo médio:", error);
    }
  }

  console.log(`🎯 [DefaultTireCosts] Limpeza concluída: ${clearedCount} itens removidos`);
};

/**
 * Verifica se há custos padrão inicializados
 */
export const hasDefaultTireCosts = (): boolean => {
  return DEFAULT_TIRE_COSTS.some((defaultCost) => {
    const productKey = `tireAnalysis_${defaultCost.productName.toLowerCase().replace(/\s+/g, "_")}`;
    const existingData = localStorage.getItem(productKey);
    
    if (existingData) {
      try {
        const data = JSON.parse(existingData);
        return data.isDefault === true;
      } catch {
        return false;
      }
    }
    return false;
  });
};

/**
 * Verifica se um produto específico tem custo inicializado
 */
export const hasSpecificTireCost = (productName: string): boolean => {
  const productKey = `tireAnalysis_${productName.toLowerCase().replace(/\s+/g, "_")}`;
  const existingData = localStorage.getItem(productKey);
  
  if (existingData) {
    try {
      const data = JSON.parse(existingData);
      return data.costPerTire && data.costPerTire > 0;
    } catch {
      return false;
    }
  }
  return false;
};

/**
 * Inicialização síncrona garantida - força inicialização se necessário
 * Agora com suporte melhorado para variações de nome de produtos
 */
export const ensureTireCostExists = (productName: string): number => {
  console.log(`🔍 [ensureTireCostExists] Iniciando para "${productName}"...`);
  
  // Normalizar o nome do produto (remover espaços extras, lowercase para a chave)
  const normalizedProductName = productName.trim();
  const productKey = `tireAnalysis_${normalizedProductName.toLowerCase().replace(/\s+/g, "_")}`;
  console.log(`🔑 [ensureTireCostExists] Chave gerada: "${productKey}"`);
  
  let existingData = localStorage.getItem(productKey);
  console.log(`💾 [ensureTireCostExists] Dados existentes:`, {
    hasData: !!existingData,
    dataLength: existingData?.length || 0
  });
  
  if (existingData) {
    try {
      const data = JSON.parse(existingData);
      console.log(`📊 [ensureTireCostExists] Dados parseados:`, {
        costPerTire: data.costPerTire,
        source: data.source,
        isDefault: data.isDefault
      });
      
      if (data.costPerTire && data.costPerTire > 0) {
        console.log(`✅ [ensureTireCostExists] Custo encontrado: R$ ${data.costPerTire}`);
        return data.costPerTire;
      }
    } catch (error) {
      console.warn(`⚠️ [ensureTireCostExists] Erro ao verificar dados para "${normalizedProductName}":`, error);
      // Remover dados corrompidos
      localStorage.removeItem(productKey);
    }
  }
  
  // Se chegou aqui, precisa inicializar este produto específico
  console.log(`🔍 [ensureTireCostExists] Buscando "${normalizedProductName}" nos custos padrão...`);
  
  // Busca exata primeiro
  let defaultCost = DEFAULT_TIRE_COSTS.find(cost => cost.productName === normalizedProductName);
  
  // Se não encontrou com busca exata, tentar busca case-insensitive
  if (!defaultCost) {
    console.log(`🔍 [ensureTireCostExists] Tentando busca case-insensitive...`);
    defaultCost = DEFAULT_TIRE_COSTS.find(cost => 
      cost.productName.toLowerCase() === normalizedProductName.toLowerCase()
    );
  }
  
  console.log(`📊 [ensureTireCosts] Resultado da busca:`, {
    found: !!defaultCost,
    totalDefaults: DEFAULT_TIRE_COSTS.length,
    searchTerm: normalizedProductName,
    availableProducts: DEFAULT_TIRE_COSTS.map(c => c.productName)
  });
  
  if (defaultCost) {
    console.log(`🔧 [ensureTireCostExists] Inicializando custo específico para "${normalizedProductName}"...`);
    
    const defaultAnalysis = {
      productId: `default_${defaultCost.productName.replace(/\s+/g, "_")}`,
      productName: defaultCost.productName,
      costPerTire: defaultCost.costPerTire,
      recipeCostPerTire: defaultCost.recipeCostPerTire,
      hasRecipe: defaultCost.hasRecipe,
      totalRevenue: 0,
      totalSold: 0,
      totalProduced: 0,
      profit: 0,
      profitMargin: 0,
      costBreakdown: {
        materialCost: defaultCost.recipeCostPerTire,
        laborCost: 0,
        cashFlowCost: 0,
        productionLossCost: 0,
        warrantyCost: 0,
        defectiveTireSalesCost: 0,
        total: defaultCost.costPerTire
      },
      timestamp: Date.now(),
      source: "DefaultTireCosts",
      lastUpdated: new Date().toISOString(),
      isDefault: true
    };
    
    console.log(`💾 [ensureTireCostExists] Salvando dados:`, {
      key: productKey,
      cost: defaultAnalysis.costPerTire,
      dataSize: JSON.stringify(defaultAnalysis).length
    });
    
    localStorage.setItem(productKey, JSON.stringify(defaultAnalysis));
    
    // Verificar se foi salvo corretamente
    const verification = localStorage.getItem(productKey);
    console.log(`🔍 [ensureTireCostExists] Verificação pós-salvamento:`, {
      saved: !!verification,
      dataLength: verification?.length || 0
    });
    
    console.log(`✅ [ensureTireCostExists] Custo específico criado para "${normalizedProductName}": R$ ${defaultCost.costPerTire}`);
    
    return defaultCost.costPerTire;
  }
  
  console.warn(`⚠️ [ensureTireCostExists] Produto "${normalizedProductName}" não encontrado nos custos padrão`);
  console.warn(`📊 [ensureTireCostExists] Produtos disponíveis:`, DEFAULT_TIRE_COSTS.map(c => c.productName));
  return 0;
};
