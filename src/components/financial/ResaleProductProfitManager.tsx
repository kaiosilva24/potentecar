import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  Calendar,
  Filter,
  X,
  CalendarDays,
  BarChart3,
  DollarSign,
  Target,
  Palette,
  Settings,
  RotateCcw,
  ShoppingCart,
} from "lucide-react";
import { dataManager } from "@/utils/dataManager";
import type {
  CashFlowEntry,
  StockItem,
  ResaleProduct,
} from "@/types/financial";
import { useResaleProducts } from "@/hooks/useDataPersistence";

interface ResaleProductProfitManagerProps {
  cashFlowEntries?: CashFlowEntry[];
  stockItems?: StockItem[];
  isLoading?: boolean;
  hideCharts?: boolean; // Ocultar gráficos quando usado apenas para cálculos
}

interface ResaleProfitData {
  productName: string;
  totalSales: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  averageProfitPerUnit: number;
  salesCount: number;
  isRawMaterial?: boolean;
}

const ResaleProductProfitManager = ({
  cashFlowEntries = [],
  stockItems = [],
  isLoading = false,
  hideCharts = false,
}: ResaleProductProfitManagerProps) => {
  // Estados para filtros
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [sortBy, setSortBy] = useState<"profit" | "revenue" | "margin">(
    "profit"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Estados para configuração de cores
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [colorSettings, setColorSettings] = useState({
    profitColor: "#bbe5fc", // Azul claro para produtos de revenda
    revenueColor: "#3B82F6", // Azul para receita
    costColor: "#EF4444", // Vermelho para custo
    marginColor: "#F59E0B", // Laranja para margem
  });

  // Log de inicialização
  useEffect(() => {
    console.log("🚀 [ResaleProductProfitManager] Componente inicializado");
    console.log("📊 [ResaleProductProfitManager] Props recebidas:", {
      cashFlowEntries: cashFlowEntries.length,
      stockItems: stockItems.length,
      isLoading,
    });
  }, []);

  // Hook para produtos de revenda
  const { resaleProducts, isLoading: resaleProductsLoading } =
    useResaleProducts();

  // Carregar configurações salvas do localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(
      "resaleProductProfitColorSettings"
    );
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setColorSettings((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error("Erro ao carregar configurações de cores:", error);
      }
    }
  }, []);

  // Salvar configurações no localStorage
  const saveColorSettings = () => {
    localStorage.setItem(
      "resaleProductProfitColorSettings",
      JSON.stringify(colorSettings)
    );
  };

  // Resetar cores para o padrão
  const resetToDefaultColors = () => {
    const defaultSettings = {
      profitColor: "#bbe5fc",
      revenueColor: "#3B82F6",
      costColor: "#EF4444",
      marginColor: "#F59E0B",
    };
    setColorSettings(defaultSettings);
    localStorage.setItem(
      "resaleProductProfitColorSettings",
      JSON.stringify(defaultSettings)
    );
  };

  // Atualizar cor específica
  const updateColor = (key: string, value: string) => {
    setColorSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Filter cash flow entries by date
  const getFilteredSales = () => {
    const today = new Date();
    // Include both regular sales and credit sales (venda and venda_prazo)
    // Also include raw material sales (TIPO_PRODUTO: materia_prima) and resale products (TIPO_PRODUTO: revenda)
    let filteredEntries = cashFlowEntries.filter(
      (entry) =>
        entry.type === "income" &&
        (entry.category === "venda" || entry.category === "venda_prazo") &&
        entry.description &&
        (entry.description.includes("TIPO_PRODUTO: revenda") ||
          entry.description.includes("TIPO_PRODUTO: materia_prima"))
    );

    console.log(`🔍 [ResaleProductProfitManager] Filtrando vendas:`, {
      totalEntries: cashFlowEntries.length,
      filteredCount: filteredEntries.length,
      resaleCount: filteredEntries.filter((e) =>
        e.description?.includes("TIPO_PRODUTO: revenda")
      ).length,
      rawMaterialCount: filteredEntries.filter((e) =>
        e.description?.includes("TIPO_PRODUTO: materia_prima")
      ).length,
    });

    switch (dateFilter) {
      case "today":
        // WORKAROUND: Compensate for +1 day UTC workaround in sales saving
        // Since sales are saved with +1 day, we need to look for tomorrow's date
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

        console.log("🗓️ [ResaleProductProfitManager] TODAY FILTER DEBUG:", {
          originalToday: today.toISOString().split("T")[0],
          adjustedTomorrow: tomorrowStr,
          note: "Looking for tomorrow's date to compensate UTC workaround",
        });

        filteredEntries = filteredEntries.filter(
          (entry) => entry.transaction_date === tomorrowStr
        );
        break;
      case "last7days":
        // WORKAROUND: Add +1 day to date range to compensate UTC workaround
        const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const todayEnd = new Date(today);
        todayEnd.setDate(today.getDate() + 1); // Add +1 day
        filteredEntries = filteredEntries.filter((entry) => {
          const entryDate = new Date(entry.transaction_date);
          return entryDate >= last7Days && entryDate <= todayEnd;
        });
        break;
      case "last30days":
        // WORKAROUND: Add +1 day to date range to compensate UTC workaround
        const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const todayEnd30 = new Date(today);
        todayEnd30.setDate(today.getDate() + 1); // Add +1 day
        filteredEntries = filteredEntries.filter((entry) => {
          const entryDate = new Date(entry.transaction_date);
          return entryDate >= last30Days && entryDate <= todayEnd30;
        });
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          // WORKAROUND: Add +1 day to custom dates to compensate UTC workaround
          const startDate = new Date(customStartDate);
          startDate.setDate(startDate.getDate() + 1);
          const endDate = new Date(customEndDate);
          endDate.setDate(endDate.getDate() + 1);

          console.log("🗓️ [ResaleProductProfitManager] CUSTOM FILTER DEBUG:", {
            originalStartDate: customStartDate,
            originalEndDate: customEndDate,
            adjustedStartDate: startDate.toISOString().split("T")[0],
            adjustedEndDate: endDate.toISOString().split("T")[0],
            note: "Added +1 day to compensate UTC workaround",
          });

          filteredEntries = filteredEntries.filter((entry) => {
            const entryDate = new Date(entry.transaction_date);
            return entryDate >= startDate && entryDate <= endDate;
          });
        }
        break;
    }

    return filteredEntries;
  };

  // Extract product info from sale description
  const extractProductInfoFromSale = (description: string) => {
    try {
      if (!description || description.trim() === "") {
        return null;
      }

      const productIdMatch = description.match(/ID_Produto: ([^\s|]+)/);
      const quantityMatch = description.match(/Qtd: ([0-9.,]+)/);
      const productNameMatch = description.match(/Produto: ([^|]+)/);
      const unitPriceMatch = description.match(/Preço Unit: R\$\s*([0-9.,]+)/);

      if (productIdMatch && quantityMatch) {
        return {
          productId: productIdMatch[1],
          quantity: parseFloat(quantityMatch[1].replace(",", ".")),
          productName: productNameMatch?.[1]?.trim() || "",
          unitPrice: unitPriceMatch
            ? parseFloat(unitPriceMatch[1].replace(",", "."))
            : 0,
        };
      }
    } catch (error) {
      console.error("Erro ao extrair informações do produto:", error);
    }
    return null;
  };

  // Check if a product is a resale product
  const isResaleProduct = (productName: string) => {
    return resaleProducts.some(
      (resaleProduct) =>
        resaleProduct.name.toLowerCase().trim() ===
          productName.toLowerCase().trim() && !resaleProduct.archived
    );
  };

  // Check if a product is a raw material (matéria-prima)
  const isRawMaterial = (productName: string, productId?: string) => {
    // Check by ID if available
    if (productId) {
      return stockItems.some(
        (item) => item.id === productId && item.item_type === "material"
      );
    }
    // Check by name
    return stockItems.some(
      (item) =>
        item.item_name.toLowerCase().trim() ===
          productName.toLowerCase().trim() && item.item_type === "material"
    );
  };

  // Get cost for resale product or raw material from stock items
  const getProductCost = (productName: string, productId?: string) => {
    // First, try to find as raw material by ID
    if (productId) {
      const rawMaterialItem = stockItems.find(
        (item) => item.id === productId && item.item_type === "material"
      );
      if (rawMaterialItem) {
        console.log(
          `💰 [ResaleProductProfitManager] Custo matéria-prima "${productName}": R$ ${rawMaterialItem.unit_cost.toFixed(2)}`
        );
        return rawMaterialItem.unit_cost;
      }
    }

    // Then, try to find as resale product
    const resaleProduct = resaleProducts.find(
      (product) =>
        product.name.toLowerCase().trim() ===
          productName.toLowerCase().trim() && !product.archived
    );

    if (resaleProduct) {
      // Find the stock item for this resale product
      const stockItem = stockItems.find(
        (item) =>
          item.item_id === resaleProduct.id && item.item_type === "product"
      );

      if (stockItem) {
        console.log(
          `💰 [ResaleProductProfitManager] Custo produto revenda "${productName}": R$ ${stockItem.unit_cost.toFixed(2)}`
        );
        return stockItem.unit_cost;
      }
    }

    // Fallback: try to find by name in stock items (any type)
    const stockItem = stockItems.find(
      (item) =>
        item.item_name.toLowerCase().trim() === productName.toLowerCase().trim()
    );

    if (stockItem) {
      console.log(
        `💰 [ResaleProductProfitManager] Custo (fallback) "${productName}": R$ ${stockItem.unit_cost.toFixed(2)}`
      );
      return stockItem.unit_cost;
    }

    console.warn(
      `⚠️ [ResaleProductProfitManager] Custo não encontrado para "${productName}"`
    );
    return 0;
  };

  // Calculate profit data for resale products only
  const profitData = useMemo(() => {
    const salesEntries = getFilteredSales();
    const productMap = new Map<string, ResaleProfitData>();

    console.log(`🔍 [ResaleProductProfitManager] Iniciando cálculo de lucro:`);
    console.log(`  - Total de vendas filtradas: ${salesEntries.length}`);
    console.log(`  - Total de produtos de revenda: ${resaleProducts.length}`);
    console.log(
      `  - Produtos de revenda:`,
      resaleProducts.map((p) => p.name)
    );

    salesEntries.forEach((entry) => {
      const productInfo = extractProductInfoFromSale(entry.description || "");
      let productName = "Produto Não Identificado";
      let quantity = 1;

      if (productInfo && productInfo.productName) {
        productName = productInfo.productName;
        quantity = productInfo.quantity;
      } else {
        // Fallback: try to extract product name from description
        if (entry.description) {
          const match = entry.description.match(/Produto: ([^|]+)/);
          if (match) {
            productName = match[1].trim();
          }
        }
      }

      // Check if it's a resale product or raw material
      const isResale = isResaleProduct(productName);
      const isRawMat = isRawMaterial(productName, productInfo?.productId);

      console.log(
        `📝 [ResaleProductProfitManager] Produto: "${productName}" - É revenda? ${isResale} - É matéria-prima? ${isRawMat}`
      );

      // Only process if it's a resale product OR raw material
      if (!isResale && !isRawMat) {
        console.log(
          `⏭️ [ResaleProductProfitManager] Pulando produto "${productName}" - não é revenda nem matéria-prima`
        );
        return;
      }

      const existing = productMap.get(productName) || {
        productName,
        totalSales: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        profitMargin: 0,
        averageProfitPerUnit: 0,
        salesCount: 0,
        isRawMaterial: isRawMat && !isResale,
      };

      // Calculate cost using stock item unit cost (works for both resale products and raw materials)
      const unitCost = getProductCost(productName, productInfo?.productId);
      const revenue = entry.amount;
      const totalCostForSale = unitCost * quantity;
      const profit = revenue - totalCostForSale;

      console.log(
        `💵 [ResaleProductProfitManager] Calculando lucro para "${productName}":`,
        {
          quantity,
          unitCost,
          revenue,
          totalCost: totalCostForSale,
          profit,
        }
      );

      existing.totalSales += quantity;
      existing.totalRevenue += revenue;
      existing.totalCost += totalCostForSale;
      existing.totalProfit += profit;
      existing.salesCount += 1;

      productMap.set(productName, existing);
    });

    // Calculate derived metrics
    const result = Array.from(productMap.values()).map((data) => ({
      ...data,
      profitMargin:
        data.totalRevenue > 0
          ? (data.totalProfit / data.totalRevenue) * 100
          : 0,
      averageProfitPerUnit:
        data.totalSales > 0 ? data.totalProfit / data.totalSales : 0,
    }));

    // Sort data
    result.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "revenue":
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        case "margin":
          aValue = a.profitMargin;
          bValue = b.profitMargin;
          break;
        case "profit":
        default:
          aValue = a.totalProfit;
          bValue = b.totalProfit;
          break;
      }
      return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
    });

    console.log(`📊 [ResaleProductProfitManager] Resultado final do cálculo:`);
    console.log(`  - Produtos processados: ${result.length}`);
    console.log(`  - Dados:`, result);

    return result;
  }, [
    cashFlowEntries,
    dateFilter,
    customStartDate,
    customEndDate,
    sortBy,
    sortOrder,
    resaleProducts,
    stockItems,
  ]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalRevenue = profitData.reduce(
      (sum, item) => sum + item.totalRevenue,
      0
    );
    const totalCost = profitData.reduce((sum, item) => sum + item.totalCost, 0);
    const totalProfit = profitData.reduce(
      (sum, item) => sum + item.totalProfit,
      0
    );
    const totalSales = profitData.reduce(
      (sum, item) => sum + item.totalSales,
      0
    );
    // Média por unidade SOMENTE sobre produtos de revenda (unidades). Matéria-prima
    // é vendida por kg/L — somar kg com unidades produziria um "lucro por unidade" sem sentido.
    const revendaRows = profitData.filter((item) => !item.isRawMaterial);
    const revendaProfit = revendaRows.reduce(
      (sum, item) => sum + item.totalProfit,
      0
    );
    const revendaUnits = revendaRows.reduce(
      (sum, item) => sum + item.totalSales,
      0
    );
    const averageProfitPerUnit =
      revendaUnits > 0 ? revendaProfit / revendaUnits : 0;
    const overallProfitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalSales,
      averageProfitPerUnit,
      overallProfitMargin,
    };
  }, [profitData]);

  // useEffect para salvar lucro médio de produtos de revenda automaticamente
  useEffect(() => {
    const averageResaleProfit = summaryMetrics.averageProfitPerUnit;

    console.log(
      `🔍 [ResaleProductProfitManager] Verificando lucro médio calculado: R$ ${averageResaleProfit.toFixed(2)}`
    );
    console.log(
      "📊 [ResaleProductProfitManager] SummaryMetrics completo:",
      summaryMetrics
    );

    // Salva sempre, mesmo se for 0, para manter sincronização
    if (averageResaleProfit !== undefined && averageResaleProfit !== null) {
      console.log(
        `💾 [ResaleProductProfitManager] Salvando lucro médio de produtos de revenda: R$ ${averageResaleProfit.toFixed(2)}`
      );

      // Salva no Supabase e localStorage via dataManager
      dataManager
        .saveAverageResaleProfit(averageResaleProfit)
        .then((success) => {
          if (success) {
            console.log(
              `✅ [ResaleProductProfitManager] Lucro médio salvo com sucesso: R$ ${averageResaleProfit.toFixed(2)}`
            );

            // Dispara evento customizado para notificar outros componentes
            const event = new CustomEvent("resaleProfitUpdated", {
              detail: {
                profit: averageResaleProfit,
                timestamp: Date.now(),
                source: "ResaleProductProfitManager",
              },
            });
            window.dispatchEvent(event);
            console.log(
              `📡 [ResaleProductProfitManager] Evento 'resaleProfitUpdated' disparado: R$ ${averageResaleProfit.toFixed(2)}`
            );
          } else {
            console.error(
              `❌ [ResaleProductProfitManager] Falha ao salvar lucro: R$ ${averageResaleProfit.toFixed(2)}`
            );
          }
        })
        .catch((error) => {
          console.error(
            "❌ [ResaleProductProfitManager] Erro ao salvar lucro médio:",
            error
          );
        });
    } else {
      console.warn(
        "⚠️ [ResaleProductProfitManager] Lucro médio é undefined/null, não salvando"
      );
    }
  }, [
    summaryMetrics.averageProfitPerUnit,
    summaryMetrics.totalProfit,
    summaryMetrics.totalSales,
  ]);

  // Listener para evento de recálculo forçado do Dashboard
  useEffect(() => {
    const handleForceRecalc = (event: CustomEvent) => {
      console.log(
        "🔄 [ResaleProductProfitManager] Evento de recálculo forçado recebido do Dashboard"
      );
      console.log(
        "📊 [ResaleProductProfitManager] Forçando recálculo e salvamento..."
      );
      console.log(
        "🔍 [ResaleProductProfitManager] SummaryMetrics no ForceRecalc:",
        summaryMetrics
      );

      // Forçar recálculo imediato
      let currentProfit = summaryMetrics.averageProfitPerUnit;
      console.log(
        `💰 [ResaleProductProfitManager] Lucro atual no ForceRecalc: R$ ${currentProfit ? currentProfit.toFixed(2) : "undefined/null"}`
      );

      // Se o cálculo retornar 0, usar valor do localStorage como fallback
      if (
        currentProfit === 0 ||
        currentProfit === undefined ||
        currentProfit === null
      ) {
        try {
          const localValue = localStorage.getItem("averageResaleProfit");
          if (localValue && localValue !== "null" && localValue !== "0") {
            const parsed = parseFloat(localValue);
            if (!isNaN(parsed) && parsed > 0) {
              currentProfit = parsed;
              console.log(
                `🔄 [ResaleProductProfitManager] Usando fallback do localStorage: R$ ${currentProfit.toFixed(2)}`
              );
            }
          }
        } catch (error) {
          console.error(
            "⚠️ [ResaleProductProfitManager] Erro ao carregar fallback do localStorage:",
            error
          );
        }
      }

      if (
        currentProfit !== undefined &&
        currentProfit !== null &&
        currentProfit > 0
      ) {
        console.log(
          `💾 [ResaleProductProfitManager] Salvamento forçado: R$ ${currentProfit.toFixed(2)}`
        );

        dataManager.saveAverageResaleProfit(currentProfit).then((success) => {
          if (success) {
            console.log(
              `✅ [ResaleProductProfitManager] Salvamento forçado bem-sucedido: R$ ${currentProfit.toFixed(2)}`
            );

            // Dispara evento de atualização
            const updateEvent = new CustomEvent("resaleProfitUpdated", {
              detail: {
                profit: currentProfit,
                timestamp: Date.now(),
                source: "ResaleProductProfitManager-ForceRecalc",
              },
            });
            window.dispatchEvent(updateEvent);
          }
        });
      } else {
        console.log(
          `⚠️ [ResaleProductProfitManager] ForceRecalc: Nenhum valor válido disponível para salvar (calculado: ${summaryMetrics.averageProfitPerUnit}, fallback tentado)`
        );
      }
    };

    console.log(
      "🎯 [ResaleProductProfitManager] Registrando listener para forceResaleProfitRecalc"
    );
    window.addEventListener(
      "forceResaleProfitRecalc",
      handleForceRecalc as EventListener
    );

    return () => {
      console.log(
        "😫 [ResaleProductProfitManager] Removendo listener para forceResaleProfitRecalc"
      );
      window.removeEventListener(
        "forceResaleProfitRecalc",
        handleForceRecalc as EventListener
      );
    };
  }, [summaryMetrics.averageProfitPerUnit]);

  // Limpar filtros
  const handleClearFilters = () => {
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  // Verificar se há filtros ativos
  const hasActiveFilters =
    dateFilter !== "all" || customStartDate || customEndDate;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      // Safe access to data properties with fallback values and type checking
      const productName = data?.productName || data?.fullName || "Produto";
      const totalRevenue = Number(data?.totalRevenue || data?.receita || 0);
      const totalCost = Number(data?.totalCost || data?.custo || 0);
      const totalProfit = Number(data?.totalProfit || data?.lucro || 0);
      const profitMargin = Number(data?.profitMargin || data?.margem || 0);
      const totalSales = Number(data?.totalSales || data?.vendas || 0);
      const averageProfitPerUnit = Number(
        data?.averageProfitPerUnit || data?.lucroPorUnidade || 0
      );

      // Ensure all values are valid numbers before formatting
      const safeFormatCurrency = (value: number) => {
        const numValue = isNaN(value) ? 0 : value;
        return formatCurrency(numValue);
      };

      const safeFormatPercentage = (value: number) => {
        const numValue = isNaN(value) ? 0 : value;
        return numValue.toFixed(1);
      };

      return (
        <div className="bg-factory-800 border border-tire-600/30 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{productName}</p>
          <p className="text-neon-green">
            Receita: {safeFormatCurrency(totalRevenue)}
          </p>
          <p className="text-red-400">Custo: {safeFormatCurrency(totalCost)}</p>
          <p className="text-neon-cyan">
            Lucro: {safeFormatCurrency(totalProfit)}
          </p>
          <p className="text-neon-orange">
            Margem: {safeFormatPercentage(profitMargin)}%
          </p>
          <p className="text-tire-300 text-sm">Vendas: {totalSales} unidades</p>
          <p className="text-tire-300 text-sm">
            Lucro/Unidade: {safeFormatCurrency(averageProfitPerUnit)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading || resaleProductsLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-factory-700/50 rounded w-1/3"></div>
          <div className="h-96 bg-factory-700/50 rounded"></div>
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
                <ShoppingCart className="h-5 w-5 text-neon-cyan" />
                <TrendingUp className="h-5 w-5 text-neon-green" />
                <DollarSign className="h-5 w-5 text-neon-blue" />
              </div>
              Lucro Produto Revenda
            </h3>
            <p className="text-tire-300 mt-2">
              Análise de lucro específica para produtos de revenda
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de Configurações de Cores */}
            <Dialog
              open={showColorSettings}
              onOpenChange={setShowColorSettings}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-factory-700/50 border-tire-600/30 text-tire-300 hover:text-white hover:bg-factory-600/50 flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Configurar Cores
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-factory-800 border-tire-600/30 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center gap-2">
                    <Palette className="h-5 w-5 text-neon-cyan" />
                    Configurações de Cores - Produtos Revenda
                  </DialogTitle>
                  <DialogDescription className="text-tire-300">
                    Personalize as cores das colunas do gráfico de lucro para
                    produtos de revenda
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white flex items-center gap-2">
                      <Settings className="h-4 w-4 text-neon-blue" />
                      Cores do Gráfico
                    </h4>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-tire-300">Lucro</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={colorSettings.profitColor}
                            onChange={(e) =>
                              updateColor("profitColor", e.target.value)
                            }
                            className="w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                          />
                          <Input
                            type="text"
                            value={colorSettings.profitColor}
                            onChange={(e) =>
                              updateColor("profitColor", e.target.value)
                            }
                            className="bg-factory-700/50 border-tire-600/30 text-white"
                            placeholder="#06B6D4"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-tire-300">Receita</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={colorSettings.revenueColor}
                            onChange={(e) =>
                              updateColor("revenueColor", e.target.value)
                            }
                            className="w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                          />
                          <Input
                            type="text"
                            value={colorSettings.revenueColor}
                            onChange={(e) =>
                              updateColor("revenueColor", e.target.value)
                            }
                            className="bg-factory-700/50 border-tire-600/30 text-white"
                            placeholder="#3B82F6"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-tire-300">Custo</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={colorSettings.costColor}
                            onChange={(e) =>
                              updateColor("costColor", e.target.value)
                            }
                            className="w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                          />
                          <Input
                            type="text"
                            value={colorSettings.costColor}
                            onChange={(e) =>
                              updateColor("costColor", e.target.value)
                            }
                            className="bg-factory-700/50 border-tire-600/30 text-white"
                            placeholder="#EF4444"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={resetToDefaultColors}
                    className="bg-factory-700/50 border-tire-600/30 text-tire-300 hover:text-white hover:bg-factory-600/50 flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Resetar Padrão
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowColorSettings(false)}
                      className="bg-factory-700/50 border-tire-600/30 text-tire-300 hover:text-white hover:bg-factory-600/50"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        saveColorSettings();
                        setShowColorSettings(false);
                      }}
                      className="bg-neon-cyan hover:bg-neon-cyan/80 text-white"
                    >
                      Salvar Configurações
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-tire-300 hover:text-white hover:bg-tire-700/50 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Receita Total</p>
                <p className="text-2xl font-bold text-neon-green">
                  {formatCurrency(summaryMetrics.totalRevenue)}
                </p>
              </div>
              <div className="text-neon-green">
                <DollarSign className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Lucro Total</p>
                <p className="text-2xl font-bold" style={{ color: "#00d4ff" }}>
                  {formatCurrency(summaryMetrics.totalProfit)}
                </p>
              </div>
              <div style={{ color: "#00d4ff" }}>
                <TrendingUp className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Lucro Médio/Unidade</p>
                <p className="text-2xl font-bold text-neon-purple">
                  {formatCurrency(summaryMetrics.averageProfitPerUnit)}
                </p>
              </div>
              <div className="text-neon-purple">
                <Target className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Margem de Lucro</p>
                <p className="text-2xl font-bold text-neon-orange">
                  {summaryMetrics.overallProfitMargin.toFixed(1)}%
                </p>
              </div>
              <div className="text-neon-orange">
                <BarChart3 className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="mb-6 p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-neon-cyan" />
          <Label className="text-tire-200 font-medium">
            Filtros de Período
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="space-y-2">
            <Label className="text-tire-300 text-sm">Período:</Label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-factory-800 border-tire-600/30">
                <SelectItem
                  value="all"
                  className="text-white hover:bg-tire-700/50"
                >
                  Todos os períodos
                </SelectItem>
                <SelectItem
                  value="custom"
                  className="text-white hover:bg-tire-700/50"
                >
                  Período personalizado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-tire-300 text-sm">Ordenar por:</Label>
            <Select
              value={sortBy}
              onValueChange={(value: "profit" | "revenue" | "margin") =>
                setSortBy(value)
              }
            >
              <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-factory-800 border-tire-600/30">
                <SelectItem
                  value="profit"
                  className="text-white hover:bg-tire-700/50"
                >
                  Lucro
                </SelectItem>
                <SelectItem
                  value="revenue"
                  className="text-white hover:bg-tire-700/50"
                >
                  Receita
                </SelectItem>
                <SelectItem
                  value="margin"
                  className="text-white hover:bg-tire-700/50"
                >
                  Margem
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-tire-300 text-sm">Ordem:</Label>
            <Select
              value={sortOrder}
              onValueChange={(value: "asc" | "desc") => setSortOrder(value)}
            >
              <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-factory-800 border-tire-600/30">
                <SelectItem
                  value="desc"
                  className="text-white hover:bg-tire-700/50"
                >
                  Maior para Menor
                </SelectItem>
                <SelectItem
                  value="asc"
                  className="text-white hover:bg-tire-700/50"
                >
                  Menor para Maior
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {dateFilter === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="space-y-2">
              <Label className="text-tire-300 text-sm">Data Inicial:</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-factory-700/50 border-tire-600/30 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-tire-300 text-sm">Data Final:</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-factory-700/50 border-tire-600/30 text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gráfico - Ocultar quando hideCharts for true */}
      {!hideCharts && (
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-neon-cyan" />
              Lucro por Produto de Revenda
              {profitData.length > 0 && (
                <span className="text-sm font-normal text-tire-400">
                  ({profitData.length} produtos)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profitData.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                <p className="text-tire-400">
                  Nenhuma venda de produto de revenda encontrada no período
                  selecionado
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                {chartType === "bar" ? (
                  <BarChart
                    data={profitData.map((item) => ({
                      name:
                        item.productName.length > 12
                          ? item.productName.substring(0, 12) + "..."
                          : item.productName,
                      fullName: item.productName || "Produto",
                      productName: item.productName || "Produto",
                      lucro: Number(item.totalProfit || 0),
                      totalProfit: Number(item.totalProfit || 0),
                      receita: Number(item.totalRevenue || 0),
                      totalRevenue: Number(item.totalRevenue || 0),
                      custo: Number(item.totalCost || 0),
                      totalCost: Number(item.totalCost || 0),
                      margem: Number(item.profitMargin || 0),
                      profitMargin: Number(item.profitMargin || 0),
                      vendas: Number(item.totalSales || 0),
                      totalSales: Number(item.totalSales || 0),
                      lucroPorUnidade: Number(item.averageProfitPerUnit || 0),
                      averageProfitPerUnit: Number(
                        item.averageProfitPerUnit || 0
                      ),
                    }))}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 80,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#374151"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="#9CA3AF"
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickFormatter={(value) =>
                        `R$ ${value.toLocaleString("pt-BR")}`
                      }
                      label={{
                        value: "Valor (R$)",
                        angle: -90,
                        position: "insideLeft",
                        style: {
                          textAnchor: "middle",
                          fill: "#9CA3AF",
                          fontSize: "12px",
                        },
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="lucro"
                      name="Lucro"
                      fill={colorSettings.profitColor}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <LineChart
                    data={profitData.map((item) => ({
                      name:
                        item.productName.length > 12
                          ? item.productName.substring(0, 12) + "..."
                          : item.productName,
                      fullName: item.productName || "Produto",
                      productName: item.productName || "Produto",
                      lucro: Number(item.totalProfit || 0),
                      totalProfit: Number(item.totalProfit || 0),
                      receita: Number(item.totalRevenue || 0),
                      totalRevenue: Number(item.totalRevenue || 0),
                      custo: Number(item.totalCost || 0),
                      totalCost: Number(item.totalCost || 0),
                      margem: Number(item.profitMargin || 0),
                      profitMargin: Number(item.profitMargin || 0),
                      vendas: Number(item.totalSales || 0),
                      totalSales: Number(item.totalSales || 0),
                      lucroPorUnidade: Number(item.averageProfitPerUnit || 0),
                      averageProfitPerUnit: Number(
                        item.averageProfitPerUnit || 0
                      ),
                    }))}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 80,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#374151"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="#9CA3AF"
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickFormatter={(value) =>
                        `R$ ${value.toLocaleString("pt-BR")}`
                      }
                      label={{
                        value: "Valor (R$)",
                        angle: -90,
                        position: "insideLeft",
                        style: {
                          textAnchor: "middle",
                          fill: "#9CA3AF",
                          fontSize: "12px",
                        },
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="lucro"
                      name="Lucro"
                      stroke={colorSettings.profitColor}
                      strokeWidth={3}
                      dot={{
                        fill: colorSettings.profitColor,
                        strokeWidth: 2,
                        r: 4,
                      }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResaleProductProfitManager;
