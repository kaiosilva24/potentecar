import React, { useState, useMemo, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Calculator,
  TrendingUp,
  DollarSign,
  Package,
  Save,
  Users,
  Settings,
  BarChart3,
  Target,
  PieChart,
  ArrowUpCircle,
  ArrowDownCircle,
  Percent,
  Filter,
  CheckCircle,
  Sliders,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  TrendingDown,
  Zap,
  Plus,
  X,
  Layers,
  FolderOpen,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  RawMaterial,
  Employee,
  FixedCost,
  VariableCost,
  StockItem,
  ProductionEntry,
  Product,
  CashFlowEntry,
  ProductionRecipe,
  DefectiveTireSale,
  CostSimulation,
  WarrantyEntry,
} from "@/types/financial";
import { useCostSimulations } from "@/hooks/useDataPersistence";
import { dataManager } from "@/utils/dataManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface TireCostManagerProps {
  materials?: RawMaterial[];
  employees?: Employee[];
  fixedCosts?: FixedCost[];
  variableCosts?: VariableCost[];
  stockItems?: StockItem[];
  productionEntries?: ProductionEntry[];
  products?: Product[];
  cashFlowEntries?: CashFlowEntry[];
  recipes?: ProductionRecipe[];
  defectiveTireSales?: DefectiveTireSale[];
  warrantyEntries?: WarrantyEntry[];
  isLoading?: boolean;
}

interface CostCalculationOptions {
  includeLaborCosts: boolean;
  includeCashFlowExpenses: boolean;
  includeProductionLosses: boolean;
  includeDefectiveTireSales: boolean;
  includeWarrantyValues: boolean;
  divideByProduction: boolean;
}

interface SelectedRecipe {
  id: string;
  name: string;
  quantity: number;
}

