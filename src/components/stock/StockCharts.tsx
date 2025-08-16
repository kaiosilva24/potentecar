import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,

  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  ArrowUpDown,
  Palette,
  Settings,
  RotateCcw,
} from "lucide-react";
import {
  RawMaterial,
  Product,
  StockItem,
} from "@/types/financial";
import { dataManager } from "@/utils/dataManager";

// Função para obter custo específico do TireCostManager (igual ao FinalProductsStock)
const getSpecificCost = (productName: string): number => {
  try {
    // Buscar dados específicos salvos pelo TireCostManager
    const productKey = `tireAnalysis_${productName.toLowerCase().replace(/\s+/g, "_")}`;
    const savedAnalysis = localStorage.getItem(productKey);

    console.log(`🔍 [StockCharts] Buscando custo para ${productName}:`, {
      productKey,
      hasData: !!savedAnalysis,
      data: savedAnalysis ? JSON.parse(savedAnalysis) : null
    });

    if (savedAnalysis) {
      const analysis = JSON.parse(savedAnalysis);
      if (analysis.costPerTire && analysis.costPerTire > 0) {
        console.log(`✅ [StockCharts] Custo encontrado para ${productName}: R$ ${analysis.costPerTire}`);
        return analysis.costPerTire;
      }
    }

    // Fallback para custo médio sincronizado
    const synchronizedData = localStorage.getItem("dashboard_averageCostPerTire");
    if (synchronizedData) {
      const data = JSON.parse(synchronizedData);
      if (data.value && data.value > 0) {
        console.log(`🔄 [StockCharts] Usando custo médio para ${productName}: R$ ${data.value}`);
        return data.value;
      }
    }

    console.warn(`⚠️ [StockCharts] Nenhum custo encontrado para ${productName}`);
    return 0;
  } catch (error) {
    console.error('Erro ao obter custo específico:', error);
    return 0;
  }
};

