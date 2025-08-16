
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Package, Calculator, Save, Edit3, Search, Settings, AlertTriangle } from "lucide-react";
import { useStockItems, useProducts } from "@/hooks/useDataPersistence";
import { useToast } from "@/components/ui/use-toast";
import { dataManager } from "@/utils/dataManager";

interface FinalProductsStockProps {
  isLoading?: boolean;
}

interface ProductAnalysis {
  productId: string;
  productName: string;
  measures: string;
  totalRevenue: number;
  totalSold: number;
  costPerTire: number;
  profit: number;
  profitMargin: number;
  quantity: number;
  editableQuantity: number;
  totalValue: number;
  isEditing: boolean;
  minLevel: number;
  stockLevel: "normal" | "low" | "out";
}

const FinalProductsStock: React.FC<FinalProductsStockProps> = ({ isLoading = false }) => {
  const { stockItems, isLoading: stockLoading, updateStockItem, createStockItem } = useStockItems();
  const { products, isLoading: productsLoading } = useProducts();
  const [productAnalysis, setProductAnalysis] = useState<ProductAnalysis[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "in-stock" | "out-of-stock" | "low-stock">("all");
  const [showMinLevelDialog, setShowMinLevelDialog] = useState(false);
  const [selectedProductForMinLevel, setSelectedProductForMinLevel] = useState("");
  const [minLevel, setMinLevel] = useState("");
  const { toast } = useToast();

  // Função para extrair as medidas do nome do produto
  const extractMeasures = (productName: string): string => {
    // Regex para capturar padrões como "175 70 14", "185 65 15", etc.
    const measurePattern = /(\d{3}\s\d{2}\s\d{2})/;
    const match = productName.match(measurePattern);
    return match ? match[1] : productName;
  };

  // Cache de custos carregados do Supabase para evitar múltiplas consultas
  const [productCostsCache, setProductCostsCache] = useState<{ [productName: string]: number }>({});
  const [costsLoaded, setCostsLoaded] = useState(false);

  // Carregar todos os custos do Supabase na inicialização
  useEffect(() => {
    const loadProductCosts = async () => {
      try {
        console.log('🔍 [FinalProductsStock] Carregando custos de produtos do Supabase...');
        const costs = await dataManager.loadAllProductUnitCosts();
        setProductCostsCache(costs);
        setCostsLoaded(true);
        console.log(`✅ [FinalProductsStock] ${Object.keys(costs).length} custos carregados do Supabase`);
      } catch (error) {
        console.error('❌ [FinalProductsStock] Erro ao carregar custos do Supabase:', error);
        setCostsLoaded(true); // Marcar como carregado mesmo com erro para usar fallbacks
      }
    };

    loadProductCosts();
  }, []);

  // Subscription para mudanças em tempo real nos custos
  useEffect(() => {
    const unsubscribe = dataManager.subscribeToProductCostChanges((productName, newCost) => {
      console.log(`📡 [FinalProductsStock] Custo atualizado via Supabase Realtime para ${productName}: R$ ${newCost.toFixed(2)}`);
      setProductCostsCache(prev => ({
        ...prev,
        [productName]: newCost
      }));
      
      // Forçar re-render para atualizar cálculos
      setLastCostUpdate(Date.now());
    });

    return unsubscribe;
  }, []);

  // Função para obter custo específico com prioridade para Supabase
  const getSpecificCost = async (productName: string): Promise<number> => {
    try {
      // 1. Primeiro, verificar cache do Supabase (se já carregado)
      if (costsLoaded && productCostsCache[productName]) {
        console.log(`💰 [FinalProductsStock] Custo encontrado no cache Supabase para ${productName}: R$ ${productCostsCache[productName].toFixed(2)}`);
        return productCostsCache[productName];
      }

      // 2. Se não estiver no cache, tentar carregar diretamente do Supabase
      if (costsLoaded) {
        const supabaseCost = await dataManager.loadProductUnitCost(productName);
        if (supabaseCost && supabaseCost > 0) {
          // Atualizar cache
          setProductCostsCache(prev => ({
            ...prev,
            [productName]: supabaseCost
          }));
          console.log(`🔍 [FinalProductsStock] Custo carregado do Supabase para ${productName}: R$ ${supabaseCost.toFixed(2)}`);
          return supabaseCost;
        }
      }

      // 3. Fallback: buscar dados específicos salvos pelo TireCostManager no localStorage
      const productKey = `tireAnalysis_${productName.toLowerCase().replace(/\s+/g, "_")}`;
      const savedAnalysis = localStorage.getItem(productKey);

      if (savedAnalysis) {
        const analysis = JSON.parse(savedAnalysis);
        if (analysis.costPerTire && analysis.costPerTire > 0) {
          console.log(`📦 [FinalProductsStock] Custo encontrado no localStorage para ${productName}: R$ ${analysis.costPerTire.toFixed(2)}`);
          
          // Sincronizar com Supabase para próximas consultas
          if (costsLoaded) {
            dataManager.saveProductUnitCost(productName, analysis.costPerTire);
          }
          
          return analysis.costPerTire;
        }
      }

      // 4. Fallback: buscar custo médio geral do dashboard
      const dashboardCostData = localStorage.getItem('dashboard_averageCostPerTire');
      if (dashboardCostData) {
        const costData = JSON.parse(dashboardCostData);
        if (costData.value && costData.value > 0) {
          console.log(`📊 [FinalProductsStock] Usando custo médio geral para ${productName}: R$ ${costData.value.toFixed(2)}`);
          return costData.value;
        }
      }

      // 5. Último fallback: dados sincronizados do TireCostManager
      const syncData = localStorage.getItem('tireCostManager_synchronizedCostData');
      if (syncData) {
        const syncedData = JSON.parse(syncData);
        if (syncedData.averageCostPerTire && syncedData.averageCostPerTire > 0) {
          console.log(`🔄 [FinalProductsStock] Usando custo sincronizado para ${productName}: R$ ${syncedData.averageCostPerTire.toFixed(2)}`);
          return syncedData.averageCostPerTire;
        }
      }

      console.warn(`⚠️ [FinalProductsStock] Nenhum custo encontrado para ${productName}`);
      return 0;
    } catch (error) {
      console.error("❌ [FinalProductsStock] Erro ao buscar custo específico:", error);
      return 0;
    }
  };

  // Estado para forçar re-render quando custos são atualizados
  const [lastCostUpdate, setLastCostUpdate] = useState(Date.now());

  useEffect(() => {
    const performAnalysis = async () => {
      if (!stockItems.length || !products.length || !costsLoaded) return;

      console.log('🔍 [FinalProductsStock] Iniciando análise de produtos com custos do Supabase...');

      // Filtrar apenas produtos finais em estoque
      const finalProductStockItems = stockItems.filter(item => 
        item.item_type === "product" && item.quantity > 0
      );

      const analysisPromises = finalProductStockItems.map(async (stockItem) => {
        const product = products.find(p => p.id === stockItem.item_id);
        if (!product) return null;

        const costPerTire = await getSpecificCost(product.name);
        const measures = extractMeasures(product.name);
        const quantity = stockItem.quantity || 0;
        const totalValue = quantity * costPerTire;
        const minLevel = stockItem.min_level || 0;

        // Determinar status do estoque
        let stockLevel: "normal" | "low" | "out" = "normal";
        if (quantity === 0) {
          stockLevel = "out";
        } else if (minLevel > 0 && quantity <= minLevel) {
          stockLevel = "low";
        }

        // Calcular valores baseados no estoque e vendas (mockado por enquanto)
        const totalSold = 0; // TODO: Integrar com dados de vendas
        const totalRevenue = totalSold * (product.price || 0);
        const profit = totalRevenue - (totalSold * costPerTire);
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        return {
          productId: stockItem.item_id,
          productName: product.name,
          measures,
          totalRevenue,
          totalSold,
          costPerTire,
          profit,
          profitMargin,
          quantity,
          editableQuantity: quantity,
          totalValue,
          isEditing: false,
          minLevel,
          stockLevel
        };
      });

      try {
        const analysisResults = await Promise.all(analysisPromises);
        const analysis = analysisResults.filter(Boolean) as ProductAnalysis[];

        setProductAnalysis(analysis);
        
        const totalValue = analysis.reduce((sum, p) => sum + p.totalValue, 0);
        
        console.log(`📊 [FinalProductsStock] Análise de produtos atualizada:`, {
          totalProducts: analysis.length,
          productsWithCost: analysis.filter(p => p.costPerTire > 0).length,
          averageCost: analysis.length > 0 ? analysis.reduce((sum, p) => sum + p.costPerTire, 0) / analysis.length : 0,
          totalValue: totalValue
        });

        // Sincronizar valor total com o sistema
        if (totalValue > 0) {
          console.log(`💰 [FinalProductsStock] Valor total sincronizado: R$ ${totalValue.toFixed(2)}`);
          
          // Salvar no DataManager para sincronização com dashboard
          dataManager.saveFinalProductStockBalance(totalValue);
          
          // Disparar evento customizado para atualizar dashboard
          const updateEvent = new CustomEvent('finalProductStockUpdated', {
            detail: {
              balance: totalValue,
              timestamp: Date.now(),
              source: 'FinalProductsStock-Analysis',
              productsCount: analysis.length
            }
          });
          window.dispatchEvent(updateEvent);
        }
      } catch (error) {
        console.error('❌ [FinalProductsStock] Erro ao realizar análise de produtos:', error);
      }
    };

    performAnalysis();
  }, [stockItems, products, lastCostUpdate, costsLoaded, productCostsCache]);

  // Listener para eventos de atualização de custo de pneus (múltiplos eventos)
  useEffect(() => {
    const handleTireCostUpdate = (event: CustomEvent) => {
      console.log('🔄 [FinalProductsStock] Evento de atualização de custo de pneu recebido:', event.detail);
      setLastCostUpdate(Date.now());
    };

    const handleTireProfitUpdate = (event: CustomEvent) => {
      console.log('📈 [FinalProductsStock] Evento de atualização de lucro por pneu recebido:', event.detail);
      setLastCostUpdate(Date.now());
    };

    const handleAverageCostUpdate = (event: CustomEvent) => {
      console.log('💰 [FinalProductsStock] Evento de atualização de custo médio recebido:', event.detail);
      setLastCostUpdate(Date.now());
    };

    // Registrar múltiplos listeners para diferentes eventos de custo
    window.addEventListener('tireCostUpdated', handleTireCostUpdate as EventListener);
    window.addEventListener('tireProfitUpdated', handleTireProfitUpdate as EventListener);
    window.addEventListener('averageCostUpdated', handleAverageCostUpdate as EventListener);
    window.addEventListener('presumedProfitUpdated', handleTireCostUpdate as EventListener);

    return () => {
      window.removeEventListener('tireCostUpdated', handleTireCostUpdate as EventListener);
      window.removeEventListener('tireProfitUpdated', handleTireProfitUpdate as EventListener);
      window.removeEventListener('averageCostUpdated', handleAverageCostUpdate as EventListener);
      window.removeEventListener('presumedProfitUpdated', handleTireCostUpdate as EventListener);
    };
  }, []);

  // Listener para mudanças no localStorage
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && event.key.startsWith('tireAnalysis_')) {
        console.log('💾 [FinalProductsStock] Mudança no localStorage detectada:', event.key);
        setLastCostUpdate(Date.now());
      }
    };

    // Adicionar listener para mudanças no localStorage
    window.addEventListener('storage', handleStorageChange);

    // Polling para garantir sincronização (fallback)
    const interval = setInterval(() => {
      setLastCostUpdate(Date.now());
    }, 30000); // A cada 30 segundos

    console.log('🚀 [FinalProductsStock] Listeners de sincronização em tempo real configurados');

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
      console.log('🗱️ [FinalProductsStock] Listeners removidos');
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleQuantityChange = (productId: string, newQuantity: string) => {
    const numericQuantity = parseInt(newQuantity) || 0;
    setProductAnalysis(prev => 
      prev.map(product => 
        product.productId === productId 
          ? { 
              ...product, 
              editableQuantity: numericQuantity,
              totalValue: numericQuantity * product.costPerTire
            }
          : product
      )
    );
  };

  const handleEditToggle = (productId: string) => {
    setProductAnalysis(prev => 
      prev.map(product => 
        product.productId === productId 
          ? { ...product, isEditing: !product.isEditing }
          : product
      )
    );
  };

  const handleSaveQuantity = async (productId: string) => {
    const product = productAnalysis.find(p => p.productId === productId);
    if (!product) return;

    setIsSaving(true);
    try {
      const stockItem = stockItems.find(item => item.item_id === productId);
      if (stockItem) {
        // Calcular novo valor total baseado na quantidade editável
        const newTotalValue = product.editableQuantity * product.costPerTire;
        
        await updateStockItem(stockItem.id, {
          quantity: product.editableQuantity,
          total_value: newTotalValue
        });

        // Atualizar estado local
        setProductAnalysis(prev => 
          prev.map(p => 
            p.productId === productId 
              ? { 
                  ...p, 
                  quantity: product.editableQuantity,
                  totalValue: newTotalValue,
                  isEditing: false 
                }
              : p
          )
        );

        console.log(`✅ Quantidade atualizada para ${product.productName}: ${product.editableQuantity} unidades, Valor total: ${formatCurrency(newTotalValue)}`);
      }
    } catch (error) {
      console.error("Erro ao salvar quantidade:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateGrandTotal = () => {
    return filteredProductAnalysis.reduce((total, product) => total + product.totalValue, 0);
  };



  const handleSetMinLevel = async () => {
    if (!selectedProductForMinLevel || !minLevel) {
      toast({
        title: "Erro",
        description: "Selecione um produto e informe o nível mínimo.",
        variant: "destructive",
      });
      return;
    }

    const minLevelValue = parseInt(minLevel);
    const stockItem = stockItems.find(item => 
      item.item_id === selectedProductForMinLevel && item.item_type === "product"
    );

    try {
      if (stockItem) {
        await updateStockItem(stockItem.id, {
          min_level: minLevelValue,
          last_updated: new Date().toISOString(),
        });
      } else {
        // Create stock entry with min level if it doesn't exist
        const product = products.find(p => p.id === selectedProductForMinLevel);
        if (product) {
          await createStockItem({
            item_id: product.id,
            item_type: "product",
            item_name: product.name,
            quantity: 0,
            unit_cost: getSpecificCost(product.name),
            total_value: 0,
            min_level: minLevelValue,
            unit: "un",
            last_updated: new Date().toISOString(),
          });
        }
      }

      toast({
        title: "Nível mínimo definido",
        description: `Nível mínimo de ${minLevel} unidades definido com sucesso.`,
      });

      setShowMinLevelDialog(false);
      setSelectedProductForMinLevel("");
      setMinLevel("");
    } catch (error) {
      console.error("Erro ao definir nível mínimo:", error);
      toast({
        title: "Erro",
        description: "Erro ao definir nível mínimo. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Apply search and filter logic
  const filteredProductAnalysis = productAnalysis.filter(product => {
    const matchesSearch = 
      product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.measures.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterType === "all" || 
      (filterType === "in-stock" && product.quantity > 0) ||
      (filterType === "out-of-stock" && product.quantity === 0) ||
      (filterType === "low-stock" && product.stockLevel === "low");

    return matchesSearch && matchesFilter;
  });

  // Calculate low stock count
  const lowStockCount = productAnalysis.filter(product => product.stockLevel === "low").length;

  // Sincronizar valor total com o dashboard automaticamente
  useEffect(() => {
    const grandTotal = calculateGrandTotal();
    
    // Salvar automaticamente no Supabase quando o valor mudar
    const saveGrandTotal = async () => {
      try {
        const success = await dataManager.saveFinalProductStockBalance(grandTotal);
        if (success) {
          console.log(`💰 [FinalProductsStock] Valor total sincronizado: R$ ${grandTotal.toFixed(2)}`);
          
          // Disparar evento para notificar o dashboard
          const event = new CustomEvent('finalProductStockUpdated', {
            detail: {
              balance: grandTotal,
              timestamp: Date.now(),
              source: 'FinalProductsStock-AutoSync'
            }
          });
          window.dispatchEvent(event);
        }
      } catch (error) {
        console.error('❌ [FinalProductsStock] Erro ao sincronizar valor total:', error);
      }
    };

    // Salvar apenas se o valor for válido e diferente de zero
    if (grandTotal > 0 && filteredProductAnalysis.length > 0) {
      saveGrandTotal();
    }
  }, [filteredProductAnalysis]); // Reagir a mudanças nos produtos

  if (isLoading || stockLoading || productsLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-factory-700/50 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-factory-700/50 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-factory-700/50 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-neon-green" />
              </div>
              Produtos Finais
              <span className="text-neon-green text-sm">({productAnalysis.length} tipos)</span>
              {lowStockCount > 0 && (
                <span className="text-red-400 text-sm flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {lowStockCount} baixo
                </span>
              )}
            </h3>
            <p className="text-tire-300 mt-2">
              Análise de custos e controle de quantidade por tipo de pneu
            </p>
          </div>
          
          <Dialog open={showMinLevelDialog} onOpenChange={setShowMinLevelDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="bg-factory-700/50 border-tire-600/30 text-tire-300 hover:text-white hover:bg-tire-700/50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Nível Mínimo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-factory-800 border-tire-600/30 text-white">
              <DialogHeader>
                <DialogTitle>Definir Nível Mínimo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Produto</Label>
                  <Select value={selectedProductForMinLevel} onValueChange={setSelectedProductForMinLevel}>
                    <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent className="bg-factory-800 border-tire-600/30">
                      {productAnalysis.map((product) => (
                        <SelectItem
                          key={product.productId}
                          value={product.productId}
                          className="text-white hover:bg-tire-700/50"
                        >
                          {product.productName} (Min: {product.minLevel})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Nível Mínimo</Label>
                  <Input
                    type="number"
                    min="0"
                    value={minLevel}
                    onChange={(e) => setMinLevel(e.target.value)}
                    placeholder="Ex: 5"
                    className="bg-factory-700/50 border-tire-600/30 text-white"
                  />
                </div>

                <Button
                  onClick={handleSetMinLevel}
                  className="w-full bg-neon-blue hover:bg-neon-blue/80"
                >
                  Salvar Nível Mínimo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-factory-800/30 rounded-lg border border-tire-600/20">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-tire-400" />
            <Input
              placeholder="Buscar produtos por nome ou medida..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-factory-700/50 border-tire-600/30 text-white"
            />
          </div>
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48 bg-factory-700/50 border-tire-600/30 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-factory-800 border-tire-600/30">
            <SelectItem value="all" className="text-white hover:bg-tire-700/50">
              Todos os Produtos
            </SelectItem>
            <SelectItem value="in-stock" className="text-white hover:bg-tire-700/50">
              Com Estoque
            </SelectItem>
            <SelectItem value="out-of-stock" className="text-white hover:bg-tire-700/50">
              Sem Estoque
            </SelectItem>
            <SelectItem value="low-stock" className="text-white hover:bg-tire-700/50">
              Estoque Baixo
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Métricas de Resumo */}
      {productAnalysis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-factory-800/50 border border-tire-600/30 rounded-lg p-4">
            <p className="text-tire-400 text-sm">Total de Tipos</p>
            <p className="text-2xl font-bold text-white">{filteredProductAnalysis.length}</p>
            <p className="text-xs text-tire-400 mt-1">
              {productAnalysis.length !== filteredProductAnalysis.length && 
                `de ${productAnalysis.length} total`}
            </p>
          </div>
          
          <div className="bg-factory-800/50 border border-tire-600/30 rounded-lg p-4">
            <p className="text-tire-400 text-sm">Quantidade Total</p>
            <p className="text-2xl font-bold text-neon-cyan">
              {filteredProductAnalysis.reduce((total, product) => total + product.quantity, 0)} unidades
            </p>
          </div>
          
          <div className="bg-factory-800/50 border border-tire-600/30 rounded-lg p-4">
            <p className="text-tire-400 text-sm">Custo Médio por Pneu</p>
            <p className="text-2xl font-bold text-neon-orange">
              {formatCurrency(filteredProductAnalysis.length > 0 
                ? filteredProductAnalysis.reduce((sum, p) => sum + p.costPerTire, 0) / filteredProductAnalysis.length 
                : 0
              )}
            </p>
          </div>
          
          <div className="bg-neon-green/10 border border-neon-green/30 rounded-lg p-4">
            <p className="text-tire-400 text-sm">Valor Total do Estoque</p>
            <p className="text-2xl font-bold text-neon-green">
              {formatCurrency(calculateGrandTotal())}
            </p>
          </div>
        </div>
      )}

      {/* Lista de Produtos */}
      <div className="space-y-4">
        {filteredProductAnalysis.length === 0 ? (
          <div className="text-center py-12 bg-factory-800/30 rounded-lg border border-tire-600/20">
            <Package className="h-16 w-16 text-tire-500 mx-auto mb-4" />
            <p className="text-tire-400 text-lg">
              {searchTerm || filterType !== "all"
                ? "Nenhum produto encontrado com os filtros aplicados"
                : "Nenhum produto final em estoque"}
            </p>
            {(searchTerm || filterType !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                }}
                className="mt-4 bg-factory-700/50 border-tire-600/30 text-tire-300 hover:text-white hover:bg-tire-700/50"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        ) : (
          filteredProductAnalysis.map((product) => (
            <div
              key={product.productId}
              className="p-6 bg-factory-800/50 border border-tire-600/30 rounded-lg hover:bg-factory-800/70 transition-all duration-200"
            >
              {/* Header do Produto */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-white font-semibold text-xl flex items-center gap-2">
                    <span className="text-2xl">🏭</span>
                    {product.measures}
                    {product.stockLevel === "low" && (
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    )}
                    {product.stockLevel === "out" && (
                      <span className="text-xs px-2 py-1 rounded bg-red-900/20 text-red-400 border border-red-600/30">
                        SEM ESTOQUE
                      </span>
                    )}
                    {product.stockLevel === "low" && (
                      <span className="text-xs px-2 py-1 rounded bg-yellow-900/20 text-yellow-400 border border-yellow-600/30">
                        ESTOQUE BAIXO
                      </span>
                    )}
                  </h4>
                  <p className="text-tire-400 text-sm">{product.productName}</p>
                  {product.minLevel > 0 && (
                    <p className="text-tire-500 text-xs">
                      Nível mínimo: {product.minLevel} unidades
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-neon-green font-bold text-2xl">
                    {formatCurrency(product.totalValue)}
                  </span>
                  <p className="text-tire-400 text-sm">Valor Total</p>
                </div>
              </div>

              {/* Controle de Quantidade */}
              <div className="bg-factory-700/30 rounded-lg p-4 border border-tire-600/20">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-tire-300 font-medium text-base flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-neon-orange" />
                    Controle de Quantidade
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditToggle(product.productId)}
                    className="bg-factory-700/50 border-tire-600/30 text-tire-300 hover:text-white hover:bg-factory-600/50 h-8 px-3"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    {product.isEditing ? "Cancelar" : "Editar"}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-tire-400 text-sm mb-1 block">Quantidade Atual</Label>
                    {product.isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        value={product.editableQuantity}
                        onChange={(e) => handleQuantityChange(product.productId, e.target.value)}
                        className="bg-factory-700/50 border-tire-600/30 text-white h-10"
                      />
                    ) : (
                      <div className="bg-factory-600/30 border border-tire-600/20 rounded-md px-3 py-2 h-10 flex items-center">
                        <span className="text-white font-medium">{product.quantity} unidades</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-tire-400 text-sm mb-1 block">Custo por Pneu</Label>
                    <div className="bg-factory-600/30 border border-tire-600/20 rounded-md px-3 py-2 h-10 flex items-center">
                      <span className="text-neon-orange font-medium">
                        {formatCurrency(product.costPerTire)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-tire-400 text-sm mb-1 block">Valor Total</Label>
                    <div className="bg-factory-600/30 border border-tire-600/20 rounded-md px-3 py-2 h-10 flex items-center">
                      <span className="text-neon-green font-medium">
                        {formatCurrency(product.isEditing ? product.editableQuantity * product.costPerTire : product.totalValue)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-end">
                    {product.isEditing && (
                      <Button
                        size="sm"
                        onClick={() => handleSaveQuantity(product.productId)}
                        disabled={isSaving}
                        className="bg-neon-green/20 border border-neon-green/50 text-neon-green hover:bg-neon-green/30 h-10 px-4 w-full"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Salvando..." : "Salvar"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="mt-6 p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
          <h4 className="text-red-400 text-lg flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5" />
            Alertas de Estoque Baixo ({lowStockCount})
          </h4>
          <div className="space-y-2">
            {productAnalysis
              .filter(product => product.stockLevel === "low")
              .map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-3 bg-red-900/10 rounded border border-red-600/20"
                >
                  <div>
                    <span className="text-white font-medium">{product.measures}</span>
                    <div className="text-sm text-tire-300">{product.productName}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-red-400 font-medium">
                      {product.quantity} unidades
                    </span>
                    <div className="text-xs text-tire-400">
                      Mín: {product.minLevel} unidades
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalProductsStock;
