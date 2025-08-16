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
} from "lucide-react";
import type {
  CashFlowEntry,
  RawMaterial,
  Employee,
  FixedCost,
  VariableCost,
  StockItem,
  ProductionEntry,
  Product,
  ProductionRecipe,
  DefectiveTireSale,
  WarrantyEntry,
} from "@/types/financial";
import { useCostCalculationOptions } from "@/hooks/useDataPersistence";

interface PresumedProfitChartProps {
  cashFlowEntries?: CashFlowEntry[];
  materials?: RawMaterial[];
  employees?: Employee[];
  fixedCosts?: FixedCost[];
  variableCosts?: VariableCost[];
  stockItems?: StockItem[];
  productionEntries?: ProductionEntry[];
  products?: Product[];
  recipes?: ProductionRecipe[];
  defectiveTireSales?: DefectiveTireSale[];
  warrantyEntries?: WarrantyEntry[];
  isLoading?: boolean;
}

interface ProfitData {
  productName: string;
  totalSales: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  averageProfitPerUnit: number;
  salesCount: number;
}

const PresumedProfitChart = ({
  cashFlowEntries = [],
  materials = [],
  employees = [],
  fixedCosts = [],
  variableCosts = [],
  stockItems = [],
  productionEntries = [],
  products = [],
  recipes = [],
  defectiveTireSales = [],
  warrantyEntries = [],
  isLoading = false,
}: PresumedProfitChartProps) => {
  // Estados para filtros
  const [dateFilter, setDateFilter] = useState("last30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [sortBy, setSortBy] = useState<"profit" | "revenue" | "margin">(
    "profit",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Estados para configuração de cores
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [colorSettings, setColorSettings] = useState({
    profitColor: "#10B981", // Verde para lucro
    revenueColor: "#3B82F6", // Azul para receita
    costColor: "#EF4444", // Vermelho para custo
    marginColor: "#F59E0B", // Laranja para margem
  });

  // Hook para sincronizar com as opções de custo do TireCostManager
  const {
    costOptions,
    isIncludingLaborCosts,
    isIncludingCashFlowExpenses,
    isIncludingProductionLosses,
    isIncludingDefectiveTireSales,
    isIncludingWarrantyValues,
    isDividingByProduction,
  } = useCostCalculationOptions();

  // Estado para forçar recálculo quando as opções de custo mudarem
  const [lastCostOptionsUpdate, setLastCostOptionsUpdate] = useState(
    Date.now(),
  );

  // Efeito para detectar mudanças nas opções de custo e forçar recálculo
  useEffect(() => {
    console.log(
      "🔄 [PresumedProfitChart] Opções de custo do TireCostManager alteradas:",
      {
        isIncludingLaborCosts,
        isIncludingCashFlowExpenses,
        isIncludingProductionLosses,
        isIncludingDefectiveTireSales,
        isIncludingWarrantyValues,
        isDividingByProduction,
        timestamp: new Date().toISOString(),
      },
    );
    setLastCostOptionsUpdate(Date.now());
  }, [
    isIncludingLaborCosts,
    isIncludingCashFlowExpenses,
    isIncludingProductionLosses,
    isIncludingDefectiveTireSales,
    isIncludingWarrantyValues,
    isDividingByProduction,
  ]);

  // Carregar configurações salvas do localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(
      "presumedProfitChartColorSettings",
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
      "presumedProfitChartColorSettings",
      JSON.stringify(colorSettings),
    );
  };

  // Resetar cores para o padrão
  const resetToDefaultColors = () => {
    const defaultSettings = {
      profitColor: "#10B981",
      revenueColor: "#3B82F6",
      costColor: "#EF4444",
      marginColor: "#F59E0B",
    };
    setColorSettings(defaultSettings);
    localStorage.setItem(
      "presumedProfitChartColorSettings",
      JSON.stringify(defaultSettings),
    );
  };

  // Atualizar cor específica
  const updateColor = (key: string, value: string) => {
    setColorSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Calculate recipe-based cost per tire (same logic as PresumedProfitManager)
  const calculateRecipeCost = (productName: string) => {
    const recipe = recipes.find((r) => {
      const nameMatch =
        r.product_name.toLowerCase().trim() ===
        productName.toLowerCase().trim();
      const notArchived = !r.archived;
      return nameMatch && notArchived;
    });

    if (!recipe) {
      return {
        recipeCost: 0,
        hasRecipe: false,
        recipeDetails: undefined,
      };
    }

    const materialCosts = recipe.materials.map((material) => {
      // Find the material in stock to get current price
      const stockMaterial = stockItems.find((item) => {
        const isTypeMaterial = item.item_type === "material";
        const idMatch = item.item_id === material.material_id;
        const nameMatch =
          item.item_name.toLowerCase().trim() ===
          material.material_name.toLowerCase().trim();

        // Try partial name matching as fallback
        const partialNameMatch =
          item.item_name
            .toLowerCase()
            .includes(material.material_name.toLowerCase()) ||
          material.material_name
            .toLowerCase()
            .includes(item.item_name.toLowerCase());

        return isTypeMaterial && (idMatch || nameMatch || partialNameMatch);
      });

      const unitCost = stockMaterial ? stockMaterial.unit_cost : 0;
      const totalCost = unitCost * material.quantity_needed;

      return {
        materialName: material.material_name,
        quantity: material.quantity_needed,
        unitCost: unitCost,
        totalCost: totalCost,
      };
    });

    const totalMaterialCost = materialCosts.reduce(
      (sum, mat) => sum + mat.totalCost,
      0,
    );

    return {
      recipeCost: totalMaterialCost,
      hasRecipe: true,
      recipeDetails: {
        materials: materialCosts,
        totalMaterialCost: totalMaterialCost,
      },
    };
  };

  // Calculate production and material losses for a specific product
  const calculateProductionLosses = (productName: string) => {
    const productEntries = productionEntries.filter(
      (entry) =>
        entry.product_name.toLowerCase().trim() ===
        productName.toLowerCase().trim(),
    );

    let totalLossQuantity = 0;
    let totalLossValue = 0;
    let totalMaterialLossValue = 0;

    productEntries.forEach((entry) => {
      const lossQuantity = entry.production_loss || 0;
      let entryMaterialLossValue = 0;

      // Calculate material losses for this entry
      if (entry.material_loss && Array.isArray(entry.material_loss)) {
        entryMaterialLossValue = entry.material_loss.reduce(
          (total: number, materialLoss: any) => {
            const stockItem = stockItems.find(
              (item) => item.item_id === materialLoss.material_id,
            );
            const lossValue = stockItem
              ? stockItem.unit_cost * materialLoss.quantity_lost
              : 0;
            return total + lossValue;
          },
          0,
        );
        totalMaterialLossValue += entryMaterialLossValue;
      }

      // Calculate production losses
      let entryProductionLossValue = 0;
      if (lossQuantity > 0) {
        // Calculate loss value based on material costs consumed
        const materialCostForEntry = entry.materials_consumed.reduce(
          (total, material) => {
            const stockItem = stockItems.find(
              (item) => item.item_id === material.material_id,
            );
            return (
              total +
              (stockItem ? stockItem.unit_cost * material.quantity_consumed : 0)
            );
          },
          0,
        );

        // Calculate cost per unit produced in this entry
        const costPerUnit =
          entry.quantity_produced > 0
            ? materialCostForEntry / entry.quantity_produced
            : 0;

        // Calculate production loss value
        entryProductionLossValue = costPerUnit * lossQuantity;
        totalLossQuantity += lossQuantity;
      }

      // Combine both types of losses for this entry
      const totalEntryLossValue =
        entryProductionLossValue + entryMaterialLossValue;
      totalLossValue += totalEntryLossValue;
    });

    const totalProduced = productEntries.reduce(
      (sum, entry) => sum + entry.quantity_produced,
      0,
    );

    const lossPercentage =
      totalProduced > 0
        ? (totalLossQuantity / (totalProduced + totalLossQuantity)) * 100
        : 0;

    return {
      totalLossQuantity,
      totalLossValue,
      totalMaterialLossValue,
      lossPercentage,
    };
  };

  // Calculate total defective tire sales
  const calculateDefectiveTireSalesTotal = () => {
    const totalValue = defectiveTireSales.reduce(
      (total, sale) => total + sale.sale_value,
      0,
    );
    return totalValue;
  };

  // Calculate warranty value for a specific product
  const calculateWarrantyValue = (productName: string) => {
    const productWarranties = warrantyEntries.filter(
      (warranty) =>
        warranty.product_name.toLowerCase().trim() ===
        productName.toLowerCase().trim(),
    );

    let totalWarrantyQuantity = 0;
    let totalWarrantyValue = 0;

    productWarranties.forEach((warranty) => {
      // Calculate individual warranty value based on raw material cost from recipes
      const recipe = recipes.find(
        (r) =>
          r.product_name.toLowerCase().trim() ===
            warranty.product_name.toLowerCase().trim() && !r.archived,
      );

      let warrantyValue = 0;
      if (recipe) {
        const recipeData = calculateRecipeCost(warranty.product_name);
        warrantyValue = recipeData.recipeCost * warranty.quantity;
      }

      totalWarrantyQuantity += warranty.quantity;
      totalWarrantyValue += warrantyValue;
    });

    return {
      totalWarrantyQuantity,
      totalWarrantyValue,
      warrantyCount: productWarranties.length,
    };
  };

  // Calculate complete tire cost using the same logic as TireCostManager
  // SINCRONIZADO com as opções do TireCostManager
  const calculateTireCost = (productName: string): number => {
    // Get recipe cost (base material cost)
    const recipeData = calculateRecipeCost(productName);
    if (!recipeData.hasRecipe) {
      return 0;
    }

    // Base cost: material cost from recipe
    let totalCost = recipeData.recipeCost;
    let laborCostComponent = 0;
    let cashFlowCostComponent = 0;
    let productionLossCostComponent = 0;
    let defectiveTireSalesCostComponent = 0;
    let warrantyCostComponent = 0;

    // Get production data for this product
    const productEntries = productionEntries.filter(
      (entry) =>
        entry.product_name.toLowerCase().trim() ===
        productName.toLowerCase().trim(),
    );

    const totalProduced = productEntries.reduce(
      (sum, entry) => sum + entry.quantity_produced,
      0,
    );

    // Get sales data for this product
    const salesEntries = cashFlowEntries.filter(
      (entry) => entry.type === "income" && entry.category === "venda",
    );

    let totalSold = 0;
    salesEntries.forEach((sale) => {
      // Try to extract product info from sale description
      const productIdMatch = sale.description?.match(/ID_Produto: ([^\s|]+)/);
      const quantityMatch = sale.description?.match(/Qtd: ([0-9.,]+)/);
      const productNameMatch = sale.description?.match(/Produto: ([^|]+)/);

      if (productNameMatch && quantityMatch) {
        const saleProductName = productNameMatch[1].trim();
        if (saleProductName.toLowerCase() === productName.toLowerCase()) {
          totalSold += parseFloat(quantityMatch[1].replace(",", "."));
        }
      }
    });

    // Production quantity for division (use the higher of produced or sold)
    const productionQuantity = Math.max(totalProduced, totalSold, 1);

    // Calculate total costs for optional components
    const totalLaborCosts = employees
      .filter((emp) => !emp.archived)
      .reduce((total, emp) => total + (emp.salary || 0), 0);

    const totalCashFlowExpenses = cashFlowEntries
      .filter((entry) => entry.type === "expense")
      .reduce((total, entry) => total + entry.amount, 0);

    const productionLossData = calculateProductionLosses(productName);
    const totalDefectiveTireSales = calculateDefectiveTireSalesTotal();
    const warrantyData = calculateWarrantyValue(productName);

    // SINCRONIZAÇÃO: Usar as mesmas opções do TireCostManager
    // Add labor costs (SOMENTE se habilitado no TireCostManager)
    if (isIncludingLaborCosts && totalLaborCosts > 0) {
      laborCostComponent = totalLaborCosts / productionQuantity;
      totalCost += laborCostComponent;
    }

    // Add cash flow expenses (SOMENTE se habilitado no TireCostManager)
    if (isIncludingCashFlowExpenses && totalCashFlowExpenses > 0) {
      cashFlowCostComponent = totalCashFlowExpenses / productionQuantity;
      totalCost += cashFlowCostComponent;
    }

    // Add production losses (SOMENTE se habilitado no TireCostManager)
    if (isIncludingProductionLosses && productionLossData?.totalLossValue > 0) {
      productionLossCostComponent =
        productionLossData.totalLossValue / productionQuantity;
      totalCost += productionLossCostComponent;
    }

    // Subtract defective tire sales (SOMENTE se habilitado no TireCostManager)
    if (isIncludingDefectiveTireSales && totalDefectiveTireSales > 0) {
      defectiveTireSalesCostComponent = -(
        totalDefectiveTireSales / productionQuantity
      );
      totalCost += defectiveTireSalesCostComponent;
    }

    // Add warranty costs (SOMENTE se habilitado no TireCostManager)
    if (isIncludingWarrantyValues && warrantyData?.totalWarrantyValue > 0) {
      warrantyCostComponent =
        warrantyData.totalWarrantyValue / productionQuantity;
      totalCost += warrantyCostComponent;
    }

    return totalCost;
  };

  // Filter cash flow entries by date
  const getFilteredSales = () => {
    const today = new Date();
    let filteredEntries = cashFlowEntries.filter(
      (entry) => entry.type === "income" && entry.category === "venda",
    );

    switch (dateFilter) {
      case "today":
        const todayStr = today.toISOString().split("T")[0];
        filteredEntries = filteredEntries.filter(
          (entry) => entry.transaction_date === todayStr,
        );
        break;
      case "last7days":
        const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredEntries = filteredEntries.filter((entry) => {
          const entryDate = new Date(entry.transaction_date);
          return entryDate >= last7Days && entryDate <= today;
        });
        break;
      case "last30days":
        const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredEntries = filteredEntries.filter((entry) => {
          const entryDate = new Date(entry.transaction_date);
          return entryDate >= last30Days && entryDate <= today;
        });
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
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

  // Calculate profit data for each product
  const profitData = useMemo(() => {
    const salesEntries = getFilteredSales();
    const productMap = new Map<string, ProfitData>();

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

      const existing = productMap.get(productName) || {
        productName,
        totalSales: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        profitMargin: 0,
        averageProfitPerUnit: 0,
        salesCount: 0,
      };

      // Calculate cost using the same logic as TireCostManager
      const unitCost = calculateTireCost(productName);
      const revenue = entry.amount;
      const totalCostForSale = unitCost * quantity;
      const profit = revenue - totalCostForSale;

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

    return result;
  }, [
    cashFlowEntries,
    dateFilter,
    customStartDate,
    customEndDate,
    sortBy,
    sortOrder,
    materials,
    employees,
    fixedCosts,
    variableCosts,
    recipes,
    stockItems,
    productionEntries,
    defectiveTireSales,
    warrantyEntries,
    lastCostOptionsUpdate, // Add cost options update trigger as dependency
  ]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalRevenue = profitData.reduce(
      (sum, item) => sum + item.totalRevenue,
      0,
    );
    const totalCost = profitData.reduce((sum, item) => sum + item.totalCost, 0);
    const totalProfit = profitData.reduce(
      (sum, item) => sum + item.totalProfit,
      0,
    );
    const totalSales = profitData.reduce(
      (sum, item) => sum + item.totalSales,
      0,
    );
    const averageProfitPerTire = totalSales > 0 ? totalProfit / totalSales : 0;
    const overallProfitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalSales,
      averageProfitPerTire,
      overallProfitMargin,
    };
  }, [profitData]);

  // Limpar filtros
  const handleClearFilters = () => {
    setDateFilter("last30days");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  // Verificar se há filtros ativos
  const hasActiveFilters =
    dateFilter !== "last30days" || customStartDate || customEndDate;

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
        data?.averageProfitPerUnit || data?.lucroPorUnidade || 0,
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
          <p className="text-neon-blue">
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

  if (isLoading) {
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
                <TrendingUp className="h-5 w-5 text-neon-green" />
                <DollarSign className="h-5 w-5 text-neon-blue" />
                <Target className="h-5 w-5 text-neon-purple" />
              </div>
              Gráfico de Lucro Presumido
              <div className="flex items-center gap-2 ml-4">
                <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
                <span className="text-xs text-neon-green font-medium">
                  SINCRONIZADO com Custo por Pneu
                </span>
              </div>
            </h3>
            <p className="text-tire-300 mt-2">
              Visualização do lucro por produto baseado nas vendas e custos
              calculados automaticamente
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
                    <Palette className="h-5 w-5 text-neon-green" />
                    Configurações de Cores do Gráfico de Lucro
                  </DialogTitle>
                  <DialogDescription className="text-tire-300">
                    Personalize as cores das colunas do gráfico de lucro
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
                            placeholder="#10B981"
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
                      className="bg-neon-green hover:bg-neon-green/80 text-white"
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
                <p className="text-2xl font-bold text-neon-blue">
                  {formatCurrency(summaryMetrics.totalProfit)}
                </p>
              </div>
              <div className="text-neon-blue">
                <TrendingUp className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Lucro Médio/Pneu</p>
                <p className="text-2xl font-bold text-neon-purple">
                  {formatCurrency(summaryMetrics.averageProfitPerTire)}
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
          <Filter className="h-4 w-4 text-neon-blue" />
          <Label className="text-tire-200 font-medium">
            Filtros de Período
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-2">
            <Label className="text-tire-300 text-sm">Período:</Label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-factory-800 border-tire-600/30">
                <SelectItem
                  value="today"
                  className="text-white hover:bg-tire-700/50"
                >
                  Hoje
                </SelectItem>
                <SelectItem
                  value="last7days"
                  className="text-white hover:bg-tire-700/50"
                >
                  Últimos 7 dias
                </SelectItem>
                <SelectItem
                  value="last30days"
                  className="text-white hover:bg-tire-700/50"
                >
                  Últimos 30 dias
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

          <div className="space-y-2">
            <Label className="text-tire-300 text-sm">Tipo de Gráfico:</Label>
            <Select
              value={chartType}
              onValueChange={(value: "bar" | "line") => setChartType(value)}
            >
              <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-factory-800 border-tire-600/30">
                <SelectItem
                  value="bar"
                  className="text-white hover:bg-tire-700/50"
                >
                  Barras
                </SelectItem>
                <SelectItem
                  value="line"
                  className="text-white hover:bg-tire-700/50"
                >
                  Linha
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
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="pl-9 bg-factory-700/50 border-tire-600/30 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-tire-300 text-sm">Data Final:</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="pl-9 bg-factory-700/50 border-tire-600/30 text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gráfico */}
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-neon-green" />
            Lucro por Produto
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
              <TrendingUp className="h-12 w-12 text-tire-500 mx-auto mb-3" />
              <p className="text-tire-400">
                Nenhuma venda encontrada no período selecionado
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
                      item.averageProfitPerUnit || 0,
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
                      item.averageProfitPerUnit || 0,
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
    </div>
  );
};

export default PresumedProfitChart;
