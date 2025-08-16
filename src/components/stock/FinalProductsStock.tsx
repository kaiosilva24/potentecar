
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
  const [productTypeFilter, setProductTypeFilter] = useState<"all" | "final" | "resale">("all");
  const [showMinLevelDialog, setShowMinLevelDialog] = useState(false);
  const [selectedProductForMinLevel, setSelectedProductForMinLevel] = useState("");
  const [minLevel, setMinLevel] = useState("");
  const { toast } = useToast();

  // Estados para sincronização em tempo real
  const [lastSyncedValue, setLastSyncedValue] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState({
    lastUpdate: null as Date | null,
    updateCount: 0,
    source: 'none' as string
  });

  // Função para extrair as medidas do nome do produto
  const extractMeasures = (productName: string): string => {
    // Regex para capturar padrões como "175 70 14", "185 65 15", etc.
    const measurePattern = /(\d{3}\s\d{2}\s\d{2})/;
    const match = productName.match(measurePattern);
    return match ? match[1] : productName;
  };

  // Função auxiliar para determinar o tipo do produto
  const getProductType = (productName: string): "final" | "resale" => {
    // Products with "CARCAÇA" or "carcaça" are typically resale products
    if (productName.toLowerCase().includes('carcaça')) {
      return 'resale';
    }
    // Products with pattern like "175 70 14 P6" are typically final products
    if (/\d{3}\s\d{2}\s\d{2}\s[A-Z]\d+/.test(productName)) {
      return 'final';
    }
    // Default to final for other products
    return 'final';
  };

  // Função para obter custo específico do TireCostManager com sincronização em tempo real
  const getSpecificCost = (productName: string): number => {
    try {
      console.log(`🔍 [FinalProductsStock] Buscando custo para produto: "${productName}"`);
      
      // PRIORIDADE 1: Buscar dados específicos salvos pelo TireCostManager
      const productKey = `tireAnalysis_${productName.toLowerCase().replace(/\s+/g, "_")}`;
      const savedAnalysis = localStorage.getItem(productKey);

      if (savedAnalysis) {
        try {
          const analysis = JSON.parse(savedAnalysis);
          if (analysis.costPerTire && analysis.costPerTire > 0) {
            console.log(`✅ [FinalProductsStock] Custo específico encontrado para "${productName}": R$ ${analysis.costPerTire.toFixed(2)}`);
            console.log(`📊 [FinalProductsStock] Dados da análise:`, {
              hasRecipe: analysis.hasRecipe,
              lastUpdated: analysis.lastUpdated,
              source: analysis.source
            });
            return analysis.costPerTire;
          }
        } catch (parseError) {
          console.warn(`⚠️ [FinalProductsStock] Erro ao parsear análise específica para "${productName}":`, parseError);
        }
      }

      // PRIORIDADE 2: Fallback para custo médio sincronizado
      const synchronizedData = localStorage.getItem("dashboard_averageCostPerTire");
      if (synchronizedData) {
        try {
          const data = JSON.parse(synchronizedData);
          if (data.value && data.value > 0) {
            console.log(`📊 [FinalProductsStock] Usando custo médio para "${productName}": R$ ${data.value.toFixed(2)}`);
            console.log(`📊 [FinalProductsStock] Dados do custo médio:`, {
              lastUpdated: data.lastUpdated,
              source: data.source,
              timestamp: new Date(data.timestamp).toLocaleString()
            });
            return data.value;
          }
        } catch (parseError) {
          console.warn(`⚠️ [FinalProductsStock] Erro ao parsear custo médio:`, parseError);
        }
      }

      console.warn(`⚠️ [FinalProductsStock] Nenhum custo encontrado para "${productName}", usando R$ 0.00`);
      return 0;
    } catch (error) {
      console.error(`❌ [FinalProductsStock] Erro ao buscar custo específico para "${productName}":`, error);
      return 0;
    }
  };

  // useEffect para escutar eventos de sincronização em tempo real do StockCharts e TireCostManager
  useEffect(() => {
    console.log('🔌 [FinalProductsStock] Iniciando configuração de listeners...');
    
    const handleStockChartsUpdate = (event: CustomEvent) => {
      console.log('📡 [FinalProductsStock] Recebendo atualização em tempo real do StockCharts:', event.detail);
      console.log('📊 [FinalProductsStock] Detalhes do evento:', {
        type: event.type,
        detail: event.detail,
        timestamp: new Date().toISOString()
      });
      
      setRealTimeUpdates(prev => {
        const newState = {
          lastUpdate: new Date(),
          updateCount: prev.updateCount + 1,
          source: event.detail.source || 'StockCharts'
        };
        console.log('🔄 [FinalProductsStock] Atualizando estado realTimeUpdates:', newState);
        return newState;
      });
      
      // Forçar recálculo dos dados quando houver mudanças
      if (event.detail.finalProductsData) {
        console.log('🔄 [FinalProductsStock] Processando dados atualizados em tempo real:', event.detail.finalProductsData);
        // Os dados serão recalculados automaticamente pelo useEffect principal
      }
    };
    
    // NOVO: Handler para atualizações de custo do TireCostManager
    const handleTireCostUpdate = (event: CustomEvent) => {
      console.log('💰 [FinalProductsStock] Recebendo atualização de custo do TireCostManager:', event.detail);
      console.log('📊 [FinalProductsStock] Detalhes do custo:', {
        averageCostPerTire: event.detail.averageCostPerTire,
        specificAnalyses: event.detail.specificAnalyses?.length || 0,
        timestamp: new Date(event.detail.timestamp).toLocaleString(),
        source: event.detail.source
      });
      
      setRealTimeUpdates(prev => {
        const newState = {
          lastUpdate: new Date(),
          updateCount: prev.updateCount + 1,
          source: 'TireCostManager'
        };
        console.log('🔄 [FinalProductsStock] Atualizando estado com custos do TireCostManager:', newState);
        return newState;
      });
      
      // Forçar recálculo imediato dos produtos com novos custos
      console.log('🔄 [FinalProductsStock] Forçando recálculo com novos custos por pneu...');
    };
    
    const handleRealtimeUpdate = (event: CustomEvent) => {
      console.log('⚡ [FinalProductsStock] Atualização Supabase Realtime recebida:', event.detail);
      console.log('📊 [FinalProductsStock] Payload Supabase:', {
        eventType: event.detail.payload?.eventType,
        table: event.detail.payload?.table,
        timestamp: new Date().toISOString()
      });
      
      setRealTimeUpdates(prev => {
        const newState = {
          ...prev,
          lastUpdate: new Date(),
          updateCount: prev.updateCount + 1,
          source: 'Supabase-Realtime'
        };
        console.log('🔄 [FinalProductsStock] Atualizando estado com Supabase:', newState);
        return newState;
      });
    };
    
    // Testar se window está disponível
    if (typeof window === 'undefined') {
      console.error('❌ [FinalProductsStock] Window não está disponível!');
      return;
    }
    
    console.log('🌐 [FinalProductsStock] Window disponível, adicionando listeners...');
    
    // Adicionar listeners para eventos customizados
    window.addEventListener('stockChartsDataUpdated', handleStockChartsUpdate as EventListener);
    window.addEventListener('stockChartsRealTimeUpdate', handleRealtimeUpdate as EventListener);
    
    console.log('🔔 [FinalProductsStock] Listeners de sincronização em tempo real configurados');
    console.log('📊 [FinalProductsStock] Listeners ativos:', {
      stockChartsDataUpdated: 'Configurado',
      stockChartsRealTimeUpdate: 'Configurado',
      timestamp: new Date().toISOString()
    });
    
    // Teste imediato para verificar se os listeners funcionam
    setTimeout(() => {
      console.log('🧪 [FinalProductsStock] Testando listeners com evento de teste...');
      const testEvent = new CustomEvent('stockChartsDataUpdated', {
        detail: {
          source: 'FinalProductsStock-Test',
          timestamp: Date.now(),
          test: true
        }
      });
      window.dispatchEvent(testEvent);
    }, 1000);
    
    // Cleanup
    return () => {
      console.log('🧹 [FinalProductsStock] Limpando listeners...');
      window.removeEventListener('stockChartsDataUpdated', handleStockChartsUpdate as EventListener);
      window.removeEventListener('stockChartsRealTimeUpdate', handleRealtimeUpdate as EventListener);
      console.log('🔕 [FinalProductsStock] Listeners de sincronização removidos');
    };
  }, []); // Removida dependência problemática

  useEffect(() => {
    if (!stockItems.length || !products.length) return;

    console.log('🔄 [FinalProductsStock] Recalculando dados do estoque:', {
      stockItems: stockItems.length,
      products: products.length,
      realTimeStatus: realTimeUpdates.source,
      lastUpdate: realTimeUpdates.lastUpdate?.toISOString() || 'Nunca'
    });

    // Filtrar apenas produtos finais em estoque
    const finalProductStockItems = stockItems.filter(item => 
      item.item_type === "product" && item.quantity > 0
    );

    const analysis = finalProductStockItems.map(stockItem => {
      const product = products.find(p => p.id === stockItem.item_id);
      if (!product) return null;

      const costPerTire = getSpecificCost(product.name);
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
      const totalRevenue = totalSold * (stockItem.unit_cost || 0); // Usar unit_cost do stockItem
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
    }).filter(Boolean) as ProductAnalysis[];

    setProductAnalysis(analysis);
  }, [stockItems, products, realTimeUpdates]); // Adicionada dependência realTimeUpdates para forçar recálculo

  // useEffect específico para monitorar mudanças nos custos em tempo real
  useEffect(() => {
    console.log('💰 [FinalProductsStock] Monitorando mudanças nos custos em tempo real...');
    
    const handleStorageChange = (event: StorageEvent) => {
      // Monitorar mudanças no localStorage relacionadas aos custos
      if (event.key === 'dashboard_averageCostPerTire' || 
          (event.key && event.key.startsWith('tireAnalysis_'))) {
        console.log('🔄 [FinalProductsStock] Mudança detectada no localStorage:', {
          key: event.key,
          newValue: event.newValue ? 'Dados atualizados' : 'Dados removidos',
          timestamp: new Date().toLocaleString()
        });
        
        // Forçar recálculo dos produtos
        setRealTimeUpdates(prev => ({
          lastUpdate: new Date(),
          updateCount: prev.updateCount + 1,
          source: 'LocalStorage-CostUpdate'
        }));
      }
    };
    
    // Adicionar listener para mudanças no localStorage
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Função para sincronizar valor total com dashboard
  const syncTotalValueWithDashboard = async (totalValue: number) => {
    if (isSyncing) return; // Evitar múltiplas sincronizações simultâneas
    
    try {
      setIsSyncing(true);
      console.log(`📊 [FinalProductsStock] Sincronizando valor total: R$ ${totalValue.toFixed(2)}`);
      
      // Salvar no Supabase via dataManager
      const success = await dataManager.saveFinalProductStockBalance(totalValue);
      
      if (success) {
        console.log(`✅ [FinalProductsStock] Valor salvo com sucesso no Supabase: R$ ${totalValue.toFixed(2)}`);
        
        // Salvar no localStorage como backup
        localStorage.setItem('finalProductStockBalance', JSON.stringify({
          value: totalValue,
          timestamp: Date.now(),
          source: 'FinalProductsStock'
        }));
        
        // Disparar evento customizado para notificar dashboard
        const updateEvent = new CustomEvent('finalProductStockUpdated', {
          detail: {
            balance: totalValue,
            timestamp: Date.now(),
            source: 'FinalProductsStock-AutoSync'
          }
        });
        window.dispatchEvent(updateEvent);
        
        setLastSyncedValue(totalValue);
        console.log(`📡 [FinalProductsStock] Evento 'finalProductStockUpdated' disparado para dashboard`);
      } else {
        console.error(`❌ [FinalProductsStock] Erro ao salvar valor no Supabase`);
      }
    } catch (error) {
      console.error(`❌ [FinalProductsStock] Erro na sincronização:`, error);
    } finally {
      setIsSyncing(false);
    }
  };

  // useEffect para monitorar mudanças no valor total e sincronizar automaticamente
  useEffect(() => {
    if (!productAnalysis || productAnalysis.length === 0) return;
    
    const currentTotalValue = productAnalysis.reduce((total, product) => total + (product?.totalValue || 0), 0);
    
    // Verificar se o valor mudou significativamente (diferença > R$ 0.01)
    if (lastSyncedValue === null || Math.abs(currentTotalValue - lastSyncedValue) > 0.01) {
      console.log(`🔄 [FinalProductsStock] Valor total mudou de R$ ${(lastSyncedValue || 0).toFixed(2)} para R$ ${currentTotalValue.toFixed(2)}`);
      
      // Debounce de 500ms para evitar múltiplas sincronizações rápidas
      const timeoutId = setTimeout(() => {
        syncTotalValueWithDashboard(currentTotalValue);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [productAnalysis, lastSyncedValue, isSyncing]);

  // useEffect para inicializar valor sincronizado na primeira carga
  useEffect(() => {
    if (productAnalysis && productAnalysis.length > 0 && lastSyncedValue === null) {
      const initialTotalValue = productAnalysis.reduce((total, product) => total + (product?.totalValue || 0), 0);
      console.log(`🚀 [FinalProductsStock] Inicializando sincronização com valor inicial: R$ ${initialTotalValue.toFixed(2)}`);
      syncTotalValueWithDashboard(initialTotalValue);
    }
  }, [productAnalysis, lastSyncedValue]);

  // useEffect para escutar eventos de sincronização do StockCharts
  useEffect(() => {
    const handleStockChartsDataUpdate = (event: CustomEvent) => {
      const { finalProductsData, timestamp, source } = event.detail || {};
      console.log(`📡 [FinalProductsStock] Evento 'stockChartsDataUpdated' recebido de ${source || 'Unknown'}:`);
      console.log(`  - Timestamp: ${timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}`);
      console.log(`  - Produtos recebidos: ${finalProductsData?.length || 0}`);
      
      // Forçar re-análise dos produtos com os novos dados
      if (finalProductsData && finalProductsData.length > 0) {
        console.log('🔄 [FinalProductsStock] Forçando re-análise com dados do StockCharts...');
        
        // Atualizar timestamp para forçar recalculação
        setLastSyncedValue(null);
        
        // Disparar recalculação após pequeno delay
        setTimeout(() => {
          const currentTotalValue = productAnalysis.reduce((total, product) => total + product.totalValue, 0);
          if (currentTotalValue > 0) {
            syncTotalValueWithDashboard(currentTotalValue);
          }
        }, 100);
      }
    };
    
    const handleForceStockRecalculation = (event: CustomEvent) => {
      const { source, timestamp } = event.detail || {};
      console.log(`🔄 [FinalProductsStock] Evento 'forceStockRecalculation' recebido de ${source || 'Unknown'}:`);
      console.log(`  - Timestamp: ${timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}`);
      
      // Forçar recalculação imediata
      const currentTotalValue = productAnalysis?.reduce((total, product) => total + (product?.totalValue || 0), 0) || 0;
      console.log(`💰 [FinalProductsStock] Valor atual calculado: R$ ${currentTotalValue.toFixed(2)}`);
      
      if (currentTotalValue > 0) {
        // Reset do valor sincronizado para forçar nova sincronização
        setLastSyncedValue(null);
        
        setTimeout(() => {
          syncTotalValueWithDashboard(currentTotalValue);
        }, 200);
      }
    };
    
    const handleTireCostUpdate = (event: CustomEvent) => {
      const { averageCostPerTire, specificAnalyses, timestamp, source } = event.detail || {};
      console.log(`💰 [FinalProductsStock] Evento 'tireCostUpdated' recebido de ${source || 'Unknown'}:`);
      console.log(`  - Timestamp: ${timestamp ? new Date(timestamp).toLocaleString() : 'N/A'}`);
      console.log(`  - Custo médio por pneu: R$ ${averageCostPerTire ? averageCostPerTire.toFixed(2) : '0.00'}`);
      console.log(`  - Análises específicas: ${specificAnalyses?.length || 0} produtos`);
      
      // Forçar recalculação dos produtos com novos custos
      setRealTimeUpdates(prev => ({
        lastUpdate: new Date(),
        updateCount: prev.updateCount + 1,
        source: 'TireCostManager-Updated'
      }));
      
      console.log('🔄 [FinalProductsStock] Forçando recalculação com novos custos sincronizados...');
    };
    
    console.log('🎯 [FinalProductsStock] Registrando listeners para eventos do StockCharts e TireCostManager');
    
    // Adicionar listeners para os eventos customizados
    window.addEventListener('stockChartsDataUpdated', handleStockChartsDataUpdate as EventListener);
    window.addEventListener('forceStockRecalculation', handleForceStockRecalculation as EventListener);
    window.addEventListener('tireCostUpdated', handleTireCostUpdate as EventListener);
    
    // Cleanup
    return () => {
      console.log('🚫 [FinalProductsStock] Removendo listeners para eventos do StockCharts e TireCostManager');
      window.removeEventListener('stockChartsDataUpdated', handleStockChartsDataUpdate as EventListener);
      window.removeEventListener('forceStockRecalculation', handleForceStockRecalculation as EventListener);
      window.removeEventListener('tireCostUpdated', handleTireCostUpdate as EventListener);
    };
  }, [productAnalysis, syncTotalValueWithDashboard]);

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
    console.log(`🚀 [FinalProductsStock] handleSaveQuantity CHAMADA para produto: ${productId}`);
    const product = productAnalysis.find(p => p.productId === productId);
    if (!product) {
      console.log(`❌ [FinalProductsStock] Produto não encontrado: ${productId}`);
      return;
    }
    console.log(`✅ [FinalProductsStock] Produto encontrado: ${product.productName}, quantidade editável: ${product.editableQuantity}`);

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
        
        // NOVO: Disparar evento para atualizar StockDashboard em tempo real
        console.log(`🔍 [FinalProductsStock] Preparando cálculo do valor total após atualização...`);
        console.log(`📊 [FinalProductsStock] Estado atual do productAnalysis:`, productAnalysis.map(p => ({
          productId: p.productId,
          productName: p.productName,
          quantity: p.quantity,
          totalValue: p.totalValue,
          isEditing: p.isEditing
        })));
        
        // Calcular valor total atualizado considerando a mudança
        const totalValue = productAnalysis.reduce((sum, p) => {
          if (p.productId === productId) {
            console.log(`🔄 [FinalProductsStock] Produto atualizado: ${p.productName} - Valor antigo: R$ ${p.totalValue.toFixed(2)}, Valor novo: R$ ${newTotalValue.toFixed(2)}`);
            return sum + newTotalValue;
          }
          console.log(`✅ [FinalProductsStock] Produto inalterado: ${p.productName} - Valor: R$ ${p.totalValue.toFixed(2)}`);
          return sum + p.totalValue;
        }, 0);
        
        console.log(`💰 [FinalProductsStock] Valor total calculado: R$ ${totalValue.toFixed(2)}`);
        
        const eventDetail = {
          totalValue,
          totalProducts: productAnalysis.length,
          productsInStock: productAnalysis.filter(p => {
            if (p.productId === productId) {
              return product.editableQuantity > 0;
            }
            return p.quantity > 0;
          }).length,
          lowStockProducts: productAnalysis.filter(p => p.stockLevel === 'low').length,
          timestamp: Date.now(),
          source: 'FinalProductsStock-Save',
          updatedProduct: {
            productId,
            productName: product.productName,
            newQuantity: product.editableQuantity,
            newTotalValue
          }
        };
        
        console.log(`📡 [FinalProductsStock] Disparando evento 'finalProductStockUpdated':`);
        console.log(`  - Valor total: R$ ${eventDetail.totalValue.toFixed(2)}`);
        console.log(`  - Total produtos: ${eventDetail.totalProducts}`);
        console.log(`  - Produtos em estoque: ${eventDetail.productsInStock}`);
        console.log(`  - Produto atualizado: ${eventDetail.updatedProduct.productName} (${eventDetail.updatedProduct.newQuantity} unidades)`);
        
        // Verificar se window está disponível
        if (typeof window === 'undefined') {
          console.error(`❌ [FinalProductsStock] Window não está disponível para disparar eventos!`);
          return;
        }
        
        console.log(`🌐 [FinalProductsStock] Window disponível, disparando eventos...`);
        
        try {
          window.dispatchEvent(new CustomEvent('finalProductStockUpdated', {
            detail: eventDetail
          }));
          console.log(`✅ [FinalProductsStock] Evento 'finalProductStockUpdated' disparado com sucesso!`);
          
          // Também disparar evento geral de atualização de estoque
          window.dispatchEvent(new CustomEvent('stockItemsUpdated', {
            detail: {
              itemId: productId,
              itemType: 'product',
              operation: 'update',
              newQuantity: product.editableQuantity,
              timestamp: Date.now(),
              source: 'FinalProductsStock-Save'
            }
          }));
          console.log(`✅ [FinalProductsStock] Evento 'stockItemsUpdated' disparado com sucesso!`);
          
        } catch (eventError) {
          console.error(`❌ [FinalProductsStock] Erro ao disparar eventos:`, eventError);
        }
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

    // Find the actual product to determine its type
    const actualProduct = products.find(p => p.id === product.productId);
    const productType = actualProduct ? getProductType(actualProduct.name) : 'final';
    const matchesProductType = 
      productTypeFilter === "all" ||
      productType === productTypeFilter;

    return matchesSearch && matchesFilter && matchesProductType;
  });

  // Calculate low stock count
  const lowStockCount = productAnalysis.filter(product => product.stockLevel === "low").length;

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
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-semibold text-white flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-neon-green" />
              </div>
              {productTypeFilter === "all" ? "Produtos Finais" : 
               productTypeFilter === "final" ? "🏭 Produtos Finais" : "🛒 Produtos Revenda"}
              <span className="text-neon-green text-sm">({filteredProductAnalysis.length} {productTypeFilter === "all" ? "tipos" : productTypeFilter === "final" ? "finais" : "revenda"})</span>
              {lowStockCount > 0 && (
                <span className="text-red-400 text-sm flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {lowStockCount} baixo
                </span>
              )}
              {realTimeUpdates.source !== 'none' && (
                <div className="flex items-center space-x-2 px-2 py-1 bg-green-900/50 rounded-full border border-green-500/30">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-300 font-medium">
                    Sync ({realTimeUpdates.source})
                  </span>
                  {realTimeUpdates.lastUpdate && (
                    <span className="text-xs text-green-400">
                      • {realTimeUpdates.lastUpdate.toLocaleTimeString('pt-BR')}
                    </span>
                  )}
                </div>
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



        <Select value={productTypeFilter} onValueChange={(value: "all" | "final" | "resale") => setProductTypeFilter(value)}>
          <SelectTrigger className="w-48 bg-factory-700/50 border-tire-600/30 text-white">
            <SelectValue placeholder="Tipo de Produto" />
          </SelectTrigger>
          <SelectContent className="bg-factory-800 border-tire-600/30">
            <SelectItem value="final" className="text-white hover:bg-tire-700/50">
              🏭 Produtos Finais
            </SelectItem>
            <SelectItem value="resale" className="text-white hover:bg-tire-700/50">
              🛒 Produtos Revenda
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
            <p className="text-2xl font-bold" style={{ color: '#00d4ff' }}>
              {filteredProductAnalysis.reduce((total, product) => total + product.quantity, 0)}
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
          
          <div className="border border-neon-green rounded-lg p-4" style={{ backgroundColor: '#173329' }}>
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
              {searchTerm || filterType !== "all" || productTypeFilter !== "all"
                ? "Nenhum produto encontrado com os filtros aplicados"
                : "Nenhum produto final em estoque"}
            </p>
            {(searchTerm || filterType !== "all" || productTypeFilter !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                  setProductTypeFilter("all");
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
                    {(() => {
                      const actualProduct = products.find(p => p.id === product.productId);
                      const productType = actualProduct ? getProductType(actualProduct.name) : 'final';
                      return (
                        <span className="text-2xl" title={productType === 'final' ? 'Produto Final' : 'Produto de Revenda'}>
                          {productType === 'final' ? '🏭' : '🛒'}
                        </span>
                      );
                    })()}
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
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-tire-400 text-sm">{product.productName}</p>
                    {(() => {
                      const actualProduct = products.find(p => p.id === product.productId);
                      const productType = actualProduct ? getProductType(actualProduct.name) : 'final';
                      return (
                        <span className={`text-xs px-2 py-1 rounded-full border ${
                          productType === 'final' 
                            ? 'bg-blue-900/20 text-blue-400 border-blue-600/30' 
                            : 'bg-purple-900/20 text-purple-400 border-purple-600/30'
                        }`}>
                          {productType === 'final' ? 'FINAL' : 'REVENDA'}
                        </span>
                      );
                    })()}
                  </div>
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
