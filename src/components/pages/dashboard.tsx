import React, { useState, useEffect, useMemo } from "react";
import TopNavigation from "../dashboard/layout/TopNavigation";
import Sidebar from "../dashboard/layout/Sidebar";
import DashboardGrid from "../dashboard/DashboardGrid";
import TaskBoard from "../dashboard/TaskBoard";
import FinancialDashboard from "../financial/FinancialDashboard";
import RegistrationDashboard from "../registration/RegistrationDashboard";
import StockDashboard from "../stock/StockDashboard";
import ProductionDashboard from "../production/ProductionDashboard";
import SalesDashboard from "../sales/SalesDashboard";
import DataDiagnostic from "../debug/DataDiagnostic";
import StockCharts from "../stock/StockCharts";
import ProductionChart from "../stock/ProductionChart";
import potentCarLogo from "../../assets/potente-car.png";

import { useDataPersistence, useDebts } from '../../hooks/useDataPersistence';
import { supabase } from '../../../supabase/supabase';
import PresumedProfitManager from "../financial/PresumedProfitManager";
import ResaleProductProfitManager from "../financial/ResaleProductProfitManager";
import TireCostManager from "../financial/TireCostManager";
import FinalProductsStock from "../stock/FinalProductsStock";
import ResaleProductsStock from "../stock/ResaleProductsStock";
import SettingsDashboard from "../settings/SettingsDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  BarChart3,
  Factory,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingBag,
  Calculator,
  Save,
  Calendar,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { dataManager } from '../../utils/dataManager';
import { autoSetupSupabase } from '../../utils/setupSupabaseTable';
import { ensureSystemDataExists } from '../../utils/initializeSupabaseData';
import { checkpointManager } from '../../utils/checkpointManager';
import {
  useCashFlow,
  useDefectiveTireSales,
  useProductionEntries,
  useMaterials,
  useProducts,
  useStockItems,
  useFixedCosts,
  useVariableCosts,
  useEmployees,
  useRecipes,
  useCostCalculationOptions,
  useWarrantyEntries,
  useResaleProducts,
} from "@/hooks/useDataPersistence";
// Imports de drag-and-drop removidos - não são mais necessários

// Seção de Métricas Principais removida completamente conforme solicitado

// Componente para Gráfico de Lucro Empresarial
interface EmpresarialProfitChartProps {
  cashFlowEntries: any[];
  isLoading: boolean;
  empresarialValue: number | null;
}