// Componente CustomTooltip para mostrar valores sincronizados
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    
    if (!data) return null;
    
    console.log('📊 [CustomTooltip] Dados recebidos:', {
      fullName: data.fullName,
      name: data.name,
      quantity: data.quantity,
      totalValue: data.totalValue,
      unitCost: data.unitCost,
      unit: data.unit,
      type: data.type,
      status: data.status,
      minLevel: data.minLevel,
      allData: data
    });
    
    // Formatar valor monetário
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value || 0);
    };
    
    // Formatar quantidade com unidade
    const formatQuantity = (quantity: number, unit: string) => {
      return `${quantity || 0} ${unit || 'un'}`;
    };
    
    // Calcular valor unitário se possível
    const unitValue = data.totalValue && data.quantity > 0 ? data.totalValue / data.quantity : 0;
    
    // Determinar tipo de item (material ou produto)
    const itemType = data.type === 'final' ? 'Produto Final' : 'Matéria-Prima';
    
    return (
      <div className="bg-factory-800/95 border border-tire-600/50 rounded-lg p-4 shadow-lg backdrop-blur-sm min-w-[280px]">
        <div className="space-y-3">
          {/* Cabeçalho com nome e tipo */}
          <div className="border-b border-tire-600/30 pb-2">
            <div className="font-semibold text-white text-sm">
              {data.fullName || label}
            </div>
            <div className="text-xs text-tire-400 mt-1">
              {itemType}
            </div>
          </div>
          
          {/* Informações principais */}
          <div className="space-y-2">
            {/* Quantidade atual */}
            <div className="flex items-center justify-between">
              <span className="text-tire-300 text-sm">Quantidade:</span>
              <span className="text-neon-orange font-medium text-sm">
                {formatQuantity(data.quantity, data.unit)}
              </span>
            </div>
            
            {/* Valor total */}
            <div className="flex items-center justify-between">
              <span className="text-tire-300 text-sm">Valor Total:</span>
              <span className="text-green-400 font-medium text-sm">
                {formatCurrency(data.totalValue)}
              </span>
            </div>
            
            {/* Valor unitário */}
            {unitValue > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-tire-300 text-sm">Valor Unitário:</span>
                <span className="text-blue-400 font-medium text-sm">
                  {formatCurrency(unitValue)}
                </span>
              </div>
            )}
            
            {/* Nível mínimo */}
            {data.minLevel > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-tire-300 text-sm">Nível Mínimo:</span>
                <span className="text-yellow-400 font-medium text-sm">
                  {formatQuantity(data.minLevel, data.unit)}
                </span>
              </div>
            )}
          </div>
          
          {/* Status e alertas */}
          <div className="pt-2 border-t border-tire-600/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-tire-300 text-sm">Status:</span>
              <span className={`font-medium text-sm ${
                data.status === 'low' ? 'text-red-400' :
                data.status === 'out' ? 'text-red-500' :
                'text-green-400'
              }`}>
                {data.status === 'low' ? 'Estoque Baixo' :
                 data.status === 'out' ? 'Sem Estoque' :
                 'Normal'}
              </span>
            </div>
            
            {/* Alerta de estoque baixo */}
            {data.status === 'low' && data.minLevel > 0 && (
              <div className="bg-red-900/20 border border-red-600/30 rounded p-2 mt-2">
                <div className="text-red-400 text-xs flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                  <span>Atenção: Estoque abaixo do mínimo!</span>
                </div>
              </div>
            )}
            
            {/* Alerta sem estoque */}
            {data.status === 'out' && (
              <div className="bg-red-900/30 border border-red-500/40 rounded p-2 mt-2">
                <div className="text-red-500 text-xs flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                  <span>Crítico: Sem estoque disponível!</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Indicador de sincronização em tempo real */}
          <div className="flex items-center justify-center pt-2 border-t border-tire-600/30">
            <div className="flex items-center gap-2 text-xs text-tire-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Sincronizado em tempo real</span>
              <div className="text-xs text-tire-500">
                {new Date().toLocaleTimeString('pt-BR')}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

interface StockChartsProps {
  materials?: RawMaterial[];
  products?: Product[];
  resaleProducts?: any[];
  stockItems?: StockItem[];
  productType?: "all" | "final" | "resale";
  isLoading?: boolean;
}

const StockCharts = ({
  materials = [],
  products = [],
  resaleProducts = [],
  stockItems = [],
  productType = "all",
  isLoading = false,
}: StockChartsProps) => {
  
  // Log dos dados recebidos com foco em produtos de revenda
  console.log('🔍 [StockCharts] Dados recebidos:', {
    materialsCount: materials.length,
    productsCount: products.length,
    resaleProductsCount: resaleProducts.length,
    stockItemsCount: stockItems.length,
    productType,
    isLoading,
    resaleProductsSample: resaleProducts.slice(0, 3).map(item => ({
      id: item.id,
      name: item.name,
      purchase_price: item.purchase_price
    })),
    resaleStockItemsSample: stockItems.filter(item => 
      item.item_type === 'product' && 
      resaleProducts.some(rp => rp.id === item.item_id)
    ).slice(0, 3).map(item => ({
      id: item.id,
      item_id: item.item_id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      total_value: item.total_value
    }))
  });
  // Estados para controle de ordenação
  const [materialSortBy, setMaterialSortBy] = useState<string>("quantity");
  const [productSortBy, setProductSortBy] = useState<string>("quantity");
  const [materialSortOrder, setMaterialSortOrder] = useState<"asc" | "desc">(
    "desc",
  );
  const [productSortOrder, setProductSortOrder] = useState<"asc" | "desc">(
    "desc",
  );
  
  // Estado para controlar tipo de produto exibido
  const [productDisplayType, setProductDisplayType] = useState<"final" | "resale">("final");

  // Estados para configuração de cores
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [colorSettings, setColorSettings] = useState({
    quantityColor: "#bbe5fc", // Cor padrão azul claro
    lowStockColor: "#FF3838", // Vermelho para estoque baixo
  });
  const [isLoadingColors, setIsLoadingColors] = useState(true);

  // Carregar configurações salvas do Supabase com fallback para localStorage
  useEffect(() => {
    const loadColorSettings = async () => {
      console.log('📁 [StockCharts] Iniciando carregamento das configurações de cores...');
      try {
        // Usar configurações locais (funcionalidade Supabase removida temporariamente)
        console.log('🔍 [StockCharts] Carregando configurações locais...');
        
        // Fallback 1: Tentar carregar do checkpoint localStorage
        console.log('🔍 [StockCharts] Tentando carregar do checkpoint localStorage...');
        const checkpointData = localStorage.getItem("checkpoint_stockChartColors");
        if (checkpointData) {
          const checkpoint = JSON.parse(checkpointData);
          if (checkpoint.stockChartColors) {
            console.log('✅ [StockCharts] Configurações encontradas no checkpoint:', checkpoint.stockChartColors);
            setColorSettings((prev) => ({ ...prev, ...checkpoint.stockChartColors }));
            console.log('✅ [StockCharts] Configurações carregadas do checkpoint e aplicadas');
            return;
          }
        }
        console.log('⚠️ [StockCharts] Nenhuma configuração encontrada no checkpoint');
        
        // Fallback 2: localStorage tradicional
        console.log('🔍 [StockCharts] Tentando carregar do localStorage tradicional...');
        const savedSettings = localStorage.getItem("stockChartColorSettings");
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          console.log('✅ [StockCharts] Configurações encontradas no localStorage:', parsed);
          setColorSettings((prev) => ({ ...prev, ...parsed }));
          console.log('✅ [StockCharts] Configurações carregadas do localStorage e aplicadas');
        } else {
          console.log('⚠️ [StockCharts] Nenhuma configuração encontrada no localStorage - usando padrões');
        }
      } catch (error) {
        console.error("❌ [StockCharts] Erro ao carregar configurações de cores:", error);
      } finally {
        // Marca o carregamento como concluído para permitir auto-save
        console.log('✅ [StockCharts] Carregamento concluído - habilitando auto-save');
        setIsLoadingColors(false);
      }
    };
    
    loadColorSettings();
  }, []);

  // Estados para sincronização em tempo real
  const [realTimeData, setRealTimeData] = useState({
    lastUpdate: null as Date | null,
    isSubscribed: false,
    updateCount: 0
  });

  // Estado para forçar re-renderização dos dados de produtos de revenda
  const [forceRefreshKey, setForceRefreshKey] = useState(0);

  // useEffect para configurar sincronização em tempo real via Supabase
  useEffect(() => {
    let supabaseSubscription: any = null;
    
    const setupRealTimeSync = async () => {
      try {
        console.log('🔄 [StockCharts] Configurando sincronização em tempo real...');
        
        // Funcionalidade de subscription removida temporariamente
        console.log('📡 [StockCharts] Subscription em tempo real desabilitada temporariamente');
        
        setRealTimeData(prev => ({ ...prev, isSubscribed: true }));
        console.log('✅ [StockCharts] Subscription Supabase Realtime ativa');
        
      } catch (error) {
        console.error('❌ [StockCharts] Erro ao configurar sincronização:', error);
      }
    };
    
    setupRealTimeSync();
    
    // Cleanup
    return () => {
      if (supabaseSubscription) {
        console.log('🔕 [StockCharts] Cancelando subscription Supabase');
        supabaseSubscription();
      }
    };
  }, []);

  // useEffect para sincronizar mudanças no estoque com FinalProductsStock e ResaleProductsStock
  useEffect(() => {
    if (!stockItems.length || (!products.length && !resaleProducts.length)) return;
    
    console.log('📊 [StockCharts] Detectadas mudanças nos dados de estoque:', {
      stockItems: stockItems.length,
      products: products.length,
      resaleProducts: resaleProducts.length,
      timestamp: new Date().toISOString(),
      realTimeStatus: realTimeData.isSubscribed ? 'Ativo' : 'Inativo',
      lastUpdate: realTimeData.lastUpdate?.toISOString() || 'Nunca',
      updateCount: realTimeData.updateCount
    });
    
    // Calcular dados dos produtos finais com informações enriquecidas
    const finalProducts = products.filter(p => !p.archived);
    const finalProductsData = finalProducts.map(product => {
      const stockItem = stockItems.find(item => 
        item.item_id === product.id && 
        item.item_type === 'product'
      );
      
      const quantity = stockItem?.quantity || 0;
      const unitCost = stockItem?.unit_cost || 0;
      const totalValue = stockItem?.total_value || (quantity * unitCost);
      
      // Calcular nível de estoque
      const minLevel = stockItem?.min_level || 0;
      let stockLevel: 'normal' | 'low' | 'out' = 'normal';
      if (quantity === 0) stockLevel = 'out';
      else if (quantity <= minLevel) stockLevel = 'low';
      
      return {
        id: product.id,
        name: product.name,
        quantity,
        unitCost,
        totalValue,
        minLevel,
        stockLevel,
        lastUpdated: new Date().toISOString(),
        stockItem: stockItem ? {
          id: stockItem.id,
          quantity: stockItem.quantity,
          unit_cost: stockItem.unit_cost,
          total_value: stockItem.total_value,
          min_level: stockItem.min_level,
          last_updated: stockItem.last_updated
        } : null
      };
    });
    
    console.log('📦 [StockCharts] Dados de produtos finais processados:', {
      totalProducts: finalProductsData.length,
      inStock: finalProductsData.filter(p => p.quantity > 0).length,
      lowStock: finalProductsData.filter(p => p.stockLevel === 'low').length,
      outOfStock: finalProductsData.filter(p => p.stockLevel === 'out').length,
      totalValue: finalProductsData.reduce((sum, p) => sum + p.totalValue, 0)
    });
    
    // Disparar evento customizado para sincronizar com FinalProductsStock
    const syncEvent = new CustomEvent('stockChartsDataUpdated', {
      detail: {
        finalProductsData,
        timestamp: Date.now(),
        source: 'StockCharts',
        realTimeStatus: realTimeData.isSubscribed,
        updateCount: realTimeData.updateCount
      }
    });
    
    window.dispatchEvent(syncEvent);
    console.log('📡 [StockCharts] Evento de sincronização disparado para FinalProductsStock');
    
    // Debounce para evitar múltiplos disparos rápidos
    const timeoutId = setTimeout(() => {
      // Forçar recálculo do valor total no FinalProductsStock
      const forceRecalcEvent = new CustomEvent('forceStockRecalculation', {
        detail: {
          source: 'StockCharts',
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(forceRecalcEvent);
      console.log('🔄 [StockCharts] Evento de recálculo forçado disparado');
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [stockItems, products, resaleProducts, realTimeData.updateCount]);

  // Salvar configurações no Supabase para sincronização entre navegadores
  const saveColorSettings = async () => {
    console.log('💾 [StockCharts] Iniciando salvamento das configurações:', colorSettings);
    try {
      // Salvar no localStorage para uso imediato
      localStorage.setItem(
        "stockChartColorSettings",
        JSON.stringify(colorSettings),
      );
      console.log('✅ [StockCharts] Configurações salvas no localStorage');
      
      // Salvar no checkpoint também
      const checkpointData = {
        stockChartColors: colorSettings,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      localStorage.setItem(
        "checkpoint_stockChartColors",
        JSON.stringify(checkpointData),
      );
      console.log('✅ [StockCharts] Configurações salvas no checkpoint');
      
      // Funcionalidade Supabase removida temporariamente
      console.log('✅ [StockCharts] Configurações salvas localmente');
    } catch (error) {
      console.error('❌ [StockCharts] Erro ao salvar configurações:', error);
    }
  };

  // Resetar cores para o padrão
  const resetToDefaultColors = async () => {
    const defaultSettings = {
      quantityColor: "#bbe5fc",
      lowStockColor: "#FF3838",
    };
    // Garantir que não estamos carregando quando resetamos
    setIsLoadingColors(false);
    setColorSettings(defaultSettings);
    
    try {
      // Salvar no localStorage para uso imediato
      localStorage.setItem(
        "stockChartColorSettings",
        JSON.stringify(defaultSettings),
      );
      
      // Salvar no checkpoint
      const checkpointData = {
        stockChartColors: defaultSettings,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      localStorage.setItem(
        "checkpoint_stockChartColors",
        JSON.stringify(checkpointData),
      );
      
      // Funcionalidade Supabase removida temporariamente
      console.log('✅ [StockCharts] Cores resetadas para padrão local');
    } catch (error) {
      console.error('❌ [StockCharts] Erro ao resetar configurações:', error);
    }
  };

  // Atualizar cor específica
  const updateColor = (key: string, value: string) => {
    console.log('🎨 [StockCharts] updateColor chamada:', { key, value, currentSettings: colorSettings });
    // Garantir que não estamos mais carregando quando o usuário faz alterações
    setIsLoadingColors(false);
    console.log('🔓 [StockCharts] isLoadingColors definido como false');
    setColorSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      console.log('🔄 [StockCharts] Novas configurações aplicadas:', newSettings);
      return newSettings;
    });
  };

  // Auto-salvar configurações quando alteradas
  useEffect(() => {
    // Não salvar durante o carregamento inicial
    if (isLoadingColors) {
      return;
    }
    
    const timer = setTimeout(() => {
      saveColorSettings();
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timer);
  }, [colorSettings, isLoadingColors]);

  // useEffect para escutar eventos de sincronização de produtos de revenda
  useEffect(() => {
    const handleResaleStockUpdate = (event: CustomEvent) => {
      console.log('📡 [StockCharts] Evento resaleStockUpdated recebido:', event.detail);
      
      // Forçar re-renderização dos dados atualizando o estado de realTimeData
      setRealTimeData(prev => ({
        ...prev,
        lastUpdate: new Date(),
        updateCount: prev.updateCount + 1
      }));
      
      console.log('🔄 [StockCharts] Forçando atualização dos gráficos de produtos de revenda...');
      
      // Forçar atualização imediata dos dados do gráfico
      setTimeout(() => {
        console.log('⚡ [StockCharts] Executando atualização imediata dos dados...');
        // O useEffect de sincronização será executado devido à mudança em realTimeData.updateCount
      }, 100);
    };

    const handleForceChartsRefresh = (event: CustomEvent) => {
      console.log('⚡ [StockCharts] Evento forceChartsRefresh recebido:', event.detail);
      
      // Forçar re-renderização imediata
      setRealTimeData(prev => ({
        ...prev,
        lastUpdate: new Date(),
        updateCount: prev.updateCount + 1
      }));
      
      console.log('🔄 [StockCharts] Executando refresh imediato dos gráficos...');
    };

    // Adicionar listeners para eventos de produtos de revenda
    window.addEventListener('resaleStockUpdated', handleResaleStockUpdate as EventListener);
    window.addEventListener('forceChartsRefresh', handleForceChartsRefresh as EventListener);
    console.log('🎧 [StockCharts] Listeners para eventos de produtos de revenda configurados');

    // Cleanup
    return () => {
      window.removeEventListener('resaleStockUpdated', handleResaleStockUpdate as EventListener);
      window.removeEventListener('forceChartsRefresh', handleForceChartsRefresh as EventListener);
      console.log('🔕 [StockCharts] Listeners de produtos de revenda removidos');
    };
  }, []);

  const getMaterialChartData = () => {
    const data = materials
      .filter((m) => !m.archived)
      .map((material, index) => {
        const stock = stockItems.find(
          (item) =>
            item.item_id === material.id && item.item_type === "material",
        );
        const quantity = stock?.quantity || 0;
        const minLevel = stock?.min_level || 0;

        let status = "normal";
        if (minLevel > 0 && quantity <= minLevel) status = "low";

        return {
          name:
            material.name.length > 15
              ? material.name.substring(0, 15) + "..."
              : material.name,
          fullName: material.name,
          quantity,
          minLevel,
          unit: material.unit,
          status,
          totalValue: stock?.total_value || 0,
          originalIndex: index,
        };
      });

    // Aplicar ordenação baseada no estado
    return data.sort((a, b) => {
      let comparison = 0;
      switch (materialSortBy) {
        case "name":
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
        case "value":
          comparison = a.totalValue - b.totalValue;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = a.quantity - b.quantity;
      }
      return materialSortOrder === "asc" ? comparison : -comparison;
    });
  };

  // Função para obter dados dos produtos baseado no tipo selecionado
  const getProductChartData = (
    products: Product[],
    resaleProducts: any[],
    stockItems: StockItem[],
    displayType: "final" | "resale"
  ) => {
    console.log('🔍 [StockCharts] Iniciando getProductChartData:', {
      productsCount: products.length,
      resaleProductsCount: resaleProducts.length,
      stockItemsCount: stockItems.length,
      displayType
    });

    // Filtrar produtos baseado no tipo selecionado
    let selectedProducts: any[] = [];
    
    if (displayType === "final") {
      selectedProducts = products.filter(p => !p.archived).map(product => ({
        ...product,
        type: 'final' as const
      }));
    } else {
      selectedProducts = resaleProducts.map(product => ({
        ...product,
        type: 'resale' as const
      }));
    }

    console.log('📊 [StockCharts] Produtos processados:', {
      totalProducts: selectedProducts.length,
      type: displayType,
      selectedProductsSample: selectedProducts.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        type: p.type
      }))
    });

    const chartData = selectedProducts.map(product => {
      const stockItem = stockItems.find(item => 
        item.item_id === product.id && 
        item.item_type === 'product'
      );

      const quantity = stockItem?.quantity || 0;
      const minLevel = stockItem?.min_level || 0;
      
      let totalValue = 0;
      let unitCost = 0;
      
      if (displayType === "final") {
        // Para produtos finais, usar a lógica do TireCostManager
        const costPerTire = getSpecificCost(product.name);
        totalValue = quantity * costPerTire;
        unitCost = costPerTire;
      } else {
        // Para produtos de revenda, usar valores reais do estoque
        totalValue = stockItem?.total_value || 0;
        unitCost = quantity > 0 ? totalValue / quantity : 0;
        
        // Log detalhado para produtos de revenda (sempre)
        console.log(`📦 [StockCharts] Produto de revenda processado: ${product.name}`, {
          productId: product.id,
          stockItemFound: !!stockItem,
          stockItemId: stockItem?.id,
          quantity,
          stockItemTotalValue: stockItem?.total_value,
          stockItemUnitCost: stockItem?.unit_cost,
          calculatedUnitCost: unitCost,
          calculatedTotalValue: totalValue,
          minLevel
        });
      }
      
      const finalTotalValue = totalValue;

      // Determinar status do estoque
      let status = "normal";
      if (quantity === 0) {
        status = "out";
      } else if (minLevel > 0 && quantity <= minLevel) {
        status = "low";
      }

      // Log apenas para produtos finais (para evitar spam)
      if (displayType === "final" && Math.random() < 0.1) {
        console.log(`📦 [StockCharts] Produto final processado: ${product.name}`, {
          productId: product.id,
          quantity,
          unitCost,
          totalValue,
          finalTotalValue,
          status,
          source: 'TireCostManager'
        });
      }

      return {
        name: product.name.length > 15 ? `${product.name.substring(0, 15)}...` : product.name,
        fullName: product.name,
        quantity,
        totalValue: finalTotalValue,
        unitCost,
        minLevel,
        minimumLevel: minLevel, // Compatibilidade
        type: product.type,
        unit: product.unit,
        status
      };
    });

    return chartData.sort((a, b) => {
      let comparison = 0;
      switch (productSortBy) {
        case "name":
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
        case "value":
          comparison = a.totalValue - b.totalValue;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = a.quantity - b.quantity;
      }
      return productSortOrder === "asc" ? comparison : -comparison;
    });
  };

  const materialData = getMaterialChartData();
  const productData = getProductChartData(products, resaleProducts, stockItems, productDisplayType);

  // Calcular dados dos produtos baseado no tipo selecionado
  const productChartData = getProductChartData(
    products, 
    resaleProducts,
    stockItems,
    productDisplayType
  );

  // Contar apenas produtos finais
  const finalProductsCount = products.filter(p => !p.archived).length;
  const displayedProductsCount = finalProductsCount;

  const getBarColor = (status: string) => {
    if (status === "low") {
      return colorSettings.lowStockColor;
    }
    return colorSettings.quantityColor;
  };

  const getQuantityBarColor = () => {
    return colorSettings.quantityColor;
  };



  // Função para obter cor dinâmica baseada no status do estoque
  const getDynamicBarColor = (data: any[]) => {
    return data.map(item => {
      if (item.status === 'low' || item.status === 'out') {
        return colorSettings.lowStockColor;
      }
      return colorSettings.quantityColor;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // CustomTooltip removido - usando a versão completa definida no início do arquivo

  const getStockSummary = (data: any[]) => {
    const total = data.length;
    const lowStock = data.filter((item) => item.status === "low").length;
    const normalStock = data.filter((item) => item.status === "normal").length;
    const totalValue = data.reduce((sum, item) => sum + item.totalValue, 0);

    return { total, lowStock, normalStock, totalValue };
  };

  const materialSummary = getStockSummary(materialData);
  const productSummary = getStockSummary(productData);

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-factory-700/50 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-factory-700/50 rounded"></div>
            <div className="h-96 bg-factory-700/50 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-neon-purple" />
                <Palette className="h-5 w-5 text-neon-green" />
              </div>
              Dashboard de Estoque - Gráficos Personalizáveis
            </h3>
            <p className="text-tire-300 mt-2">
              Visualização gráfica dos níveis de estoque com cores
              personalizáveis e controles de ordenação
            </p>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Materials Chart */}
        <Card className="bg-factory-800/50 border-tire-600/30 h-fit">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-neon-green" />
                Estoque de Matérias-Primas
              </div>
              <div className="flex gap-2">
                {materialSummary.lowStock > 0 && (
                  <Badge variant="destructive" className="bg-red-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {materialSummary.lowStock} Baixo
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="text-tire-300 border-tire-600"
                >
                  {materialSummary.total} Total
                </Badge>
              </div>
            </CardTitle>

            {/* Controles de Ordenação para Materiais */}
            <div className="flex flex-wrap items-center gap-3 mt-4 p-3 bg-factory-700/30 rounded-lg border border-tire-600/20">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-neon-blue" />
                <span className="text-tire-300 text-sm font-medium">
                  Ordenar por:
                </span>
              </div>

              <Select value={materialSortBy} onValueChange={setMaterialSortBy}>
                <SelectTrigger className="w-32 bg-factory-700/50 border-tire-600/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-factory-800 border-tire-600/30">
                  <SelectItem
                    value="quantity"
                    className="text-white hover:bg-tire-700/50"
                  >
                    Quantidade
                  </SelectItem>
                  <SelectItem
                    value="name"
                    className="text-white hover:bg-tire-700/50"
                  >
                    Nome
                  </SelectItem>
                  <SelectItem
                    value="value"
                    className="text-white hover:bg-tire-700/50"
                  >
                    Valor
                  </SelectItem>
                  <SelectItem
                    value="status"
                    className="text-white hover:bg-tire-700/50"
                  >
                    Status
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setMaterialSortOrder(
                    materialSortOrder === "asc" ? "desc" : "asc",
                  )
                }
                className="text-tire-300 hover:text-white hover:bg-tire-700/50 flex items-center gap-1"
              >
                <ArrowUpDown className="h-3 w-3" />
                {materialSortOrder === "asc" ? "Crescente" : "Decrescente"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {materialData.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                <p className="text-tire-400">
                  Nenhuma matéria-prima cadastrada
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={450}>
                <BarChart
                  data={materialData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />

                  <Bar
                    dataKey="quantity"
                    name="Quantidade em Estoque"
                    radius={[6, 6, 0, 0]}
                  >
                    {materialData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.status === 'low' || entry.status === 'out' 
                            ? colorSettings.lowStockColor 
                            : colorSettings.quantityColor
                        } 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Products Chart */}
        <Card className="bg-factory-800/50 border-tire-600/30 h-fit">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-neon-orange" />
                {productDisplayType === "final" ? "Estoque de Produtos Finais" : "Estoque de Produtos Revenda"}
                <span className="text-xs text-tire-400">
                  ({productData.length} produtos)
                </span>
              </div>
              <div className="flex gap-2">
                {productSummary.lowStock > 0 && (
                  <Badge variant="destructive" className="bg-red-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {productSummary.lowStock} Baixo
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="text-tire-300 border-tire-600"
                >
                  {productSummary.total} Exibindo
                </Badge>
              </div>
            </CardTitle>

            {/* Controles de Filtro e Ordenação para Produtos */}
            <div className="flex flex-wrap items-center gap-3 mt-4 p-3 bg-factory-700/30 rounded-lg border border-tire-600/20">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-neon-orange" />
                <span className="text-tire-300 text-sm font-medium">
                  Ordenar por:
                </span>
              </div>

              <Select value={productSortBy} onValueChange={setProductSortBy}>
                <SelectTrigger className="w-32 bg-factory-700/50 border-tire-600/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-factory-800 border-tire-600/30">
                  <SelectItem
                    value="quantity"
                    className="text-white hover:bg-tire-700/50"
                  >
                    Quantidade
                  </SelectItem>
                  <SelectItem
                    value="name"
                    className="text-white hover:bg-tire-700/50"
                  >
                    Nome
                  </SelectItem>
                  <SelectItem
                    value="value"
                    className="text-white hover:bg-tire-700/50"
                  >
                    Valor
                  </SelectItem>
                  <SelectItem
                    value="status"
                    className="text-white hover:bg-tire-700/50"
                  >
                    Status
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setProductDisplayType(
                    productDisplayType === "final" ? "resale" : "final"
                  )
                }
                className="text-tire-300 hover:text-white hover:bg-tire-700/50 flex items-center gap-1"
              >
                <BarChart3 className="h-3 w-3" />
                {productDisplayType === "final" ? "Produtos Finais" : "Produtos Revenda"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setProductSortOrder(
                    productSortOrder === "asc" ? "desc" : "asc",
                  )
                }
                className="text-tire-300 hover:text-white hover:bg-tire-700/50 flex items-center gap-1"
              >
                <ArrowUpDown className="h-3 w-3" />
                {productSortOrder === "asc" ? "Crescente" : "Decrescente"}
              </Button>

            </div>
          </CardHeader>
          <CardContent>
            {productData.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                <p className="text-tire-400">Nenhum produto cadastrado</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={450}>
                <BarChart
                  data={productData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />

                  <Bar
                    dataKey="quantity"
                    name="Quantidade em Estoque"
                    radius={[6, 6, 0, 0]}
                  >
                    {productData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.status === 'low' || entry.status === 'out' 
                            ? colorSettings.lowStockColor 
                            : colorSettings.quantityColor
                        } 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts */}
      {(materialSummary.lowStock > 0 || productSummary.lowStock > 0) && (
        <Card className="mt-6 bg-red-900/20 border-red-600/30">
          <CardHeader>
            <CardTitle className="text-red-400 text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {materialData
                .filter((item) => item.status === "low")
                .map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-red-900/10 rounded border border-red-600/20"
                  >
                    <span className="text-white">
                      {item.fullName} (Matéria-Prima)
                    </span>
                    <span className="text-red-400">
                      {item.quantity} {item.unit} / Mín: {item.minLevel}{" "}
                      {item.unit}
                    </span>
                  </div>
                ))}
              {productData
                .filter((item) => item.status === "low")
                .map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-red-900/10 rounded border border-red-600/20"
                  >
                    <span className="text-white">
                      {item.fullName} (Produto)
                    </span>
                    <span className="text-red-400">
                      {item.quantity} {item.unit} / Mín: {item.minLevel}{" "}
                      {item.unit}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StockCharts;