interface TireAnalysis {
  productId: string;
  productName: string;
  totalRevenue: number;
  totalSold: number;
  averagePrice: number;
  totalProduced: number;
  totalLosses: number;
  productionCost: number;
  costPerTire: number;
  recipeCostPerTire: number;
  laborCostPerTire: number;
  cashFlowCostPerTire: number;
  productionLossCostPerTire: number;
  defectiveTireSalesCostPerTire: number;
  warrantyCostPerTire: number;
  profit: number;
  profitMargin: number;
  salesCount: number;
  hasRecipe: boolean;
  recipeDetails?: {
    materials: Array<{
      materialName: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>;
    totalMaterialCost: number;
  };
  lossDetails?: {
    totalLossQuantity: number;
    totalLossValue: number;
    totalMaterialLossValue: number;
    lossPercentage: number;
    productionEntries: Array<{
      date: string;
      lossQuantity: number;
      lossValue: number;
      materialLossValue: number;
      totalEntryLossValue: number;
    }>;
  };
  warrantyDetails?: {
    totalWarrantyQuantity: number;
    totalWarrantyValue: number;
    warrantyCount: number;
    warrantyEntries: Array<{
      date: string;
      quantity: number;
      value: number;
      customerName: string;
      salespersonName: string;
    }>;
  };
  costBreakdown: {
    materialCost: number;
    laborCost: number;
    cashFlowCost: number;
    productionLossCost: number;
    defectiveTireSalesCost: number;
    warrantyCost: number;
    total: number;
  };
}

const TireCostManager = ({
  materials = [],
  employees = [],
  fixedCosts = [],
  variableCosts = [],
  stockItems = [],
  productionEntries = [],
  products = [],
  cashFlowEntries = [],
  recipes = [],
  defectiveTireSales = [],
  warrantyEntries = [],
  isLoading = false,
}: TireCostManagerProps) => {
  // Cost simulations hook
  const {
    costSimulations,
    addCostSimulation,
    updateCostSimulation,
    deleteCostSimulation,
    refreshCostSimulations,
    isLoading: simulationsLoading,
    isSaving: simulationsSaving,
  } = useCostSimulations();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [monthlyProduction, setMonthlyProduction] = useState("1000");
  const [analysisMode, setAnalysisMode] = useState<"individual" | "average">(
    "individual"
  );
  const [activeTab, setActiveTab] = useState("cost-analysis");

  // Simulation states
  const [simulationRecipe, setSimulationRecipe] = useState("");
  const [simulationQuantity, setSimulationQuantity] = useState("");
  const [simulationCashFlowExpenses, setSimulationCashFlowExpenses] =
    useState("");
  const [simulationProductionLosses, setSimulationProductionLosses] =
    useState("");
  const [simulationFixedCosts, setSimulationFixedCosts] = useState("");
  const [simulationLaborCosts, setSimulationLaborCosts] = useState("");
  const [simulationAnalysisMode, setSimulationAnalysisMode] = useState<
    "individual" | "average"
  >("individual");

  // Multiple recipes simulation states
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipe[]>([]);
  const [simulationMode, setSimulationMode] = useState<"single" | "multiple">(
    "single"
  );

  // Save simulation states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [simulationName, setSimulationName] = useState("");
  const [simulationDescription, setSimulationDescription] = useState("");
  const [showLoadDialog, setShowLoadDialog] = useState(false);

  // Cost calculation options with persistence
  const [costOptions, setCostOptions] = useState<CostCalculationOptions>(() => {
    const saved = localStorage.getItem("tireCostManager_costOptions");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error("Error parsing saved cost options:", error);
      }
    }
    return {
      includeLaborCosts: true,
      includeCashFlowExpenses: true,
      includeProductionLosses: true,
      includeDefectiveTireSales: true,
      includeWarrantyValues: true,
      divideByProduction: true,
    };
  });

  // Simulation cost calculation options with persistence
  const [simulationCostOptions, setSimulationCostOptions] =
    useState<CostCalculationOptions>(() => {
      const saved = localStorage.getItem(
        "tireCostManager_simulationCostOptions"
      );
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error("Error parsing saved simulation cost options:", error);
        }
      }
      return {
        includeLaborCosts: true,
        includeCashFlowExpenses: true,
        includeProductionLosses: true,
        includeDefectiveTireSales: true,
        includeWarrantyValues: true,
        divideByProduction: true,
      };
    });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Effect to persist cost options only
  useEffect(() => {
    localStorage.setItem(
      "tireCostManager_costOptions",
      JSON.stringify(costOptions)
    );
  }, [costOptions]);

  // Effect to persist simulation cost options
  useEffect(() => {
    localStorage.setItem(
      "tireCostManager_simulationCostOptions",
      JSON.stringify(simulationCostOptions)
    );
  }, [simulationCostOptions]);

  // ===== SINCRONIZAÇÃO EM TEMPO REAL DAS RECEITAS =====
  // Estado para forçar re-renderização da simulação quando receitas mudam
  const [simulationUpdateTrigger, setSimulationUpdateTrigger] = useState(0);

  // Effect para sincronização em tempo real da leitura das receitas na simulação
  useEffect(() => {
    console.log(
      "🔄 [TireCostManager] Receitas atualizadas, sincronizando simulação em tempo real...",
      {
        recipesCount: recipes.length,
        materialsCount: materials.length,
        stockItemsCount: stockItems.length,
        currentSimulationRecipe: simulationRecipe,
        selectedRecipesCount: selectedRecipes.length,
        simulationMode,
      }
    );

    // Força atualização da simulação quando receitas, materiais ou estoque mudam
    setSimulationUpdateTrigger((prev) => prev + 1);

    // Log detalhado das receitas disponíveis
    if (recipes.length > 0) {
      console.log(
        "📋 [TireCostManager] Receitas disponíveis para simulação:",
        recipes.map((recipe) => ({
          id: recipe.id,
          product_name: recipe.product_name,
          materials_count: recipe.materials?.length || 0,
          archived: recipe.archived,
        }))
      );
    }

    // Validar se a receita selecionada ainda existe
    if (simulationRecipe && !recipes.find((r) => r.id === simulationRecipe)) {
      console.warn(
        "⚠️ [TireCostManager] Receita selecionada não encontrada, limpando seleção:",
        simulationRecipe
      );
      setSimulationRecipe("");
    }

    // Validar receitas múltiplas selecionadas
    if (selectedRecipes.length > 0) {
      const validRecipes = selectedRecipes.filter((selected) =>
        recipes.find((r) => r.id === selected.id)
      );

      if (validRecipes.length !== selectedRecipes.length) {
        console.warn(
          "⚠️ [TireCostManager] Algumas receitas múltiplas não foram encontradas, atualizando seleção"
        );
        setSelectedRecipes(validRecipes);
      }
    }
  }, [
    recipes,
    materials,
    stockItems,
    simulationRecipe,
    selectedRecipes,
    simulationMode,
  ]);

  // Effect para logs de sincronização quando simulação é atualizada
  useEffect(() => {
    if (simulationUpdateTrigger > 0) {
      console.log(
        "✅ [TireCostManager] Simulação sincronizada em tempo real - trigger:",
        simulationUpdateTrigger
      );
    }
  }, [simulationUpdateTrigger]);

  // Extract product info from sale description
  const extractProductInfoFromSale = (description: string) => {
    try {
      console.log(
        "🔍 [TireCostManager] Analisando descrição de venda:",
        description
      );

      const productIdMatch = description.match(/ID_Produto: ([^\s|]+)/);
      const quantityMatch = description.match(/Qtd: ([0-9.,]+)/);
      const productNameMatch = description.match(/Produto: ([^|]+)/);
      const unitPriceMatch = description.match(/Preço Unit: R\$\s*([0-9.,]+)/);

      console.log("🔍 [TireCostManager] Matches encontrados:", {
        productIdMatch: productIdMatch?.[1],
        quantityMatch: quantityMatch?.[1],
        productNameMatch: productNameMatch?.[1]?.trim(),
        unitPriceMatch: unitPriceMatch?.[1],
      });

      if (productIdMatch && quantityMatch) {
        const result = {
          productId: productIdMatch[1],
          quantity: parseFloat(quantityMatch[1].replace(",", ".")),
          productName: productNameMatch ? productNameMatch[1].trim() : "",
          unitPrice: unitPriceMatch
            ? parseFloat(unitPriceMatch[1].replace(",", "."))
            : 0,
        };
        console.log(
          "✅ [TireCostManager] Produto extraído com sucesso:",
          result
        );
        return result;
      } else {
        console.warn(
          "⚠️ [TireCostManager] Não foi possível extrair ID do produto ou quantidade da descrição"
        );
      }
    } catch (error) {
      console.error(
        "❌ [TireCostManager] Erro ao extrair informações do produto:",
        error
      );
    }
    return null;
  };

  // Calculate recipe-based cost per tire
  const calculateRecipeCost = (productName: string) => {
    console.log(
      `🔍 [TireCostManager] Buscando receita para produto: "${productName}"`
    );
    console.log(
      `🔍 [TireCostManager] Receitas disponíveis (${recipes.length}):`,
      recipes.map((r) => ({
        id: r.id,
        product_name: r.product_name,
        archived: r.archived,
        materials_count: r.materials?.length || 0,
      }))
    );
    console.log(
      `🔍 [TireCostManager] StockItems disponíveis (${stockItems.length}):`,
      stockItems
        .filter((item) => item.item_type === "material")
        .map((s) => ({
          id: s.item_id,
          name: s.item_name,
          type: s.item_type,
          unit_cost: s.unit_cost,
          quantity: s.quantity,
        }))
    );

    const recipe = recipes.find((r) => {
      const nameMatch =
        r.product_name.toLowerCase().trim() ===
        productName.toLowerCase().trim();
      const notArchived = !r.archived;
      console.log(
        `🔍 [TireCostManager] Comparando "${r.product_name}" com "${productName}": nameMatch=${nameMatch}, notArchived=${notArchived}`
      );
      return nameMatch && notArchived;
    });

    console.log(
      `🔍 [TireCostManager] Receita encontrada:`,
      recipe
        ? {
            id: recipe.id,
            product_name: recipe.product_name,
            materials_count: recipe.materials?.length || 0,
          }
        : "Nenhuma receita encontrada"
    );

    if (!recipe) {
      return {
        recipeCost: 0,
        hasRecipe: false,
        recipeDetails: undefined,
      };
    }

    const materialCosts = recipe.materials.map((material) => {
      console.log(`🔍 [TireCostManager] Processando material da receita:`, {
        material_id: material.material_id,
        material_name: material.material_name,
        quantity_needed: material.quantity_needed,
      });

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

        console.log(`🔍 [TireCostManager] Comparando com estoque:`, {
          stock_item_id: item.item_id,
          stock_item_name: item.item_name,
          stock_item_type: item.item_type,
          material_name: material.material_name,
          isTypeMaterial,
          idMatch,
          nameMatch,
          partialNameMatch,
          matches: isTypeMaterial && (idMatch || nameMatch || partialNameMatch),
        });

        return isTypeMaterial && (idMatch || nameMatch || partialNameMatch);
      });

      const unitCost = stockMaterial ? stockMaterial.unit_cost : 0;
      const totalCost = unitCost * material.quantity_needed;

      // Log warning if material not found
      if (!stockMaterial) {
        console.warn(
          `⚠️ [TireCostManager] Material "${material.material_name}" (ID: ${material.material_id}) não encontrado no estoque. Usando custo zero.`
        );
      }

      console.log(`🔍 [TireCostManager] Material processado:`, {
        materialName: material.material_name,
        materialId: material.material_id,
        stockFound: !!stockMaterial,
        stockItemId: stockMaterial?.item_id,
        stockItemName: stockMaterial?.item_name,
        unitCost,
        quantity: material.quantity_needed,
        totalCost,
      });

      return {
        materialName: material.material_name,
        quantity: material.quantity_needed,
        unitCost: unitCost,
        totalCost: totalCost,
      };
    });

    const totalMaterialCost = materialCosts.reduce(
      (sum, mat) => sum + mat.totalCost,
      0
    );

    // Check for missing materials
    const missingMaterials = materialCosts.filter((mat) => mat.totalCost === 0);
    if (missingMaterials.length > 0) {
      console.warn(
        `⚠️ [TireCostManager] Receita para "${productName}" tem ${missingMaterials.length} materiais com custo zero:`,
        missingMaterials.map((mat) => mat.materialName)
      );
    }

    console.log(`✅ [TireCostManager] Custo da receita calculado:`, {
      productName,
      totalMaterialCost,
      materialsCount: materialCosts.length,
      materialsWithCost: materialCosts.filter((mat) => mat.totalCost > 0)
        .length,
      materialsWithoutCost: missingMaterials.length,
      materials: materialCosts,
    });

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
    console.log(
      `🔍 [TireCostManager] Calculando perdas de produção e matéria-prima para: "${productName}"`
    );

    const productEntries = productionEntries.filter(
      (entry) =>
        entry.product_name.toLowerCase().trim() ===
        productName.toLowerCase().trim()
    );

    console.log(
      `📊 [TireCostManager] Entradas de produção encontradas para ${productName}:`,
      productEntries.length
    );

    let totalLossQuantity = 0;
    let totalLossValue = 0;
    let totalMaterialLossValue = 0;
    const lossEntries: Array<{
      date: string;
      lossQuantity: number;
      lossValue: number;
      materialLossValue: number;
      totalEntryLossValue: number;
    }> = [];

    productEntries.forEach((entry) => {
      const lossQuantity = entry.production_loss || 0;
      let entryMaterialLossValue = 0;

      // Calculate material losses for this entry
      if (entry.material_loss && Array.isArray(entry.material_loss)) {
        console.log(
          `🔍 [TireCostManager] Calculando perdas de matéria-prima para entrada ${entry.production_date}:`,
          entry.material_loss
        );

        entryMaterialLossValue = entry.material_loss.reduce(
          (total: number, materialLoss: any) => {
            const stockItem = stockItems.find(
              (item) => item.item_id === materialLoss.material_id
            );
            const lossValue = stockItem
              ? stockItem.unit_cost * materialLoss.quantity_lost
              : 0;

            console.log(
              `📉 [TireCostManager] Perda de material ${materialLoss.material_name}:`,
              {
                material_id: materialLoss.material_id,
                quantity_lost: materialLoss.quantity_lost,
                unit_cost: stockItem?.unit_cost || 0,
                loss_value: lossValue,
              }
            );

            return total + lossValue;
          },
          0
        );

        totalMaterialLossValue += entryMaterialLossValue;
        console.log(
          `💸 [TireCostManager] Total de perdas de matéria-prima na entrada ${entry.production_date}: ${entryMaterialLossValue}`
        );
      }

      // Calculate production losses (existing logic)
      let entryProductionLossValue = 0;
      if (lossQuantity > 0) {
        // Calculate loss value based on material costs consumed
        const materialCostForEntry = entry.materials_consumed.reduce(
          (total, material) => {
            const stockItem = stockItems.find(
              (item) => item.item_id === material.material_id
            );
            return (
              total +
              (stockItem ? stockItem.unit_cost * material.quantity_consumed : 0)
            );
          },
          0
        );

        // Calculate cost per unit produced in this entry
        const costPerUnit =
          entry.quantity_produced > 0
            ? materialCostForEntry / entry.quantity_produced
            : 0;

        // Calculate production loss value
        entryProductionLossValue = costPerUnit * lossQuantity;

        totalLossQuantity += lossQuantity;

        console.log(
          `📉 [TireCostManager] Perda de produção encontrada em ${entry.production_date}:`,
          {
            lossQuantity,
            materialCostForEntry,
            costPerUnit,
            productionLossValue: entryProductionLossValue,
          }
        );
      }

      // Combine both types of losses for this entry
      const totalEntryLossValue =
        entryProductionLossValue + entryMaterialLossValue;
      totalLossValue += totalEntryLossValue;

      if (lossQuantity > 0 || entryMaterialLossValue > 0) {
        lossEntries.push({
          date: entry.production_date,
          lossQuantity,
          lossValue: entryProductionLossValue,
          materialLossValue: entryMaterialLossValue,
          totalEntryLossValue,
        });

        console.log(
          `📊 [TireCostManager] Resumo de perdas em ${entry.production_date}:`,
          {
            productionLoss: entryProductionLossValue,
            materialLoss: entryMaterialLossValue,
            totalLoss: totalEntryLossValue,
          }
        );
      }
    });

    const totalProduced = productEntries.reduce(
      (sum, entry) => sum + entry.quantity_produced,
      0
    );

    const lossPercentage =
      totalProduced > 0
        ? (totalLossQuantity / (totalProduced + totalLossQuantity)) * 100
        : 0;

    const result = {
      totalLossQuantity,
      totalLossValue,
      totalMaterialLossValue,
      lossPercentage,
      productionEntries: lossEntries,
    };

    console.log(
      `✅ [TireCostManager] Perdas totais calculadas para ${productName}:`,
      {
        totalProductionLossValue: totalLossValue - totalMaterialLossValue,
        totalMaterialLossValue,
        totalCombinedLossValue: totalLossValue,
        lossPercentage,
        entriesWithLosses: lossEntries.length,
      }
    );

    return result;
  };

  // Calculate total defective tire sales
  const calculateDefectiveTireSalesTotal = () => {
    console.log(
      `🔍 [TireCostManager] Calculando total de vendas de pneus defeituosos:`,
      {
        totalSales: defectiveTireSales.length,
        sales: defectiveTireSales.map((sale) => ({
          id: sale.id,
          tire_name: sale.tire_name,
          quantity: sale.quantity,
          sale_value: sale.sale_value,
          sale_date: sale.sale_date,
        })),
      }
    );

    const totalValue = defectiveTireSales.reduce(
      (total, sale) => total + sale.sale_value,
      0
    );

    console.log(
      `✅ [TireCostManager] Total de vendas de pneus defeituosos calculado: ${totalValue}`
    );
    console.log(
      `🔧 [TireCostManager] DEBUG - Valor esperado: 1800, Valor calculado: ${totalValue}`
    );

    return totalValue;
  };

  // Calculate warranty value for a specific product
  const calculateWarrantyValue = (productName: string) => {
    console.log(
      `🔍 [TireCostManager] Calculando valor de garantia para produto: "${productName}"`
    );

    const productWarranties = warrantyEntries.filter(
      (warranty) =>
        warranty.product_name.toLowerCase().trim() ===
        productName.toLowerCase().trim()
    );

    console.log(
      `📊 [TireCostManager] Garantias encontradas para ${productName}:`,
      productWarranties.length
    );

    let totalWarrantyQuantity = 0;
    let totalWarrantyValue = 0;
    const warrantyDetails: Array<{
      date: string;
      quantity: number;
      value: number;
      customerName: string;
      salespersonName: string;
    }> = [];

    productWarranties.forEach((warranty) => {
      // Calculate individual warranty value based on raw material cost from recipes
      const recipe = recipes.find(
        (r) =>
          r.product_name.toLowerCase().trim() ===
            warranty.product_name.toLowerCase().trim() && !r.archived
      );

      let warrantyValue = 0;
      if (recipe) {
        const recipeData = calculateRecipeCost(warranty.product_name);
        warrantyValue = recipeData.recipeCost * warranty.quantity;
        console.log(`💰 [TireCostManager] Valor da garantia calculado:`, {
          product: warranty.product_name,
          quantity: warranty.quantity,
          recipeCost: recipeData.recipeCost,
          totalValue: warrantyValue,
        });
      } else {
        console.warn(
          `⚠️ [TireCostManager] Receita não encontrada para produto da garantia: ${warranty.product_name}`
        );
      }

      totalWarrantyQuantity += warranty.quantity;
      totalWarrantyValue += warrantyValue;

      warrantyDetails.push({
        date: warranty.warranty_date,
        quantity: warranty.quantity,
        value: warrantyValue,
        customerName: warranty.customer_name,
        salespersonName: warranty.salesperson_name,
      });
    });

    const result = {
      totalWarrantyQuantity,
      totalWarrantyValue,
      warrantyCount: productWarranties.length,
      warrantyEntries: warrantyDetails,
    };

    console.log(
      `✅ [TireCostManager] Valor total de garantia calculado para ${productName}:`,
      {
        totalQuantity: totalWarrantyQuantity,
        totalValue: totalWarrantyValue,
        warrantyCount: productWarranties.length,
      }
    );

    return result;
  };

  // Calculate simulation cost per tire with manual inputs
  const calculateSimulationCostPerTire = (
    productName: string,
    recipeCost: number,
    quantity: number,
    manualCashFlowExpenses: number,
    manualProductionLosses: number,
    manualFixedCosts: number,
    manualLaborCosts: number,
    options: CostCalculationOptions
  ) => {
    console.log(
      `🧮 [TireCostManager] Calculando custo de simulação para ${productName}:`,
      {
        recipeCost,
        quantity,
        manualCashFlowExpenses,
        manualProductionLosses,
        manualFixedCosts,
        manualLaborCosts,
        options,
      }
    );

    // Base cost: material cost from recipe
    let totalCost = recipeCost;
    const laborCostComponent = 0;
    let cashFlowCostComponent = 0;
    let productionLossCostComponent = 0;
    let fixedCostComponent = 0;

    // Production quantity for division
    const productionQuantity = Math.max(quantity, 1);

    console.log(
      `📊 [TireCostManager] Quantidade de produção para simulação: ${productionQuantity}`
    );

    // Calculate total costs for optional components
    const totalLaborCosts = employees
      .filter((emp) => !emp.archived)
      .reduce((total, emp) => total + (emp.salary || 0), 0);

    const totalFixedCosts = fixedCosts
      .filter((cost) => !cost.archived)
      .reduce((total, cost) => total + cost.amount, 0);

    console.log(
      `💰 [TireCostManager] Custos totais disponíveis para simulação:`,
      {
        totalLaborCosts,
        totalFixedCosts,
        manualCashFlowExpenses,
        manualProductionLosses,
        manualFixedCosts,
        manualLaborCosts,
      }
    );

    // Add fixed costs (only use manual input, don't auto-include system data)
    if (manualFixedCosts > 0) {
      // CORREÇÃO: Sempre dividir por quantidade para obter custo por pneu
      fixedCostComponent = manualFixedCosts / productionQuantity;
      totalCost += fixedCostComponent;
      console.log(
        `🏭 [TireCostManager] Custos fixos manuais adicionados: ${fixedCostComponent}`
      );
    }

    // Add optional components based on user selection
    // Labor costs removed from calculation as per user requirement

    if (options.includeCashFlowExpenses && manualCashFlowExpenses > 0) {
      // CORREÇÃO: Sempre dividir por quantidade para obter custo por pneu
      cashFlowCostComponent = manualCashFlowExpenses / productionQuantity;
      totalCost += cashFlowCostComponent;
      console.log(
        `💸 [TireCostManager] Saídas de caixa manuais adicionadas: ${cashFlowCostComponent}`
      );
    }

    if (options.includeProductionLosses && manualProductionLosses > 0) {
      // CORREÇÃO: Sempre dividir por quantidade para obter custo por pneu
      productionLossCostComponent = manualProductionLosses / productionQuantity;
      totalCost += productionLossCostComponent;
      console.log(
        `📉 [TireCostManager] Perdas de produção manuais adicionadas: ${productionLossCostComponent}`
      );
    }

    const result = {
      totalCost,
      fixedCostPerTire: fixedCostComponent,
      laborCostPerTire: laborCostComponent,
      cashFlowCostPerTire: cashFlowCostComponent,
      productionLossCostPerTire: productionLossCostComponent,
      costBreakdown: {
        materialCost: recipeCost,
        fixedCost: fixedCostComponent,
        laborCost: laborCostComponent,
        cashFlowCost: cashFlowCostComponent,
        productionLossCost: productionLossCostComponent,
        total: totalCost,
      },
    };

    console.log(
      `✅ [TireCostManager] Custo de simulação calculado para ${productName}:`,
      result
    );
    return result;
  };

  // Calculate customizable cost per tire
  const calculateCustomCostPerTire = (
    productName: string,
    productId: string,
    totalProduced: number,
    totalSold: number,
    recipeCost: number,
    productionLossData: any,
    warrantyData: any,
    options: CostCalculationOptions
  ) => {
    console.log(
      `🧮 [TireCostManager] Calculando custo customizado para ${productName}:`,
      {
        recipeCost,
        totalProduced,
        totalSold,
        options,
      }
    );

    // Base cost: material cost from recipe
    let totalCost = recipeCost;
    const laborCostComponent = 0;
    let cashFlowCostComponent = 0;
    let productionLossCostComponent = 0;
    let defectiveTireSalesCostComponent = 0;
    let warrantyCostComponent = 0;

    // Production quantity for division (use the higher of produced or sold)
    const productionQuantity = Math.max(totalProduced, totalSold, 1);

    console.log(
      `📊 [TireCostManager] Quantidade de produção para divisão: ${productionQuantity}`
    );

    // Calculate total costs for optional components
    const totalLaborCosts = employees
      .filter((emp) => !emp.archived)
      .reduce((total, emp) => total + (emp.salary || 0), 0);

    const totalCashFlowExpenses = cashFlowEntries
      .filter((entry) => entry.type === "expense")
      .reduce((total, entry) => total + entry.amount, 0);

    const totalDefectiveTireSales = calculateDefectiveTireSalesTotal();

    console.log(`💰 [TireCostManager] Custos totais disponíveis:`, {
      totalLaborCosts,
      totalCashFlowExpenses,
      productionLossValue: productionLossData?.totalLossValue || 0,
      totalDefectiveTireSales,
      warrantyValue: warrantyData?.totalWarrantyValue || 0,
    });

    console.log(
      `🔧 [TireCostManager] DEBUG - Switch includeDefectiveTireSales:`,
      options.includeDefectiveTireSales
    );
    console.log(
      `🔧 [TireCostManager] DEBUG - Total defective tire sales:`,
      totalDefectiveTireSales
    );
    console.log(`🔧 [TireCostManager] DEBUG - Condition check:`, {
      includeDefectiveTireSales: options.includeDefectiveTireSales,
      totalDefectiveTireSales: totalDefectiveTireSales,
      totalDefectiveTireSalesGreaterThanZero: totalDefectiveTireSales > 0,
      bothConditionsTrue:
        options.includeDefectiveTireSales && totalDefectiveTireSales > 0,
    });

    // Add optional components based on user selection
    // Labor costs removed from calculation as per user requirement

    if (options.includeCashFlowExpenses && totalCashFlowExpenses > 0) {
      if (options.divideByProduction) {
        cashFlowCostComponent = totalCashFlowExpenses / productionQuantity;
      } else {
        cashFlowCostComponent = totalCashFlowExpenses;
      }
      totalCost += cashFlowCostComponent;
      console.log(
        `💸 [TireCostManager] Saídas de caixa adicionadas: ${cashFlowCostComponent}`
      );
    }

    if (
      options.includeProductionLosses &&
      productionLossData?.totalLossValue > 0
    ) {
      if (options.divideByProduction) {
        productionLossCostComponent =
          productionLossData.totalLossValue / productionQuantity;
      } else {
        productionLossCostComponent = productionLossData.totalLossValue;
      }
      totalCost += productionLossCostComponent;
      console.log(
        `📉 [TireCostManager] Perdas de produção adicionadas: ${productionLossCostComponent}`
      );
    }

    if (options.includeDefectiveTireSales && totalDefectiveTireSales > 0) {
      if (options.divideByProduction) {
        defectiveTireSalesCostComponent = -(
          totalDefectiveTireSales / productionQuantity
        );
      } else {
        defectiveTireSalesCostComponent = -totalDefectiveTireSales;
      }
      totalCost += defectiveTireSalesCostComponent;
      console.log(
        `🔧 [TireCostManager] Vendas de pneus defeituosos SUBTRAÍDAS: ${defectiveTireSalesCostComponent}`
      );
      console.log(
        `🔧 [TireCostManager] DEBUG - Custo total ANTES: ${totalCost - defectiveTireSalesCostComponent}, DEPOIS: ${totalCost}`
      );
    } else {
      console.log(
        `⚠️ [TireCostManager] DEBUG - Vendas de pneus defeituosos NÃO subtraídas:`,
        {
          includeDefectiveTireSales: options.includeDefectiveTireSales,
          totalDefectiveTireSales: totalDefectiveTireSales,
          condition:
            options.includeDefectiveTireSales && totalDefectiveTireSales > 0,
        }
      );
    }

    if (options.includeWarrantyValues && warrantyData?.totalWarrantyValue > 0) {
      if (options.divideByProduction) {
        warrantyCostComponent =
          warrantyData.totalWarrantyValue / productionQuantity;
      } else {
        warrantyCostComponent = warrantyData.totalWarrantyValue;
      }
      totalCost += warrantyCostComponent;
      console.log(
        `🛡️ [TireCostManager] Valor de garantia adicionado: ${warrantyCostComponent}`
      );
    }

    const result = {
      totalCost,
      laborCostPerTire: laborCostComponent,
      cashFlowCostPerTire: cashFlowCostComponent,
      productionLossCostPerTire: productionLossCostComponent,
      defectiveTireSalesCostPerTire: defectiveTireSalesCostComponent,
      warrantyCostPerTire: warrantyCostComponent,
      costBreakdown: {
        materialCost: recipeCost,
        laborCost: laborCostComponent,
        cashFlowCost: cashFlowCostComponent,
        productionLossCost: productionLossCostComponent,
        defectiveTireSalesCost: defectiveTireSalesCostComponent,
        warrantyCost: warrantyCostComponent,
        total: totalCost,
      },
    };

    console.log(
      `✅ [TireCostManager] Custo customizado calculado para ${productName}:`,
      result
    );
    return result;
  };

  // Analyze individual tire performance
  const tireAnalysis = useMemo((): TireAnalysis[] => {
    const productAnalysis = new Map<string, TireAnalysis>();

    // Initialize analysis for all products
    const availableProducts = stockItems.filter(
      (item) => item.item_type === "product"
    );

    console.log(
      `📊 [TireCostManager] Inicializando análise para ${availableProducts.length} produtos:`,
      availableProducts.map((p) => ({ id: p.item_id, name: p.item_name }))
    );

    availableProducts.forEach((product) => {
      console.log(
        `🔄 [TireCostManager] Calculando receita para produto: ${product.item_name}`
      );
      const recipeData = calculateRecipeCost(product.item_name);
      const lossData = calculateProductionLosses(product.item_name);
      const warrantyData = calculateWarrantyValue(product.item_name);

      productAnalysis.set(product.item_id, {
        productId: product.item_id,
        productName: product.item_name,
        totalRevenue: 0,
        totalSold: 0,
        averagePrice: 0,
        totalProduced: 0,
        totalLosses: lossData.totalLossQuantity,
        productionCost: 0,
        costPerTire: 0,
        recipeCostPerTire: recipeData.recipeCost,
        laborCostPerTire: 0,
        cashFlowCostPerTire: 0,
        productionLossCostPerTire: 0,
        profit: 0,
        profitMargin: 0,
        salesCount: 0,
        hasRecipe: recipeData.hasRecipe,
        recipeDetails: recipeData.recipeDetails,
        lossDetails: lossData,
        warrantyDetails: warrantyData,
        warrantyCostPerTire: 0,
        defectiveTireSalesCostPerTire: 0,
        costBreakdown: {
          materialCost: recipeData.recipeCost,
          laborCost: 0,
          cashFlowCost: 0,
          productionLossCost: 0,
          defectiveTireSalesCost: 0,
          warrantyCost: 0,
          total: recipeData.recipeCost,
        },
      });

      console.log(
        `✅ [TireCostManager] Produto ${product.item_name} inicializado:`,
        {
          hasRecipe: recipeData.hasRecipe,
          recipeCost: recipeData.recipeCost,
        }
      );
    });

    // Analyze sales data - FILTRO RIGOROSO: APENAS PRODUTOS FINAIS COM RECEITAS
    const salesEntries = cashFlowEntries.filter((entry) => {
      const isIncomeVenda =
        entry.type === "income" && entry.category === "venda";

      if (!isIncomeVenda) return false;

      const description = entry.description || "";

      // EXCLUIR produtos de revenda explicitamente
      if (description.includes("TIPO_PRODUTO: revenda")) {
        console.log(`🚫 [TireCostManager] EXCLUINDO produto de revenda:`, {
          id: entry.id,
          description: description.substring(0, 100),
        });
        return false;
      }

      // INCLUIR apenas produtos finais ou sem tag (compatibilidade)
      const isFinalProduct =
        description.includes("TIPO_PRODUTO: final") ||
        !description.includes("TIPO_PRODUTO:");

      if (!isFinalProduct) {
        console.log(`🚫 [TireCostManager] EXCLUINDO - Não é produto final:`, {
          id: entry.id,
          description: description.substring(0, 100),
        });
        return false;
      }

      // VALIDAÇÃO ADICIONAL: Verificar se tem receita (se possível extrair nome)
      const productInfo = extractProductInfoFromSale(description);
      if (productInfo && productInfo.productName) {
        // Verificar se o produto tem receita cadastrada
        const hasRecipe = recipes.some(
          (r) =>
            r.product_name.toLowerCase().trim() ===
              productInfo.productName.toLowerCase().trim() &&
            !r.archived &&
            r.materials &&
            r.materials.length > 0
        );

        if (!hasRecipe) {
          console.log(
            `🚫 [TireCostManager] EXCLUINDO - Produto sem receita válida:`,
            {
              id: entry.id,
              productName: productInfo.productName,
              description: description.substring(0, 100),
            }
          );
          return false;
        }
      }

      return true;
    });

    console.log(
      "📊 [TireCostManager] Analisando vendas (APENAS PRODUTOS FINAIS COM RECEITAS):",
      {
        totalCashFlowEntries: cashFlowEntries.length,
        salesEntriesFiltered: salesEntries.length,
        availableProducts: availableProducts.length,
        recipesAvailable: recipes.filter(
          (r) => !r.archived && r.materials && r.materials.length > 0
        ).length,
      }
    );

    salesEntries.forEach((sale, index) => {
      console.log(`🔍 [TireCostManager] Processando venda ${index + 1}:`, {
        id: sale.id,
        amount: sale.amount,
        reference_name: sale.reference_name,
        description: sale.description,
        transaction_date: sale.transaction_date,
      });

      const productInfo = extractProductInfoFromSale(sale.description || "");
      if (productInfo && productInfo.productId) {
        console.log(`🎯 [TireCostManager] Produto identificado:`, productInfo);

        const analysis = productAnalysis.get(productInfo.productId);
        if (analysis) {
          console.log(
            `✅ [TireCostManager] Atualizando análise do produto ${analysis.productName}:`,
            {
              revenueAnterior: analysis.totalRevenue,
              novaReceita: sale.amount,
              quantidadeAnterior: analysis.totalSold,
              novaQuantidade: productInfo.quantity,
            }
          );

          analysis.totalRevenue += sale.amount;
          analysis.totalSold += productInfo.quantity;
          analysis.salesCount += 1;
          analysis.averagePrice = analysis.totalRevenue / analysis.totalSold;

          console.log(`📈 [TireCostManager] Análise atualizada:`, {
            productName: analysis.productName,
            totalRevenue: analysis.totalRevenue,
            totalSold: analysis.totalSold,
            salesCount: analysis.salesCount,
            averagePrice: analysis.averagePrice,
          });
        } else {
          console.warn(
            `⚠️ [TireCostManager] Produto não encontrado na análise:`,
            productInfo.productId
          );
          console.warn(
            `⚠️ [TireCostManager] Produtos disponíveis:`,
            Array.from(productAnalysis.keys())
          );
        }
      } else {
        console.warn(
          `⚠️ [TireCostManager] Não foi possível extrair informações da venda:`,
          {
            saleId: sale.id,
            description: sale.description,
          }
        );

        // Tentar correspondência alternativa por nome do produto no reference_name
        const referenceName = sale.reference_name.toLowerCase();
        const matchingProduct = availableProducts.find(
          (product) =>
            referenceName.includes(product.item_name.toLowerCase()) ||
            product.item_name
              .toLowerCase()
              .includes(referenceName.split(" - ")[1]?.toLowerCase() || "")
        );

        if (matchingProduct) {
          console.log(
            `🔄 [TireCostManager] Tentativa de correspondência alternativa encontrada:`,
            {
              productId: matchingProduct.item_id,
              productName: matchingProduct.item_name,
              saleReference: sale.reference_name,
            }
          );

          const analysis = productAnalysis.get(matchingProduct.item_id);
          if (analysis) {
            // Usar valor total da venda como receita e assumir quantidade 1 se não conseguir extrair
            analysis.totalRevenue += sale.amount;
            analysis.totalSold += 1; // Assumir 1 unidade se não conseguir extrair
            analysis.salesCount += 1;
            analysis.averagePrice = analysis.totalRevenue / analysis.totalSold;

            console.log(
              `🔄 [TireCostManager] Correspondência alternativa aplicada:`,
              {
                productName: analysis.productName,
                totalRevenue: analysis.totalRevenue,
                totalSold: analysis.totalSold,
              }
            );
          }
        }
      }
    });

    console.log("📊 [TireCostManager] Resumo final das vendas processadas:");
    productAnalysis.forEach((analysis, productId) => {
      if (analysis.totalRevenue > 0) {
        console.log(`💰 ${analysis.productName}:`, {
          totalRevenue: analysis.totalRevenue,
          totalSold: analysis.totalSold,
          salesCount: analysis.salesCount,
          averagePrice: analysis.averagePrice,
        });
      }
    });

    // Analyze production data
    productionEntries.forEach((entry) => {
      const analysis =
        productAnalysis.get(entry.product_name) ||
        Array.from(productAnalysis.values()).find(
          (a) => a.productName === entry.product_name
        );
      if (analysis) {
        analysis.totalProduced += entry.quantity_produced;

        // Calculate production costs for this entry
        const materialCost = entry.materials_consumed.reduce(
          (total, material) => {
            const stockItem = stockItems.find(
              (item) => item.item_id === material.material_id
            );
            return (
              total +
              (stockItem ? stockItem.unit_cost * material.quantity_consumed : 0)
            );
          },
          0
        );

        analysis.productionCost += materialCost;
      }
    });

    // Calculate customizable costs per tire using the new system
    productAnalysis.forEach((analysis) => {
      console.log(
        `🔄 [TireCostManager] Calculando custo customizado para ${analysis.productName}:`,
        {
          hasRecipe: analysis.hasRecipe,
          recipeCostPerTire: analysis.recipeCostPerTire,
          totalProduced: analysis.totalProduced,
          totalSold: analysis.totalSold,
          costOptions,
        }
      );

      if (analysis.hasRecipe && analysis.recipeCostPerTire > 0) {
        // Use the new customizable cost calculation
        const customCost = calculateCustomCostPerTire(
          analysis.productName,
          analysis.productId,
          analysis.totalProduced,
          analysis.totalSold,
          analysis.recipeCostPerTire,
          analysis.lossDetails,
          analysis.warrantyDetails,
          costOptions
        );

        analysis.costPerTire = customCost.totalCost;
        analysis.laborCostPerTire = customCost.laborCostPerTire;
        analysis.cashFlowCostPerTire = customCost.cashFlowCostPerTire;
        analysis.productionLossCostPerTire =
          customCost.productionLossCostPerTire;
        analysis.defectiveTireSalesCostPerTire =
          customCost.defectiveTireSalesCostPerTire;
        analysis.warrantyCostPerTire = customCost.warrantyCostPerTire;
        analysis.costBreakdown = customCost.costBreakdown;

        console.log(
          `📋 [TireCostManager] Custo customizado aplicado para ${analysis.productName}:`,
          {
            materialCost: analysis.recipeCostPerTire,
            laborCost: analysis.laborCostPerTire,
            cashFlowCost: analysis.cashFlowCostPerTire,
            productionLossCost: analysis.productionLossCostPerTire,
            defectiveTireSalesCost: analysis.defectiveTireSalesCostPerTire,
            totalCost: analysis.costPerTire,
            costOptions: costOptions,
          }
        );

        console.log(
          `🔧 [TireCostManager] DEBUG - Breakdown detalhado para ${analysis.productName}:`,
          {
            breakdown: analysis.costBreakdown,
            includeDefectiveTireSales: costOptions.includeDefectiveTireSales,
            defectiveTireSalesValue: analysis.defectiveTireSalesCostPerTire,
            totalDefectiveTireSalesInSystem: calculateDefectiveTireSalesTotal(),
            costOptionsState: costOptions,
          }
        );

        // CRITICAL DEBUG: Check if defective tire sales are being included
        if (costOptions.includeDefectiveTireSales) {
          console.log(
            `🚨 [TireCostManager] SWITCH ATIVADO - Verificando inclusão para ${analysis.productName}:`,
            {
              switchAtivado: true,
              valorTotalSistema: calculateDefectiveTireSalesTotal(),
              valorPorPneu: analysis.defectiveTireSalesCostPerTire,
              custoTotalPneu: analysis.costPerTire,
              breakdownCompleto: analysis.costBreakdown,
            }
          );
        } else {
          console.log(
            `❌ [TireCostManager] SWITCH DESATIVADO para ${analysis.productName}`
          );
        }
      } else {
        console.log(
          `⚠️ [TireCostManager] Produto ${analysis.productName} sem receita - usando custo zero`
        );
        analysis.costPerTire = 0;
        analysis.laborCostPerTire = 0;
        analysis.cashFlowCostPerTire = 0;
        analysis.productionLossCostPerTire = 0;
        analysis.defectiveTireSalesCostPerTire = 0;
        analysis.warrantyCostPerTire = 0;
        analysis.costBreakdown = {
          materialCost: 0,
          laborCost: 0,
          cashFlowCost: 0,
          productionLossCost: 0,
          defectiveTireSalesCost: 0,
          warrantyCost: 0,
          total: 0,
        };
      }

      // Calculate profit and margin
      analysis.profit =
        analysis.totalRevenue - analysis.costPerTire * analysis.totalSold;
      analysis.profitMargin =
        analysis.totalRevenue > 0
          ? (analysis.profit / analysis.totalRevenue) * 100
          : 0;

      console.log(
        `✅ [TireCostManager] Resultado final para ${analysis.productName}:`,
        {
          costPerTire: analysis.costPerTire,
          profit: analysis.profit,
          profitMargin: analysis.profitMargin,
          breakdown: analysis.costBreakdown,
        }
      );
    });

    return Array.from(productAnalysis.values())
      .filter(
        (analysis) => analysis.totalProduced > 0 || analysis.totalSold > 0
      )
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [
    cashFlowEntries,
    stockItems,
    productionEntries,
    fixedCosts,
    variableCosts,
    monthlyProduction,
    recipes,
    employees,
    costOptions,
    defectiveTireSales,
    warrantyEntries,
  ]);

  // Calculate average costs across all tires
  const averageAnalysis = useMemo(() => {
    if (tireAnalysis.length === 0) {
      return {
        totalRevenue: 0,
        totalSold: 0,
        totalProduced: 0,
        totalLosses: 0,
        totalLossValue: 0,
        averagePrice: 0,
        averageCostPerTire: 0,
        totalProfit: 0,
        averageProfitMargin: 0,
        productCount: 0,
      };
    }

    const totals = tireAnalysis.reduce(
      (acc, tire) => {
        acc.totalRevenue += tire.totalRevenue;
        acc.totalSold += tire.totalSold;
        acc.totalProduced += tire.totalProduced;
        acc.totalLosses += tire.totalLosses;
        acc.totalLossValue += tire.lossDetails?.totalLossValue || 0;
        acc.totalProfit += tire.profit;
        return acc;
      },
      {
        totalRevenue: 0,
        totalSold: 0,
        totalProduced: 0,
        totalLosses: 0,
        totalLossValue: 0,
        totalProfit: 0,
      }
    );

    return {
      totalRevenue: totals.totalRevenue,
      totalSold: totals.totalSold,
      totalProduced: totals.totalProduced,
      totalLosses: totals.totalLosses,
      totalLossValue: totals.totalLossValue,
      averagePrice:
        totals.totalSold > 0 ? totals.totalRevenue / totals.totalSold : 0,
      averageCostPerTire:
        Math.round(
          (tireAnalysis.reduce((sum, tire) => sum + tire.costPerTire, 0) /
            tireAnalysis.length) *
            100
        ) / 100,
      totalProfit: totals.totalProfit,
      averageProfitMargin:
        totals.totalRevenue > 0
          ? (totals.totalProfit / totals.totalRevenue) * 100
          : 0,
      productCount: tireAnalysis.length,
    };
  }, [tireAnalysis]);

  // Effect to save synchronized cost data with average cost per tire - SINCRONIZAÇÃO DIRETA
  useEffect(() => {
    // Salvar dados sincronizados com timestamp para sincronização em tempo real
    const synchronizedData = {
      averageCostPerTire: averageAnalysis.averageCostPerTire,
      lastUpdated: new Date().toISOString(),
      costOptions: costOptions,
      source: "TireCostManager",
      calculationMethod: "Real-time calculation from TireCostManager",
      timestamp: Date.now(),
      // Dados adicionais para debug
      productCount: tireAnalysis.length,
      totalSold: averageAnalysis.totalSold,
      totalProduced: averageAnalysis.totalProduced,
    };

    // Salvar no localStorage para sincronização com o dashboard
    localStorage.setItem(
      "tireCostManager_synchronizedCostData",
      JSON.stringify(synchronizedData)
    );

    // NOVA CHAVE ESPECÍFICA PARA SINCRONIZAÇÃO DIRETA COM O DASHBOARD
    localStorage.setItem(
      "dashboard_averageCostPerTire",
      JSON.stringify({
        value: averageAnalysis.averageCostPerTire,
        timestamp: Date.now(),
        source: "TireCostManager",
        lastUpdated: new Date().toISOString(),
      })
    );

    // SALVAR ANÁLISES ESPECÍFICAS POR PRODUTO PARA O PRODUCTSTOCK
    tireAnalysis.forEach((tire) => {
      const productKey = `tireAnalysis_${tire.productName.toLowerCase().replace(/\s+/g, "_")}`;
      const productSpecificData = {
        productId: tire.productId,
        productName: tire.productName,
        costPerTire: tire.costPerTire,
        recipeCostPerTire: tire.recipeCostPerTire,
        hasRecipe: tire.hasRecipe,
        totalRevenue: tire.totalRevenue,
        totalSold: tire.totalSold,
        totalProduced: tire.totalProduced,
        profit: tire.profit,
        profitMargin: tire.profitMargin,
        costBreakdown: tire.costBreakdown,
        timestamp: Date.now(),
        source: "TireCostManager",
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem(productKey, JSON.stringify(productSpecificData));

      console.log(
        `💾 [TireCostManager] Salvando análise específica para "${tire.productName}":`,
        {
          key: productKey,
          costPerTire: tire.costPerTire,
          hasRecipe: tire.hasRecipe,
        }
      );
    });

    // ===== SINCRONIZAÇÃO COM SUPABASE EM TEMPO REAL =====
    // Salvar custo médio por pneu no Supabase para sincronização em tempo real
    const saveToSupabase = async () => {
      try {
        const success = await dataManager.saveAverageTireCost(
          averageAnalysis.averageCostPerTire
        );
        if (success) {
          console.log(
            "✅ [TireCostManager] Custo médio por pneu salvo no Supabase com sucesso"
          );
        } else {
          console.warn(
            "⚠️ [TireCostManager] Falha ao salvar custo médio por pneu no Supabase"
          );
        }
      } catch (error) {
        console.error(
          "❌ [TireCostManager] Erro ao salvar no Supabase:",
          error
        );
      }
    };

    // Salvar no Supabase de forma assíncrona
    saveToSupabase();

    // Disparar evento customizado para notificar o dashboard sobre a mudança
    window.dispatchEvent(
      new CustomEvent("tireCostUpdated", {
        detail: {
          averageCostPerTire: averageAnalysis.averageCostPerTire,
          averageProfitPerTire:
            averageAnalysis.totalProduced > 0
              ? averageAnalysis.totalProfit / averageAnalysis.totalSold
              : 0,
          timestamp: Date.now(),
          source: "TireCostManager",
          specificAnalyses: tireAnalysis.map((tire) => ({
            productName: tire.productName,
            costPerTire: tire.costPerTire,
          })),
        },
      })
    );

    console.log(
      "🔄 [TireCostManager] SINCRONIZAÇÃO DIRETA - Dados salvos e evento disparado:",
      {
        averageCostPerTire: synchronizedData.averageCostPerTire,
        lastUpdated: synchronizedData.lastUpdated,
        costOptions: synchronizedData.costOptions,
        timestamp: synchronizedData.timestamp,
        specificAnalysesCount: tireAnalysis.length,
        eventDispatched: true,
      }
    );
  }, [
    averageAnalysis.averageCostPerTire,
    averageAnalysis.totalProfit,
    averageAnalysis.totalSold,
    averageAnalysis.totalProduced,
    costOptions,
    tireAnalysis,
  ]);

  // Get selected product analysis
  const selectedProductAnalysis = useMemo(() => {
    if (!selectedProduct) return null;
    return tireAnalysis.find(
      (analysis) =>
        analysis.productId === selectedProduct ||
        analysis.productName === selectedProduct
    );
  }, [selectedProduct, tireAnalysis]);

  // Get simulation recipe analysis
  const simulationRecipeAnalysis = useMemo(() => {
    if (!simulationRecipe || !simulationQuantity) return null;

    const recipe = recipes.find(
      (r) => r.id === simulationRecipe && !r.archived
    );

    if (!recipe) return null;

    const recipeData = calculateRecipeCost(recipe.product_name);
    const quantity = parseFloat(simulationQuantity) || 1;
    const manualCashFlow = parseFloat(simulationCashFlowExpenses) || 0;
    const manualLosses = parseFloat(simulationProductionLosses) || 0;
    const manualFixed = parseFloat(simulationFixedCosts) || 0;
    const manualLabor = parseFloat(simulationLaborCosts) || 0;

    if (!recipeData.hasRecipe) {
      return {
        recipeName: recipe.product_name,
        hasRecipe: false,
        costPerTire: 0,
        quantity: quantity,
        error: "Receita não possui dados de custo válidos",
      };
    }

    const simulationCost = calculateSimulationCostPerTire(
      recipe.product_name,
      recipeData.recipeCost,
      quantity,
      manualCashFlow,
      manualLosses,
      manualFixed,
      manualLabor,
      simulationCostOptions
    );

    return {
      recipeName: recipe.product_name,
      recipeId: recipe.id,
      hasRecipe: true,
      quantity: quantity,
      recipeCostPerTire: recipeData.recipeCost,
      costPerTire: simulationCost.totalCost,
      fixedCostPerTire: simulationCost.fixedCostPerTire,
      laborCostPerTire: simulationCost.laborCostPerTire,
      cashFlowCostPerTire: simulationCost.cashFlowCostPerTire,
      productionLossCostPerTire: simulationCost.productionLossCostPerTire,
      costBreakdown: simulationCost.costBreakdown,
      recipeDetails: recipeData.recipeDetails,
      // CORREÇÃO: Custo total = custo por pneu × quantidade
      totalCost: simulationCost.totalCost * quantity,
      manualInputs: {
        cashFlowExpenses: manualCashFlow,
        productionLosses: manualLosses,
        fixedCosts: manualFixed,
        laborCosts: manualLabor,
      },
    };
  }, [
    simulationRecipe,
    simulationQuantity,
    simulationCashFlowExpenses,
    simulationProductionLosses,
    simulationFixedCosts,
    simulationLaborCosts,
    simulationCostOptions,
    recipes,
    fixedCosts,
    employees,
  ]);

  // Get multiple recipes simulation analysis
  const multipleRecipesAnalysis = useMemo(() => {
    if (selectedRecipes.length === 0) return null;

    const manualCashFlow = parseFloat(simulationCashFlowExpenses) || 0;
    const manualLosses = parseFloat(simulationProductionLosses) || 0;
    const manualFixed = parseFloat(simulationFixedCosts) || 0;
    const manualLabor = parseFloat(simulationLaborCosts) || 0;

    // Calculate total quantity first for proper cost division
    const totalQuantityForCosts = selectedRecipes.reduce(
      (sum, recipe) => sum + recipe.quantity,
      0
    );

    const recipeAnalyses = selectedRecipes.map((selectedRecipe) => {
      const recipe = recipes.find(
        (r) => r.id === selectedRecipe.id && !r.archived
      );

      if (!recipe) {
        return {
          recipeId: selectedRecipe.id,
          recipeName: selectedRecipe.name,
          quantity: selectedRecipe.quantity,
          hasRecipe: false,
          costPerTire: 0,
          totalCost: 0,
          error: "Receita não encontrada",
        };
      }

      const recipeData = calculateRecipeCost(recipe.product_name);

      if (!recipeData.hasRecipe) {
        return {
          recipeId: selectedRecipe.id,
          recipeName: recipe.product_name,
          quantity: selectedRecipe.quantity,
          hasRecipe: false,
          costPerTire: 0,
          totalCost: 0,
          error: "Receita não possui dados de custo válidos",
        };
      }

      // CORREÇÃO: Usar quantidade total para divisão correta dos custos
      const simulationCost = calculateSimulationCostPerTire(
        recipe.product_name,
        recipeData.recipeCost,
        totalQuantityForCosts, // Usar quantidade total em vez de individual
        manualCashFlow,
        manualLosses,
        manualFixed,
        manualLabor,
        simulationCostOptions
      );

      return {
        recipeId: selectedRecipe.id,
        recipeName: recipe.product_name,
        quantity: selectedRecipe.quantity,
        hasRecipe: true,
        recipeCostPerTire: recipeData.recipeCost,
        costPerTire: simulationCost.totalCost,
        fixedCostPerTire: simulationCost.fixedCostPerTire,
        laborCostPerTire: simulationCost.laborCostPerTire,
        cashFlowCostPerTire: simulationCost.cashFlowCostPerTire,
        productionLossCostPerTire: simulationCost.productionLossCostPerTire,
        costBreakdown: simulationCost.costBreakdown,
        recipeDetails: recipeData.recipeDetails,
        totalCost: simulationCost.totalCost * selectedRecipe.quantity,
      };
    });

    // Calculate weighted average cost
    const totalQuantity = recipeAnalyses.reduce(
      (sum, analysis) => sum + analysis.quantity,
      0
    );
    const totalCost = recipeAnalyses.reduce(
      (sum, analysis) => sum + analysis.totalCost,
      0
    );
    const averageCostPerTire =
      totalQuantity > 0 ? totalCost / totalQuantity : 0;

    // Calculate average breakdown components (weighted by quantity)
    const averageBreakdown = {
      materialCost: 0,
      fixedCost: 0,
      laborCost: 0,
      cashFlowCost: 0,
      productionLossCost: 0,
      total: averageCostPerTire,
    };

    if (totalQuantity > 0) {
      recipeAnalyses.forEach((analysis) => {
        if (analysis.hasRecipe && analysis.costBreakdown) {
          const weight = analysis.quantity / totalQuantity;
          averageBreakdown.materialCost +=
            analysis.costBreakdown.materialCost * weight;
          averageBreakdown.fixedCost +=
            analysis.costBreakdown.fixedCost * weight;
          averageBreakdown.laborCost +=
            analysis.costBreakdown.laborCost * weight;
          averageBreakdown.cashFlowCost +=
            analysis.costBreakdown.cashFlowCost * weight;
          averageBreakdown.productionLossCost +=
            analysis.costBreakdown.productionLossCost * weight;
        }
      });
    }

    return {
      recipes: recipeAnalyses,
      totalQuantity,
      totalCost,
      averageCostPerTire,
      averageBreakdown,
      validRecipes: recipeAnalyses.filter((r) => r.hasRecipe).length,
      manualInputs: {
        cashFlowExpenses: manualCashFlow,
        productionLosses: manualLosses,
        fixedCosts: manualFixed,
        laborCosts: manualLabor,
      },
    };
  }, [
    selectedRecipes,
    simulationCashFlowExpenses,
    simulationProductionLosses,
    simulationFixedCosts,
    simulationLaborCosts,
    simulationCostOptions,
    recipes,
    fixedCosts,
    employees,
  ]);

  // Add recipe to multiple selection
  const addRecipeToSelection = () => {
    if (!simulationRecipe) return;

    const recipe = recipes.find((r) => r.id === simulationRecipe);
    if (!recipe) return;

    // Check if recipe is already selected
    if (selectedRecipes.some((r) => r.id === simulationRecipe)) return;

    const quantity = parseFloat(simulationQuantity) || 1;
    setSelectedRecipes((prev) => [
      ...prev,
      {
        id: simulationRecipe,
        name: recipe.product_name,
        quantity: quantity,
      },
    ]);

    // Reset single recipe selection
    setSimulationRecipe("");
    setSimulationQuantity("");
  };

  // Remove recipe from multiple selection
  const removeRecipeFromSelection = (recipeId: string) => {
    setSelectedRecipes((prev) => prev.filter((r) => r.id !== recipeId));
  };

  // Update recipe quantity in multiple selection
  const updateRecipeQuantity = (recipeId: string, quantity: number) => {
    setSelectedRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, quantity } : r))
    );
  };

  // Save current simulation
  const saveCurrentSimulation = async () => {
    if (!simulationName.trim()) {
      alert("Por favor, insira um nome para a simulação.");
      return;
    }

    try {
      const simulationData: Omit<
        CostSimulation,
        "id" | "created_at" | "updated_at"
      > = {
        name: simulationName.trim(),
        description: simulationDescription.trim() || undefined,
        simulation_type: simulationMode,
        cost_options: simulationCostOptions,
        simulation_data: {
          recipe_id: simulationMode === "single" ? simulationRecipe : undefined,
          quantity:
            simulationMode === "single"
              ? parseFloat(simulationQuantity) || undefined
              : undefined,
          selected_recipes:
            simulationMode === "multiple" ? selectedRecipes : undefined,
          manual_fixed_costs: parseFloat(simulationFixedCosts) || undefined,
          manual_labor_costs: parseFloat(simulationLaborCosts) || undefined,
          manual_cash_flow_expenses:
            parseFloat(simulationCashFlowExpenses) || undefined,
          manual_production_losses:
            parseFloat(simulationProductionLosses) || undefined,
        },
        results:
          simulationMode === "single" && simulationRecipeAnalysis
            ? {
                total_cost: simulationRecipeAnalysis.totalCost,
                cost_per_tire: simulationRecipeAnalysis.costPerTire,
                total_quantity: simulationRecipeAnalysis.quantity,
                cost_breakdown: simulationRecipeAnalysis.costBreakdown,
              }
            : simulationMode === "multiple" && multipleRecipesAnalysis
              ? {
                  total_cost: multipleRecipesAnalysis.totalCost,
                  cost_per_tire: multipleRecipesAnalysis.averageCostPerTire,
                  total_quantity: multipleRecipesAnalysis.totalQuantity,
                  cost_breakdown: multipleRecipesAnalysis.averageBreakdown,
                }
              : undefined,
      };

      console.log("💾 [TireCostManager] Salvando simulação:", simulationData);

      await addCostSimulation(simulationData);

      // Reset form and close dialog
      setSimulationName("");
      setSimulationDescription("");
      setShowSaveDialog(false);

      alert("Simulação salva com sucesso!");
    } catch (error) {
      console.error("❌ [TireCostManager] Erro ao salvar simulação:", error);
      alert("Erro ao salvar simulação. Tente novamente.");
    }
  };

  // Load a saved simulation
  const loadSimulation = (simulation: CostSimulation) => {
    console.log("📂 [TireCostManager] Carregando simulação:", simulation);

    // Set simulation mode
    setSimulationMode(simulation.simulation_type);

    // Set cost options
    setSimulationCostOptions({
      ...simulation.cost_options,
      includeWarrantyValues: false, // Add missing property with default value
    });

    // Set simulation data
    const data = simulation.simulation_data;

    if (simulation.simulation_type === "single") {
      setSimulationRecipe(data.recipe_id || "");
      setSimulationQuantity(data.quantity?.toString() || "");
    } else {
      setSelectedRecipes(data.selected_recipes || []);
    }

    // Set manual inputs
    setSimulationFixedCosts(data.manual_fixed_costs?.toString() || "");
    setSimulationLaborCosts(data.manual_labor_costs?.toString() || "");
    setSimulationCashFlowExpenses(
      data.manual_cash_flow_expenses?.toString() || ""
    );
    setSimulationProductionLosses(
      data.manual_production_losses?.toString() || ""
    );

    setShowLoadDialog(false);
    alert(`Simulação "${simulation.name}" carregada com sucesso!`);
  };

  // Delete a saved simulation
  const deleteSimulation = async (
    simulationId: string,
    simulationName: string
  ) => {
    if (
      confirm(`Tem certeza que deseja excluir a simulação "${simulationName}"?`)
    ) {
      try {
        await deleteCostSimulation(simulationId);
        alert("Simulação excluída com sucesso!");
      } catch (error) {
        console.error("❌ [TireCostManager] Erro ao excluir simulação:", error);
        alert("Erro ao excluir simulação. Tente novamente.");
      }
    }
  };

  // Load real tire cost chart data from Supabase
  const [chartData, setChartData] = useState<
    Array<{ date: string; cost: number }>
  >([]);
  const [allChartData, setAllChartData] = useState<
    Array<{ date: string; cost: number }>
  >([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const loadTireCostChartData = async () => {
    try {
      setIsLoadingChart(true);
      console.log(
        "📊 [TireCostManager] Carregando dados reais do gráfico de custos..."
      );

      const historicalData = await dataManager.loadTireCostHistory(30);

      console.log(
        "🔍 [TireCostManager] Dados históricos encontrados:",
        historicalData.length,
        "registros"
      );
      console.log("🔍 [TireCostManager] Dados:", historicalData);

      // Always use real data from database - no simulated data
      // Generate empty data points for days without records (showing 0)
      const chartData = [];
      const today = new Date();

      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const dateStr = date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        });

        // Check if we have real data for this date
        const realDataPoint = historicalData.find(
          (item) => item.date === dateStr
        );

        if (realDataPoint) {
          // Use real data
          chartData.push({
            date: dateStr,
            cost: realDataPoint.cost,
          });
          console.log(
            "📊 [TireCostManager] Usando dados reais para",
            dateStr,
            ":",
            realDataPoint.cost
          );
        } else {
          // No data for this date - show 0
          chartData.push({
            date: dateStr,
            cost: 0,
          });
          console.log(
            "📊 [TireCostManager] Sem dados para",
            dateStr,
            "- usando 0"
          );
        }
      }

      setAllChartData(chartData);
      setChartData(chartData);
    } catch (error) {
      console.error(
        "❌ [TireCostManager] Erro ao carregar dados do gráfico:",
        error
      );
      // Show empty chart on error
      setChartData([]);
    } finally {
      setIsLoadingChart(false);
    }
  };

  // Filter chart data by selected month and add real-time today data
  const filterDataByMonth = (month: string) => {
    let baseData = [...allChartData];

    // Add real-time today data if not already in database
    const today = new Date();
    const todayStr = today.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

    console.log("🔍 [TireCostManager] Debug - Data de hoje:", todayStr);
    console.log(
      "🔍 [TireCostManager] Debug - Custo atual:",
      averageAnalysis.averageCostPerTire
    );
    console.log(
      "🔍 [TireCostManager] Debug - Dados base:",
      baseData.map((item) => `${item.date}: R$ ${item.cost}`)
    );

    // Check if today's data already exists in the database (from allChartData, not including real-time)
    const todayExistsInDB = allChartData.some((item) => item.date === todayStr);

    // Remove any existing real-time today point first (to avoid duplicates)
    baseData = baseData.filter(
      (item) => !(item.date === todayStr && !todayExistsInDB)
    );

    // Always add real-time today point if we have a valid cost
    if (averageAnalysis.averageCostPerTire > 0) {
      const realTimeCost = parseFloat(
        averageAnalysis.averageCostPerTire.toFixed(2)
      );

      if (todayExistsInDB) {
        // Update existing today point with real-time value
        const todayIndex = baseData.findIndex((item) => item.date === todayStr);
        if (todayIndex !== -1) {
          baseData[todayIndex] = {
            date: todayStr,
            cost: realTimeCost,
          };
          console.log(
            "🔄 [TireCostManager] Atualizando ponto existente para hoje:",
            todayStr,
            "->",
            realTimeCost
          );
        }
      } else {
        // Add new real-time today point
        baseData.push({
          date: todayStr,
          cost: realTimeCost,
        });
        console.log(
          "📊 [TireCostManager] Adicionando ponto em tempo real para hoje:",
          todayStr,
          "->",
          realTimeCost
        );
      }
    }

    if (month === "all") {
      setChartData(baseData);
      return;
    }

    const [year, monthNum] = month.split("-");
    const filteredData = baseData.filter((item) => {
      // Parse the date string (format: "dd/mm")
      const [day, monthStr] = item.date.split("/");
      const itemMonth = monthStr.padStart(2, "0");
      const currentYear = new Date().getFullYear().toString();

      return itemMonth === monthNum && year === currentYear;
    });

    console.log(
      `📅 [TireCostManager] Filtrando dados para ${month}:`,
      filteredData.length,
      "registros"
    );
    setChartData(filteredData);
  };

  // Get available months from chart data
  const getAvailableMonths = () => {
    const months = new Set<string>();
    const currentYear = new Date().getFullYear();

    allChartData.forEach((item) => {
      // Parse the date string (format: "dd/mm")
      const [day, monthStr] = item.date.split("/");
      const monthNum = monthStr.padStart(2, "0");
      months.add(`${currentYear}-${monthNum}`);
    });

    return Array.from(months)
      .sort()
      .map((month) => {
        const [year, monthNum] = month.split("-");
        const monthName = new Date(
          parseInt(year),
          parseInt(monthNum) - 1
        ).toLocaleDateString("pt-BR", { month: "long" });
        return {
          value: month,
          label: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
        };
      });
  };

  // Handle month selection change
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    filterDataByMonth(month);
  };

  // Function to record today's tire cost
  const recordTodayTireCost = async () => {
    try {
      console.log(
        "💾 [TireCostManager] Registrando custo de hoje:",
        averageAnalysis.averageCostPerTire
      );

      // WORKAROUND: Add +1 day to compensate Supabase UTC conversion
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const todayLocal = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

      console.log(
        "📅 [TireCostManager] WORKAROUND +1: Data original vs enviada:",
        {
          dataOriginal: today.toISOString().split("T")[0],
          dataEnviada: todayLocal,
        }
      );

      const success = await dataManager.saveTireCostHistory(
        todayLocal,
        averageAnalysis.averageCostPerTire
      );

      if (success) {
        console.log("✅ [TireCostManager] Custo registrado com sucesso!");
        // Reload chart data to include today's record
        await loadTireCostChartData();
        alert("✅ Custo por pneu registrado com sucesso!");
      } else {
        console.error("❌ [TireCostManager] Erro ao registrar custo");
        alert("❌ Erro ao registrar custo por pneu");
      }
    } catch (error) {
      console.error("❌ [TireCostManager] Erro ao registrar custo:", error);
      alert("❌ Erro ao registrar custo por pneu");
    }
  };

  // Save previous day cost when day changes - DISABLED to keep 0 values for previous days
  const savePreviousDayOnDayChange = async () => {
    console.log(
      "📅 [TireCostManager] Função savePreviousDayOnDayChange desabilitada - mantendo valores 0 para dias anteriores"
    );
    // This function is now disabled to preserve 0 values for days without records
    // Previous days will show 0 in the chart instead of being filled with current cost
  };

  // Auto-record tire cost daily (ONLY for today - previous days keep 0 values)
  const checkAndRecordDailyCost = async () => {
    try {
      // WORKAROUND: Add +1 day to compensate Supabase UTC conversion
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const todayLocal = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

      console.log(
        "📅 [TireCostManager] Verificando registro APENAS para hoje:",
        todayLocal,
        "- dias anteriores mantêm valor 0"
      );

      // Check if today's record exists
      const { data, error } = await (dataManager as any).supabase
        .from("tire_cost_history")
        .select("*")
        .eq("date", todayLocal)
        .single();

      if (error && error.code === "PGRST116") {
        // Today's record doesn't exist, save it
        console.log(
          "💾 [TireCostManager] Salvando custo APENAS para hoje:",
          todayLocal,
          "Valor:",
          averageAnalysis.averageCostPerTire
        );

        const success = await dataManager.saveTireCostHistory(
          todayLocal,
          averageAnalysis.averageCostPerTire
        );

        if (success) {
          console.log("✅ [TireCostManager] Custo de hoje salvo com sucesso!");
          // Reload chart data to include the new record
          await loadTireCostChartData();
        } else {
          console.error("❌ [TireCostManager] Erro ao salvar custo de hoje");
        }
      } else if (!error && data) {
        // Today's record exists, check if we need to update it
        const existingCost = parseFloat(data.average_cost_per_tire);
        const currentCost = averageAnalysis.averageCostPerTire;
        const costDifference = Math.abs(currentCost - existingCost);

        console.log("📊 [TireCostManager] Registro de hoje encontrado:", {
          data: todayLocal,
          custoExistente: existingCost,
          custoAtual: currentCost,
          diferenca: costDifference,
        });

        // Update if difference is significant (more than R$ 0.01)
        if (costDifference > 0.01) {
          console.log(
            "🔄 [TireCostManager] Atualizando custo de hoje - diferença significativa:",
            costDifference
          );

          const success = await dataManager.saveTireCostHistory(
            todayLocal,
            currentCost
          );

          if (success) {
            console.log(
              "✅ [TireCostManager] Custo de hoje atualizado com sucesso!"
            );
            // Reload chart data to reflect the update
            await loadTireCostChartData();
          } else {
            console.error(
              "❌ [TireCostManager] Erro ao atualizar custo de hoje"
            );
          }
        } else {
          console.log(
            "📅 [TireCostManager] Custo de hoje já está atualizado - diferença insignificante:",
            costDifference
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ [TireCostManager] Erro ao verificar/salvar custo de hoje:",
        error
      );
    }
  };

  // Load chart data on component mount only
  useEffect(() => {
    loadTireCostChartData();
  }, []); // Remove averageAnalysis.averageCostPerTire dependency to avoid conflicts

  // Check and record daily cost on component mount
  useEffect(() => {
    if (!isLoading && averageAnalysis.averageCostPerTire > 0) {
      checkAndRecordDailyCost();
    }
  }, [isLoading, averageAnalysis.averageCostPerTire]);

  // Auto-save tire cost every 30 minutes during the day
  useEffect(() => {
    if (!isLoading && averageAnalysis.averageCostPerTire > 0) {
      const autoSaveInterval = setInterval(
        async () => {
          console.log(
            "⏰ [TireCostManager] Auto-save periódico - verificando se precisa salvar custo"
          );
          await checkAndRecordDailyCost();
        },
        30 * 60 * 1000
      ); // 30 minutos

      return () => {
        clearInterval(autoSaveInterval);
        console.log("🔄 [TireCostManager] Auto-save interval limpo");
      };
    }
  }, [isLoading, averageAnalysis.averageCostPerTire]);

  // Apply month filter when allChartData changes
  useEffect(() => {
    if (allChartData.length > 0) {
      filterDataByMonth(selectedMonth);
    }
  }, [allChartData, selectedMonth]);

  // Update chart in real-time when average cost changes (for today's point)
  useEffect(() => {
    console.log(
      "🔄 [TireCostManager] useEffect disparado - custo mudou para:",
      averageAnalysis.averageCostPerTire
    );
    console.log(
      "🔄 [TireCostManager] allChartData.length:",
      allChartData.length
    );
    console.log("🔄 [TireCostManager] selectedMonth:", selectedMonth);

    if (allChartData.length >= 0 && averageAnalysis.averageCostPerTire > 0) {
      console.log(
        "🔄 [TireCostManager] ✅ Condições atendidas - atualizando gráfico em tempo real"
      );
      console.log(
        "🔄 [TireCostManager] Novo custo a ser exibido:",
        averageAnalysis.averageCostPerTire
      );
      filterDataByMonth(selectedMonth);
    } else {
      console.log(
        "🔄 [TireCostManager] ❌ Condições não atendidas para atualização em tempo real"
      );
    }
  }, [averageAnalysis.averageCostPerTire, selectedMonth]);

  // Day change detection and periodic check
  useEffect(() => {
    let lastCheckedDay = new Date().getDate();

    const checkDayChange = async () => {
      const currentDay = new Date().getDate();

      if (currentDay !== lastCheckedDay) {
        console.log(
          "🌅 [TireCostManager] Detectada virada do dia! Salvando custo do dia anterior..."
        );
        await savePreviousDayOnDayChange();
        lastCheckedDay = currentDay;
      }
    };

    // Check for day change every minute
    const interval = setInterval(checkDayChange, 60000);

    // Also check immediately on component mount
    checkDayChange();

    return () => clearInterval(interval);
  }, [averageAnalysis.averageCostPerTire]);

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-factory-700/50 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-24 bg-factory-700/50 rounded"></div>
            <div className="h-24 bg-factory-700/50 rounded"></div>
            <div className="h-24 bg-factory-700/50 rounded"></div>
            <div className="h-24 bg-factory-700/50 rounded"></div>
          </div>
          <div className="h-96 bg-factory-700/50 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-orange to-neon-yellow flex items-center justify-center">
            <Calculator className="h-4 w-4 text-white" />
          </div>
          Análise de Custos e Receitas por Pneu
        </h2>
        <p className="text-tire-300 mt-2">
          Análise completa de custos, receitas e rentabilidade por tipo de pneu
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Custo Médio/Pneu</p>
                <p className="text-xl font-bold text-neon-orange">
                  {formatCurrency(averageAnalysis.averageCostPerTire)}
                </p>
              </div>
              <div className="text-neon-orange">
                <Calculator className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Perdas Totais</p>
                <p className="text-xl font-bold text-red-400">
                  {averageAnalysis.totalLosses.toFixed(0)}
                </p>
                <p className="text-xs text-red-300">
                  {formatCurrency(averageAnalysis.totalLossValue)}
                </p>
              </div>
              <div className="text-red-400">
                <TrendingDown className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Tipos de Pneu</p>
                <p className="text-xl font-bold text-tire-200">
                  {averageAnalysis.productCount}
                </p>
              </div>
              <div className="text-tire-200">
                <Package className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tire Cost Chart */}
      <div className="mb-6">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-neon-orange" />
                  Oscilação do Custo por Pneu
                </CardTitle>
                <p className="text-tire-300 text-sm">
                  {selectedMonth === "all"
                    ? "Evolução do custo médio por pneu ao longo dos últimos 30 dias"
                    : `Evolução do custo médio por pneu no mês selecionado`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="month-filter" className="text-tire-300 text-sm">
                  Filtrar por mês:
                </Label>
                <Select value={selectedMonth} onValueChange={handleMonthChange}>
                  <SelectTrigger className="w-48 bg-factory-700 border-tire-600 text-tire-200">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent className="bg-factory-800 border-tire-600">
                    <SelectItem
                      value="all"
                      className="text-tire-200 hover:bg-factory-700"
                    >
                      Todos os meses
                    </SelectItem>
                    {getAvailableMonths().map((month) => (
                      <SelectItem
                        key={month.value}
                        value={month.value}
                        className="text-tire-200 hover:bg-factory-700"
                      >
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F3F4F6",
                    }}
                    formatter={(value: number) => [
                      `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                      "Custo por Pneu",
                    ]}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#FB923C"
                    strokeWidth={3}
                    dot={{ fill: "#FB923C", strokeWidth: 2, r: 4 }}
                    activeDot={{
                      r: 6,
                      stroke: "#FB923C",
                      strokeWidth: 2,
                      fill: "#FED7AA",
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análise por Pneu - Content with tabs */}
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-factory-800/50 border border-tire-600/30">
            <TabsTrigger
              value="cost-analysis"
              className="data-[state=active]:bg-neon-blue/20 data-[state=active]:text-neon-blue text-tire-300"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Custo por Pneu
            </TabsTrigger>
            <TabsTrigger
              value="simulation"
              className="data-[state=active]:bg-neon-orange/20 data-[state=active]:text-neon-orange text-tire-300"
            >
              <Zap className="h-4 w-4 mr-2" />
              Simulação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cost-analysis" className="mt-6">
            {/* Analysis Content */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left Column - Cost Configuration and Analysis Selection */}
              <div className="space-y-6">
                {/* Cost Calculation Options */}
                <Card className="bg-factory-800/50 border-tire-600/30">
                  <CardHeader>
                    <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
                      <Sliders className="h-5 w-5 text-neon-blue" />
                      Configuração de Custos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
                      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-neon-orange" />
                        Componentes do Custo por Pneu
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-tire-300 font-medium">
                              Matéria-Prima (Receita)
                            </Label>
                            <p className="text-tire-400 text-xs">
                              Base obrigatória do cálculo
                            </p>
                          </div>
                          <div className="text-neon-green">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-tire-300 font-medium">
                              Saídas de Caixa
                            </Label>
                            <p className="text-tire-400 text-xs">
                              Incluir despesas do fluxo de caixa
                            </p>
                          </div>
                          <Switch
                            checked={costOptions.includeCashFlowExpenses}
                            onCheckedChange={(checked) =>
                              setCostOptions((prev) => ({
                                ...prev,
                                includeCashFlowExpenses: checked,
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-tire-300 font-medium">
                              Perdas de Produção e Matéria-Prima
                            </Label>
                            <p className="text-tire-400 text-xs">
                              Incluir perdas de produção e matéria-prima do
                              histórico
                            </p>
                          </div>
                          <Switch
                            checked={costOptions.includeProductionLosses}
                            onCheckedChange={(checked) =>
                              setCostOptions((prev) => ({
                                ...prev,
                                includeProductionLosses: checked,
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-tire-300 font-medium">
                              Vendas de Pneus Defeituosos (Desconto)
                            </Label>
                            <p className="text-tire-400 text-xs">
                              Subtrair valor das vendas de pneus defeituosos do
                              custo total
                            </p>
                          </div>
                          <Switch
                            checked={costOptions.includeDefectiveTireSales}
                            onCheckedChange={(checked) =>
                              setCostOptions((prev) => ({
                                ...prev,
                                includeDefectiveTireSales: checked,
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-tire-300 font-medium">
                              Valor de Garantia
                            </Label>
                            <p className="text-tire-400 text-xs">
                              Incluir valor das garantias baseado no custo de
                              matéria-prima
                            </p>
                          </div>
                          <Switch
                            checked={costOptions.includeWarrantyValues}
                            onCheckedChange={(checked) =>
                              setCostOptions((prev) => ({
                                ...prev,
                                includeWarrantyValues: checked,
                              }))
                            }
                          />
                        </div>

                        <div className="border-t border-tire-600/30 pt-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-tire-300 font-medium">
                                Dividir pela Produção
                              </Label>
                              <p className="text-tire-400 text-xs">
                                Dividir custos opcionais pela quantidade
                                produzida
                              </p>
                            </div>
                            <Switch
                              checked={costOptions.divideByProduction}
                              onCheckedChange={(checked) =>
                                setCostOptions((prev) => ({
                                  ...prev,
                                  divideByProduction: checked,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Product Selection and Analysis Mode */}
                <Card className="bg-factory-800/50 border-tire-600/30">
                  <CardHeader>
                    <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
                      <Filter className="h-5 w-5 text-neon-blue" />
                      Seleção de Análise
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-12">
                    <div className="space-y-3 flex flex-col items-end">
                      <Label className="text-tire-300 self-start">
                        Modo de Análise:
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant={
                            analysisMode === "individual"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setAnalysisMode("individual")}
                          className={`${analysisMode === "individual" ? "bg-neon-blue/20 border-neon-blue/50 text-neon-blue" : "bg-factory-700/50 border-tire-600/30 text-tire-300"} hover:text-white`}
                        >
                          <Target className="h-4 w-4 mr-2" />
                          Individual
                        </Button>
                        <Button
                          variant={
                            analysisMode === "average" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setAnalysisMode("average")}
                          className={`${analysisMode === "average" ? "bg-neon-purple/20 border-neon-purple/50 text-neon-purple" : "bg-factory-700/50 border-tire-600/30 text-tire-300"} hover:text-white`}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Custo Médio
                        </Button>
                      </div>
                    </div>

                    {analysisMode === "individual" && (
                      <div className="space-y-2 flex flex-col items-end">
                        <Label className="text-tire-300 self-start">
                          Selecionar Pneu:
                        </Label>
                        <Select
                          value={selectedProduct}
                          onValueChange={setSelectedProduct}
                        >
                          <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                            <SelectValue placeholder="Escolha um tipo de pneu" />
                          </SelectTrigger>
                          <SelectContent className="bg-factory-800 border-tire-600/30">
                            {tireAnalysis.map((tire) => (
                              <SelectItem
                                key={tire.productId}
                                value={tire.productId}
                                className="text-white hover:bg-tire-700/50"
                              >
                                {tire.productName} -{" "}
                                {formatCurrency(tire.totalRevenue)} receita
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {analysisMode === "average" && (
                      <div className="p-4 bg-neon-purple/10 rounded-lg border border-neon-purple/30">
                        <h4 className="text-neon-purple font-medium mb-2">
                          Análise Geral
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-tire-300">
                              Total de Produtos:
                            </span>
                            <span className="text-white font-medium">
                              {averageAnalysis.productCount}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-tire-300">
                              Pneus Vendidos:
                            </span>
                            <span className="text-white font-medium">
                              {averageAnalysis.totalSold.toFixed(0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-tire-300">
                              Pneus Produzidos:
                            </span>
                            <span className="text-white font-medium">
                              {averageAnalysis.totalProduced.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Analysis Results */}
              <Card className="bg-factory-800/50 border-tire-600/30">
                <CardHeader>
                  <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-neon-orange" />
                    {analysisMode === "individual"
                      ? "Análise Individual"
                      : "Análise Média"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-12">
                  {analysisMode === "individual" && selectedProductAnalysis ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
                        <h4 className="text-white font-medium mb-3">
                          {selectedProductAnalysis.productName}
                        </h4>
                        <div className="flex justify-center text-xl">
                          <div className="space-y-2 w-full max-w-md">
                            <div className="flex justify-between">
                              <span className="text-tire-300">
                                {selectedProductAnalysis.hasRecipe
                                  ? "Custo/Pneu (Receita):"
                                  : "Custo/Pneu:"}
                              </span>
                              <span className="text-neon-orange font-bold">
                                {formatCurrency(
                                  selectedProductAnalysis.costPerTire
                                )}
                              </span>
                            </div>
                            {selectedProductAnalysis.hasRecipe && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-tire-300 text-lg">
                                    Materiais:
                                  </span>
                                  <span className="text-white font-medium text-lg">
                                    {formatCurrency(
                                      selectedProductAnalysis.recipeCostPerTire
                                    )}
                                  </span>
                                </div>

                                {costOptions.includeCashFlowExpenses && (
                                  <div className="flex justify-between">
                                    <span className="text-tire-300 text-lg">
                                      Saídas de Caixa:
                                    </span>
                                    <span className="text-neon-purple font-medium text-lg">
                                      {formatCurrency(
                                        selectedProductAnalysis.cashFlowCostPerTire
                                      )}
                                    </span>
                                  </div>
                                )}
                                {costOptions.includeProductionLosses && (
                                  <div className="flex justify-between">
                                    <span className="text-tire-300 text-lg">
                                      Perdas (Produção + Material):
                                    </span>
                                    <span className="text-red-400 font-medium text-lg">
                                      {formatCurrency(
                                        selectedProductAnalysis.productionLossCostPerTire
                                      )}
                                    </span>
                                  </div>
                                )}
                                {costOptions.includeDefectiveTireSales && (
                                  <div className="flex justify-between">
                                    <span className="text-tire-300 text-lg">
                                      Pneus Defeituosos (Desconto):
                                    </span>
                                    <span className="text-green-400 font-medium text-lg">
                                      {formatCurrency(
                                        selectedProductAnalysis.defectiveTireSalesCostPerTire
                                      )}
                                    </span>
                                  </div>
                                )}
                                {costOptions.includeWarrantyValues && (
                                  <div className="flex justify-between">
                                    <span className="text-tire-300 text-lg">
                                      Valor de Garantia:
                                    </span>
                                    <span className="text-orange-400 font-medium text-lg">
                                      {formatCurrency(
                                        selectedProductAnalysis.warrantyCostPerTire
                                      )}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="flex justify-between">
                              <span className="text-tire-300">
                                Qtd Produzida:
                              </span>
                              <span className="text-white">
                                {selectedProductAnalysis.totalProduced.toFixed(
                                  0
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recipe Details */}
                      {selectedProductAnalysis.hasRecipe &&
                        selectedProductAnalysis.recipeDetails && (
                          <div className="mt-4 p-3 bg-neon-yellow/10 rounded-lg border border-neon-yellow/30">
                            <h5 className="text-white font-medium mb-2 text-sm">
                              📋 Detalhes da Receita:
                            </h5>
                            <div className="space-y-1 text-xs">
                              {selectedProductAnalysis.recipeDetails.materials.map(
                                (material, index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center"
                                  >
                                    <span className="text-tire-300">
                                      {material.materialName} (
                                      {material.quantity} un)
                                    </span>
                                    <span className="text-white">
                                      {formatCurrency(material.totalCost)}
                                    </span>
                                  </div>
                                )
                              )}
                              <div className="flex justify-between items-center pt-1 border-t border-green-500/20">
                                <span className="text-green-400 font-medium">
                                  Total Materiais:
                                </span>
                                <span className="text-green-400 font-bold">
                                  {formatCurrency(
                                    selectedProductAnalysis.recipeDetails
                                      .totalMaterialCost
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Production and Material Losses Details */}
                      {selectedProductAnalysis.lossDetails &&
                        (selectedProductAnalysis.lossDetails.totalLossQuantity >
                          0 ||
                          selectedProductAnalysis.lossDetails
                            .totalMaterialLossValue > 0) && (
                          <div className="mt-4 p-3 bg-red-900/10 rounded-lg border border-red-500/30">
                            <h5 className="text-red-400 font-medium mb-2 text-sm flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              📉 Perdas de Produção e Matéria-Prima:
                            </h5>
                            <div className="space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-tire-300">
                                    Qtd. Produção Perdida:
                                  </span>
                                  <span className="text-red-400 font-bold">
                                    {selectedProductAnalysis.lossDetails.totalLossQuantity.toFixed(
                                      0
                                    )}{" "}
                                    un
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-tire-300">
                                    Valor Produção Perdida:
                                  </span>
                                  <span className="text-red-400 font-bold">
                                    {formatCurrency(
                                      selectedProductAnalysis.lossDetails
                                        .totalLossValue -
                                        selectedProductAnalysis.lossDetails
                                          .totalMaterialLossValue
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-tire-300">
                                    Valor Material Perdido:
                                  </span>
                                  <span className="text-orange-400 font-bold">
                                    {formatCurrency(
                                      selectedProductAnalysis.lossDetails
                                        .totalMaterialLossValue
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-tire-300">
                                    Valor Total Perdido:
                                  </span>
                                  <span className="text-red-400 font-bold">
                                    {formatCurrency(
                                      selectedProductAnalysis.lossDetails
                                        .totalLossValue
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t border-red-500/20">
                                <span className="text-red-400 font-medium">
                                  % de Perdas de Produção:
                                </span>
                                <span className="text-red-400 font-bold">
                                  {selectedProductAnalysis.lossDetails.lossPercentage.toFixed(
                                    2
                                  )}
                                  %
                                </span>
                              </div>
                              {selectedProductAnalysis.lossDetails
                                .productionEntries.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-red-500/20">
                                  <p className="text-red-400 font-medium text-xs mb-1">
                                    Histórico de Perdas por Data:
                                  </p>
                                  <div className="space-y-1 max-h-24 overflow-y-auto">
                                    {selectedProductAnalysis.lossDetails.productionEntries.map(
                                      (entry, index) => (
                                        <div
                                          key={index}
                                          className="p-2 bg-red-900/20 rounded border border-red-500/20"
                                        >
                                          <div className="flex justify-between items-center text-xs mb-1">
                                            <span className="text-tire-300 font-medium">
                                              {new Date(
                                                entry.date
                                              ).toLocaleDateString("pt-BR")}
                                            </span>
                                            <span className="text-red-400 font-bold">
                                              {formatCurrency(
                                                entry.totalEntryLossValue
                                              )}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex justify-between">
                                              <span className="text-tire-400">
                                                Produção:
                                              </span>
                                              <span className="text-red-400">
                                                {entry.lossQuantity} un -{" "}
                                                {formatCurrency(
                                                  entry.lossValue
                                                )}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-tire-400">
                                                Material:
                                              </span>
                                              <span className="text-orange-400">
                                                {formatCurrency(
                                                  entry.materialLossValue
                                                )}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      {!selectedProductAnalysis.hasRecipe && (
                        <div className="mt-4 p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                          <p className="text-red-400 text-sm">
                            ⚠️ Este produto não possui receita cadastrada. O
                            custo está sendo calculado baseado nos dados de
                            produção.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : analysisMode === "average" ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
                        <h4 className="text-white font-medium mb-3">
                          Análise Consolidada - Custo Médio
                        </h4>
                        <div className="flex justify-center text-xl">
                          <div className="space-y-2 w-full max-w-md">
                            <div className="flex justify-between">
                              <span className="text-tire-300">
                                Custo/Pneu (Receita):
                              </span>
                              <span className="text-neon-orange font-bold">
                                {formatCurrency(
                                  averageAnalysis.averageCostPerTire
                                )}
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-tire-300 text-lg">
                                Materiais:
                              </span>
                              <span className="text-white font-medium text-lg">
                                {formatCurrency(
                                  tireAnalysis.length > 0
                                    ? tireAnalysis.reduce(
                                        (sum, tire) =>
                                          sum +
                                          tire.recipeCostPerTire *
                                            tire.totalProduced,
                                        0
                                      ) / averageAnalysis.totalProduced
                                    : 0
                                )}
                              </span>
                            </div>

                            {costOptions.includeCashFlowExpenses && (
                              <div className="flex justify-between">
                                <span className="text-tire-300 text-lg">
                                  Saídas de Caixa:
                                </span>
                                <span className="text-neon-purple font-medium text-lg">
                                  {formatCurrency(
                                    tireAnalysis.length > 0
                                      ? tireAnalysis.reduce(
                                          (sum, tire) =>
                                            sum +
                                            tire.cashFlowCostPerTire *
                                              tire.totalProduced,
                                          0
                                        ) / averageAnalysis.totalProduced
                                      : 0
                                  )}
                                </span>
                              </div>
                            )}

                            {costOptions.includeProductionLosses && (
                              <div className="flex justify-between">
                                <span className="text-tire-300 text-lg">
                                  Perdas (Produção + Material):
                                </span>
                                <span className="text-red-400 font-medium text-lg">
                                  {formatCurrency(
                                    tireAnalysis.length > 0
                                      ? tireAnalysis.reduce(
                                          (sum, tire) =>
                                            sum +
                                            tire.productionLossCostPerTire *
                                              tire.totalProduced,
                                          0
                                        ) / averageAnalysis.totalProduced
                                      : 0
                                  )}
                                </span>
                              </div>
                            )}

                            {costOptions.includeDefectiveTireSales && (
                              <div className="flex justify-between">
                                <span className="text-tire-300 text-lg">
                                  Pneus Defeituosos (Desconto):
                                </span>
                                <span className="text-neon-green font-medium text-lg">
                                  -
                                  {formatCurrency(
                                    Math.abs(
                                      tireAnalysis.length > 0
                                        ? tireAnalysis.reduce(
                                            (sum, tire) =>
                                              sum +
                                              tire.defectiveTireSalesCostPerTire *
                                                tire.totalProduced,
                                            0
                                          ) / averageAnalysis.totalProduced
                                        : 0
                                    )
                                  )}
                                </span>
                              </div>
                            )}

                            {costOptions.includeWarrantyValues && (
                              <div className="flex justify-between">
                                <span className="text-tire-300 text-lg">
                                  Valor de Garantia:
                                </span>
                                <span className="text-yellow-400 font-medium text-lg">
                                  {formatCurrency(
                                    tireAnalysis.length > 0
                                      ? tireAnalysis.reduce(
                                          (sum, tire) =>
                                            sum +
                                            tire.warrantyCostPerTire *
                                              tire.totalProduced,
                                          0
                                        ) / averageAnalysis.totalProduced
                                      : 0
                                  )}
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between border-t border-tire-600/30 pt-2">
                              <span className="text-tire-300 text-lg font-medium">
                                Qtd Produzida:
                              </span>
                              <span className="text-neon-blue font-bold text-lg">
                                {averageAnalysis.totalProduced.toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                      <p className="text-tire-400">
                        {analysisMode === "individual"
                          ? "Selecione um tipo de pneu para ver a análise detalhada"
                          : "Dados de análise média carregados"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tire Performance List */}
            <Card className="bg-factory-800/50 border-tire-600/30 mt-6">
              <CardHeader>
                <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-neon-green" />
                  Performance por Tipo de Pneu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {tireAnalysis.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                      <p className="text-tire-400">
                        Nenhum dado de produção ou venda encontrado
                      </p>
                    </div>
                  ) : (
                    tireAnalysis.map((tire) => (
                      <div
                        key={tire.productId}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedProduct === tire.productId
                            ? "bg-neon-blue/10 border-neon-blue/30"
                            : "bg-factory-700/30 border-tire-600/20 hover:bg-factory-700/50"
                        }`}
                        onClick={() => {
                          setSelectedProduct(tire.productId);
                          setAnalysisMode("individual");
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {selectedProduct === tire.productId && (
                              <CheckCircle className="h-4 w-4 text-neon-blue" />
                            )}
                            <h4 className="text-white font-medium">
                              {tire.productName}
                            </h4>
                          </div>
                          <div className="text-center">
                            <span className="text-tire-400 text-sm mr-2">
                              {tire.hasRecipe
                                ? "Custo/Pneu (Receita)"
                                : "Custo/Pneu"}
                            </span>
                            <span className="text-neon-orange font-bold text-lg flex items-center gap-1">
                              {tire.hasRecipe && (
                                <span className="text-neon-yellow text-xs">
                                  📋
                                </span>
                              )}
                              {formatCurrency(tire.costPerTire)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulation" className="mt-6">
            {/* Simulation Content */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left Column - Simulation Configuration */}
              <div className="space-y-6">
                {/* Simulation Cost Configuration */}
                <Card className="bg-factory-800/50 border-tire-600/30">
                  <CardHeader>
                    <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
                      <Sliders className="h-5 w-5 text-neon-orange" />
                      Configuração de Simulação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
                      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-neon-orange" />
                        Componentes do Custo de Simulação
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-tire-300 font-medium">
                              Matéria-Prima (Receita)
                            </Label>
                            <p className="text-tire-400 text-xs">
                              Base obrigatória do cálculo
                            </p>
                          </div>
                          <div className="text-neon-green">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-tire-300 font-medium">
                              Custos Fixos (Manual)
                            </Label>
                            <p className="text-tire-400 text-xs">
                              Valor manual ou usar dados do sistema
                            </p>
                          </div>
                          <div className="text-neon-green">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-tire-300 font-medium">
                              Saídas de Caixa (Manual)
                            </Label>
                            <p className="text-tire-400 text-xs">
                              Valor manual de despesas
                            </p>
                          </div>
                          <Switch
                            checked={
                              simulationCostOptions.includeCashFlowExpenses
                            }
                            onCheckedChange={(checked) =>
                              setSimulationCostOptions((prev) => ({
                                ...prev,
                                includeCashFlowExpenses: checked,
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-tire-300 font-medium">
                              Perdas de Produção (Manual)
                            </Label>
                            <p className="text-tire-400 text-xs">
                              Valor manual de perdas
                            </p>
                          </div>
                          <Switch
                            checked={
                              simulationCostOptions.includeProductionLosses
                            }
                            onCheckedChange={(checked) =>
                              setSimulationCostOptions((prev) => ({
                                ...prev,
                                includeProductionLosses: checked,
                              }))
                            }
                          />
                        </div>

                        <div className="border-t border-tire-600/30 pt-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-tire-300 font-medium">
                                Dividir pela Produção
                              </Label>
                              <p className="text-tire-400 text-xs">
                                Dividir custos pela quantidade produzida
                              </p>
                            </div>
                            <Switch
                              checked={simulationCostOptions.divideByProduction}
                              onCheckedChange={(checked) =>
                                setSimulationCostOptions((prev) => ({
                                  ...prev,
                                  divideByProduction: checked,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Save/Load Simulation Controls */}
                <Card className="bg-factory-800/50 border-tire-600/30">
                  <CardHeader>
                    <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
                      <Save className="h-5 w-5 text-neon-green" />
                      Gerenciar Simulações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      {/* Save Simulation Button */}
                      <Dialog
                        open={showSaveDialog}
                        onOpenChange={setShowSaveDialog}
                      >
                        <DialogTrigger asChild>
                          <Button
                            disabled={
                              simulationMode === "single"
                                ? !simulationRecipe || !simulationQuantity
                                : selectedRecipes.length === 0
                            }
                            className="bg-neon-green/20 border-neon-green/50 text-neon-green hover:bg-neon-green/30 flex-1"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Simulação
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-factory-800 border-tire-600/30">
                          <DialogHeader>
                            <DialogTitle className="text-white">
                              Salvar Simulação
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-tire-300">
                                Nome da Simulação:
                              </Label>
                              <Input
                                value={simulationName}
                                onChange={(e) =>
                                  setSimulationName(e.target.value)
                                }
                                className="bg-factory-700/50 border-tire-600/30 text-white"
                                placeholder="Ex: Simulação Pneu 175/70R13 - Janeiro 2024"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-tire-300">
                                Descrição (opcional):
                              </Label>
                              <Textarea
                                value={simulationDescription}
                                onChange={(e) =>
                                  setSimulationDescription(e.target.value)
                                }
                                className="bg-factory-700/50 border-tire-600/30 text-white"
                                placeholder="Descreva os parâmetros ou objetivo desta simulação..."
                                rows={3}
                              />
                            </div>
                            <div className="p-3 bg-factory-700/30 rounded-lg border border-tire-600/20">
                              <h4 className="text-white font-medium mb-2 text-sm">
                                Resumo da Simulação:
                              </h4>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-tire-300">Tipo:</span>
                                  <span className="text-white">
                                    {simulationMode === "single"
                                      ? "Receita Única"
                                      : "Múltiplas Receitas"}
                                  </span>
                                </div>
                                {simulationMode === "single" &&
                                  simulationRecipe && (
                                    <div className="flex justify-between">
                                      <span className="text-tire-300">
                                        Receita:
                                      </span>
                                      <span className="text-white">
                                        {recipes.find(
                                          (r) => r.id === simulationRecipe
                                        )?.product_name || "N/A"}
                                      </span>
                                    </div>
                                  )}
                                {simulationMode === "multiple" && (
                                  <div className="flex justify-between">
                                    <span className="text-tire-300">
                                      Receitas:
                                    </span>
                                    <span className="text-white">
                                      {selectedRecipes.length} selecionadas
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-tire-300">
                                    Opções de Custo:
                                  </span>
                                  <span className="text-white">
                                    {
                                      Object.values(
                                        simulationCostOptions
                                      ).filter(Boolean).length
                                    }{" "}
                                    ativas
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button
                                onClick={() => setShowSaveDialog(false)}
                                variant="outline"
                                className="flex-1 bg-factory-700/50 border-tire-600/30 text-tire-300"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={saveCurrentSimulation}
                                disabled={
                                  !simulationName.trim() || simulationsSaving
                                }
                                className="flex-1 bg-neon-green/20 border-neon-green/50 text-neon-green hover:bg-neon-green/30"
                              >
                                {simulationsSaving ? "Salvando..." : "Salvar"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Load Simulation Button */}
                      <Dialog
                        open={showLoadDialog}
                        onOpenChange={setShowLoadDialog}
                      >
                        <DialogTrigger asChild>
                          <Button className="bg-neon-blue/20 border-neon-blue/50 text-neon-blue hover:bg-neon-blue/30 flex-1">
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Carregar Simulação
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-factory-800 border-tire-600/30 max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-white">
                              Simulações Salvas
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {simulationsLoading ? (
                              <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue mx-auto"></div>
                                <p className="text-tire-400 mt-2">
                                  Carregando simulações...
                                </p>
                              </div>
                            ) : costSimulations.length === 0 ? (
                              <div className="text-center py-8">
                                <Save className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                                <p className="text-tire-400">
                                  Nenhuma simulação salva encontrada
                                </p>
                                <p className="text-tire-500 text-sm">
                                  Salve uma simulação para vê-la aqui
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3 max-h-96 overflow-y-auto">
                                {costSimulations.map((simulation) => (
                                  <div
                                    key={simulation.id}
                                    className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20"
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <h4 className="text-white font-medium">
                                          {simulation.name}
                                        </h4>
                                        {simulation.description && (
                                          <p className="text-tire-400 text-sm mt-1">
                                            {simulation.description}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex gap-2 ml-4">
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            loadSimulation(simulation)
                                          }
                                          className="bg-neon-blue/20 border-neon-blue/50 text-neon-blue hover:bg-neon-blue/30 h-8 px-3"
                                        >
                                          <Download className="h-3 w-3 mr-1" />
                                          Carregar
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            deleteSimulation(
                                              simulation.id,
                                              simulation.name
                                            )
                                          }
                                          className="bg-red-900/20 border-red-500/50 text-red-400 hover:bg-red-900/30 h-8 px-3"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                      <div className="space-y-1">
                                        <div className="flex justify-between">
                                          <span className="text-tire-400">
                                            Tipo:
                                          </span>
                                          <span className="text-white">
                                            {simulation.simulation_type ===
                                            "single"
                                              ? "Única"
                                              : "Múltiplas"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-tire-400">
                                            Criada em:
                                          </span>
                                          <span className="text-white">
                                            {new Date(
                                              simulation.created_at
                                            ).toLocaleDateString("pt-BR")}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        {simulation.results && (
                                          <>
                                            <div className="flex justify-between">
                                              <span className="text-tire-400">
                                                Custo/Pneu:
                                              </span>
                                              <span className="text-neon-orange font-medium">
                                                {formatCurrency(
                                                  simulation.results
                                                    .cost_per_tire || 0
                                                )}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-tire-400">
                                                Quantidade:
                                              </span>
                                              <span className="text-white">
                                                {simulation.results
                                                  .total_quantity || 0}{" "}
                                                pneus
                                              </span>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex justify-end pt-2">
                              <Button
                                onClick={() => setShowLoadDialog(false)}
                                variant="outline"
                                className="bg-factory-700/50 border-tire-600/30 text-tire-300"
                              >
                                Fechar
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>

                {/* Simulation Product Selection and Manual Inputs */}
                <Card className="bg-factory-800/50 border-tire-600/30">
                  <CardHeader>
                    <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-neon-orange" />
                      Parâmetros de Simulação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {/* Simulation Mode Selection */}
                      <div className="space-y-2">
                        <Label className="text-tire-300">
                          Modo de Simulação:
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            variant={
                              simulationMode === "single"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => setSimulationMode("single")}
                            className={`${simulationMode === "single" ? "bg-neon-orange/20 border-neon-orange/50 text-neon-orange" : "bg-factory-700/50 border-tire-600/30 text-tire-300"} hover:text-white`}
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Receita Única
                          </Button>
                          <Button
                            variant={
                              simulationMode === "multiple"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => setSimulationMode("multiple")}
                            className={`${simulationMode === "multiple" ? "bg-neon-purple/20 border-neon-purple/50 text-neon-purple" : "bg-factory-700/50 border-tire-600/30 text-tire-300"} hover:text-white`}
                          >
                            <Layers className="h-4 w-4 mr-2" />
                            Múltiplas Receitas
                          </Button>
                        </div>
                      </div>

                      {simulationMode === "single" ? (
                        <>
                          <div className="space-y-2">
                            <Label className="text-tire-300">
                              Selecionar Receita de Pneu:
                            </Label>
                            <Select
                              value={simulationRecipe}
                              onValueChange={setSimulationRecipe}
                            >
                              <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                                <SelectValue placeholder="Escolha uma receita para simular" />
                              </SelectTrigger>
                              <SelectContent className="bg-factory-800 border-tire-600/30">
                                {recipes
                                  .filter((recipe) => !recipe.archived)
                                  .map((recipe) => (
                                    <SelectItem
                                      key={recipe.id}
                                      value={recipe.id}
                                      className="text-white hover:bg-tire-700/50"
                                    >
                                      {recipe.product_name} (
                                      {recipe.materials?.length || 0} materiais)
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-tire-300">
                              Quantidade de Pneus:
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={simulationQuantity}
                              onChange={(e) =>
                                setSimulationQuantity(e.target.value)
                              }
                              className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                              placeholder="Ex: 100 pneus"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Multiple Recipes Selection */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-tire-300">
                                Receitas Selecionadas ({selectedRecipes.length}
                                ):
                              </Label>
                              {selectedRecipes.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedRecipes([])}
                                  className="bg-factory-700/50 border-tire-600/30 text-tire-300 hover:text-white"
                                >
                                  Limpar Todas
                                </Button>
                              )}
                            </div>

                            {/* Add Recipe Section */}
                            <div className="p-3 bg-factory-700/20 rounded-lg border border-tire-600/20">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-tire-400 text-xs">
                                    Receita:
                                  </Label>
                                  <Select
                                    value={simulationRecipe}
                                    onValueChange={setSimulationRecipe}
                                  >
                                    <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white h-9">
                                      <SelectValue placeholder="Escolher receita" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-factory-800 border-tire-600/30">
                                      {recipes
                                        .filter(
                                          (recipe) =>
                                            !recipe.archived &&
                                            !selectedRecipes.some(
                                              (sr) => sr.id === recipe.id
                                            )
                                        )
                                        .map((recipe) => (
                                          <SelectItem
                                            key={recipe.id}
                                            value={recipe.id}
                                            className="text-white hover:bg-tire-700/50"
                                          >
                                            {recipe.product_name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-tire-400 text-xs">
                                    Quantidade:
                                  </Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={simulationQuantity}
                                    onChange={(e) =>
                                      setSimulationQuantity(e.target.value)
                                    }
                                    className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 h-9"
                                    placeholder="Ex: 100"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    onClick={addRecipeToSelection}
                                    disabled={
                                      !simulationRecipe || !simulationQuantity
                                    }
                                    className="bg-neon-green/20 border-neon-green/50 text-neon-green hover:bg-neon-green/30 h-9 w-full"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Adicionar
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Selected Recipes List */}
                            {selectedRecipes.length > 0 && (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {selectedRecipes.map((selectedRecipe) => (
                                  <div
                                    key={selectedRecipe.id}
                                    className="p-3 bg-factory-700/30 rounded-lg border border-tire-600/20 flex items-center justify-between"
                                  >
                                    <div className="flex-1">
                                      <h5 className="text-white font-medium text-sm">
                                        {selectedRecipe.name}
                                      </h5>
                                      <div className="flex items-center gap-3 mt-1">
                                        <Label className="text-tire-400 text-xs">
                                          Quantidade:
                                        </Label>
                                        <Input
                                          type="number"
                                          min="1"
                                          step="1"
                                          value={selectedRecipe.quantity}
                                          onChange={(e) =>
                                            updateRecipeQuantity(
                                              selectedRecipe.id,
                                              parseInt(e.target.value) || 1
                                            )
                                          }
                                          className="bg-factory-700/50 border-tire-600/30 text-white w-20 h-7 text-xs"
                                        />
                                        <span className="text-tire-400 text-xs">
                                          pneus
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        removeRecipeFromSelection(
                                          selectedRecipe.id
                                        )
                                      }
                                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-8 w-8"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label className="text-tire-300">
                          Custos Fixos (R$):
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={simulationFixedCosts}
                          onChange={(e) =>
                            setSimulationFixedCosts(e.target.value)
                          }
                          className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                          placeholder="Ex: 3000.00 (deixe vazio para usar dados do sistema)"
                        />
                      </div>

                      {simulationCostOptions.includeCashFlowExpenses && (
                        <div className="space-y-2">
                          <Label className="text-tire-300">
                            Saídas de Caixa (R$):
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={simulationCashFlowExpenses}
                            onChange={(e) =>
                              setSimulationCashFlowExpenses(e.target.value)
                            }
                            className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                            placeholder="Ex: 5000.00"
                          />
                        </div>
                      )}

                      {simulationCostOptions.includeProductionLosses && (
                        <div className="space-y-2">
                          <Label className="text-tire-300">
                            Perdas de Produção (R$):
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={simulationProductionLosses}
                            onChange={(e) =>
                              setSimulationProductionLosses(e.target.value)
                            }
                            className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                            placeholder="Ex: 1000.00"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Simulation Results */}
              <Card className="bg-factory-800/50 border-tire-600/30">
                <CardHeader>
                  <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-neon-orange" />
                    Resultado da Simulação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {simulationMode === "single" && simulationRecipeAnalysis ? (
                    <div className="space-y-4">
                      {simulationRecipeAnalysis.hasRecipe ? (
                        <>
                          <div className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
                            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                              📋 {simulationRecipeAnalysis.recipeName}
                              <span className="text-xs text-tire-400">
                                (Simulação de Custo por Pneu)
                              </span>
                            </h4>
                            <div className="grid grid-cols-2 gap-6 text-lg">
                              <div className="space-y-4">
                                <div className="flex justify-between">
                                  <span className="text-tire-300 text-lg">
                                    Quantidade de Pneus:
                                  </span>
                                  <span className="text-white font-bold text-xl">
                                    {simulationRecipeAnalysis.quantity}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-tire-300 text-lg">
                                    Custo Total:
                                  </span>
                                  <span className="text-neon-green font-bold text-xl">
                                    {formatCurrency(
                                      simulationRecipeAnalysis.totalCost
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-tire-300 text-lg">
                                    Custo por Pneu:
                                  </span>
                                  <span className="text-neon-orange font-bold text-xl">
                                    {formatCurrency(
                                      simulationRecipeAnalysis.costPerTire
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div className="flex justify-between">
                                  <span className="text-tire-300 text-base">
                                    Materiais (Receita):
                                  </span>
                                  <span className="text-white font-medium text-lg">
                                    {formatCurrency(
                                      simulationRecipeAnalysis.recipeCostPerTire
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-tire-300 text-base">
                                    Custos Fixos:
                                  </span>
                                  <span className="text-neon-blue font-medium text-lg">
                                    {formatCurrency(
                                      simulationRecipeAnalysis.fixedCostPerTire
                                    )}
                                  </span>
                                </div>

                                {simulationCostOptions.includeCashFlowExpenses && (
                                  <div className="flex justify-between">
                                    <span className="text-tire-300 text-base">
                                      Saídas de Caixa:
                                    </span>
                                    <span className="text-neon-purple font-medium text-lg">
                                      {formatCurrency(
                                        simulationRecipeAnalysis.cashFlowCostPerTire
                                      )}
                                    </span>
                                  </div>
                                )}
                                {simulationCostOptions.includeProductionLosses && (
                                  <div className="flex justify-between">
                                    <span className="text-tire-300 text-base">
                                      Perdas de Produção:
                                    </span>
                                    <span className="text-red-400 font-medium text-lg">
                                      {formatCurrency(
                                        simulationRecipeAnalysis.productionLossCostPerTire
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Recipe Details */}
                          {simulationRecipeAnalysis.recipeDetails && (
                            <div className="mt-4 p-3 bg-neon-yellow/10 rounded-lg border border-neon-yellow/30">
                              <h5 className="text-white font-medium mb-2 text-sm">
                                📋 Composição da Receita:
                              </h5>
                              <div className="space-y-1 text-xs">
                                {simulationRecipeAnalysis.recipeDetails.materials.map(
                                  (material, index) => (
                                    <div
                                      key={index}
                                      className="flex justify-between items-center"
                                    >
                                      <span className="text-tire-300">
                                        {material.materialName} (
                                        {material.quantity} un por pneu)
                                      </span>
                                      <span className="text-white">
                                        {formatCurrency(material.totalCost)}
                                      </span>
                                    </div>
                                  )
                                )}
                                <div className="flex justify-between items-center pt-1 border-t border-neon-green/20">
                                  <span className="text-neon-green font-medium">
                                    Custo de Materiais por Pneu:
                                  </span>
                                  <span className="text-neon-green font-bold">
                                    {formatCurrency(
                                      simulationRecipeAnalysis.recipeDetails
                                        .totalMaterialCost
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Manual Inputs Summary */}
                          {(simulationRecipeAnalysis.manualInputs
                            .cashFlowExpenses > 0 ||
                            simulationRecipeAnalysis.manualInputs
                              .productionLosses > 0 ||
                            simulationRecipeAnalysis.manualInputs.fixedCosts >
                              0 ||
                            simulationRecipeAnalysis.manualInputs.laborCosts >
                              0) && (
                            <div className="mt-4 p-3 bg-neon-orange/10 rounded-lg border border-neon-orange/30">
                              <h5 className="text-neon-orange font-medium mb-2 text-sm">
                                ⚙️ Valores Manuais Inseridos:
                              </h5>
                              <div className="space-y-1 text-xs">
                                {simulationRecipeAnalysis.manualInputs
                                  .fixedCosts > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-tire-300">
                                      Custos Fixos:
                                    </span>
                                    <span className="text-neon-blue font-bold">
                                      {formatCurrency(
                                        simulationRecipeAnalysis.manualInputs
                                          .fixedCosts
                                      )}
                                    </span>
                                  </div>
                                )}

                                {simulationRecipeAnalysis.manualInputs
                                  .cashFlowExpenses > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-tire-300">
                                      Saídas de Caixa:
                                    </span>
                                    <span className="text-neon-purple font-bold">
                                      {formatCurrency(
                                        simulationRecipeAnalysis.manualInputs
                                          .cashFlowExpenses
                                      )}
                                    </span>
                                  </div>
                                )}
                                {simulationRecipeAnalysis.manualInputs
                                  .productionLosses > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-tire-300">
                                      Perdas de Produção:
                                    </span>
                                    <span className="text-red-400 font-bold">
                                      {formatCurrency(
                                        simulationRecipeAnalysis.manualInputs
                                          .productionLosses
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-4 bg-red-900/20 rounded-lg border border-red-500/30">
                          <p className="text-red-400 text-sm">
                            ⚠️{" "}
                            {simulationRecipeAnalysis.error ||
                              "Esta receita não possui dados de custo válidos."}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : simulationMode === "multiple" &&
                    multipleRecipesAnalysis ? (
                    <div className="space-y-4">
                      {/* Multiple Recipes Summary */}
                      <div className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
                        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                          <Layers className="h-4 w-4 text-neon-purple" />
                          Simulação com Múltiplas Receitas
                          <span className="text-xs text-tire-400">
                            ({multipleRecipesAnalysis.recipes.length} receitas)
                          </span>
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-tire-300">
                                Total de Pneus:
                              </span>
                              <span className="text-white font-bold">
                                {multipleRecipesAnalysis.totalQuantity} pneus
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-tire-300">
                                Custo Total:
                              </span>
                              <span className="text-neon-green font-bold">
                                {formatCurrency(
                                  multipleRecipesAnalysis.totalCost
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-tire-300">
                                Custo Médio por Pneu:
                              </span>
                              <span className="text-neon-orange font-bold">
                                {formatCurrency(
                                  multipleRecipesAnalysis.averageCostPerTire
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-tire-300 text-xs">
                                Materiais (Média):
                              </span>
                              <span className="text-neon-yellow font-medium text-xs">
                                {formatCurrency(
                                  multipleRecipesAnalysis.averageBreakdown
                                    .materialCost
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-tire-300 text-xs">
                                Custos Fixos (Média):
                              </span>
                              <span className="text-neon-blue font-medium text-xs">
                                {formatCurrency(
                                  multipleRecipesAnalysis.averageBreakdown
                                    .fixedCost
                                )}
                              </span>
                            </div>
                            {simulationCostOptions.includeLaborCosts && (
                              <div className="flex justify-between">
                                <span className="text-tire-300 text-xs">
                                  Mão de Obra (Média):
                                </span>
                                <span className="text-neon-green font-medium text-xs">
                                  {formatCurrency(
                                    multipleRecipesAnalysis.averageBreakdown
                                      .laborCost
                                  )}
                                </span>
                              </div>
                            )}
                            {simulationCostOptions.includeCashFlowExpenses && (
                              <div className="flex justify-between">
                                <span className="text-tire-300 text-xs">
                                  Saídas de Caixa (Média):
                                </span>
                                <span className="text-neon-purple font-medium text-xs">
                                  {formatCurrency(
                                    multipleRecipesAnalysis.averageBreakdown
                                      .cashFlowCost
                                  )}
                                </span>
                              </div>
                            )}
                            {simulationCostOptions.includeProductionLosses && (
                              <div className="flex justify-between">
                                <span className="text-tire-300 text-xs">
                                  Perdas (Média):
                                </span>
                                <span className="text-red-400 font-medium text-xs">
                                  {formatCurrency(
                                    multipleRecipesAnalysis.averageBreakdown
                                      .productionLossCost
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Individual Recipe Details */}
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        <h5 className="text-tire-300 font-medium text-sm">
                          Detalhes por Receita:
                        </h5>
                        {multipleRecipesAnalysis.recipes.map((recipe) => (
                          <div
                            key={recipe.recipeId}
                            className={`p-3 rounded-lg border ${
                              recipe.hasRecipe
                                ? "bg-factory-700/20 border-tire-600/20"
                                : "bg-red-900/10 border-red-500/20"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="text-white font-medium text-sm">
                                {recipe.recipeName}
                              </h6>
                              <div className="text-right">
                                <span className="text-neon-orange font-bold text-sm">
                                  {recipe.hasRecipe
                                    ? formatCurrency(recipe.costPerTire)
                                    : "N/A"}
                                </span>
                                <p className="text-tire-400 text-xs">
                                  por pneu
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div className="flex justify-between">
                                <span className="text-tire-400">
                                  Quantidade:
                                </span>
                                <span className="text-white">
                                  {recipe.quantity} pneus
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-tire-400">
                                  Custo Total:
                                </span>
                                <span className="text-neon-green font-medium">
                                  {recipe.hasRecipe
                                    ? formatCurrency(recipe.totalCost)
                                    : "N/A"}
                                </span>
                              </div>
                            </div>
                            {!recipe.hasRecipe && recipe.error && (
                              <p className="text-red-400 text-xs mt-2">
                                ⚠️ {recipe.error}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Manual Inputs Summary for Multiple Recipes */}
                      {(multipleRecipesAnalysis.manualInputs.cashFlowExpenses >
                        0 ||
                        multipleRecipesAnalysis.manualInputs.productionLosses >
                          0 ||
                        multipleRecipesAnalysis.manualInputs.fixedCosts > 0 ||
                        multipleRecipesAnalysis.manualInputs.laborCosts >
                          0) && (
                        <div className="mt-4 p-3 bg-neon-orange/10 rounded-lg border border-neon-orange/30">
                          <h5 className="text-neon-orange font-medium mb-2 text-sm">
                            ⚙️ Valores Manuais Aplicados a Todas as Receitas:
                          </h5>
                          <div className="space-y-1 text-xs">
                            {multipleRecipesAnalysis.manualInputs.fixedCosts >
                              0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-tire-300">
                                  Custos Fixos:
                                </span>
                                <span className="text-neon-blue font-bold">
                                  {formatCurrency(
                                    multipleRecipesAnalysis.manualInputs
                                      .fixedCosts
                                  )}
                                </span>
                              </div>
                            )}

                            {multipleRecipesAnalysis.manualInputs
                              .cashFlowExpenses > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-tire-300">
                                  Saídas de Caixa:
                                </span>
                                <span className="text-neon-purple font-bold">
                                  {formatCurrency(
                                    multipleRecipesAnalysis.manualInputs
                                      .cashFlowExpenses
                                  )}
                                </span>
                              </div>
                            )}
                            {multipleRecipesAnalysis.manualInputs
                              .productionLosses > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-tire-300">
                                  Perdas de Produção:
                                </span>
                                <span className="text-red-400 font-bold">
                                  {formatCurrency(
                                    multipleRecipesAnalysis.manualInputs
                                      .productionLosses
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Zap className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                      <p className="text-tire-400">
                        {simulationMode === "single"
                          ? "Selecione uma receita e defina a quantidade de pneus para ver a simulação de custo"
                          : "Adicione receitas à simulação para ver o custo médio entre todas as receitas selecionadas"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TireCostManager;