const EmpresarialProfitChart = ({ cashFlowEntries, isLoading, empresarialValue }: EmpresarialProfitChartProps) => {
  const [dateFilter, setDateFilter] = useState("30"); // Mensal (30 dias) por padrão
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  // Estados para lucro empresarial
  const [businessProfit, setBusinessProfit] = useState<number>(0);
  const [businessBaseline, setBusinessBaseline] = useState<number | null>(null);
  const [isLoadingBusinessProfit, setIsLoadingBusinessProfit] = useState(true);

  // Carregar lucro empresarial
  useEffect(() => {
    const loadBusinessProfit = async () => {
      try {
        setIsLoadingBusinessProfit(true);
        const profit = await dataManager.calculateBusinessProfit();
        const baseline = await dataManager.loadBusinessValueBaseline();
        setBusinessProfit(profit);
        setBusinessBaseline(baseline);
      } catch (error) {
        console.error('Erro ao carregar lucro empresarial:', error);
      } finally {
        setIsLoadingBusinessProfit(false);
      }
    };

    loadBusinessProfit();
  }, [empresarialValue]); // Recalcula quando valor empresarial muda

  // Função para calcular lucro empresarial baseado em registros reais
  const calculateDailyProfit = () => {
    // Se não há baseline, mostrar apenas o ponto atual
    if (businessBaseline === null) {
      return [{
        date: new Date().toISOString().split('T')[0],
        displayDate: new Date().toLocaleDateString('pt-BR'),
        profit: 0,
        businessValue: empresarialValue || 0,
        baseline: 0,
        accumulatedProfit: 0,
      }];
    }

    // Mostrar apenas pontos relevantes: baseline e valor atual
    const chartData = [];
    const today = new Date();
    const baselineDate = new Date();
    baselineDate.setDate(today.getDate() - 7); // Simular que baseline foi criado há 7 dias

    // Ponto do baseline (início)
    chartData.push({
      date: baselineDate.toISOString().split('T')[0],
      displayDate: baselineDate.toLocaleDateString('pt-BR'),
      profit: 0, // No momento do baseline, lucro era zero
      businessValue: businessBaseline,
      baseline: businessBaseline,
      accumulatedProfit: 0,
    });

    // Ponto atual (se diferente do baseline)
    if (empresarialValue !== businessBaseline) {
      const currentProfit = empresarialValue !== null ? empresarialValue - businessBaseline : 0;
      chartData.push({
        date: today.toISOString().split('T')[0],
        displayDate: today.toLocaleDateString('pt-BR'),
        profit: currentProfit,
        businessValue: empresarialValue || 0,
        baseline: businessBaseline,
        accumulatedProfit: currentProfit,
      });
    }

    return chartData;
  };

  const chartData = calculateDailyProfit();

  // Tooltip customizado para lucro empresarial
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-factory-800/95 border border-tire-600/50 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.displayDate}</p>
          <p className="text-tire-300">
            Valor Empresarial: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.businessValue)}
          </p>
          <p className="text-tire-400">
            Baseline: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.baseline)}
          </p>
          <p className={`font-bold ${data.profit >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
            Lucro Empresarial: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.profit)}
          </p>
          <p className="text-neon-blue">
            Acumulado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.accumulatedProfit)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-factory-800/50 border-tire-600/30">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-tire-200 text-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            Lucro Empresarial
          </CardTitle>

          {/* Filtros de Data */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-tire-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-factory-700/50 border border-tire-600/30 text-white rounded px-3 py-1 text-sm"
              >
                <option value="7">Últimos 7 dias</option>
                <option value="15">Últimos 15 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="60">Últimos 60 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="custom">Período Customizado</option>
              </select>
            </div>

            {dateFilter === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-factory-700/50 border border-tire-600/30 text-white rounded px-2 py-1 text-sm"
                />
                <span className="text-tire-400">até</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-factory-700/50 border border-tire-600/30 text-white rounded px-2 py-1 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-6">
          {/* Gráfico */}
          <div className="w-full" style={{ width: '790px', height: '260px', minWidth: '790px', minHeight: '260px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-purple"></div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                  <p className="text-tire-400">Nenhum dado encontrado para o período selecionado</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width={790} height={260} minWidth={790} minHeight={260}>
                <LineChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 20,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#9CA3AF"
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => `R$ ${value.toLocaleString("pt-BR")}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Lucro Empresarial"
                    stroke="#ffffff"
                    strokeWidth={2}
                    dot={{
                      fill: "#ffffff",
                      strokeWidth: 2,
                      r: 3,
                    }}
                    activeDot={{
                      r: 5,
                      fill: "#ffffff",
                      stroke: "#374151",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Display do Lucro Empresarial */}
          <div className="flex flex-col justify-center h-full" style={{ width: '480px', height: '240px' }}>
            <div className="bg-factory-900/50 border border-tire-600/30 rounded-lg p-6 h-full flex flex-col justify-center">
              {isLoadingBusinessProfit ? (
                <div className="animate-pulse flex flex-col justify-center h-full">
                  <div className="h-8 bg-tire-600/30 rounded mb-2"></div>
                  <div className="h-4 bg-tire-600/30 rounded mb-4"></div>
                  <div className="h-16 bg-tire-600/30 rounded"></div>
                </div>
              ) : (
                <div className="flex flex-col justify-start h-full pt-2">
                  {/* Cabeçalho com valor e ícone */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1 text-center">
                      <p className="text-tire-300 text-sm font-medium">Lucro Empresarial</p>
                      <p className={`text-4xl font-bold ${
                        businessProfit > 0 ? 'text-neon-green' : 
                        businessProfit < 0 ? 'text-red-400' : 'text-tire-200'
                      }`}>
                        {new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        }).format(businessProfit)}
                      </p>
                      <p className="text-tire-400 text-xs">
                        {businessBaseline !== null ? 'Diferença do baseline ativo' : 'Aguardando confirmação do balanço'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${
                      businessProfit > 0 ? 'bg-neon-green/20' : 
                      businessProfit < 0 ? 'bg-red-500/20' : 'bg-tire-500/20'
                    }`}>
                      <TrendingUp className={`h-6 w-6 ${
                        businessProfit > 0 ? 'text-neon-green' : 
                        businessProfit < 0 ? 'text-red-400' : 'text-tire-400'
                      }`} />
                    </div>
                  </div>

                  {/* Informações do baseline */}
                  <div className="border-t border-tire-600/30 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-tire-400">
                        <p>Status do Balanço:</p>
                        <p className={`font-medium ${
                          businessBaseline !== null ? 'text-neon-green' : 'text-yellow-400'
                        }`}>
                          {businessBaseline !== null ? '✅ Confirmado' : '⏳ Não Confirmado'}
                        </p>
                      </div>
                      <div className="text-xs text-tire-400 text-right">
                        <p>Baseline:</p>
                        <p className="font-medium text-tire-200">
                          {businessBaseline !== null 
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(businessBaseline)
                            : 'Não definido'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Dashboard Component with Financial Metrics
const MainDashboard = ({ isLoading = false }: { isLoading?: boolean }) => {
  // Load all necessary data using hooks
  const { cashFlowEntries, isLoading: cashFlowLoading } = useCashFlow();
  const { defectiveTireSales, isLoading: defectiveTireSalesLoading } =
    useDefectiveTireSales();
  const { productionEntries, isLoading: productionLoading } =
    useProductionEntries();
  const { materials, isLoading: materialsLoading } = useMaterials();
  const { products, isLoading: productsLoading } = useProducts();
  const { resaleProducts, isLoading: resaleProductsLoading } =
    useResaleProducts();
  const { stockItems, isLoading: stockItemsLoading } = useStockItems();
  const { fixedCosts, isLoading: fixedCostsLoading } = useFixedCosts();
  const { variableCosts, isLoading: variableCostsLoading } = useVariableCosts();
  const { employees, isLoading: employeesLoading } = useEmployees();
  const { recipes, isLoading: recipesLoading } = useRecipes();
  const { warrantyEntries, isLoading: warrantyEntriesLoading } =
    useWarrantyEntries();
  
  // Load debts data for business value calculation
  const { debts, isLoading: debtsLoading } = useDebts();

  // Load cost calculation options from TireCostManager
  const {
    costOptions,
    isIncludingLaborCosts,
    isIncludingCashFlowExpenses,
    isIncludingProductionLosses,
    isIncludingDefectiveTireSales,
    isDividingByProduction,
  } = useCostCalculationOptions();

  // Estado para controlar inicialização dos gráficos
  const [chartsInitialized, setChartsInitialized] = useState(false);
  
  // Estado para forçar re-renderização quando há mudanças nos produtos de revenda
  const [resaleDataVersion, setResaleDataVersion] = useState(0);

  // Delay para inicialização dos gráficos (previne warnings do Recharts)
  useEffect(() => {
    const timer = setTimeout(() => {
      setChartsInitialized(true);
    }, 500); // 500ms delay para garantir que o DOM esteja pronto

    return () => clearTimeout(timer);
  }, []);

  // Listener para eventos de sincronização de produtos de revenda
  useEffect(() => {
    const handleResaleStockUpdate = (event: CustomEvent) => {
      console.log('📡 [MainDashboard] Evento resaleStockUpdated recebido:', event.detail);
      
      // Forçar re-renderização incrementando a versão dos dados
      setResaleDataVersion(prev => {
        const newVersion = prev + 1;
        console.log(`🔄 [MainDashboard] Atualizando resaleDataVersion: ${prev} → ${newVersion}`);
        return newVersion;
      });
    };

    const handleForceChartsRefresh = (event: CustomEvent) => {
      console.log('⚡ [MainDashboard] Evento forceChartsRefresh recebido:', event.detail);
      
      // Forçar re-renderização dos gráficos
      setResaleDataVersion(prev => prev + 1);
      console.log('🔄 [MainDashboard] Executando refresh imediato dos gráficos de estoque...');
    };

    // Adicionar listeners
    window.addEventListener('resaleStockUpdated', handleResaleStockUpdate as EventListener);
    window.addEventListener('forceChartsRefresh', handleForceChartsRefresh as EventListener);
    console.log('🎧 [MainDashboard] Listeners para sincronização de produtos de revenda configurados');

    // Cleanup
    return () => {
      window.removeEventListener('resaleStockUpdated', handleResaleStockUpdate as EventListener);
      window.removeEventListener('forceChartsRefresh', handleForceChartsRefresh as EventListener);
      console.log('🔕 [MainDashboard] Listeners de produtos de revenda removidos');
    };
  }, []);

  const isDataLoading =
    isLoading ||
    cashFlowLoading ||
    defectiveTireSalesLoading ||
    productionLoading ||
    materialsLoading ||
    productsLoading ||
    resaleProductsLoading ||
    stockItemsLoading ||
    fixedCostsLoading ||
    variableCostsLoading ||
    employeesLoading ||
    recipesLoading ||
    warrantyEntriesLoading;

  // Combinar loading state com inicialização dos gráficos
  const isChartsLoading = isDataLoading || !chartsInitialized;

  // Estados de métricas principais removidos

  // Funções de configuração e drag-and-drop removidas

  // Lógica de sincronização das métricas removida

  // Cálculos de métricas - Saldo de Caixa
  const totalIncome = cashFlowEntries
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpense = cashFlowEntries
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const cashBalance = totalIncome - totalExpense;

  // Função para formatar valores em moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Cálculo da Receita Total (apenas vendas - igual ao dashboard de vendas)
  const totalRevenue = cashFlowEntries
    .filter((entry) => 
      entry.type === "income" && 
      entry.category === "venda"
    )
    .reduce((sum, entry) => sum + entry.amount, 0);

  // Contador de vendas
  const salesCount = cashFlowEntries.filter(entry => 
    entry.type === "income" && entry.category === "venda"
  ).length;

  // Cálculo do Saldo de Produtos de Revenda em Estoque (sincronizado com aba de produtos de revenda)
  const resaleProductStockValue = useMemo(() => {
    const value = resaleProducts.reduce((total, product) => {
      // Verificar se há estoque correspondente na tabela stock_items
      const stockItem = stockItems.find(item => 
        item.item_id === product.id && item.item_type === 'product'
      );

      // Usar valores reais do estoque (mesma lógica da aba de produtos de revenda)
      const stockValue = stockItem?.total_value || 0;

      console.log(`💰 [MainDashboard] Produto de revenda: ${product.name}`, {
        productId: product.id,
        stockItemFound: !!stockItem,
        stockValue,
        quantity: stockItem?.quantity || 0,
        unitCost: stockItem?.unit_cost || 0
      });

      return total + stockValue;
    }, 0);
    
    console.log(`📊 [MainDashboard] Valor total de produtos de revenda: R$ ${value.toFixed(2)}`);
    return value;
  }, [resaleProducts, stockItems, resaleDataVersion]);

  // Estado para custo médio por pneu
  const [averageTireCost, setAverageTireCost] = useState(101.09);
  const [isLoadingTireCost, setIsLoadingTireCost] = useState(true);

  // Debounce para evitar oscilações
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(Date.now());
  const [pendingUpdate, setPendingUpdate] = useState<number | null>(null);

  // Estado para lucro médio por pneu
  const [averageTireProfit, setAverageTireProfit] = useState(0);
  const [isLoadingTireProfit, setIsLoadingTireProfit] = useState(true);

  // Estado para lucro médio dos produtos de revenda - inicializar com null para evitar oscilação
  const [averageResaleProfit, setAverageResaleProfit] = useState<number | null>(() => {
    // Tentar carregar valor inicial do localStorage imediatamente
    try {
      const localValue = localStorage.getItem('averageResaleProfit');
      if (localValue && localValue !== 'null' && localValue !== '0') {
        const parsed = parseFloat(localValue);
        if (!isNaN(parsed) && parsed > 0) {
          console.log(`⚡ [Dashboard] Valor inicial carregado do localStorage: R$ ${parsed.toFixed(2)}`);
          return parsed;
        }
      }
    } catch (error) {
      console.log('⚠️ [Dashboard] Erro ao carregar valor inicial do localStorage');
    }
    return null;
  });
  const [isLoadingResaleProfit, setIsLoadingResaleProfit] = useState(true);

  // Estado para saldo de produtos finais - sincronização em tempo real (apenas valor sincronizado)
  const [finalProductStockBalance, setFinalProductStockBalance] = useState<number | null>(null);
  const [isLoadingFinalProductStock, setIsLoadingFinalProductStock] = useState(true);

  // Estado para saldo de matéria-prima - sincronização em tempo real via Supabase
  const [rawMaterialStockBalance, setRawMaterialStockBalance] = useState<number | null>(null);
  const [isLoadingRawMaterialStock, setIsLoadingRawMaterialStock] = useState(true);

  // Estado para saldo de produtos de revenda - sincronização em tempo real
  const [resaleProductStockBalance, setResaleProductStockBalance] = useState<number | null>(null);
  const [isLoadingResaleProductStock, setIsLoadingResaleProductStock] = useState(true);

  // Estado para saldo de caixa - sincronização em tempo real via Supabase
  const [cashBalanceState, setCashBalanceState] = useState<number | null>(null);
  const [isLoadingCashBalance, setIsLoadingCashBalance] = useState(true);

  // Estado para valor empresarial - soma de todos os saldos em tempo real
  const [empresarialValue, setEmpresarialValue] = useState<number | null>(null);
  const [isLoadingEmpresarialValue, setIsLoadingEmpresarialValue] = useState(true);

  // Estado para quantidade unitária de matéria-prima - sincronização em tempo real
  const [rawMaterialUnitaryQuantity, setRawMaterialUnitaryQuantity] = useState(0);
  const [isLoadingRawMaterialUnitaryQuantity, setIsLoadingRawMaterialUnitaryQuantity] = useState(true);

  // Estado para Quantidade Total de Produtos Finais - sincronização em tempo real
  const [finalProductTotalQuantity, setFinalProductTotalQuantity] = useState<number | null>(null);
  const [isLoadingFinalProductTotalQuantity, setIsLoadingFinalProductTotalQuantity] = useState(true);

  // Estado para Quantidade Total de Produtos Revenda - sincronização em tempo real
  const [resaleProductTotalQuantity, setResaleProductTotalQuantity] = useState<number | null>(null);
  const [isLoadingResaleProductTotalQuantity, setIsLoadingResaleProductTotalQuantity] = useState(true);


  // Estados para o sistema de checkpoint
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);
  const [checkpointStatus, setCheckpointStatus] = useState<string | null>(null);

  // Função de debounce para evitar oscilações
  const updateResaleProfitWithDebounce = (newProfit: number, source: string) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimestamp;

    console.log(`🔄 [Dashboard] Tentativa de atualização de ${source}: R$ ${newProfit.toFixed(2)}`);
    console.log(`🕰️ [Dashboard] Tempo desde última atualização: ${timeSinceLastUpdate}ms`);

    // Se já há uma atualização pendente com o mesmo valor, ignorar
    if (pendingUpdate !== null && Math.abs(pendingUpdate - newProfit) < 0.01) {
      console.log(`⚠️ [Dashboard] Atualização ignorada - valor já pendente: R$ ${pendingUpdate.toFixed(2)}`);
      return;
    }

    // Se o valor atual já é o mesmo, ignorar
    if (averageResaleProfit !== null && Math.abs(averageResaleProfit - newProfit) < 0.01) {
      console.log(`✅ [Dashboard] Valor já atualizado: R$ ${averageResaleProfit.toFixed(2)}`);
      return;
    }

    // Rejeitar atualizações para R$ 0.00 quando há um valor válido anterior
    if (newProfit === 0 && averageResaleProfit !== null && averageResaleProfit > 0) {
      console.log(`⛔ [Dashboard] Rejeitando atualização para R$ 0.00 de ${source} - mantendo valor atual: R$ ${averageResaleProfit.toFixed(2)}`);
      return;
    }

    // Debounce de 300ms para evitar múltiplas atualizações
    if (timeSinceLastUpdate < 300) {
      console.log(`🔄 [Dashboard] Debounce ativo - agendando atualização em 300ms`);
      setPendingUpdate(newProfit);

      setTimeout(() => {
        console.log(`⏰ [Dashboard] Executando atualização agendada: R$ ${newProfit.toFixed(2)}`);
        setAverageResaleProfit(newProfit);
        setIsLoadingResaleProfit(false);
        setLastUpdateTimestamp(Date.now());
        setPendingUpdate(null);
      }, 300);
    } else {
      console.log(`⚡ [Dashboard] Atualização imediata: R$ ${newProfit.toFixed(2)}`);
      setAverageResaleProfit(newProfit);
      setIsLoadingResaleProfit(false);
      setLastUpdateTimestamp(now);
      setPendingUpdate(null);
    }
  };

  // Função para calcular lucro de revenda diretamente
  const calculateResaleProfitDirectly = async () => {
    try {
      console.log('📊 [Dashboard] Calculando lucro de revenda diretamente...');
      console.log(`📊 [Dashboard] Total de entradas no cashFlow: ${cashFlowEntries.length}`);

      // Filtrar vendas de produtos de revenda dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Debug: Mostrar as últimas 5 entradas
      const recentEntries = cashFlowEntries
        .filter(entry => entry.type === 'income' && entry.category === 'venda')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      console.log('🔍 [Dashboard] Últimas 5 vendas:');
      recentEntries.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.description?.substring(0, 80)}...`);
      });

      const resaleSales = cashFlowEntries.filter(entry => {
        if (entry.type !== 'income' || entry.category !== 'venda') return false;

        const entryDate = new Date(entry.created_at);
        if (entryDate < thirtyDaysAgo) return false;

        // Verificar se é produto de revenda (múltiplas formas)
        const description = entry.description || '';
        const isResale = description.includes('TIPO_PRODUTO: revenda') || 
                        description.includes('tipo_produto: revenda') ||
                        description.includes('revenda') ||
                        description.includes('REVENDA');

        console.log(`🔍 [Dashboard] Verificando entrada: ${description.substring(0, 50)}... | É revenda: ${isResale}`);

        return isResale;
      });

      console.log(`📊 [Dashboard] Vendas de revenda encontradas: ${resaleSales.length}`);

      if (resaleSales.length === 0) {
        console.log('⚠️ [Dashboard] Nenhuma venda de revenda encontrada');

        // Se cashFlowEntries está vazio, o problema é no carregamento dos dados
        if (cashFlowEntries.length === 0) {
          console.log('❌ [Dashboard] PROBLEMA: cashFlowEntries está vazio - hook useCashFlow() não está funcionando');
          return;
        }

        console.log('🔍 [Dashboard] cashFlowEntries tem dados, mas nenhuma venda de revenda encontrada');
        return;
      }

      let totalProfit = 0;
      let totalQuantity = 0;

      resaleSales.forEach(sale => {
        // Extrair informações do produto da descrição
        const productMatch = sale.description?.match(/Produto: ([^|]+)/);
        const quantityMatch = sale.description?.match(/Quantidade: (\d+)/);

        if (productMatch && quantityMatch) {
          const productName = productMatch[1].trim();
          const quantity = parseInt(quantityMatch[1]);

          // Buscar custo do produto no estoque
          const stockItem = stockItems.find(item => 
            item.item_name === productName && item.item_type === 'product'
          );

          if (stockItem) {
            const unitCost = stockItem.unit_cost || 0;
            const revenue = sale.amount;
            const totalCost = unitCost * quantity;
            const profit = revenue - totalCost;

            totalProfit += profit;
            totalQuantity += quantity;

            console.log(`💰 [Dashboard] Produto: ${productName}, Qtd: ${quantity}, Lucro: R$ ${profit.toFixed(2)}`);
          }
        }
      });

      const averageProfit = totalQuantity > 0 ? totalProfit / totalQuantity : 0;

      console.log(`📊 [Dashboard] Lucro médio calculado diretamente: R$ ${averageProfit.toFixed(2)}`);

      // Salvar no Supabase e localStorage
      const success = await dataManager.saveAverageResaleProfit(averageProfit);
      if (success) {
        console.log(`✅ [Dashboard] Lucro de revenda salvo com sucesso: R$ ${averageProfit.toFixed(2)}`);

        // Disparar evento de atualização
        const updateEvent = new CustomEvent('resaleProfitUpdated', {
          detail: {
            profit: averageProfit,
            timestamp: Date.now(),
            source: 'Dashboard-DirectCalculation'
          }
        });
        window.dispatchEvent(updateEvent);
      }
    } catch (error) {
      console.error('❌ [Dashboard] Erro ao calcular lucro de revenda diretamente:', error);
    }
  };

  // Verificação automática da tabela system_settings no Supabase
  useEffect(() => {
    const checkSupabaseSetup = async () => {
      try {
        console.log('🔍 [Dashboard] Verificando configuração do Supabase...');
        await autoSetupSupabase();

        // Inicializar dados essenciais após verificar a configuração
        console.log('🚀 [Dashboard] Inicializando dados essenciais do sistema...');
        await ensureSystemDataExists();

      } catch (error) {
        console.warn('⚠️ [Dashboard] Erro na verificação do Supabase:', error);
      }
    };

    checkSupabaseSetup();
  }, []);

  // Effect para sincronização em tempo real do custo médio por pneu
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeTireCostSync = async () => {
      try {
        console.log('🔄 [Dashboard] Inicializando sincronização em tempo real do custo médio por pneu...');

        // Carregar valor inicial do Supabase
        const initialCost = await dataManager.loadAverageTireCost();

        // Se o Supabase retornar o valor padrão (101.09), tentar localStorage
        let finalCost = initialCost;
        console.log(`🔍 [Dashboard] Valor inicial do Supabase: R$ ${initialCost.toFixed(2)}`);

        // Usar Math.abs para comparação de float mais robusta
        if (Math.abs(initialCost - 101.09) < 0.01) {
          console.log('⚠️ [Dashboard] Valor padrão detectado, tentando localStorage...');
          const localStorageCost = getTireCostFromLocalStorage();
          console.log(`🔍 [Dashboard] Valor do localStorage: R$ ${localStorageCost.toFixed(2)}`);

          if (Math.abs(localStorageCost - 101.09) >= 0.01) {
            finalCost = localStorageCost;
            console.log(`✅ [Dashboard] Valor do localStorage usado: R$ ${finalCost.toFixed(2)}`);
          } else {
            console.log('⚠️ [Dashboard] localStorage também tem valor padrão, mantendo Supabase');
          }
        } else {
          console.log('✅ [Dashboard] Valor do Supabase não é padrão, usando diretamente');
        }

        setAverageTireCost(finalCost);
        setIsLoadingTireCost(false);

        console.log(`✅ [Dashboard] Custo inicial carregado: R$ ${finalCost.toFixed(2)}`);

        // Configurar subscription em tempo real
        unsubscribe = dataManager.subscribeToTireCostChanges((newCost) => {
          console.log(`🔄 [Dashboard] Novo custo recebido via Supabase Realtime: R$ ${newCost.toFixed(2)}`);
          setAverageTireCost(newCost);
        });

        console.log('🔔 [Dashboard] Subscription ativa para mudanças em tempo real');

      } catch (error) {
        console.error('❌ [Dashboard] Erro ao inicializar sincronização:', error);
        setIsLoadingTireCost(false);

        // Fallback para localStorage em caso de erro
        const fallbackCost = getTireCostFromLocalStorage();
        setAverageTireCost(fallbackCost);
      }
    };

    initializeTireCostSync();

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        console.log('🔕 [Dashboard] Cancelando subscription do custo médio por pneu');
        unsubscribe();
      }
    };
  }, []);

  // Effect para sincronização em tempo real do lucro médio por pneu
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeTireProfitSync = async () => {
      try {
        console.log('🔄 [Dashboard] Inicializando sincronização em tempo real do lucro médio por pneu...');

        // Carregar valor inicial do Supabase
        const initialProfit = await dataManager.loadAverageTireProfit();
        console.log(`🔍 [Dashboard] Valor inicial do lucro do Supabase: R$ ${initialProfit.toFixed(2)}`);

        // Usar valor do Supabase exclusivamente
        console.log(`🎯 [Dashboard] Valor final escolhido: R$ ${initialProfit.toFixed(2)}`);

        setAverageTireProfit(initialProfit);
        setIsLoadingTireProfit(false);

        console.log(`✅ [Dashboard] Lucro inicial carregado: R$ ${initialProfit.toFixed(2)}`);

        // Configurar subscription em tempo real
        unsubscribe = dataManager.subscribeToTireProfitChanges((newProfit) => {
          console.log(`📡 [Dashboard] Novo lucro por pneu recebido via subscription: R$ ${newProfit.toFixed(2)}`);
          setAverageTireProfit(newProfit);
        });

        console.log('🔔 [Dashboard] Subscription ativa para mudanças de lucro em tempo real');

        // Forçar recálculo após 1 segundo para garantir sincronização
        setTimeout(() => {
          console.log('🎯 [Dashboard] Disparando recálculo forçado do lucro médio por pneu');
          const forceRecalcEvent = new CustomEvent('forceTireProfitRecalc');
          window.dispatchEvent(forceRecalcEvent);

          console.log('🎯 [Dashboard] Disparando recálculo forçado do lucro produtos revenda');
          const forceResaleRecalcEvent = new CustomEvent('forceResaleProfitRecalc');
          window.dispatchEvent(forceResaleRecalcEvent);

          console.log('🔄 [Dashboard] Eventos de recálculo disparados para produtos finais e revenda');
        }, 1000);

        // Listener para evento de nova entrada de cash flow
        const handleCashFlowEntryAdded = (event: CustomEvent) => {
          console.log('💰 [Dashboard] Evento cashFlowEntryAdded recebido:', event.detail);
          console.log('🔍 [Dashboard] Tipo de entrada:', event.detail?.type);
          console.log('🔍 [Dashboard] Categoria:', event.detail?.category);
          console.log('🔍 [Dashboard] Valor:', event.detail?.amount);

          // Forçar recálculo imediato
          setTimeout(() => {
            console.log('🔄 [Dashboard] Forçando recálculo após nova entrada de cash flow');

            const forceRecalcEvent = new CustomEvent('forceTireProfitRecalc');
            window.dispatchEvent(forceRecalcEvent);

            const forceResaleRecalcEvent = new CustomEvent('forceResaleProfitRecalc');
            window.dispatchEvent(forceResaleRecalcEvent);

            console.log('✅ [Dashboard] Eventos de recálculo disparados via cashFlowEntryAdded');
          }, 100); // Recálculo mais rápido para nova entrada

          // Forçar recálculo adicional para garantir
          setTimeout(() => {
            console.log('🔄 [Dashboard] Segundo recálculo forçado via cashFlowEntryAdded');
            const forceResaleRecalcEvent2 = new CustomEvent('forceResaleProfitRecalc');
            window.dispatchEvent(forceResaleRecalcEvent2);
          }, 500);
        };

        window.addEventListener('cashFlowEntryAdded', handleCashFlowEntryAdded as EventListener);

        // Listener direto do Supabase Realtime para cash_flow_entries
        const cashFlowChannel = supabase
          .channel('cash_flow_realtime')
          .on(
            'postgres_changes',
            {
              event: '*', // INSERT, UPDATE, DELETE
              schema: 'public',
              table: 'cash_flow_entries'
            },
            (payload) => {
              console.log('💰 [Dashboard] Mudança detectada na tabela cash_flow_entries:', payload);
              console.log('🔍 [Dashboard] Tipo de evento:', payload.eventType);
              console.log('🔍 [Dashboard] Dados da mudança:', payload.new || payload.old);

              // Forçar recálculo imediato quando há mudanças no cash flow
              setTimeout(async () => {
                console.log('🔄 [Dashboard] Forçando recálculo após mudança no cash flow (Supabase Realtime)');

                const forceRecalcEvent = new CustomEvent('forceTireProfitRecalc');
                window.dispatchEvent(forceRecalcEvent);

                // Calcular lucro de revenda diretamente
                await calculateResaleProfitDirectly();

                console.log('✅ [Dashboard] Eventos de recálculo disparados');
              }, 200); // Recálculo rápido para mudanças em tempo real

              // Forçar recálculo adicional para garantir
              setTimeout(() => {
                console.log('🔄 [Dashboard] Segundo recálculo forçado para garantir sincronização');
                const forceResaleRecalcEvent2 = new CustomEvent('forceResaleProfitRecalc');
                window.dispatchEvent(forceResaleRecalcEvent2);
              }, 1000);
            }
          )
          .subscribe();

        // Cleanup dos listeners
        return () => {
          window.removeEventListener('cashFlowEntryAdded', handleCashFlowEntryAdded as EventListener);
          supabase.removeChannel(cashFlowChannel);
        };

      } catch (error) {
        console.error('❌ [Dashboard] Erro ao inicializar sincronização do lucro:', error);
        setIsLoadingTireProfit(false);

        // Fallback para localStorage em caso de erro
        const fallbackProfit = getTireProfitFromLocalStorage();
        setAverageTireProfit(fallbackProfit);
      }
    };

    initializeTireProfitSync();

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        console.log('🔕 [Dashboard] Cancelando subscription do lucro médio por pneu');
        unsubscribe();
      }
    };
  }, []);

  // Effect para sincronização em tempo real do saldo de produtos finais
  useEffect(() => {
    console.log('🚀 [Dashboard] useEffect de saldo de produtos finais INICIADO!');
    let unsubscribe: (() => void) | null = null;

    const initializeFinalProductStockSync = async () => {
      try {
        console.log('🔄 [Dashboard] Inicializando sincronização em tempo real do saldo de produtos finais...');

        // Carregar valor inicial do Supabase
        const initialBalance = await dataManager.loadFinalProductStockBalance();
        console.log(`🔍 [Dashboard] Valor inicial do saldo de produtos finais: R$ ${initialBalance.toFixed(2)}`);

        setFinalProductStockBalance(initialBalance);
        setIsLoadingFinalProductStock(false);

        console.log(`✅ [Dashboard] Saldo inicial carregado: R$ ${initialBalance.toFixed(2)}`);

        // Configurar subscription em tempo real
        unsubscribe = dataManager.subscribeToFinalProductStockChanges((newBalance) => {
          console.log(`📡 [Dashboard] Novo saldo de produtos finais recebido via subscription: R$ ${newBalance.toFixed(2)}`);
          setFinalProductStockBalance(newBalance);
        });

        console.log('🔔 [Dashboard] Subscription ativa para mudanças de saldo em tempo real');

      } catch (error) {
        console.error('❌ [Dashboard] Erro ao inicializar sincronização do saldo:', error);
        setIsLoadingFinalProductStock(false);

        // Fallback para valor 0 em caso de erro
        setFinalProductStockBalance(0);
      }
    };

    initializeFinalProductStockSync();

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        console.log('🔕 [Dashboard] Cancelando subscription do saldo de produtos finais');
        unsubscribe();
      }
    };
  }, []);

  // Listener para evento customizado de atualização do lucro médio por pneu
  useEffect(() => {
    const handleTireProfitUpdate = (event: CustomEvent) => {
      const { profit, timestamp, source } = event.detail;
      console.log(`🔄 [Dashboard] Evento customizado recebido:`, {
        profit: `R$ ${profit.toFixed(2)}`,
        timestamp: new Date(timestamp).toLocaleTimeString('pt-BR'),
        source: source || 'unknown'
      });
      setAverageTireProfit(profit);
    };

    // Adicionar listener para o evento customizado
    window.addEventListener('tireProfitUpdated', handleTireProfitUpdate as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('tireProfitUpdated', handleTireProfitUpdate as EventListener);
    };
  }, []);

  // Listener para evento customizado de atualização do saldo de produtos finais
  useEffect(() => {
    const handleFinalProductStockUpdate = (event: CustomEvent) => {
      const { balance, timestamp, source } = event.detail;
      console.log(`🔄 [Dashboard] Evento customizado de saldo recebido:`, {
        balance: `R$ ${balance.toFixed(2)}`,
        timestamp: new Date(timestamp).toLocaleTimeString('pt-BR'),
        source: source || 'unknown'
      });
      setFinalProductStockBalance(balance);
      setIsLoadingFinalProductStock(false);
    };

    // Adicionar listener para o evento customizado
    window.addEventListener('finalProductStockUpdated', handleFinalProductStockUpdate as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('finalProductStockUpdated', handleFinalProductStockUpdate as EventListener);
    };
  }, []);

  // Criar hash dos cashFlowEntries para detectar mudanças mais precisamente
  const cashFlowHash = useMemo(() => {
    return JSON.stringify(cashFlowEntries.map(entry => ({
      id: entry.id,
      amount: entry.amount,
      type: entry.type,
      category: entry.category,
      transaction_date: entry.transaction_date
    })));
  }, [cashFlowEntries]);

  // Monitorar mudanças no cashFlowEntries e disparar recálculo forçado
  useEffect(() => {
    // Aguardar um pouco após mudanças no cashFlow para garantir que os dados foram atualizados
    const timeoutId = setTimeout(() => {
      console.log('🔄 [Dashboard] Mudanças detectadas no cashFlowEntries:', {
        totalEntries: cashFlowEntries.length,
        hashLength: cashFlowHash.length,
        timestamp: new Date().toISOString()
      });
      console.log('🔄 [Dashboard] Disparando recálculo forçado do lucro');

      // Disparar recálculo para produtos finais
      const forceRecalcEvent = new CustomEvent('forceTireProfitRecalc');
      window.dispatchEvent(forceRecalcEvent);

      // Disparar recálculo para produtos de revenda
      const forceResaleRecalcEvent = new CustomEvent('forceResaleProfitRecalc');
      window.dispatchEvent(forceResaleRecalcEvent);

      console.log('🔄 [Dashboard] Eventos de recálculo disparados para produtos finais e revenda');
    }, 500); // Aguardar 500ms para garantir que os dados foram processados

    return () => {
      clearTimeout(timeoutId);
    };
  }, [cashFlowHash]); // Monitorar mudanças no hash das entradas

  // Monitorar mudanças no stockItems apenas para logs (cálculo real feito pelo FinalProductsStock)
  useEffect(() => {
    if (!stockItemsLoading && stockItems.length >= 0) {
      const timeoutId = setTimeout(() => {
        console.log('📊 [Dashboard] Monitorando stockItems para sincronização...');
        console.log(`📦 [Dashboard] Total de stockItems: ${stockItems.length}`);

        // Filtrar apenas produtos finais para logs
        const productItems = stockItems.filter(item => item.item_type === 'product');
        console.log(`📦 [Dashboard] Produtos finais encontrados: ${productItems.length}`);

        // Calcular valor simples apenas para comparação nos logs
        const simpleCalculation = productItems.reduce((total, item) => {
          const itemValue = item.total_value || (item.quantity * item.unit_cost) || 0;
          return total + itemValue;
        }, 0);

        // Apenas log de comparação - não salvar nem atualizar estado
        if (finalProductStockBalance > 0 && Math.abs(finalProductStockBalance - simpleCalculation) > 0.01) {
          console.log(`⚠️ [Dashboard] Diferença detectada entre cálculo local e sincronizado:`);
          console.log(`  - Cálculo local: R$ ${simpleCalculation.toFixed(2)}`);
          console.log(`  - Estado sincronizado: R$ ${finalProductStockBalance.toFixed(2)}`);
          console.log(`  - Diferença: R$ ${Math.abs(finalProductStockBalance - simpleCalculation).toFixed(2)}`);
          console.log(`  - Produtos finais encontrados: ${productItems.length}`);
          console.log(`  - FinalProductsStock fará o cálculo correto automaticamente`);
        }
      }, 300);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [stockItems, stockItemsLoading, finalProductStockBalance]);

  // Função de fallback para localStorage do lucro (compatibilidade)
  const getTireProfitFromLocalStorage = () => {
    // Tentar múltiplas chaves para compatibilidade
    const TIRE_PROFIT_KEYS = [
      "dashboard_averageProfitPerTire", // Chave atual do PresumedProfitManager
      "dashboard_tireProfitValue_unified", // Chave legada
      "presumedProfitManager_synchronizedProfitData" // Chave alternativa
    ];

    for (const key of TIRE_PROFIT_KEYS) {
      try {
        const storedData = localStorage.getItem(key);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          const value = parsedData.value || parsedData.averageProfitPerTire || 0;
          const timestamp = parsedData.timestamp || 0;
          const isRecent = Date.now() - timestamp < 300000; // 5 minutos (mais tolerante)

          if (value > 0 && isRecent) {
            console.log(`✅ [Dashboard] Lucro encontrado na chave '${key}': R$ ${value.toFixed(2)}`);
            return value;
          }
        }
      } catch (error) {
        console.warn(`⚠️ [Dashboard] Erro ao ler chave de lucro '${key}':`, error);
        continue;
      }
    }

    console.warn('⚠️ [Dashboard] Nenhum valor válido de lucro encontrado no localStorage, usando padrão');
    return 0; // Valor padrão para lucro
  };

  // Função de fallback para localStorage (compatibilidade)
  const getTireCostFromLocalStorage = () => {
    // Tentar múltiplas chaves para compatibilidade
    const TIRE_COST_KEYS = [
      "dashboard_averageCostPerTire", // Chave atual do TireCostManager
      "dashboard_tireCostValue_unified", // Chave legada
      "tireCostManager_synchronizedCostData" // Chave alternativa
    ];

    for (const key of TIRE_COST_KEYS) {
      try {
        const storedData = localStorage.getItem(key);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          const value = parsedData.value || parsedData.averageCostPerTire || 0;
          const timestamp = parsedData.timestamp || 0;
          const isRecent = Date.now() - timestamp < 300000; // 5 minutos (mais tolerante)

          if (value > 0 && isRecent) {
            console.log(`✅ [Dashboard] Valor encontrado na chave '${key}': R$ ${value.toFixed(2)}`);
            return value;
          }
        }
      } catch (error) {
        console.warn(`⚠️ [Dashboard] Erro ao ler chave '${key}':`, error);
        continue;
      }
    }

    console.warn('⚠️ [Dashboard] Nenhum valor válido encontrado no localStorage, usando padrão');
    return 101.09; // Valor padrão
  };

  // Effect para sincronização em tempo real do lucro médio dos produtos de revenda
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeResaleProfitSync = async () => {
      try {
        console.log('🚀 [Dashboard] Inicializando sincronização do lucro médio dos produtos de revenda...');

        // Verificar se já temos um valor inicial carregado
        if (averageResaleProfit !== null) {
          console.log(`📊 [Dashboard] Valor já carregado na inicialização: R$ ${averageResaleProfit.toFixed(2)}`);
          setIsLoadingResaleProfit(false);
        } else {
          // Tentar carregar do localStorage se ainda não temos valor
          try {
            const localValue = localStorage.getItem('averageResaleProfit');
            if (localValue && localValue !== 'null' && localValue !== '0') {
              const parsed = parseFloat(localValue);
              if (!isNaN(parsed) && parsed > 0) {
                console.log(`⚡ [Dashboard] Valor carregado do localStorage na inicialização: R$ ${parsed.toFixed(2)}`);
                setAverageResaleProfit(parsed);
                setIsLoadingResaleProfit(false);
              }
            }
          } catch (localError) {
            console.log('⚠️ [Dashboard] Erro ao carregar do localStorage, continuando com Supabase');
          }
        }

        // Carregar valor definitivo do Supabase
        const supabaseProfit = await dataManager.loadAverageResaleProfit();
        console.log(`📊 [Dashboard] Lucro médio carregado do Supabase: R$ ${supabaseProfit.toFixed(2)}`);

        // Usar valor do Supabase como definitivo
        console.log(`🎯 [Dashboard] Valor final escolhido: R$ ${supabaseProfit.toFixed(2)}`);

        setAverageResaleProfit(supabaseProfit);
        setIsLoadingResaleProfit(false);

        // Forçar disparo de evento para garantir que o ResaleProductProfitManager recalcule
        setTimeout(() => {
          console.log('🔄 [Dashboard] Forçando recalculo do ResaleProductProfitManager...');
          const forceUpdateEvent = new CustomEvent('forceResaleProfitRecalc', {
            detail: { timestamp: Date.now() }
          });
          window.dispatchEvent(forceUpdateEvent);
        }, 1000);

        // Configurar subscription em tempo real
        unsubscribe = dataManager.subscribeToResaleProfitChanges((newProfit) => {
          updateResaleProfitWithDebounce(newProfit, 'Supabase Realtime');
        });

      } catch (error) {
        console.error('❌ [Dashboard] Erro ao inicializar sincronização do lucro de revenda:', error);
        setIsLoadingResaleProfit(false);

        // Usar valor padrão em caso de erro
        console.log('🔄 [Dashboard] Usando valor padrão: R$ 23.61');
        setAverageResaleProfit(23.61);
        setIsLoadingResaleProfit(false);
      }
    };

    initializeResaleProfitSync();

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        console.log('🔕 [Dashboard] Cancelando subscription do lucro médio de revenda');
        unsubscribe();
      }
    };
  }, [averageResaleProfit]);

  // Effect para sincronização em tempo real do saldo de produtos finais
  useEffect(() => {
    const initializeFinalProductStockSync = async () => {
      try {
        console.log('🚀 [Dashboard] Inicializando sincronização do saldo de produtos finais...');

        // Carregar valor inicial do Supabase
        const initialBalance = await dataManager.loadFinalProductStockBalance();
        console.log(`📊 [Dashboard] Valor inicial do saldo de produtos finais: R$ ${initialBalance.toFixed(2)}`);

        setFinalProductStockBalance(initialBalance);
        setIsLoadingFinalProductStock(false);

        // Configurar subscription em tempo real para mudanças no Supabase
        // Note: O hook useDataPersistence já gerencia subscriptions, este effect pode ser redundante.
        // Se necessário, o subscription pode ser configurado aqui ou confiado no hook.
        // O `dataManager.subscribeToFinalProductStockChanges` é um wrapper que pode ser usado.

      } catch (error) {
        console.error('❌ [Dashboard] Erro ao inicializar sincronização do saldo de produtos finais:', error);
        setIsLoadingFinalProductStock(false);

        // Fallback para localStorage em caso de erro
        try {
          const localValue = localStorage.getItem('finalProductStockBalance');
          if (localValue) {
            const parsed = JSON.parse(localValue);
            if (parsed.value && typeof parsed.value === 'number') {
              console.log(`🔄 [Dashboard] Usando valor do localStorage: R$ ${parsed.value.toFixed(2)}`);
              setFinalProductStockBalance(parsed.value);
            }
          }
        } catch (localError) {
          console.error('❌ [Dashboard] Erro ao carregar do localStorage:', localError);
        }
      }
    };

    initializeFinalProductStockSync();
  }, []);

  // Effect para sincronização em tempo real da quantidade unitária de matéria-prima
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeRawMaterialUnitaryQuantitySync = async () => {
      try {
        console.log('🔄 [Dashboard] Inicializando sincronização da quantidade unitária de matéria-prima...');

        // Carregar valor inicial do Supabase
        const initialQuantity = await dataManager.loadRawMaterialUnitaryQuantity();
        console.log(`📦 [Dashboard] Valor inicial da quantidade unitária: ${initialQuantity}`);

        setRawMaterialUnitaryQuantity(initialQuantity);
        setIsLoadingRawMaterialUnitaryQuantity(false);

        // Configurar subscription em tempo real
        unsubscribe = dataManager.subscribeToRawMaterialUnitaryQuantityChanges((newQuantity) => {
          console.log(`📡 [Dashboard] Nova quantidade unitária recebida via subscription: ${newQuantity}`);
          setRawMaterialUnitaryQuantity(newQuantity);
        });

        console.log('🔔 [Dashboard] Subscription ativa para quantidade unitária de matéria-prima');

      } catch (error) {
        console.error('❌ [Dashboard] Erro ao inicializar sincronização da quantidade unitária:', error);
        setIsLoadingRawMaterialUnitaryQuantity(false);
      }
    };

    initializeRawMaterialUnitaryQuantitySync();

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        console.log('🔕 [Dashboard] Cancelando subscription da quantidade unitária de matéria-prima');
        unsubscribe();
      }
    };
  }, []);

  // Effect para sincronização em tempo real da quantidade total de produtos finais
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeFinalProductTotalQuantitySync = async () => {
      try {
        console.log('🔄 [Dashboard] Inicializando sincronização da quantidade total de produtos finais...');

        // Carregar valor inicial do Supabase
        const initialQuantity = await dataManager.loadFinalProductTotalQuantity();
        console.log(`🏭 [Dashboard] Valor inicial da quantidade total: ${initialQuantity}`);

        setFinalProductTotalQuantity(initialQuantity);
        setIsLoadingFinalProductTotalQuantity(false);

        // Configurar subscription em tempo real
        unsubscribe = dataManager.subscribeToFinalProductTotalQuantityChanges((newQuantity) => {
          console.log(`📡 [Dashboard] Nova quantidade total recebida via subscription: ${newQuantity}`);
          setFinalProductTotalQuantity(newQuantity);
        });

        console.log('🔔 [Dashboard] Subscription ativa para quantidade total de produtos finais');

      } catch (error) {
        console.error('❌ [Dashboard] Erro ao inicializar sincronização da quantidade total:', error);
        setIsLoadingFinalProductTotalQuantity(false);
      }
    };

    initializeFinalProductTotalQuantitySync();

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        console.log('🔕 [Dashboard] Cancelando subscription da quantidade total de produtos finais');
        unsubscribe();
      }
    };
  }, []);

  // Effect para sincronização em tempo real da quantidade total de produtos revenda
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeResaleProductTotalQuantitySync = async () => {
      try {
        console.log('🔄 [Dashboard] Inicializando sincronização da quantidade total de produtos revenda...');

        // Carregar valor inicial do Supabase
        const initialQuantity = await dataManager.loadResaleProductTotalQuantity();
        console.log(`🛍️ [Dashboard] Valor inicial da quantidade total de revenda: ${initialQuantity}`);

        setResaleProductTotalQuantity(initialQuantity);
        setIsLoadingResaleProductTotalQuantity(false);

        // Configurar subscription em tempo real
        unsubscribe = dataManager.subscribeToResaleProductTotalQuantityChanges((newQuantity) => {
          console.log(`📡 [Dashboard] Nova quantidade total de revenda recebida via subscription: ${newQuantity}`);
          setResaleProductTotalQuantity(newQuantity);
        });

        console.log('🔔 [Dashboard] Subscription ativa para quantidade total de produtos revenda');

      } catch (error) {
        console.error('❌ [Dashboard] Erro ao inicializar sincronização da quantidade total de revenda:', error);
        setIsLoadingResaleProductTotalQuantity(false);
      }
    };

    initializeResaleProductTotalQuantitySync();

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        console.log('🔕 [Dashboard] Cancelando subscription da quantidade total de produtos revenda');
        unsubscribe();
      }
    };
  }, []);

  // Listener para evento customizado de atualização do saldo de matéria-prima
  useEffect(() => {
    const handleRawMaterialStockUpdate = (event: CustomEvent) => {
      const { balance, timestamp, source } = event.detail;
      console.log(`🏥 [Dashboard] Evento 'rawMaterialBalanceUpdated' recebido:`);
      console.log(`  - Saldo: R$ ${balance.toFixed(2)}`);
      console.log(`  - Timestamp: ${new Date(timestamp).toLocaleString()}`);
      console.log(`  - Source: ${source}`);

      // Atualizar estado imediatamente
      setRawMaterialStockBalance(balance);
      setIsLoadingRawMaterialStock(false);
    };

    const handleRawMaterialUnitaryQuantityUpdate = (event: CustomEvent) => {
      const { quantity, timestamp, source } = event.detail;
      console.log(`📦 [Dashboard] Evento 'rawMaterialUnitaryQuantityUpdated' recebido:`);
      console.log(`  - Quantidade Unitária: ${quantity}`);
      console.log(`  - Timestamp: ${new Date(timestamp).toLocaleString()}`);
      console.log(`  - Source: ${source}`);

      // Atualizar estado imediatamente
      setRawMaterialUnitaryQuantity(quantity);
      setIsLoadingRawMaterialUnitaryQuantity(false);
    };

    const handleFinalProductTotalQuantityUpdate = (event: CustomEvent) => {
      const { quantity, timestamp, source } = event.detail;
      console.log(`🏭 [Dashboard] Evento 'finalProductTotalQuantityUpdated' recebido:`);
      console.log(`  - Quantidade Total: ${quantity}`);
      console.log(`  - Timestamp: ${new Date(timestamp).toLocaleString()}`);
      console.log(`  - Source: ${source}`);

      // Atualizar estado imediatamente
      setFinalProductTotalQuantity(quantity);
      setIsLoadingFinalProductTotalQuantity(false);
    };

    const handleResaleProductTotalQuantityUpdate = (event: CustomEvent) => {
      const { quantity, timestamp, source } = event.detail;
      console.log(`🛍️ [Dashboard] Evento 'resaleProductTotalQuantityUpdated' recebido:`);
      console.log(`  - Quantidade Total Revenda: ${quantity}`);
      console.log(`  - Timestamp: ${new Date(timestamp).toLocaleString()}`);
      console.log(`  - Source: ${source}`);

      // Atualizar estado imediatamente
      setResaleProductTotalQuantity(quantity);
      setIsLoadingResaleProductTotalQuantity(false);
    };

    console.log('🎯 [Dashboard] Registrando listeners para eventos de matéria-prima e produtos finais');

    // Adicionar listeners para os eventos customizados
    window.addEventListener('rawMaterialBalanceUpdated', handleRawMaterialStockUpdate as EventListener);
    window.addEventListener('rawMaterialUnitaryQuantityUpdated', handleRawMaterialUnitaryQuantityUpdate as EventListener);
    window.addEventListener('finalProductTotalQuantityUpdated', handleFinalProductTotalQuantityUpdate as EventListener);
    window.addEventListener('resaleProductTotalQuantityUpdated', handleResaleProductTotalQuantityUpdate as EventListener);

    // Cleanup
    return () => {
      console.log('🚫 [Dashboard] Removendo listeners para eventos de matéria-prima e produtos finais');
      window.removeEventListener('rawMaterialBalanceUpdated', handleRawMaterialStockUpdate as EventListener);
      window.removeEventListener('rawMaterialUnitaryQuantityUpdated', handleRawMaterialUnitaryQuantityUpdate as EventListener);
      window.removeEventListener('finalProductTotalQuantityUpdated', handleFinalProductTotalQuantityUpdate as EventListener);
      window.removeEventListener('resaleProductTotalQuantityUpdated', handleResaleProductTotalQuantityUpdate as EventListener);
    };
  }, []);

  // Inicialização do saldo de produtos de revenda - usando valor sincronizado do ResaleProductsStock
  useEffect(() => {
    const initializeResaleStockBalance = async () => {
      try {
        console.log('🔄 [Dashboard] Inicializando saldo de produtos de revenda...');

        // PRIORIDADE 1: Tentar carregar do localStorage (sincronizado pelo ResaleProductsStock)
        const localStorageData = localStorage.getItem('resale_total_stock_value');
        if (localStorageData) {
          try {
            const parsed = JSON.parse(localStorageData);
            if (parsed.value !== undefined && parsed.value >= 0) {
              console.log(`💾 [Dashboard] Valor carregado do localStorage (ResaleProductsStock): R$ ${parsed.value.toFixed(2)}`);
              console.log(`📊 [Dashboard] Dados do localStorage:`, parsed);
              setResaleProductStockBalance(parsed.value);
              setIsLoadingResaleProductStock(false);
              return;
            }
          } catch (error) {
            console.log('⚠️ [Dashboard] Erro ao parsear localStorage, usando cálculo local');
          }
        }

        // PRIORIDADE 2: Fallback para cálculo local
        console.log('📊 [Dashboard] Usando cálculo local como fallback...');
        const localValue = resaleProductStockValue;
        console.log(`🔍 [Dashboard] Valor calculado localmente: R$ ${localValue.toFixed(2)}`);

        setResaleProductStockBalance(localValue);
        setIsLoadingResaleProductStock(false);

      } catch (error) {
        console.error('❌ [Dashboard] Erro ao inicializar saldo de produtos de revenda:', error);
        setResaleProductStockBalance(0);
        setIsLoadingResaleProductStock(false);
      }
    };

    // Aguardar um pouco para garantir que os dados estejam carregados
    if (!resaleProductsLoading && !stockItemsLoading) {
      initializeResaleStockBalance();
    }
  }, [resaleProductsLoading, stockItemsLoading, resaleProductStockValue]);

  // Listener para evento customizado de atualização do saldo de produtos de revenda
  useEffect(() => {
    const handleResaleStockUpdate = (event: CustomEvent) => {
      const { totalValue, timestamp, source } = event.detail;
      console.log(`🛍️ [Dashboard] Evento 'resaleTotalStockUpdated' recebido:`);
      console.log(`  - Valor Total: R$ ${totalValue.toFixed(2)}`);
      console.log(`  - Timestamp: ${new Date(timestamp).toLocaleString()}`);
      console.log(`  - Source: ${source}`);

      // Atualizar estado imediatamente
      setResaleProductStockBalance(totalValue);
      setIsLoadingResaleProductStock(false);
    };

    console.log('🎯 [Dashboard] Registrando listener para evento resaleTotalStockUpdated');

    // Adicionar listener para o evento customizado
    window.addEventListener('resaleTotalStockUpdated', handleResaleStockUpdate as EventListener);

    // Cleanup
    return () => {
      console.log('🚫 [Dashboard] Removendo listener para evento resaleTotalStockUpdated');
      window.removeEventListener('resaleTotalStockUpdated', handleResaleStockUpdate as EventListener);
    };
  }, []);

  // Effect para sincronização em tempo real do saldo de caixa
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let supabaseChannel: any = null;

    const initializeCashBalanceSync = async () => {
      try {
        console.log('🔄 [Dashboard] Inicializando sincronização em tempo real do saldo de caixa...');

        // Calcular saldo inicial baseado nas entradas de cash flow
        const initialBalance = cashBalance;
        console.log(`🔍 [Dashboard] Saldo inicial calculado: R$ ${initialBalance.toFixed(2)}`);

        setCashBalanceState(initialBalance);
        setIsLoadingCashBalance(false);

        // Salvar saldo inicial no Supabase
        await dataManager.saveCashBalance(initialBalance);

        // Configurar subscription em tempo real para mudanças na tabela cash_flow_entries
        supabaseChannel = supabase
          .channel('cash_balance_realtime')
          .on(
            'postgres_changes',
            {
              event: '*', // INSERT, UPDATE, DELETE
              schema: 'public',
              table: 'cash_flow_entries'
            },
            async (payload) => {
              console.log('💰 [Dashboard] Mudança detectada na tabela cash_flow_entries:', payload);

              // Recalcular saldo baseado nas mudanças
              setTimeout(async () => {
                try {
                  // Recarregar todas as entradas de cash flow
                  const updatedEntries = await dataManager.loadCashFlowEntries();

                  // Calcular novo saldo
                  const newTotalIncome = updatedEntries
                    .filter((entry) => entry.type === "income")
                    .reduce((sum, entry) => sum + entry.amount, 0);
                  const newTotalExpense = updatedEntries
                    .filter((entry) => entry.type === "expense")
                    .reduce((sum, entry) => sum + entry.amount, 0);
                  const newBalance = newTotalIncome - newTotalExpense;

                  console.log(`📊 [Dashboard] Novo saldo calculado em tempo real: R$ ${newBalance.toFixed(2)}`);

                  // Salvar no Supabase
                  await dataManager.saveCashBalance(newBalance);

                  // Atualizar estado local
                  setCashBalanceState(newBalance);

                  // Disparar evento de atualização
                  const updateEvent = new CustomEvent('cashBalanceUpdated', {
                    detail: {
                      balance: newBalance,
                      timestamp: Date.now(),
                      source: 'Dashboard-SupabaseRealtime'
                    }
                  });
                  window.dispatchEvent(updateEvent);

                } catch (error) {
                  console.error('❌ [Dashboard] Erro ao recalcular saldo em tempo real:', error);
                }
              }, 200); // Pequeno delay para garantir que a mudança foi persistida
            }
          )
          .subscribe();

        console.log('🔔 [Dashboard] Subscription ativa para mudanças de saldo em tempo real');

      } catch (error) {
        console.error('❌ [Dashboard] Erro ao inicializar sincronização do saldo de caixa:', error);
        setIsLoadingCashBalance(false);

        // Fallback para cálculo local em caso de erro
        const fallbackBalance = cashBalance;
        setCashBalanceState(fallbackBalance);
      }
    };

    // Aguardar o carregamento dos dados de cash flow antes de inicializar
    if (!cashFlowLoading && cashFlowEntries.length >= 0) {
      initializeCashBalanceSync();
    }

    // Cleanup subscription
    return () => {
      if (supabaseChannel) {
        console.log('🔕 [Dashboard] Cancelando subscription do saldo de caixa');
        supabase.removeChannel(supabaseChannel);
      }
    };
  }, [cashFlowLoading, cashFlowEntries, cashBalance]);

  // Listener para evento customizado de atualização do saldo de caixa
  useEffect(() => {
    const handleCashBalanceUpdate = (event: CustomEvent) => {
      const { balance, timestamp, source } = event.detail;
      console.log(`💰 [Dashboard] Evento 'cashBalanceUpdated' recebido:`);
      console.log(`  - Saldo: R$ ${balance.toFixed(2)}`);
      console.log(`  - Timestamp: ${new Date(timestamp).toLocaleString()}`);
      console.log(`  - Source: ${source}`);

      // Atualizar estado imediatamente
      setCashBalanceState(balance);
      setIsLoadingCashBalance(false);
    };

    console.log('🎯 [Dashboard] Registrando listener para evento cashBalanceUpdated');

    // Adicionar listener para o evento customizado
    window.addEventListener('cashBalanceUpdated', handleCashBalanceUpdate as EventListener);

    // Cleanup
    return () => {
      console.log('🚫 [Dashboard] Removendo listener para evento cashBalanceUpdated');
      window.removeEventListener('cashBalanceUpdated', handleCashBalanceUpdate as EventListener);
    };
  }, []);

  // Sistema de sincronização em tempo real para dados de estoque
  useEffect(() => {
    console.log('🔔 [Dashboard] Iniciando subscription para mudanças no estoque...');

    const stockChannel = supabase
      .channel('stock_realtime')
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'stock_items'
      }, (payload) => {
        console.log('📦 [Dashboard] Mudança detectada na tabela stock_items:', payload);

        // Recarregar dados de estoque após mudança
        setTimeout(() => {
          console.log('🔄 [Dashboard] Recarregando dados de estoque após mudança (Supabase Realtime)');

          // Disparar evento customizado para forçar recarga
          const stockUpdateEvent = new CustomEvent('stockItemsUpdated', {
            detail: {
              timestamp: Date.now(),
              source: 'Dashboard-SupabaseRealtime',
              payload
            }
          });
          window.dispatchEvent(stockUpdateEvent);
        }, 200); // Delay pequeno para garantir que a mudança foi persistida
      })
      .subscribe();

    // Cleanup
    return () => {
      console.log('🔕 [Dashboard] Cancelando subscription do estoque');
      stockChannel.unsubscribe();
    };
  }, []);

  // Listener para eventos de atualização de estoque de matéria-prima em tempo real
  useEffect(() => {
    const handleMaterialStockUpdate = async (event: CustomEvent) => {
      const { updateData, timestamp, source } = event.detail;
      console.log(`🏭 [Dashboard] Evento 'materialStockUpdated' recebido:`);
      console.log(`  - Timestamp: ${new Date(timestamp).toLocaleString()}`);
      console.log(`  - Source: ${source}`);
      console.log(`  - Update Data:`, updateData);

      // Forçar recálculo imediato do saldo de matéria-prima
      setTimeout(() => {
        console.log('🔄 [Dashboard] Forçando recálculo do saldo de matéria-prima após atualização de estoque');

        // Recarregar dados de estoque para recalcular valores
        const forceReloadEvent = new CustomEvent('forceStockItemsReload');
        window.dispatchEvent(forceReloadEvent);

        // Disparar evento específico para recálculo de matéria-prima
        const forceRawMaterialEvent = new CustomEvent('forceRawMaterialBalanceRecalc', {
          detail: {
            timestamp: Date.now(),
            source: 'Dashboard-MaterialStockUpdate'
          }
        });
        window.dispatchEvent(forceRawMaterialEvent);
      }, 200); // Pequeno delay para garantir que a atualização do Supabase foi processada
    };

    const handleForceRawMaterialRecalc = async (event: CustomEvent) => {
      const { timestamp, source } = event.detail;
      console.log(`🔄 [Dashboard] Evento 'forceRawMaterialRecalc' recebido:`);
      console.log(`  - Timestamp: ${new Date(timestamp).toLocaleString()}`);
      console.log(`  - Source: ${source}`);

      // Recarregar dados de estoque e recalcular saldo
      try {
        const updatedStockItems = await dataManager.loadStockItems();

        // Calcular novo saldo de matéria-prima
        const materialStockItems = updatedStockItems.filter(item => item.item_type === 'material');
        const newRawMaterialBalance = materialStockItems.reduce((total, item) => {
          return total + (item.total_value || 0);
        }, 0);

        console.log(`💰 [Dashboard] Novo saldo de matéria-prima calculado: R$ ${newRawMaterialBalance.toFixed(2)}`);

        // Salvar no Supabase e disparar evento de atualização
        await dataManager.saveRawMaterialStockBalance(newRawMaterialBalance);

        // Disparar evento para atualizar o card no dashboard
        const updateEvent = new CustomEvent('rawMaterialBalanceUpdated', {
          detail: {
            balance: newRawMaterialBalance,
            timestamp: Date.now(),
            source: 'Dashboard-ForceRecalc'
          }
        });
        window.dispatchEvent(updateEvent);

      } catch (error) {
        console.error('❌ [Dashboard] Erro ao recalcular saldo de matéria-prima:', error);
      }
    };

    console.log('🎯 [Dashboard] Registrando listeners para eventos de matéria-prima');

    // Adicionar listeners para os eventos customizados
    window.addEventListener('materialStockUpdated', handleMaterialStockUpdate as EventListener);
    window.addEventListener('forceRawMaterialRecalc', handleForceRawMaterialRecalc as EventListener);

    // Cleanup
    return () => {
      console.log('🚫 [Dashboard] Removendo listeners para eventos de matéria-prima');
      window.removeEventListener('materialStockUpdated', handleMaterialStockUpdate as EventListener);
      window.removeEventListener('forceRawMaterialRecalc', handleForceRawMaterialRecalc as EventListener);
    };
  }, []);

  // Monitorar mudanças no stockItems e calcular saldo de matéria-prima automaticamente
  useEffect(() => {
    if (!stockItemsLoading && stockItems.length >= 0) {
      const timeoutId = setTimeout(async () => {
        console.log('🔍 [Dashboard] Calculando saldo de matéria-prima automaticamente...');
        console.log(`📊 [Dashboard] Total de stockItems: ${stockItems.length}`);

        // Filtrar apenas matéria-prima
        const materialItems = stockItems.filter(item => item.item_type === 'material');
        console.log(`🏭 [Dashboard] Matérias-primas encontradas: ${materialItems.length}`);

        // Calcular quantidade total de matéria-prima unitária (unidade "un")
        const unitaryMaterialQuantity = materialItems.reduce((total, item) => {
          // Buscar o material para pegar sua unidade
          const material = materials.find(m => m.id === item.item_id);
          const itemUnit = material?.unit || item.unit || '';

          if (itemUnit === 'un' && item.quantity > 0) {
            console.log(`📦 [Dashboard] Material unitário encontrado: ${item.item_name} - Qtd: ${item.quantity}`);
            return total + (item.quantity || 0);
          }
          return total;
        }, 0);

        // Atualizar quantidade unitária de matéria-prima
        setRawMaterialUnitaryQuantity(unitaryMaterialQuantity);
        setIsLoadingRawMaterialUnitaryQuantity(false);

        console.log(`📦 [Dashboard] Quantidade unitária de matéria-prima: ${unitaryMaterialQuantity}`);

        // Calcular valor total das matérias-primas
        let newBalance = 0;
        materialItems.forEach(item => {
          const itemValue = item.total_value || 0;
          newBalance += itemValue;

          if (itemValue > 0) {
            console.log(`  - ${item.item_name}: R$ ${itemValue.toFixed(2)} (qtd: ${item.quantity}, custo: ${item.unit_cost})`);
          }
        });

        console.log(`💰 [Dashboard] Saldo calculado: R$ ${newBalance.toFixed(2)}`);
        console.log(`💰 [Dashboard] Saldo atual no estado: R$ ${(rawMaterialStockBalance || 0).toFixed(2)}`);

        // Só atualizar se houver diferença significativa
        if (rawMaterialStockBalance === null || Math.abs((rawMaterialStockBalance || 0) - newBalance) > 0.01) {
          console.log(`🔄 [Dashboard] Atualizando saldo de matéria-prima: R$ ${newBalance.toFixed(2)}`);

          // Salvar no Supabase
          const success = await dataManager.saveRawMaterialStockBalance(newBalance);
          if (success) {
            console.log(`✅ [Dashboard] Saldo salvo com sucesso no Supabase: R$ ${newBalance.toFixed(2)}`);

            // Disparar evento de atualização
            const updateEvent = new CustomEvent('rawMaterialBalanceUpdated', {
              detail: {
                balance: newBalance,
                timestamp: Date.now(),
                source: 'Dashboard-StockItemsMonitor'
              }
            });
            window.dispatchEvent(updateEvent);
          }

          // Atualizar estado local
          setRawMaterialStockBalance(newBalance);
        } else {
          console.log(`✅ [Dashboard] Saldo já atualizado, não há necessidade de alterar`);
        }

        // Salvar quantidade unitária de matéria-prima no Supabase também
        try {
          const success = await dataManager.saveRawMaterialUnitaryQuantity(unitaryMaterialQuantity);
          if (success) {
            console.log(`✅ [Dashboard] Quantidade unitária de matéria-prima salva no Supabase: ${unitaryMaterialQuantity}`);
            console.log(`📦 [Dashboard] Card "Matéria Prima Unitária" sincronizado com valor: ${unitaryMaterialQuantity}`);

            // Disparar evento de atualização para quantidade unitária
            const quantityUpdateEvent = new CustomEvent('rawMaterialUnitaryQuantityUpdated', {
              detail: {
                quantity: unitaryMaterialQuantity,
                timestamp: Date.now(),
                source: 'Dashboard-StockItemsMonitor'
              }
            });
            window.dispatchEvent(quantityUpdateEvent);
          }
        } catch (error) {
          console.warn('⚠️ [Dashboard] Erro ao salvar quantidade unitária de matéria-prima:', error);
        }

        // ===== CALCULAR QUANTIDADE TOTAL DE PRODUTOS FINAIS =====
        console.log('🔍 [Dashboard] Calculando quantidade total de produtos finais...');

        // Filtrar apenas produtos finais (não produtos de revenda)
        const productItems = stockItems.filter(item => item.item_type === 'product');
        const resaleProductIds = new Set(resaleProducts.map(p => p.id));
        const finalProductItems = productItems.filter(item => !resaleProductIds.has(item.item_id));

        console.log(`🏭 [Dashboard] Produtos finais encontrados: ${finalProductItems.length}`);

        // Calcular quantidade total
        const totalFinalProductQuantity = finalProductItems.reduce((total, item) => {
          const quantity = Number(item.quantity) || 0;
          console.log(`🏭 [Dashboard] Produto Final: ${item.item_name} - Qtd: ${quantity}`);
          return total + quantity;
        }, 0);

        console.log(`🏭 [Dashboard] Quantidade total de produtos finais calculada: ${totalFinalProductQuantity}`);

        // Só atualizar se houver diferença significativa
        if (finalProductTotalQuantity === null || finalProductTotalQuantity !== totalFinalProductQuantity) {
          console.log(`🔄 [Dashboard] Atualizando quantidade total de produtos finais: ${totalFinalProductQuantity}`);

          // Salvar no Supabase
          const success = await dataManager.saveFinalProductTotalQuantity(totalFinalProductQuantity);
          if (success) {
            console.log(`✅ [Dashboard] Quantidade total salva com sucesso no Supabase: ${totalFinalProductQuantity}`);

            // Disparar evento de atualização
            const updateEvent = new CustomEvent('finalProductTotalQuantityUpdated', {
              detail: {
                quantity: totalFinalProductQuantity,
                timestamp: Date.now(),
                source: 'Dashboard-StockItemsMonitor'
              }
            });
            window.dispatchEvent(updateEvent);
          }

          // Atualizar estado local
          setFinalProductTotalQuantity(totalFinalProductQuantity);
          setIsLoadingFinalProductTotalQuantity(false);
        } else {
          console.log(`✅ [Dashboard] Quantidade total já atualizada: ${totalFinalProductQuantity}`);
        }

        // ===== CALCULAR QUANTIDADE TOTAL DE PRODUTOS REVENDA =====
        console.log('🔍 [Dashboard] Calculando quantidade total de produtos revenda...');

        // Filtrar apenas produtos de revenda
        const resaleProductItems = productItems.filter(item => resaleProductIds.has(item.item_id));

        console.log(`🛍️ [Dashboard] Produtos revenda encontrados: ${resaleProductItems.length}`);

        // Calcular quantidade total
        const totalResaleProductQuantity = resaleProductItems.reduce((total, item) => {
          const quantity = Number(item.quantity) || 0;
          console.log(`🛍️ [Dashboard] Produto Revenda: ${item.item_name} - Qtd: ${quantity}`);
          return total + quantity;
        }, 0);

        console.log(`🛍️ [Dashboard] Quantidade total de produtos revenda calculada: ${totalResaleProductQuantity}`);

        // Só atualizar se houver diferença significativa
        if (resaleProductTotalQuantity === null || resaleProductTotalQuantity !== totalResaleProductQuantity) {
          console.log(`🔄 [Dashboard] Atualizando quantidade total de produtos revenda: ${totalResaleProductQuantity}`);

          // Salvar no Supabase
          const success = await dataManager.saveResaleProductTotalQuantity(totalResaleProductQuantity);
          if (success) {
            console.log(`✅ [Dashboard] Quantidade total de revenda salva com sucesso no Supabase: ${totalResaleProductQuantity}`);

            // Disparar evento de atualização
            const updateEvent = new CustomEvent('resaleProductTotalQuantityUpdated', {
              detail: {
                quantity: totalResaleProductQuantity,
                timestamp: Date.now(),
                source: 'Dashboard-StockItemsMonitor'
              }
            });
            window.dispatchEvent(updateEvent);
          }

          // Atualizar estado local
          setResaleProductTotalQuantity(totalResaleProductQuantity);
          setIsLoadingResaleProductTotalQuantity(false);
        } else {
          console.log(`✅ [Dashboard] Quantidade total de revenda já atualizada: ${totalResaleProductQuantity}`);
        }

      }, 300); // Aguardar 300ms para garantir que os dados foram processados

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [stockItems, stockItemsLoading, rawMaterialStockBalance, materials, materialsLoading, resaleProducts, finalProductTotalQuantity, resaleProductTotalQuantity]);

  // Log de comparação entre cálculo local e valor sincronizado
  useEffect(() => {
    if (resaleProductStockBalance !== null && !isLoadingResaleProductStock) {
      const difference = Math.abs(resaleProductStockValue - resaleProductStockBalance);
      if (difference > 0.01) {
        console.log('⚠️ [Dashboard] Diferença detectada no saldo de produtos de revenda:');
        console.log(`  - Cálculo local: R$ ${resaleProductStockValue.toFixed(2)}`);
        console.log(`  - Valor sincronizado: R$ ${resaleProductStockBalance.toFixed(2)}`);
        console.log(`  - Diferença: R$ ${difference.toFixed(2)}`);
        console.log(`  - ResaleProductsStock fará o cálculo correto automaticamente`);
      } else {
        console.log('✅ [Dashboard] Valores de produtos de revenda sincronizados corretamente:');
        console.log(`  - Valor: R$ ${resaleProductStockBalance.toFixed(2)}`);
      }
    }
  }, [resaleProductStockValue, resaleProductStockBalance, isLoadingResaleProductStock]);

  // Monitorar mudanças no cashFlowEntries e calcular saldo de caixa automaticamente
  useEffect(() => {
    if (!cashFlowLoading && cashFlowEntries.length >= 0) {
      const timeoutId = setTimeout(async () => {
        console.log('🔍 [Dashboard] Calculando saldo de caixa automaticamente...');
        console.log(`📊 [Dashboard] Total de entradas no cashFlow: ${cashFlowEntries.length}`);

        // Calcular saldo baseado nas entradas de fluxo de caixa
        let newBalance = 0;
        let totalIncome = 0;
        let totalExpense = 0;

        cashFlowEntries.forEach(entry => {
          if (entry.type === 'income') {
            totalIncome += entry.amount;
            newBalance += entry.amount;
          } else if (entry.type === 'expense') {
            totalExpense += entry.amount;
            newBalance -= entry.amount;
          }
        });

        console.log(`💰 [Dashboard] Receitas: R$ ${totalIncome.toFixed(2)}`);
        console.log(`💸 [Dashboard] Despesas: R$ ${totalExpense.toFixed(2)}`);
        console.log(`💰 [Dashboard] Saldo calculado: R$ ${newBalance.toFixed(2)}`);
        console.log(`💰 [Dashboard] Saldo atual no estado: R$ ${(cashBalanceState || 0).toFixed(2)}`);

        // Só atualizar se houver diferença significativa
        if (cashBalanceState === null || Math.abs((cashBalanceState || 0) - newBalance) > 0.01) {
          console.log(`🔄 [Dashboard] Atualizando saldo de caixa: R$ ${newBalance.toFixed(2)}`);

          // Salvar no Supabase
          const success = await dataManager.saveCashBalance(newBalance);
          if (success) {
            console.log(`✅ [Dashboard] Saldo salvo com sucesso no Supabase: R$ ${newBalance.toFixed(2)}`);

            // Disparar evento de atualização
            const updateEvent = new CustomEvent('cashBalanceUpdated', {
              detail: {
                balance: newBalance,
                timestamp: Date.now(),
                source: 'Dashboard-CashFlowMonitor'
              }
            });
            window.dispatchEvent(updateEvent);
          }

          // Atualizar estado local
          setCashBalanceState(newBalance);
        } else {
          console.log(`✅ [Dashboard] Saldo já atualizado, não há necessidade de alterar`);
        }
      }, 300); // Aguardar 300ms para garantir que os dados foram processados

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [cashFlowEntries, cashFlowLoading, cashBalanceState]);

  // Monitorar mudanças no estoque para sincronização entre componentes
  useEffect(() => {
    if (!stockItems.length || stockItemsLoading) return;

    console.log('📊 [Dashboard] Monitorando mudanças no estoque para sincronização:', {
      totalStockItems: stockItems.length,
      finalProducts: stockItems.filter(item => item.item_type === 'product').length,
      materials: stockItems.filter(item => item.item_type === 'material').length
    });

    // Debounce para evitar múltiplos disparos
    const timeoutId = setTimeout(() => {
      // Disparar evento para forçar sincronização entre StockCharts e FinalProductsStock
      const stockSyncEvent = new CustomEvent('dashboardStockUpdated', {
        detail: {
          stockItems: stockItems.filter(item => item.item_type === 'product'),
          timestamp: Date.now(),
          source: 'Dashboard-StockMonitor'
        }
      });

      window.dispatchEvent(stockSyncEvent);
      console.log('📡 [Dashboard] Evento de sincronização de estoque disparado');

      // Forçar recalculação no FinalProductsStock após mudanças no estoque
      setTimeout(() => {
        const forceRecalcEvent = new CustomEvent('forceStockRecalculation', {
          detail: {
            source: 'Dashboard-StockChange',
            timestamp: Date.now()
          }
        });
        window.dispatchEvent(forceRecalcEvent);
        console.log('🔄 [Dashboard] Forçando recalculação após mudança no estoque');
      }, 300);

    }, 1000); // Debounce de 1 segundo

    return () => clearTimeout(timeoutId);
  }, [stockItems, stockItemsLoading]);

  // Effect para inicializar e sincronizar todos os saldos baseado nos dados existentes
  useEffect(() => {
    const initializeBalances = () => {
      console.log('🚀 [Dashboard] Inicializando sincronização de todos os saldos...');
      
      try {
        // Usar saldo de caixa já calculado
        console.log(`💰 [Dashboard] Saldo de caixa: R$ ${cashBalance.toFixed(2)}`);
        setCashBalanceState(cashBalance);
        setIsLoadingCashBalance(false);
        
        // Calcular saldo de matéria-prima baseado nos stockItems
        const materialStockValue = stockItems
          .filter(item => item.item_type === 'material')
          .reduce((total, item) => total + (item.total_value || 0), 0);
        console.log(`🏭 [Dashboard] Saldo de matéria-prima: R$ ${materialStockValue.toFixed(2)}`);
        setRawMaterialStockBalance(materialStockValue);
        setIsLoadingRawMaterialStock(false);
        
        // Calcular saldo de produtos finais baseado nos stockItems
        const finalProductStockValue = stockItems
          .filter(item => item.item_type === 'product')
          .reduce((total, item) => total + (item.total_value || 0), 0);
        console.log(`📦 [Dashboard] Saldo de produtos finais: R$ ${finalProductStockValue.toFixed(2)}`);
        setFinalProductStockBalance(finalProductStockValue);
        setIsLoadingFinalProductStock(false);
        
        // Usar saldo de produtos de revenda já calculado
        console.log(`🛒 [Dashboard] Saldo de produtos de revenda: R$ ${resaleProductStockValue.toFixed(2)}`);
        setResaleProductStockBalance(resaleProductStockValue);
        setIsLoadingResaleProductStock(false);
        
        console.log('✅ [Dashboard] Todos os saldos sincronizados com sucesso!');
        console.log('🔍 [Dashboard] RESUMO DOS SALDOS INICIALIZADOS:');
        console.log(`  - cashBalanceState: R$ ${cashBalance.toFixed(2)}`);
        console.log(`  - rawMaterialStockBalance: R$ ${materialStockValue.toFixed(2)}`);
        console.log(`  - finalProductStockBalance: R$ ${finalProductStockValue.toFixed(2)}`);
        console.log(`  - resaleProductStockBalance: R$ ${resaleProductStockValue.toFixed(2)}`);
        console.log(`  - SOMA TOTAL (sem dívidas): R$ ${(cashBalance + materialStockValue + finalProductStockValue + resaleProductStockValue).toFixed(2)}`);
      } catch (error) {
        console.error('❌ [Dashboard] Erro ao sincronizar saldos:', error);
      }
    };
    
    // Só inicializar quando todos os dados necessários estiverem carregados
    if (!isDataLoading && cashFlowEntries.length >= 0 && stockItems.length >= 0) {
      initializeBalances();
    }
  }, [isDataLoading, cashFlowEntries, stockItems, cashBalance, resaleProductStockValue]);

  // Effect para calcular valor empresarial em tempo real
  useEffect(() => {
    const calculateEmpresarialValue = () => {
      // Só calcular se todos os valores estão carregados (incluindo dívidas)
      if (
        cashBalanceState !== null &&
        rawMaterialStockBalance !== null &&
        finalProductStockBalance !== null &&
        resaleProductStockBalance !== null &&
        !debtsLoading
      ) {
        // CORREÇÃO FINAL: Usar diretamente o remaining_amount das dívidas (mesmo valor do card "Saldo Devedor")
        const totalDebtRemaining = debts.reduce((sum, debt) => {
          const remainingAmount = typeof debt.remaining_amount === 'number' 
            ? debt.remaining_amount 
            : parseFloat(debt.remaining_amount) || 0;
          return sum + remainingAmount;
        }, 0);
        
        // CÁLCULO CORRETO: Somar todos os saldos e subtrair saldo devedor das dívidas
        const calculatedBusinessValue = 
          cashBalanceState + 
          rawMaterialStockBalance + 
          finalProductStockBalance + 
          resaleProductStockBalance - 
          totalDebtRemaining;
        
        console.log('💼 [Dashboard] Calculando Valor Empresarial (SOMA DINÂMICA COM DÍVIDAS):');
        console.log(`  - Saldo Caixa: R$ ${cashBalanceState.toFixed(2)}`);
        console.log(`  - Saldo Matéria-Prima: R$ ${rawMaterialStockBalance.toFixed(2)}`);
        console.log(`  - Saldo Produtos Finais: R$ ${finalProductStockBalance.toFixed(2)}`);
        console.log(`  - Saldo Produtos Revenda: R$ ${resaleProductStockBalance.toFixed(2)}`);
        console.log('💳 [Dashboard] DETALHAMENTO DAS DÍVIDAS:');
        console.log(`  - Total de dívidas encontradas: ${debts.length}`);
        debts.forEach((debt, index) => {
          console.log(`    ${index + 1}. ${debt.description}: remaining_amount = R$ ${(typeof debt.remaining_amount === 'number' ? debt.remaining_amount : parseFloat(debt.remaining_amount) || 0).toFixed(2)}`);
        });
        console.log(`  - SALDO DEVEDOR TOTAL: R$ ${totalDebtRemaining.toFixed(2)}`);
        console.log(`  - VALOR EMPRESARIAL CALCULADO: R$ ${calculatedBusinessValue.toFixed(2)}`);
        console.log(`  - FÓRMULA DETALHADA: ${cashBalanceState.toFixed(2)} + ${rawMaterialStockBalance.toFixed(2)} + ${finalProductStockBalance.toFixed(2)} + ${resaleProductStockBalance.toFixed(2)} - ${totalDebtRemaining.toFixed(2)} = ${calculatedBusinessValue.toFixed(2)}`);
        console.log(`  - VERIFICAÇÃO: ${(cashBalanceState + rawMaterialStockBalance + finalProductStockBalance + resaleProductStockBalance - totalDebtRemaining).toFixed(2)}`);

        // Validação adicional para garantir que o cálculo está correto
        const manualCalculation = cashBalanceState + rawMaterialStockBalance + finalProductStockBalance + resaleProductStockBalance - totalDebtRemaining;
        if (Math.abs(calculatedBusinessValue - manualCalculation) > 0.01) {
          console.error('❌ [Dashboard] ERRO: Inconsistência no cálculo do valor empresarial!');
          console.error(`  - calculatedBusinessValue: R$ ${calculatedBusinessValue.toFixed(2)}`);
          console.error(`  - manualCalculation: R$ ${manualCalculation.toFixed(2)}`);
          console.error(`  - Diferença: R$ ${Math.abs(calculatedBusinessValue - manualCalculation).toFixed(2)}`);
        }

        console.log(`🎯 [Dashboard] VALOR EMPRESARIAL FINAL DEFINIDO: R$ ${calculatedBusinessValue.toFixed(2)}`);
        setEmpresarialValue(calculatedBusinessValue);
        setIsLoadingEmpresarialValue(false);
        
        // Salvar o valor empresarial calculado no banco de dados para sincronização
        dataManager.saveBusinessValue(calculatedBusinessValue).catch(error => {
          console.error('❌ [Dashboard] Erro ao salvar valor empresarial no banco:', error);
        });
      } else {
        console.log('⏳ [Dashboard] Aguardando todos os valores para calcular Valor Empresarial...');
        console.log(`  - Saldo Caixa: ${cashBalanceState !== null ? `R$ ${cashBalanceState.toFixed(2)}` : 'LOADING'}`);
        console.log(`  - Saldo Matéria-Prima: ${rawMaterialStockBalance !== null ? `R$ ${rawMaterialStockBalance.toFixed(2)}` : 'LOADING'}`);
        console.log(`  - Saldo Produtos Finais: ${finalProductStockBalance !== null ? `R$ ${finalProductStockBalance.toFixed(2)}` : 'LOADING'}`);
        console.log(`  - Saldo Produtos Revenda: ${resaleProductStockBalance !== null ? `R$ ${resaleProductStockBalance.toFixed(2)}` : 'LOADING'}`);
        console.log(`  - Dívidas: ${!debtsLoading ? 'OK' : 'LOADING'}`);
      }
    };

    // Calcular sempre que qualquer valor mudar (incluindo dívidas)
    calculateEmpresarialValue();
  }, [cashBalanceState, rawMaterialStockBalance, finalProductStockBalance, resaleProductStockBalance, debts, debtsLoading]);

  // Listeners para eventos de checkpoint - restauração de dados
  useEffect(() => {
    const handleResaleProductStockRestore = (event: CustomEvent) => {
      const { balance, source } = event.detail;
      console.log(`🔄 [Dashboard] Evento 'resaleProductStockUpdated' recebido:`);
      console.log(`  - Saldo: R$ ${balance.toFixed(2)}`);
      console.log(`  - Source: ${source}`);

      // Atualizar estado imediatamente
      setResaleProductStockBalance(balance);
      setIsLoadingResaleProductStock(false);
    };

    const handleRawMaterialStockRestore = (event: CustomEvent) => {
      const { balance, source } = event.detail;
      console.log(`🔄 [Dashboard] Evento 'rawMaterialStockUpdated' recebido:`);
      console.log(`  - Saldo: R$ ${balance.toFixed(2)}`);
      console.log(`  - Source: ${source}`);

      // Atualizar estado imediatamente
      setRawMaterialStockBalance(balance);
      setIsLoadingRawMaterialStock(false);
    };

    const handleFinalProductStockRestore = (event: CustomEvent) => {
      const { balance, source } = event.detail;
      console.log(`🔄 [Dashboard] Evento 'finalProductStockUpdated' recebido:`);
      console.log(`  - Saldo: R$ ${balance.toFixed(2)}`);
      console.log(`  - Source: ${source}`);

      // Atualizar estado imediatamente
      setFinalProductStockBalance(balance);
      setIsLoadingFinalProductStock(false);
    };

    const handleCashBalanceRestore = (event: CustomEvent) => {
      const { balance, source } = event.detail;
      console.log(`🔄 [Dashboard] Evento 'cashBalanceUpdated' recebido:`);
      console.log(`  - Saldo: R$ ${balance.toFixed(2)}`);
      console.log(`  - Source: ${source}`);

      // Atualizar estado imediatamente
      setCashBalanceState(balance);
      setIsLoadingCashBalance(false);
    };

    const handleSystemRestore = (event: CustomEvent) => {
      const { timestamp, source, version } = event.detail;
      console.log(`🔄 [Dashboard] Sistema restaurado de checkpoint:`);
      console.log(`  - Timestamp: ${new Date(timestamp).toLocaleString('pt-BR')}`);
      console.log(`  - Source: ${source}`);
      console.log(`  - Version: ${version}`);
    };

    console.log('🎯 [Dashboard] Registrando listeners para eventos de checkpoint');

    // Adicionar listeners para os eventos de sincronização em tempo real
    window.addEventListener('resaleProductStockUpdated', handleResaleProductStockRestore as EventListener);
    window.addEventListener('rawMaterialStockUpdated', handleRawMaterialStockRestore as EventListener);
    window.addEventListener('finalProductStockUpdated', handleFinalProductStockRestore as EventListener);
    window.addEventListener('cashBalanceUpdated', handleCashBalanceRestore as EventListener);
    window.addEventListener('systemRestored', handleSystemRestore as EventListener);

    // Cleanup
    return () => {
      console.log('🚫 [Dashboard] Removendo listeners para eventos de sincronização');
      window.removeEventListener('resaleProductStockUpdated', handleResaleProductStockRestore as EventListener);
      window.removeEventListener('rawMaterialStockUpdated', handleRawMaterialStockRestore as EventListener);
      window.removeEventListener('finalProductStockUpdated', handleFinalProductStockRestore as EventListener);
      window.removeEventListener('cashBalanceUpdated', handleCashBalanceRestore as EventListener);
      window.removeEventListener('systemRestored', handleSystemRestore as EventListener);
    };
  }, []);

  // Definições de métricas e cores removidas

  if (isDataLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, index) => (
            <Card
              key={index}
              className="bg-factory-800/50 border-tire-600/30 animate-pulse"
            >
              <CardContent className="p-6">
                <div className="h-4 bg-factory-700/50 rounded mb-2"></div>
                <div className="h-8 bg-factory-700/50 rounded mb-2"></div>
                <div className="h-3 bg-factory-700/50 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-96 bg-factory-800/50 border-tire-600/30 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  // Função para criar checkpoint incluindo todos os saldos
  const handleCreateCheckpoint = async () => {
    try {
      setIsCreatingCheckpoint(true);
      setCheckpointStatus('creating');

      console.log('💾 [Dashboard] Iniciando criação de checkpoint...');

      // Criar checkpoint usando o checkpointManager com informações de todos os saldos
      const checkpointDescription = [
        `Saldo Caixa: ${formatCurrency(cashBalanceState || 0)}`,
        `Saldo Produtos Finais: ${formatCurrency(finalProductStockBalance || 0)}`,
        `Saldo Matéria-Prima: ${formatCurrency(rawMaterialStockBalance || 0)}`,
        `Saldo Produtos Revenda: ${formatCurrency(resaleProductStockBalance || 0)}`
      ].join(' | ');

      const success = await checkpointManager.createCheckpoint(
        `Dashboard - ${checkpointDescription}`
      );

      if (success) {
        console.log('✅ [Dashboard] Checkpoint criado com sucesso');
        setCheckpointStatus('success');

        // Resetar status após 3 segundos
        setTimeout(() => {
          setCheckpointStatus(null);
        }, 3000);
      } else {
        throw new Error('Falha ao criar checkpoint');
      }
    } catch (error) {
      console.error('❌ [Dashboard] Erro ao criar checkpoint:', error);
      setCheckpointStatus('error');

      // Resetar status após 3 segundos
      setTimeout(() => {
        setCheckpointStatus(null);
      }, 3000);
    } finally {
      setIsCreatingCheckpoint(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Cards de Saldo e Receita */}
      <div className="flex justify-between items-center mb-6">
        <div>
        </div>
        <div className="flex gap-6">
          {/* Card Saldo Caixa - Maior */}
          <Card className="bg-factory-900/30 border-tire-600/30 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${
                  (cashBalanceState !== null ? cashBalanceState : cashBalance) >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  <DollarSign className={`h-6 w-6 ${
                    (cashBalanceState !== null ? cashBalanceState : cashBalance) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`} />
                </div>
                <div>
                  <p className="text-tire-300 text-sm font-medium">Saldo Caixa</p>
                  <p className={`text-2xl font-bold ${
                    (cashBalanceState !== null ? cashBalanceState : cashBalance) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {isLoadingCashBalance || cashBalanceState === null ? (
                      <span className="animate-pulse">Carregando...</span>
                    ) : (
                      formatCurrency(cashBalanceState)
                    )}
                  </p>

                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Valor Empresarial - Maior */}
          <Card className="bg-factory-900/30 border-tire-600/30 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${
                  empresarialValue && empresarialValue > 0 ? 'bg-neon-purple/20' : 'bg-gray-500/20'
                }`}>
                  <TrendingUp className={`h-6 w-6 ${
                    empresarialValue && empresarialValue > 0 ? 'text-neon-purple' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <p className="text-tire-300 text-sm font-medium">Valor Empresarial</p>
                  <p className={`text-2xl font-bold ${
                    empresarialValue && empresarialValue > 0 ? 'text-neon-purple' : 'text-tire-200'
                  }`}>
                    {isLoadingEmpresarialValue || empresarialValue === null ? (
                      <span className="animate-pulse">Carregando...</span>
                    ) : (
                      formatCurrency(empresarialValue)
                    )}
                  </p>

                </div>
              </div>
            </CardContent>
          </Card>


        </div>
      </div>

      {/* Gráfico de Lucro Empresarial */}
      <EmpresarialProfitChart 
        cashFlowEntries={cashFlowEntries}
        isLoading={cashFlowLoading}
        empresarialValue={empresarialValue}
      />

      {/* Seção de Cards de Métricas - Layout 3x3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Primeira linha */}
          {/* Card 1 - Saldo Matéria-Prima */}
          <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-tire-300 text-sm font-medium">Saldo Matéria-Prima</p>
                  <p className="text-2xl font-bold text-tire-200">
                    {isLoadingRawMaterialStock || rawMaterialStockBalance === null ? (
                      <span className="animate-pulse">Carregando...</span>
                    ) : (
                      formatCurrency(rawMaterialStockBalance)
                    )}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-blue-500/20">
                  <Factory className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2 - Saldo Produtos Finais */}
          <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-tire-300 text-sm font-medium">Saldo Produtos Finais</p>
                  <p className="text-2xl font-bold text-tire-200">
                    {isLoadingFinalProductStock || finalProductStockBalance === null ? (
                      <span className="animate-pulse">Carregando...</span>
                    ) : (
                      formatCurrency(finalProductStockBalance)
                    )}
                  </p>

                </div>
                <div className="p-2 rounded-full bg-blue-500/20">
                  <Package className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3 - Saldo Produtos Revenda */}
          <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-tire-300 text-sm font-medium">Saldo Produtos Revenda</p>
                  <p className="text-2xl font-bold text-tire-200">
                    {isLoadingResaleProductStock || resaleProductStockBalance === null ? (
                      <span className="animate-pulse">Carregando...</span>
                    ) : (
                      formatCurrency(resaleProductStockBalance)
                    )}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-blue-500/20">
                  <ShoppingBag className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Segunda linha */}
          {/* Card 4 - Custo Médio por Pneu */}
          <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-tire-300 text-sm font-medium">Custo Médio por Pneu</p>
                  <p className="text-2xl font-bold text-tire-200">
                    {formatCurrency(averageTireCost)}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-blue-500/20">
                  <Calculator className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 5 - Lucro Médio por Pneu */}
          <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-tire-300 text-sm font-medium">Lucro Médio por Pneu</p>
                  <p className="text-2xl font-bold text-green-400">
                    {isLoadingTireProfit ? (
                      <span className="animate-pulse">Carregando...</span>
                    ) : (
                      formatCurrency(averageTireProfit)
                    )}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-blue-500/20">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 6 - Lucro Médio Produtos Revenda */}
          <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-tire-300 text-sm font-medium">Lucro Médio Produtos Revenda</p>
                  <p className="text-2xl font-bold text-green-400">
                    {isLoadingResaleProfit || averageResaleProfit === null ? (
                      <span className="animate-pulse">Carregando...</span>
                    ) : (
                      formatCurrency(averageResaleProfit)
                    )}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-blue-500/20">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terceira linha */}
          {/* Card 7 - Matéria Prima Unitária */}
          <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-tire-300 text-sm font-medium">Matéria Prima Unitária</p>
                  <p className="text-2xl font-bold text-tire-200">
                    {isLoadingRawMaterialUnitaryQuantity ? (
                      <span className="animate-pulse">Carregando...</span>
                    ) : (
                      rawMaterialUnitaryQuantity
                    )}
                  </p>

                </div>
                <div className="p-2 rounded-full bg-blue-500/20">
                  <Package className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 8 - Quantidade Total Produtos Finais */}
          <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-tire-300 text-sm font-medium">Qtd. Total Produtos Finais</p>
                  <p className="text-2xl font-bold text-tire-200">
                    {isLoadingFinalProductTotalQuantity || finalProductTotalQuantity === null ? (
                      <span className="animate-pulse">Carregando...</span>
                    ) : (
                      `${finalProductTotalQuantity?.toFixed(0) || 0}`
                    )}
                  </p>

                </div>
                <div className="p-2 rounded-full bg-blue-500/20">
                  <Factory className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 9 - Quantidade Total Produtos Revenda */}
          <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-tire-300 text-sm font-medium">Qtd. Total Produtos Revenda</p>
                  <p className="text-2xl font-bold text-tire-200">
                    {isLoadingResaleProductTotalQuantity || resaleProductTotalQuantity === null ? (
                      <span className="animate-pulse">Carregando...</span>
                    ) : (
                      resaleProductTotalQuantity
                    )}
                  </p>

                </div>
                <div className="p-2 rounded-full bg-blue-500/20">
                  <ShoppingBag className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Combined Charts Section - Production and Profit in Tabs */}
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 text-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-green via-neon-blue to-neon-purple flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            Análise de Produção e Lucro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-factory-900/30 rounded-lg p-4 min-h-[400px] w-full">
            {isChartsLoading || !productionEntries ? (
              <div className="flex items-center justify-center h-[350px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-green"></div>
              </div>
            ) : (
              <div className="w-full h-full min-h-[350px]">
                <ProductionChart
                  productionEntries={productionEntries || []}
                  isLoading={false}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stock Charts Section */}
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 text-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            Gráficos de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-[400px] w-full">
          <div className="min-h-[350px] w-full">
            {isChartsLoading || !materials || !products || !stockItems ? (
              <div className="flex items-center justify-center h-[350px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue"></div>
              </div>
            ) : (
              <div className="w-full h-full min-h-[350px]">
                <StockCharts
                  key={`main-dashboard-stock-charts-${resaleDataVersion}-${stockItems.length}`}
                  materials={materials || []}
                  products={products || []}
                  resaleProducts={resaleProducts || []}
                  stockItems={stockItems || []}
                  isLoading={false}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Resumo Financeiro Simplificado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-tire-300">Total de Entradas:</span>
                <span className="text-neon-green font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalIncome)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tire-300">Total de Saídas:</span>
                <span className="text-red-400 font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalExpense)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-tire-600/30">
                <span className="text-white font-medium">Saldo Atual:</span>
                <span
                  className={`font-bold text-lg ${
                    cashBalance >= 0
                      ? "text-neon-green"
                      : "text-red-400"
                  }`}
                >
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(cashBalance)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Resumo de Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-tire-300">Total Produzido:</span>
                <span className="text-neon-blue font-bold">
                  {productionEntries.reduce(
                    (sum, entry) => sum + entry.quantity_produced,
                    0,
                  )} unidades
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tire-300">Entradas de Produção:</span>
                <span className="text-neon-green font-bold">
                  {productionEntries.length} registros
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-tire-600/30">
                <span className="text-white font-medium">
                  Média por Entrada:
                </span>
                <span className="text-neon-orange font-bold">
                  {productionEntries.length > 0
                    ? (
                        productionEntries.reduce(
                          (sum, entry) => sum + entry.quantity_produced,
                          0,
                        ) / productionEntries.length
                      ).toFixed(1)
                    : 0}{" "}
                  unidades
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PresumedProfitManager sempre ativo para cálculos em tempo real */}
      <div className="hidden">
        <PresumedProfitManager
          isLoading={
            isDataLoading ||
            materialsLoading ||
            employeesLoading ||
            fixedCostsLoading ||
            variableCostsLoading ||
            stockItemsLoading ||
            productionLoading ||
            productsLoading ||
            cashFlowLoading ||
            recipesLoading ||
            defectiveTireSalesLoading ||
            warrantyEntriesLoading
          }
          materials={materials}
          employees={employees}
          fixedCosts={fixedCosts}
          variableCosts={variableCosts}
          stockItems={stockItems}
          productionEntries={productionEntries}
          products={products}
          cashFlowEntries={cashFlowEntries}
          recipes={recipes}
          defectiveTireSales={defectiveTireSales}
          warrantyEntries={warrantyEntries}
          hideCharts={true}
        />
      </div>

      {/* ResaleProductProfitManager sempre ativo para cálculos em tempo real */}
      <div className="hidden">
        {(() => {
          const isLoadingValue = cashFlowLoading || stockItemsLoading || resaleProductsLoading;
          console.log('🔧 [Dashboard] Renderizando ResaleProductProfitManager:', {
            isLoading: isLoadingValue,
            cashFlowLoading,
            stockItemsLoading,
            resaleProductsLoading,
            cashFlowEntries: cashFlowEntries.length,
            stockItems: stockItems.length
          });
          return (
            <ResaleProductProfitManager
              isLoading={isLoadingValue}
              cashFlowEntries={cashFlowEntries}
              stockItems={stockItems}
              hideCharts={true}
            />
          );
        })()}
      </div>

      {/* FinalProductsStock sempre ativo para cálculos e sincronização em tempo real */}
      <div className="hidden">
        {(() => {
          const isLoadingValue = stockItemsLoading || materialsLoading || recipesLoading;
          console.log('🔧 [Dashboard] Renderizando FinalProductsStock:', {
            isLoading: isLoadingValue,
            stockItemsLoading,
            materialsLoading,
            recipesLoading,
            stockItems: stockItems.length,
            materials: materials.length,
            recipes: recipes.length
          });
          return (
            <FinalProductsStock
              isLoading={isLoadingValue}
            />
          );
        })()}
      </div>

      {/* TireCostManager sempre ativo para cálculos de custo por pneu em tempo real */}
      <div className="hidden">
        {(() => {
          const isLoadingValue = 
            materialsLoading ||
            employeesLoading ||
            fixedCostsLoading ||
            variableCostsLoading ||
            stockItemsLoading ||
            productionLoading ||
            productsLoading ||
            cashFlowLoading ||
            recipesLoading ||
            defectiveTireSalesLoading ||
            warrantyEntriesLoading;
          console.log('🔧 [Dashboard] Renderizando TireCostManager:', {
            isLoading: isLoadingValue,
            materials: materials.length,
            employees: employees.length,
            stockItems: stockItems.length,
            products: products.length,
            recipes: recipes.length
          });
          return (
            <TireCostManager
              isLoading={isLoadingValue}
              materials={materials}
              employees={employees}
              fixedCosts={fixedCosts}
              variableCosts={variableCosts}
              stockItems={stockItems}
              productionEntries={productionEntries}
              products={products}
              cashFlowEntries={cashFlowEntries}
              recipes={recipes}
              defectiveTireSales={defectiveTireSales}
              warrantyEntries={warrantyEntries}
            />
          );
        })()
      }
      </div>

      {/* ResaleProductsStock sempre ativo para sincronização em tempo real */}
      <div className="hidden">
        {(() => {
          const isLoadingValue = resaleProductsLoading || stockItemsLoading;
          console.log('🔧 [Dashboard] Renderizando ResaleProductsStock:', {
            isLoading: isLoadingValue,
            resaleProductsLoading,
            stockItemsLoading,
            resaleProducts: resaleProducts.length,
            stockItems: stockItems.length
          });
          return (
            <ResaleProductsStock
              isLoading={isLoadingValue}
            />
          );
        })()
      }
      </div>

      {/* PresumedProfitManager sempre ativo para calcular e salvar o Valor Empresarial correto */}
      <div className="hidden">
        {(() => {
          const isLoadingValue = 
            cashFlowLoading ||
            materialsLoading ||
            employeesLoading ||
            fixedCostsLoading ||
            variableCostsLoading ||
            stockItemsLoading ||
            productionLoading ||
            productsLoading ||
            recipesLoading ||
            defectiveTireSalesLoading ||
            warrantyEntriesLoading;
          console.log('💼 [Dashboard] Renderizando PresumedProfitManager para calcular Valor Empresarial:', {
            isLoading: isLoadingValue,
            cashFlowEntries: cashFlowEntries.length,
            materials: materials.length,
            employees: employees.length,
            fixedCosts: fixedCosts.length,
            variableCosts: variableCosts.length,
            stockItems: stockItems.length,
            productionEntries: productionEntries.length,
            products: products.length,
            recipes: recipes.length,
            defectiveTireSales: defectiveTireSales.length,
            warrantyEntries: warrantyEntries.length
          });
          return (
            <PresumedProfitManager
              isLoading={isLoadingValue}
              cashFlowEntries={cashFlowEntries || []}
              materials={materials || []}
              employees={employees || []}
              fixedCosts={fixedCosts || []}
              variableCosts={variableCosts || []}
              stockItems={stockItems || []}
              productionEntries={productionEntries || []}
              products={products || []}
              recipes={recipes || []}
              defectiveTireSales={defectiveTireSales || []}
              warrantyEntries={warrantyEntries || []}
              hideCharts={true}
            />
          );
        })()
      }
      </div>
    </div>
  );
};

const Home = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const { stockItems, updateStockItem, loadStockItems } = useStockItems(); // ✅ Usando Supabase em vez de localStorage
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Function to trigger loading state for demonstration
  const handleRefresh = () => {
    setLoading(true);
    // Reset loading after 2 seconds
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  const handleSidebarClick = (label: string) => {
    const sectionMap: { [key: string]: string } = {
      Dashboard: "dashboard",
      Financeiro: "financial",
      Estoque: "inventory",
      Produção: "production",
      Cadastros: "registrations",
      Vendas: "sales",
      Settings: "settings", // Mapeamento correto para o valor "Settings" que vem da sidebar
      Configurações: "settings", // Adicional para compatibilidade
    };
    setActiveSection(sectionMap[label] || "dashboard");
  };

  // Process URL hash to set active section
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    console.log(`🔗 [Dashboard] Hash da URL detectado: "${hash}"`);

    if (hash && hash !== activeSection) {
      console.log(`🔄 [Dashboard] Mudando seção ativa de "${activeSection}" para "${hash}"`);
      setActiveSection(hash);
    }
  }, []);

  // Listen for stockItemsUpdated event to reload stock items
  useEffect(() => {
    const handleStockItemsUpdated = async () => {
      console.log('🔄 [Home] Evento stockItemsUpdated recebido, recarregando itens de estoque...');
      await loadStockItems();
    };

    window.addEventListener('stockItemsUpdated', handleStockItemsUpdated as EventListener);
    // Also listen for the generic reload event from MainDashboard
    window.addEventListener('forceStockItemsReload', handleStockItemsUpdated as EventListener);

    return () => {
      window.removeEventListener('stockItemsUpdated', handleStockItemsUpdated as EventListener);
      window.removeEventListener('forceStockItemsReload', handleStockItemsUpdated as EventListener);
    };
  }, [loadStockItems]);


  // ✅ Function updateStock now uses Supabase via hook useStockItems
  const updateStock = async (
    itemId: string,
    itemType: "material" | "product",
    quantity: number,
    operation: "add" | "remove",
    unitPrice?: number,
    itemName?: string
  ): Promise<void> => {
    console.log(`🔄 [Home] Atualizando estoque via Supabase:`, {
      itemId,
      itemType,
      quantity,
      operation,
      unitPrice,
      itemName,
    });

    // Encontrar o item de estoque existente
    const existingStock = stockItems.find(
      (item) => item.item_id === itemId && item.item_type === itemType,
    );

    if (existingStock) {
      // Preparar dados para atualização
      let updateData: any = {
        last_updated: new Date().toISOString(),
      };

      if (operation === "add") {
        const newQuantity = existingStock.quantity + quantity;
        let newUnitCost = existingStock.unit_cost;

        // Calcular custo médio ponderado se adicionando com preço
        if (unitPrice && unitPrice > 0) {
          const currentTotalValue = existingStock.quantity * existingStock.unit_cost;
          const newTotalValue = quantity * unitPrice;
          newUnitCost = (currentTotalValue + newTotalValue) / newQuantity;
        }

        updateData = {
          ...updateData,
          quantity: newQuantity,
          unit_cost: newUnitCost,
          total_value: newQuantity * newUnitCost,
        };
      } else if (operation === "remove") {
        const newQuantity = Math.max(0, existingStock.quantity - quantity);
        updateData = {
          ...updateData,
          quantity: newQuantity,
          total_value: newQuantity * existingStock.unit_cost,
        };
      }

      // Atualizar via hook do Supabase
      try {
        await updateStockItem(existingStock.id, updateData);
        console.log(`✅ [Home] Estoque atualizado com sucesso via Supabase`);

        // Disparar evento para notificar outros componentes
        const stockUpdateEvent = new CustomEvent('stockItemsUpdated', {
          detail: {
            timestamp: Date.now(),
            source: 'Home-UpdateStock',
            updateType: operation,
            itemId: itemId,
            itemType: itemType
          }
        });
        window.dispatchEvent(stockUpdateEvent);

      } catch (error) {
        console.error(`❌ [Home] Erro ao atualizar estoque via Supabase:`, error);
      }
    } else {
      console.warn(`⚠️ [Home] Item de estoque não encontrado:`, { itemId, itemType });
    }
  };
  return (
    <div className="h-screen bg-gradient-to-br from-factory-900 via-factory-800 to-tire-900 factory-grid overflow-hidden">
      <div className="flex h-screen">
        <Sidebar
          onItemClick={handleSidebarClick}
          activeItem={
            activeSection === "dashboard"
              ? "Dashboard"
              : activeSection === "financial"
                ? "Financeiro"
                : activeSection === "inventory"
                  ? "Estoque"
                  : activeSection === "production"
                    ? "Produção"
                    : activeSection === "sales"
                      ? "Vendas"
                      : activeSection === "settings"
                        ? "Configurações" // Adicionado caso para Configurações
                        : "Cadastros"
          }
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Header Section */}
          <div className="container mx-auto px-6 pt-6 pb-4">
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-2 flex flex-col items-center">
                <img 
                  src={potentCarLogo} 
                  alt="Potente Car" 
                  className="h-24 w-auto object-contain"
                />
                <p className="text-tire-300 text-lg text-center">
                  {t(
                    "dashboard.subtitle",
                    "Sistema de Gestão Financeira e Produção",
                  )}
                </p>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {t("dashboard.title", "Dashboard")}
                </h1>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "container mx-auto p-6 space-y-8",
              "transition-all duration-300 ease-in-out",
            )}
          >
            {activeSection === "dashboard" && (
              <MainDashboard isLoading={loading} />
            )}
            {activeSection === "financial" && (
              <FinancialDashboard
                isLoading={loading}
                onRefresh={handleRefresh}
              />
            )}
            {activeSection === "registrations" && (
              <RegistrationDashboard
                isLoading={loading}
                onRefresh={handleRefresh}
              />
            )}
            {activeSection === "inventory" && (
              <StockDashboard isLoading={loading} onRefresh={handleRefresh} />
            )}
            {activeSection === "production" && (
              <ProductionDashboard
                isLoading={loading}
                onRefresh={handleRefresh}
                onStockUpdate={updateStock}
              />
            )}
            {activeSection === "sales" && (
              <SalesDashboard isLoading={loading} onRefresh={handleRefresh} />
            )}
            {activeSection === "settings" && ( // Renderiza SettingsDashboard quando activeSection for "settings"
              <SettingsDashboard onRefresh={() => window.location.reload()} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;