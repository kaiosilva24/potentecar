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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Filter,
  Calendar,
  Package,
  Target,
  Percent,
  Calculator,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
import { dataManager } from "@/utils/dataManager";

// 🔧 DEBUG FLAGS - Desabilitar logs para máxima performance
// Mude para true apenas quando precisar debugar categorias específicas
const DEBUG_LOGS = {
  COST_OPTIONS: false,        // Mudanças nas opções de custo do TireCostManager
  RECIPE_SEARCH: false,        // Busca e processamento de receitas
  PRODUCTION_LOSSES: false,    // Cálculo de perdas de produção e matéria-prima
  DEFECTIVE_SALES: false,      // Vendas de pneus defeituosos
  WARRANTY_CALC: false,        // Cálculo de valores de garantia
  COST_BREAKDOWN: false,       // Breakdown detalhado dos custos
  SALE_PROCESSING: false,      // Processamento individual de vendas
  FILTERS_STATS: false,        // Filtros e estatísticas
  ALL: false                   // Master switch - ativa TODOS os logs
};

// Função helper para verificar se deve logar
const shouldLog = (category: keyof typeof DEBUG_LOGS): boolean => {
  return DEBUG_LOGS.ALL || DEBUG_LOGS[category];
};

interface PresumedProfitManagerProps {
  isLoading?: boolean;
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
  hideCharts?: boolean; // Ocultar gráficos quando usado apenas para cálculos
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

const PresumedProfitManager = ({
  isLoading = false,
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
  hideCharts = false,
}: PresumedProfitManagerProps) => {
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sortBy, setSortBy] = useState<"profit" | "revenue" | "margin">(
    "profit",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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
    if (shouldLog('COST_OPTIONS')) {
      console.log(
        "🔄 [PresumedProfitManager] Opções de custo do TireCostManager alteradas:",
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
    }
    setLastCostOptionsUpdate(Date.now());
  }, [
    isIncludingLaborCosts,
    isIncludingCashFlowExpenses,
    isIncludingProductionLosses,
    isIncludingDefectiveTireSales,
    isIncludingWarrantyValues,
    isDividingByProduction,
  ]);

  // Calculate recipe-based cost per tire (same logic as TireCostManager)
  const calculateRecipeCost = (productName: string) => {
    if (shouldLog('RECIPE_SEARCH')) {
      console.log(
        `🔍 [PresumedProfitManager] Buscando receita para produto: "${productName}"`,
      );
      console.log(
        `🔍 [PresumedProfitManager] Receitas disponíveis (${recipes.length}):`,
        recipes.map((r) => ({
          id: r.id,
          product_name: r.product_name,
          archived: r.archived,
          materials_count: r.materials?.length || 0,
        })),
      );
      console.log(
        `🔍 [PresumedProfitManager] StockItems disponíveis (${stockItems.length}):`,
        stockItems
          .filter((item) => item.item_type === "material")
          .map((s) => ({
            id: s.item_id,
            name: s.item_name,
            type: s.item_type,
            unit_cost: s.unit_cost,
            quantity: s.quantity,
          })),
      );
    }
    const recipe = recipes.find((r) => {
      const nameMatch =
        r.product_name.toLowerCase().trim() ===
        productName.toLowerCase().trim();
      const notArchived = !r.archived;
      return nameMatch && notArchived;
    });

    if (shouldLog('RECIPE_SEARCH')) {
      console.log(
        `🔍 [PresumedProfitManager] Receita encontrada:`,
        recipe ? {
          id: recipe.id,
          product_name: recipe.product_name,
          materials_count: recipe.materials?.length || 0,
        } : "Nenhuma receita encontrada",
      );
    }

    const materialCosts = recipe?.materials.map((material) => {
      // Find the material in stock to get current price
      const stockMaterial = stockItems.find((item) => {
        const isTypeMaterial = item.item_type === "material";
        const idMatch = item.item_id === material.material_id;
        const nameMatch =
          item.item_name.toLowerCase().trim() ===
          material.material_name.toLowerCase().trim();
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

      // Log warning if material not found
      if (!stockMaterial && shouldLog('RECIPE_SEARCH')) {
        console.warn(
          `⚠️ [PresumedProfitManager] Material "${material.material_name}" (ID: ${material.material_id}) não encontrado no estoque. Usando custo zero.`,
        );
      }

      // Log removido para melhorar performance

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

    // Check for missing materials
    const missingMaterials = materialCosts.filter((mat) => mat.totalCost === 0);
    if (missingMaterials.length > 0 && shouldLog('RECIPE_SEARCH')) {
      console.warn(
        `⚠️ [PresumedProfitManager] Receita para "${productName}" tem ${missingMaterials.length} materiais com custo zero:`,
        missingMaterials.map((mat) => mat.materialName),
      );
    }

    if (shouldLog('RECIPE_SEARCH')) {
      console.log(`✅ [PresumedProfitManager] Custo da receita calculado:`, {
        productName,
        totalMaterialCost,
        materialsCount: materialCosts.length,
        materialsWithCost: materialCosts.filter((mat) => mat.totalCost > 0)
          .length,
        materialsWithoutCost: missingMaterials.length,
        materials: materialCosts,
      });
    }

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
    if (shouldLog('PRODUCTION_LOSSES')) {
      console.log(
        `🔍 [PresumedProfitManager] Calculando perdas de produção e matéria-prima para: "${productName}"`,
      );
    }

    const productEntries = productionEntries.filter(
      (entry) =>
        entry.product_name.toLowerCase().trim() ===
        productName.toLowerCase().trim(),
    );

    if (shouldLog('PRODUCTION_LOSSES')) {
      console.log(
        `📊 [PresumedProfitManager] Entradas de produção encontradas para ${productName}:`,
        productEntries.length,
      );
    }

    let totalLossQuantity = 0;
    let totalLossValue = 0;
    let totalMaterialLossValue = 0;

    productEntries.forEach((entry) => {
      const lossQuantity = entry.production_loss || 0;
      let entryMaterialLossValue = 0;

      // Calculate material losses for this entry
      if (entry.material_loss && Array.isArray(entry.material_loss)) {
        if (shouldLog('PRODUCTION_LOSSES')) {
          console.log(
            `🔍 [PresumedProfitManager] Calculando perdas de matéria-prima para entrada ${entry.production_date}:`,
            entry.material_loss,
          );
        }

        entryMaterialLossValue = entry.material_loss.reduce(
          (total: number, materialLoss: any) => {
            const stockItem = stockItems.find(
              (item) => item.item_id === materialLoss.material_id,
            );
            const lossValue = stockItem
              ? stockItem.unit_cost * materialLoss.quantity_lost
              : 0;

            if (shouldLog('PRODUCTION_LOSSES')) {
              console.log(
                `📉 [PresumedProfitManager] Perda de material ${materialLoss.material_name}:`,
                {
                  material_id: materialLoss.material_id,
                  quantity_lost: materialLoss.quantity_lost,
                  unit_cost: stockItem?.unit_cost || 0,
                  loss_value: lossValue,
                },
              );
            }

            return total + lossValue;
          },
          0,
        );

        totalMaterialLossValue += entryMaterialLossValue;
        if (shouldLog('PRODUCTION_LOSSES')) {
          console.log(
            `💸 [PresumedProfitManager] Total de perdas de matéria-prima na entrada ${entry.production_date}: ${entryMaterialLossValue}`,
          );
        }
      }

      // Calculate production losses (existing logic)
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

        if (shouldLog('PRODUCTION_LOSSES')) {
          console.log(
            `📉 [PresumedProfitManager] Perda de produção encontrada em ${entry.production_date}:`,
            {
              lossQuantity,
              materialCostForEntry,
              costPerUnit,
              productionLossValue: entryProductionLossValue,
            },
          );
        }
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

    const result = {
      totalLossQuantity,
      totalLossValue,
      totalMaterialLossValue,
      lossPercentage,
    };

    if (shouldLog('PRODUCTION_LOSSES')) {
      console.log(
        `✅ [PresumedProfitManager] Perdas totais calculadas para ${productName}:`,
        {
          totalProductionLossValue: totalLossValue - totalMaterialLossValue,
          totalMaterialLossValue,
          totalCombinedLossValue: totalLossValue,
          lossPercentage,
        },
      );
    }

    return result;
  };

  // Calculate total defective tire sales
  const calculateDefectiveTireSalesTotal = () => {
    if (shouldLog('DEFECTIVE_SALES')) {
      console.log(
        `🔍 [PresumedProfitManager] Calculando total de vendas de pneus defeituosos:`,
        {
          totalSales: defectiveTireSales.length,
          sales: defectiveTireSales.map((sale) => ({
            id: sale.id,
            tire_name: sale.tire_name,
            quantity: sale.quantity,
            sale_value: sale.sale_value,
            sale_date: sale.sale_date,
          })),
        },
      );
    }

    const totalValue = defectiveTireSales.reduce(
      (total, sale) => total + sale.sale_value,
      0,
    );

    if (shouldLog('DEFECTIVE_SALES')) {
      console.log(
        `✅ [PresumedProfitManager] Total de vendas de pneus defeituosos calculado: ${totalValue}`,
      );
    }

    return totalValue;
  };

  // Calculate warranty value for a specific product
  const calculateWarrantyValue = (productName: string) => {
    // DEBUG: Desabilitado para performance - use DEBUG_LOGS.WARRANTY_CALC = true para reativar
    // console.log(
    //   `🔍 [PresumedProfitManager] Calculando valor de garantia para produto: "${productName}"`,
    // );

    const productWarranties = warrantyEntries.filter(
      (warranty) =>
        warranty.product_name.toLowerCase().trim() ===
        productName.toLowerCase().trim(),
    );

    // DEBUG: Desabilitado para performance
    // console.log(
    //   `📊 [PresumedProfitManager] Garantias encontradas para ${productName}:`,
    //   productWarranties.length,
    // );

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
        // DEBUG: Desabilitado para performance
        // console.log(`💰 [PresumedProfitManager] Valor da garantia calculado:`, {
        //   product: warranty.product_name,
        //   quantity: warranty.quantity,
        //   recipeCost: recipeData.recipeCost,
        //   totalValue: warrantyValue,
        // });
      } else {
        // DEBUG: Desabilitado para performance
        // console.warn(
        //   `⚠️ [PresumedProfitManager] Receita não encontrada para produto da garantia: ${warranty.product_name}`,
        // );
      }

      totalWarrantyQuantity += warranty.quantity;
      totalWarrantyValue += warrantyValue;
    });

    const result = {
      totalWarrantyQuantity,
      totalWarrantyValue,
      warrantyCount: productWarranties.length,
    };

    // DEBUG: Desabilitado para performance
    // console.log(
    //   `✅ [PresumedProfitManager] Valor total de garantia calculado para ${productName}:`,
    //   {
    //     totalQuantity: totalWarrantyQuantity,
    //     totalValue: totalWarrantyValue,
    //     warrantyCount: productWarranties.length,
    //   },
    // );

    return result;
  };

  // Helper function to get specific cost from TireCostManager (same logic as StockCharts)
  const getSpecificCostFromTireCostManager = (productName: string): number => {
    try {
      // Primeiro, tentar buscar dados existentes do TireCostManager
      const productKey = `tireAnalysis_${productName.toLowerCase().replace(/\s+/g, "_")}`;
      const savedAnalysis = localStorage.getItem(productKey);

      if (savedAnalysis) {
        const analysis = JSON.parse(savedAnalysis);
        if (analysis.costPerTire && analysis.costPerTire > 0) {
          console.log(
            `✅ [PresumedProfitManager] Usando custo do TIRECOSTMANAGER para ${productName}:`,
            {
              productName,
              costPerTire: analysis.costPerTire,
              source: "TireCostManager (localStorage)"
            }
          );
          return analysis.costPerTire;
        }
      }

      // Fallback: Custo médio sincronizado
      const synchronizedData = localStorage.getItem("dashboard_averageCostPerTire");
      if (synchronizedData) {
        const data = JSON.parse(synchronizedData);
        if (data.value && data.value > 0) {
          console.log(
            `⚠️ [PresumedProfitManager] Usando custo médio para ${productName}:`,
            {
              productName,
              averageCost: data.value,
              source: "Custo médio (fallback)"
            }
          );
          return data.value;
        }
      }

      return 0;
    } catch (error) {
      console.error(`❌ [PresumedProfitManager] Erro ao obter custo do TireCostManager para "${productName}":`, error);
      return 0;
    }
  };

  // Calculate complete tire cost using the same logic as TireCostManager
  // SINCRONIZADO com as opções do TireCostManager
  const calculateTireCost = (productName: string): number => {
    // CORREÇÃO DEFINITIVA: Usar custo do TireCostManager (Custo por Pneu)
    // Este é o custo correto que é atualizado dinamicamente
    const tireCostFromManager = getSpecificCostFromTireCostManager(productName);
    
    if (tireCostFromManager > 0) {
      return tireCostFromManager;
    }

    // Fallback 1: Buscar no estoque de produtos finais
    const productInStock = stockItems.find((item) => {
      const isProduct = item.item_type === "product";
      const nameMatch = item.item_name.toLowerCase().trim() === productName.toLowerCase().trim();
      return isProduct && nameMatch;
    });

    if (productInStock && productInStock.unit_cost > 0) {
      console.log(
        `⚠️ [PresumedProfitManager] TireCostManager não encontrado, usando estoque para ${productName}:`,
        {
          productName,
          unit_cost: productInStock.unit_cost,
          source: "stock_items (fallback)"
        }
      );
      return productInStock.unit_cost;
    }

    // Fallback 2: Usar custo da receita (matéria-prima)
    console.warn(
      `⚠️ [PresumedProfitManager] Produto ${productName} não encontrado no TireCostManager nem no estoque, usando custo da receita como último fallback`
    );
    
    const recipeData = calculateRecipeCost(productName);
    if (!recipeData.hasRecipe) {
      console.warn(
        `⚠️ [PresumedProfitManager] Produto ${productName} sem receita, estoque e TireCostManager - usando custo zero`,
      );
      return 0;
    }

    // Base cost: material cost from recipe (apenas como último fallback)
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

    // DEBUG: Desabilitado para performance
    // console.log(
    //   `📊 [PresumedProfitManager] Dados de produção para ${productName}:`,
    //   {
    //     totalProduced,
    //     totalSold,
    //     productionQuantity,
    //     recipeCost: recipeData.recipeCost,
    //   },
    // );

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

    // DEBUG: Desabilitado para performance
    // console.log(`💰 [PresumedProfitManager] Custos totais disponíveis:`, {
    //   totalLaborCosts,
    //   totalCashFlowExpenses,
    //   productionLossValue: productionLossData?.totalLossValue || 0,
    //   totalDefectiveTireSales,
    //   warrantyValue: warrantyData?.totalWarrantyValue || 0,
    // });

    // SINCRONIZAÇÃO: Usar as mesmas opções do TireCostManager
    // DEBUG: Desabilitado para performance
    // console.log(
    //   `🔗 [PresumedProfitManager] APLICANDO configurações sincronizadas do TireCostManager:`,
    //   {
    //     isIncludingLaborCosts,
    //     isIncludingCashFlowExpenses,
    //     isIncludingProductionLosses,
    //     isIncludingDefectiveTireSales,
    //     isDividingByProduction,
    //   },
    // );

    // Add labor costs (SOMENTE se habilitado no TireCostManager)
    // CORREÇÃO: Não dividir TODO o salário dos funcionários pela produção de um produto específico
    if (isIncludingLaborCosts && totalLaborCosts > 0) {
      // DESABILITADO: laborCostComponent = totalLaborCosts / productionQuantity;
      laborCostComponent = 0; // Temporariamente zerado para corrigir cálculos
      totalCost += laborCostComponent;
      // DEBUG: Desabilitado para performance
      // console.log(
      //   `👥 [PresumedProfitManager] Custos de mão de obra TEMPORARIAMENTE ZERADOS para corrigir cálculos absurdos`,
      // );
    } else if (!isIncludingLaborCosts) {
      // DEBUG: Desabilitado para performance
      // console.log(
      //   `👥 [PresumedProfitManager] Custos de mão de obra IGNORADOS (desabilitado no TireCostManager)`,
      // );
    }

    // Add cash flow expenses (SOMENTE se habilitado no TireCostManager)
    // CORREÇÃO: Não incluir TODOS os gastos de fluxo de caixa no custo do produto
    // Isso estava causando custos unitários absurdamente altos
    if (isIncludingCashFlowExpenses && totalCashFlowExpenses > 0) {
      // DESABILITADO: cashFlowCostComponent = totalCashFlowExpenses / productionQuantity;
      cashFlowCostComponent = 0; // Temporariamente zerado para corrigir cálculos
      totalCost += cashFlowCostComponent;
      // DEBUG: Desabilitado para performance
      // console.log(
      //   `💸 [PresumedProfitManager] Saídas de caixa TEMPORARIAMENTE ZERADAS para corrigir cálculos absurdos`,
      // );
    } else if (!isIncludingCashFlowExpenses) {
      // DEBUG: Desabilitado para performance
      // console.log(
      //   `💸 [PresumedProfitManager] Saídas de caixa IGNORADAS (desabilitado no TireCostManager)`,
      // );
    }

    // Add production losses (SOMENTE se habilitado no TireCostManager)
    // CORREÇÃO: Perdas de produção devem ser específicas do produto, não divididas por toda produção
    if (isIncludingProductionLosses && productionLossData?.totalLossValue > 0) {
      // DESABILITADO: productionLossCostComponent = productionLossData.totalLossValue / productionQuantity;
      productionLossCostComponent = 0; // Temporariamente zerado para corrigir cálculos
      totalCost += productionLossCostComponent;
      // DEBUG: Desabilitado para performance
      // console.log(
      //   `📉 [PresumedProfitManager] Perdas de produção TEMPORARIAMENTE ZERADAS para corrigir cálculos absurdos`,
      // );
    } else if (!isIncludingProductionLosses) {
      // DEBUG: Desabilitado para performance
      // console.log(
      //   `📉 [PresumedProfitManager] Perdas de produção IGNORADAS (desabilitado no TireCostManager)`,
      // );
    }

    // Subtract defective tire sales (SOMENTE se habilitado no TireCostManager)
    // CORREÇÃO: Vendas de defeituosos devem ser específicas do produto
    if (isIncludingDefectiveTireSales && totalDefectiveTireSales > 0) {
      // DESABILITADO: defectiveTireSalesCostComponent = -(totalDefectiveTireSales / productionQuantity);
      defectiveTireSalesCostComponent = 0; // Temporariamente zerado para corrigir cálculos
      totalCost += defectiveTireSalesCostComponent;
      // DEBUG: Desabilitado para performance
      // console.log(
      //   `🔧 [PresumedProfitManager] Vendas de pneus defeituosos TEMPORARIAMENTE ZERADAS para corrigir cálculos absurdos`,
      // );
    } else if (!isIncludingDefectiveTireSales) {
      // DEBUG: Desabilitado para performance
      // console.log(
      //   `🔧 [PresumedProfitManager] Vendas de pneus defeituosos IGNORADAS (desabilitado no TireCostManager)`,
      // );
    }

    // Add warranty costs (SOMENTE se habilitado no TireCostManager)
    // CORREÇÃO: Garantias devem ser específicas do produto
    if (isIncludingWarrantyValues && warrantyData?.totalWarrantyValue > 0) {
      // DESABILITADO: warrantyCostComponent = warrantyData.totalWarrantyValue / productionQuantity;
      warrantyCostComponent = 0; // Temporariamente zerado para corrigir cálculos
      totalCost += warrantyCostComponent;
      // DEBUG: Desabilitado para performance
      // console.log(
      //   `🛡️ [PresumedProfitManager] Valor de garantia TEMPORARIAMENTE ZERADO para corrigir cálculos absurdos`,
      // );
    } else if (!isIncludingWarrantyValues) {
      // DEBUG: Desabilitado para performance
      // console.log(
      //   `🛡️ [PresumedProfitManager] Valor de garantia IGNORADO (desabilitado no TireCostManager)`,
      // );
    }

    const result = {
      totalCost,
      materialCost: recipeData.recipeCost,
      laborCost: laborCostComponent,
      cashFlowCost: cashFlowCostComponent,
      productionLossCost: productionLossCostComponent,
      defectiveTireSalesCost: defectiveTireSalesCostComponent,
      warrantyCost: warrantyCostComponent,
    };

    // DEBUG: Desabilitado para performance
    // console.log(
    //   `🎯 [PresumedProfitManager] Custo final calculado para ${productName}:`,
    //   result,
    // );

    // console.log(
    //   `🔍 [PresumedProfitManager] BREAKDOWN DETALHADO DO CUSTO UNITÁRIO ${productName}:`,
    //   {
    //     custoMateriais: recipeData.recipeCost,
    //     custoMaoDeObra: laborCostComponent,
    //     custoFluxoCaixa: cashFlowCostComponent,
    //     custoPerdasProducao: productionLossCostComponent,
    //     custoVendasDefeituosos: defectiveTireSalesCostComponent,
    //     custoGarantia: warrantyCostComponent,
    //     custoTotalFinal: totalCost,
    //     quantidadeProducao: productionQuantity,
    //     formula: `(${recipeData.recipeCost} + ${laborCostComponent} + ${cashFlowCostComponent} + ${productionLossCostComponent} + ${defectiveTireSalesCostComponent} + ${warrantyCostComponent}) = ${totalCost}`,
    //   },
    // );

    return totalCost;
  };

  // Check if a product has a registered recipe - RIGOROSO: APENAS COM RECEITAS VÁLIDAS
  const hasRegisteredRecipe = (productName: string): boolean => {
    // Validação inicial: nome do produto deve existir e não estar vazio
    if (
      !productName ||
      productName.trim() === "" ||
      productName === "Produto Não Identificado"
    ) {
      // DEBUG: Desabilitado para performance
      // console.log(
      //   `🚫 [PresumedProfitManager] REJEITADO - Nome de produto inválido: "${productName}"`,
      //   {
      //     productName,
      //     reason: "Nome vazio, nulo ou não identificado",
      //   },
      // );
      return false;
    }

    // Buscar receita correspondente
    const recipe = recipes.find((r) => {
      const nameMatch =
        r.product_name.toLowerCase().trim() ===
        productName.toLowerCase().trim();
      const notArchived = !r.archived;
      const hasValidMaterials = r.materials && r.materials.length > 0;

      // Log removido para melhorar performance

      return nameMatch && notArchived && hasValidMaterials;
    });

    const hasRecipe = !!recipe;
    // Log removido para melhorar performance

    return hasRecipe;
  };

  // Filter cash flow entries by date - ONLY FINAL PRODUCTS WITH REGISTERED RECIPES
  const getFilteredSales = () => {
    // DEBUG: Desabilitado para performance - use DEBUG_LOGS.FILTERS_STATS = true para reativar
    // console.log(
    //   "🔍 [PresumedProfitManager] INICIANDO filtro de vendas - APENAS PRODUTOS FINAIS COM RECEITAS CADASTRADAS:",
    //   {
    //     totalCashFlowEntries: cashFlowEntries.length,
    //     totalRecipes: recipes.length,
    //     dateFilter,
    //     customStartDate,
    //     customEndDate,
    //   },
    // );

    const today = new Date();
    // FILTRO RIGOROSO PARA PRODUTOS FINAIS APENAS - Excluir produtos de revenda
    let filteredEntries = cashFlowEntries.filter((entry) => {
      const isIncomeVenda =
        entry.type === "income" && entry.category === "venda";

      if (!isIncomeVenda) return false;

      const description = entry.description || "";

      // PRIMEIRA VALIDAÇÃO: Excluir explicitamente produtos de revenda
      if (description.includes("TIPO_PRODUTO: revenda")) {
        // DEBUG: Desabilitado para performance
        // console.log(
        //   `🚫 [PresumedProfitManager] EXCLUINDO produto de revenda:`,
        //   {
        //     id: entry.id,
        //     description: description.substring(0, 100),
        //     reason: "Produto marcado como revenda",
        //   },
        // );
        return false;
      }

      // SEGUNDA VALIDAÇÃO: Verificar se é produto final ou sem tag
      const isFinalProduct =
        description.includes("TIPO_PRODUTO: final") ||
        !description.includes("TIPO_PRODUTO:");

      if (!isFinalProduct) {
        // DEBUG: Desabilitado para performance
        // console.log(
        //   `🚫 [PresumedProfitManager] EXCLUINDO - Não é produto final:`,
        //   {
        //     id: entry.id,
        //     description: description.substring(0, 100),
        //     reason: "Produto não marcado como final",
        //   },
        // );
        return false;
      }

      // TERCEIRA VALIDAÇÃO: Extrair nome do produto
      const productInfo = extractProductInfoFromSale(description);
      let productName = "";

      if (productInfo && productInfo.productName) {
        productName = productInfo.productName;
      } else {
        // Fallback: try to extract product name from description
        const match = description.match(/Produto: ([^|]+)/);
        if (match) {
          productName = match[1].trim();
        } else if (description.toLowerCase().includes("pneu")) {
          const tireMatch = description.match(/Pneu\s+([\w\/\-R]+)/i);
          if (tireMatch) {
            productName = `Pneu ${tireMatch[1]}`;
          } else {
            productName = description;
          }
        }
      }

      // QUARTA VALIDAÇÃO: Verificar se conseguimos extrair o nome do produto
      if (
        !productName ||
        productName === "Produto Não Identificado" ||
        productName.trim() === ""
      ) {
        // DEBUG: Desabilitado para performance
        // console.log(
        //   `🚫 [PresumedProfitManager] EXCLUINDO - Produto não identificado:`,
        //   {
        //     id: entry.id,
        //     productName: productName || "[VAZIO]",
        //     description: description.substring(0, 100),
        //     reason: "Nome do produto não pôde ser extraído da descrição",
        //   },
        // );
        return false;
      }

      // QUINTA VALIDAÇÃO (CRÍTICA): Verificar se o produto tem receita cadastrada válida
      const hasRecipe = hasRegisteredRecipe(productName);

      if (hasRecipe) {
        // DEBUG: Desabilitado para performance
        // console.log(
        //   `✅ [PresumedProfitManager] APROVADO - Produto final com receita válida:`,
        //   {
        //     id: entry.id,
        //     productName,
        //     hasFinalTag: description.includes("TIPO_PRODUTO: final"),
        //     hasNoTag: !description.includes("TIPO_PRODUTO:"),
        //     description: description.substring(0, 100),
        //   },
        // );
      } else {
        // DEBUG: Desabilitado para performance
        // console.log(
        //   `🚫 [PresumedProfitManager] REJEITADO - Produto final SEM receita cadastrada válida:`,
        //   {
        //     id: entry.id,
        //     productName,
        //     description: description.substring(0, 100),
        //     reason: "Receita não encontrada ou inválida no sistema de produção",
        //   },
        // );
      }

      return hasRecipe;
    });

    // DEBUG: Desabilitado para performance
    // console.log(
    //   "📊 [PresumedProfitManager] Vendas de PRODUTOS FINAIS COM RECEITAS encontradas antes do filtro de data:",
    //   {
    //     totalFinalProductSalesWithRecipesFound: filteredEntries.length,
    //     finalProductSalesEntries: filteredEntries.map((entry) => ({
    //       id: entry.id,
    //       amount: entry.amount,
    //       category: entry.category,
    //       type: entry.type,
    //       transaction_date: entry.transaction_date,
    //       description: entry.description?.substring(0, 50) + "...",
    //     })),
    //   },
    // );

    switch (dateFilter) {
      case "today":
        // WORKAROUND: Compensate for +1 day UTC workaround in sales saving
        // Since sales are saved with +1 day, we need to look for tomorrow's date
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
        
        console.log("🗓️ [PresumedProfitManager] TODAY FILTER DEBUG:", {
          originalToday: today.toISOString().split("T")[0],
          adjustedTomorrow: tomorrowStr,
          note: "Looking for tomorrow's date to compensate UTC workaround"
        });
        
        filteredEntries = filteredEntries.filter(
          // CORREÇÃO: Usar transaction_date em vez de date
          (entry) => entry.transaction_date === tomorrowStr,
        );
        console.log(
          `📅 [PresumedProfitManager] Filtro 'hoje' (${tomorrowStr}): ${filteredEntries.length} vendas de produtos finais com receitas`,
        );
        break;
      case "last7days":
        // WORKAROUND: Add +1 day to date range to compensate UTC workaround
        const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const todayEnd7 = new Date(today);
        todayEnd7.setDate(today.getDate() + 1); // Add +1 day
        filteredEntries = filteredEntries.filter((entry) => {
          // CORREÇÃO: Usar transaction_date em vez de date
          const entryDate = new Date(entry.transaction_date);
          return entryDate >= last7Days && entryDate <= todayEnd7;
        });
        console.log(
          `📅 [PresumedProfitManager] Filtro 'últimos 7 dias': ${filteredEntries.length} vendas de produtos finais com receitas`,
        );
        break;
      case "last30days":
        // WORKAROUND: Add +1 day to date range to compensate UTC workaround
        const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const todayEnd30 = new Date(today);
        todayEnd30.setDate(today.getDate() + 1); // Add +1 day
        filteredEntries = filteredEntries.filter((entry) => {
          // CORREÇÃO: Usar transaction_date em vez de date
          const entryDate = new Date(entry.transaction_date);
          return entryDate >= last30Days && entryDate <= todayEnd30;
        });
        console.log(
          `📅 [PresumedProfitManager] Filtro 'últimos 30 dias': ${filteredEntries.length} vendas de produtos finais com receitas`,
        );
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          // WORKAROUND: Add +1 day to custom dates to compensate UTC workaround
          const startDate = new Date(customStartDate);
          startDate.setDate(startDate.getDate() + 1);
          const endDate = new Date(customEndDate);
          endDate.setDate(endDate.getDate() + 1);
          
          console.log("🗓️ [PresumedProfitManager] CUSTOM FILTER DEBUG:", {
            originalStartDate: customStartDate,
            originalEndDate: customEndDate,
            adjustedStartDate: startDate.toISOString().split("T")[0],
            adjustedEndDate: endDate.toISOString().split("T")[0],
            note: "Added +1 day to compensate UTC workaround"
          });
          
          filteredEntries = filteredEntries.filter((entry) => {
            // CORREÇÃO: Usar transaction_date em vez de date
            const entryDate = new Date(entry.transaction_date);
            return entryDate >= startDate && entryDate <= endDate;
          });
          console.log(
            `📅 [PresumedProfitManager] Filtro personalizado (${customStartDate} a ${customEndDate}): ${filteredEntries.length} vendas de produtos finais com receitas`,
          );
        }
        break;
    }

    console.log(
      "✅ [PresumedProfitManager] RESULTADO FINAL do filtro de vendas de PRODUTOS FINAIS COM RECEITAS:",
      {
        totalFilteredFinalProductSalesWithRecipes: filteredEntries.length,
        dateFilter,
        filteredFinalProductSales: filteredEntries.map((entry) => ({
          id: entry.id,
          amount: entry.amount,
          transaction_date: entry.transaction_date,
          description: entry.description?.substring(0, 100) + "...",
        })),
      },
    );

    return filteredEntries;
  };

  // Extract product info from sale description (same logic as TireCostManager)
  const extractProductInfoFromSale = (description: string) => {
    try {
      console.log(
        "🔍 [FinalProductProfitManager] ANALISANDO descrição de venda de produto final:",
        {
          description,
          length: description?.length || 0,
        },
      );

      if (!description || description.trim() === "") {
        console.warn("⚠️ [FinalProductProfitManager] Descrição vazia ou nula");
        return null;
      }

      // Tentar múltiplos padrões de extração
      const productIdMatch = description.match(/ID_Produto: ([^\s|]+)/);
      const quantityMatch = description.match(/Qtd: ([0-9.,]+)/);
      const productNameMatch = description.match(/Produto: ([^|]+)/);
      const unitPriceMatch = description.match(/Preço Unit: R\$\s*([0-9.,]+)/);

      // Padrões alternativos
      const altProductIdMatch = description.match(
        /ID[_\s]*Produto[:\s]*([^\s|]+)/i,
      );
      const altQuantityMatch =
        description.match(/Qtd[:\s]*([0-9.,]+)/i) ||
        description.match(/Quantidade[:\s]*([0-9.,]+)/i);
      const altProductNameMatch =
        description.match(/Produto[:\s]*([^|]+)/i) ||
        description.match(/Nome[:\s]*([^|]+)/i);

      console.log("🔍 [FinalProductProfitManager] MATCHES encontrados:", {
        productIdMatch: productIdMatch?.[1],
        quantityMatch: quantityMatch?.[1],
        productNameMatch: productNameMatch?.[1]?.trim(),
        unitPriceMatch: unitPriceMatch?.[1],
        // Alternativos
        altProductIdMatch: altProductIdMatch?.[1],
        altQuantityMatch: altQuantityMatch?.[1],
        altProductNameMatch: altProductNameMatch?.[1]?.trim(),
      });

      // Usar matches principais ou alternativos
      const finalProductId = productIdMatch?.[1] || altProductIdMatch?.[1];
      const finalQuantity = quantityMatch?.[1] || altQuantityMatch?.[1];
      const finalProductName =
        productNameMatch?.[1]?.trim() || altProductNameMatch?.[1]?.trim();
      const finalUnitPrice = unitPriceMatch?.[1];

      if (finalProductId && finalQuantity) {
        const result = {
          productId: finalProductId,
          quantity: parseFloat(finalQuantity.replace(",", ".")),
          productName: finalProductName || "",
          unitPrice: finalUnitPrice
            ? parseFloat(finalUnitPrice.replace(",", "."))
            : 0,
        };
        console.log(
          "✅ [FinalProductProfitManager] PRODUTO FINAL EXTRAÍDO com sucesso:",
          result,
        );
        return result;
      } else {
        console.warn(
          "⚠️ [FinalProductProfitManager] NÃO foi possível extrair ID do produto final ou quantidade:",
          {
            description,
            finalProductId,
            finalQuantity,
            finalProductName,
          },
        );
      }
    } catch (error) {
      console.error(
        "❌ [FinalProductProfitManager] ERRO ao extrair informações do produto final:",
        {
          error: error instanceof Error ? error.message : error,
          description,
        },
      );
    }
    return null;
  };

  // Calculate profit data for each product
  const profitData = useMemo(() => {
    console.log(
      "🔄 [PresumedProfitManager] INICIANDO cálculo de dados de lucro - APENAS PRODUTOS FINAIS COM RECEITAS CADASTRADAS",
    );

    // PRIMEIRO: Verificar se temos dados de entrada
    console.log(
      "📋 [PresumedProfitManager] VERIFICAÇÃO INICIAL dos dados de entrada:",
      {
        totalCashFlowEntries: cashFlowEntries.length,
        totalRecipes: recipes.length,
        recipesAvailable: recipes.map((r) => ({
          id: r.id,
          product_name: r.product_name,
          archived: r.archived,
        })),
        incomeEntries: cashFlowEntries.filter((e) => e.type === "income")
          .length,
        vendaEntries: cashFlowEntries.filter(
          (e) => e.type === "income" && e.category === "venda",
        ).length,
        vendasEntries: cashFlowEntries.filter(
          (e) => e.type === "income" && e.category === "Vendas",
        ).length,
        allCategories: [
          ...new Set(cashFlowEntries.map((e) => e.category)),
        ].sort(),
        sampleEntries: cashFlowEntries
          .filter((e) => e.type === "income")
          .slice(0, 3)
          .map((e) => ({
            id: e.id,
            type: e.type,
            category: e.category,
            amount: e.amount,
            transaction_date: e.transaction_date,
            description: e.description?.substring(0, 100),
          })),
      },
    );

    const salesEntries = getFilteredSales();
    const productMap = new Map<string, ProfitData>();

    console.log(
      "📊 [PresumedProfitManager] RESULTADO da filtragem de vendas de produtos finais COM RECEITAS:",
      {
        totalSalesEntriesWithRecipes: salesEntries.length,
        dateFilter,
        customStartDate,
        customEndDate,
        salesEntriesDetails: salesEntries.map((entry) => ({
          id: entry.id,
          amount: entry.amount,
          category: entry.category,
          type: entry.type,
          transaction_date: entry.transaction_date,
          reference_name: entry.reference_name,
          description: entry.description?.substring(0, 150),
        })),
      },
    );

    // ALERTA se não encontramos vendas
    if (salesEntries.length === 0) {
      console.warn(
        "⚠️ [PresumedProfitManager] ATENÇÃO: Nenhuma venda de produto final COM RECEITA CADASTRADA encontrada no histórico!",
        {
          possibleReasons: [
            "Categoria incorreta (deveria ser 'venda' minúsculo)",
            "Tipo incorreto (deveria ser 'income')",
            "Filtro de data muito restritivo",
            "Dados de cashFlowEntries vazios ou incorretos",
            "Todas as vendas são de produtos de revenda (TIPO_PRODUTO: revenda)",
            "NOVO: Produtos não possuem receitas cadastradas no sistema de produção",
            "NOVO: Nomes dos produtos nas vendas não coincidem com os nomes nas receitas",
          ],
          debugInfo: {
            totalCashFlowEntries: cashFlowEntries.length,
            totalRecipes: recipes.length,
            dateFilter,
            customStartDate,
            customEndDate,
          },
        },
      );
    }

    salesEntries.forEach((entry, index) => {
      console.log(
        `🔍 [PresumedProfitManager] Processando venda de produto final COM RECEITA VÁLIDA ${index + 1}:`,
        {
          id: entry.id,
          amount: entry.amount,
          reference_name: entry.reference_name,
          description: entry.description,
          transaction_date: entry.transaction_date,
        },
      );

      const productInfo = extractProductInfoFromSale(entry.description || "");
      let productName = "";
      let quantity = 1;

      if (productInfo && productInfo.productName) {
        productName = productInfo.productName;
        quantity = productInfo.quantity;
        console.log(
          `🎯 [PresumedProfitManager] Produto final COM RECEITA VÁLIDA identificado:`,
          {
            productName,
            quantity,
            productId: productInfo.productId,
            hasRecipe: hasRegisteredRecipe(productName),
          },
        );
      } else {
        // Fallback: try to extract product name from description
        if (entry.description) {
          const match = entry.description.match(/Produto: ([^|]+)/);
          if (match) {
            productName = match[1].trim();
            console.log(
              `🔄 [PresumedProfitManager] Produto final extraído por fallback: ${productName}`,
            );
          } else if (entry.description.toLowerCase().includes("pneu")) {
            const tireMatch = entry.description.match(/Pneu\s+([\w\/\-R]+)/i);
            if (tireMatch) {
              productName = `Pneu ${tireMatch[1]}`;
            } else {
              productName = entry.description;
            }
            console.log(
              `🔄 [PresumedProfitManager] Produto final de pneu extraído: ${productName}`,
            );
          }
        }
      }

      // VALIDAÇÃO ADICIONAL: Garantir que o produto tem receita válida
      if (
        !productName ||
        productName.trim() === "" ||
        !hasRegisteredRecipe(productName)
      ) {
        console.error(
          `❌ [PresumedProfitManager] ERRO CRÍTICO - Produto sem receita válida chegou ao processamento:`,
          {
            id: entry.id,
            productName: productName || "[VAZIO]",
            hasRecipe: productName ? hasRegisteredRecipe(productName) : false,
            description: entry.description?.substring(0, 100),
          },
        );
        // Pular este item - não deveria chegar aqui se o filtro estiver funcionando
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
      };

      // Calculate cost using the same logic as TireCostManager
      const unitCost = calculateTireCost(productName);
      const revenue = entry.amount;
      const totalCostForSale = unitCost * quantity;
      const profit = revenue - totalCostForSale;

      console.log(
        `💰 [PresumedProfitManager] Cálculo de lucro para produto final COM RECEITA VÁLIDA ${productName}:`,
        {
          quantity,
          unitCost,
          revenue,
          totalCostForSale,
          profit,
          hasValidRecipe: hasRegisteredRecipe(productName),
          recipeVerified: "✅ CONFIRMADO",
          formula: `${unitCost} (custo unitário) × ${quantity} (qtd vendida) = ${totalCostForSale} (custo total)`,
        },
      );

      existing.totalSales += quantity;
      existing.totalRevenue += revenue;
      existing.totalCost += totalCostForSale;
      existing.totalProfit += profit;
      existing.salesCount += 1;

      productMap.set(productName, existing);

      console.log(
        `📈 [PresumedProfitManager] Dados atualizados para produto final COM RECEITA VÁLIDA ${productName}:`,
        {
          totalSales: existing.totalSales,
          totalRevenue: existing.totalRevenue,
          totalCost: existing.totalCost,
          totalProfit: existing.totalProfit,
          salesCount: existing.salesCount,
          recipeStatus: "✅ VÁLIDA E CONFIRMADA",
        },
      );
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

    console.log(
      "📊 [PresumedProfitManager] Resumo final dos dados de lucro de produtos finais COM RECEITAS VÁLIDAS:",
      result.map((item) => ({
        productName: item.productName,
        totalSales: item.totalSales,
        totalRevenue: item.totalRevenue,
        totalCost: item.totalCost,
        totalProfit: item.totalProfit,
        profitMargin: item.profitMargin,
        recipeStatus: hasRegisteredRecipe(item.productName)
          ? "✅ VÁLIDA"
          : "❌ INVÁLIDA",
      })),
    );

    // VALIDAÇÃO FINAL: Garantir que todos os produtos no resultado têm receitas válidas
    const invalidProducts = result.filter(
      (item) => !hasRegisteredRecipe(item.productName),
    );
    if (invalidProducts.length > 0) {
      console.error(
        "❌ [PresumedProfitManager] ERRO CRÍTICO - Produtos sem receitas válidas no resultado final:",
        invalidProducts.map((item) => ({
          productName: item.productName,
          totalSales: item.totalSales,
          reason: "Receita não encontrada ou inválida",
        })),
      );
      // Filtrar produtos inválidos do resultado final
      const validResult = result.filter((item) =>
        hasRegisteredRecipe(item.productName),
      );
      console.log(
        `🔧 [PresumedProfitManager] CORREÇÃO APLICADA - Removidos ${invalidProducts.length} produtos inválidos. Produtos válidos restantes: ${validResult.length}`,
      );
      return validResult;
    }

    // Sort data by profit (default sorting)
    result.sort((a, b) => {
      const aValue = a.totalProfit;
      const bValue = b.totalProfit;
      return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
    });

    return result;
  }, [
    cashFlowEntries,
    dateFilter,
    customStartDate,
    customEndDate,
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

  // Log de debug para verificar se o componente está sendo renderizado
  useEffect(() => {
    console.log('🏭 [PresumedProfitManager] Componente renderizado/montado');
    console.log('📊 [PresumedProfitManager] summaryMetrics atual:', {
      averageProfitPerTire: summaryMetrics.averageProfitPerTire,
      totalRevenue: summaryMetrics.totalRevenue,
      totalCost: summaryMetrics.totalCost,
      totalProfit: summaryMetrics.totalProfit,
      totalSales: summaryMetrics.totalSales,
      overallProfitMargin: summaryMetrics.overallProfitMargin
    });
  }, []);

  // Salvar lucro médio por pneu quando summaryMetrics mudarem
  useEffect(() => {
    const saveAverageProfitPerTire = async () => {
      console.log(`🔍 [PresumedProfitManager] useEffect executado - averageProfitPerTire: R$ ${summaryMetrics.averageProfitPerTire.toFixed(2)}`);
      console.log(`📊 [PresumedProfitManager] Valor bruto:`, summaryMetrics.averageProfitPerTire);
      console.log(`📊 [PresumedProfitManager] Tipo do valor:`, typeof summaryMetrics.averageProfitPerTire);
      console.log(`📊 [PresumedProfitManager] Valor > 0?`, summaryMetrics.averageProfitPerTire > 0);
      
      // Forçar salvamento mesmo se o valor for 0 para debug
      if (summaryMetrics.averageProfitPerTire >= 0) {
        try {
          console.log(`💰 [PresumedProfitManager] Salvando lucro médio por pneu: R$ ${summaryMetrics.averageProfitPerTire.toFixed(2)}`);
          console.log(`📊 [PresumedProfitManager] Valor formatado na UI: R$ ${summaryMetrics.averageProfitPerTire.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
          
          // Salva no Supabase e localStorage
          const success = await dataManager.saveAverageTireProfit(summaryMetrics.averageProfitPerTire);
          
          if (success) {
            console.log(`✅ [PresumedProfitManager] Lucro médio por pneu salvo com sucesso: R$ ${summaryMetrics.averageProfitPerTire.toFixed(2)}`);
            
            // Dispara evento customizado para notificar outros componentes
            const event = new CustomEvent('tireProfitUpdated', {
              detail: {
                profit: summaryMetrics.averageProfitPerTire,
                timestamp: Date.now(),
                source: 'PresumedProfitManager'
              }
            });
            window.dispatchEvent(event);
            console.log(`📢 [PresumedProfitManager] Evento customizado disparado com valor: R$ ${summaryMetrics.averageProfitPerTire.toFixed(2)}`);
          } else {
            console.warn('⚠️ [PresumedProfitManager] Falha ao salvar lucro médio por pneu');
          }
        } catch (error) {
          console.error('❌ [PresumedProfitManager] Erro ao salvar lucro médio por pneu:', error);
        }
      } else {
        console.log(`⚠️ [PresumedProfitManager] Valor zero ou negativo, não salvando: R$ ${summaryMetrics.averageProfitPerTire.toFixed(2)}`);
      }
    };

    saveAverageProfitPerTire();
  }, [summaryMetrics.averageProfitPerTire]);

  // Salvar lucro empresarial total quando summaryMetrics mudarem
  useEffect(() => {
    const saveBusinessValue = async () => {
      console.log(`💼 [PresumedProfitManager] Salvando Valor Empresarial e Lucro Empresarial: R$ ${summaryMetrics.totalProfit.toFixed(2)}`);
      
      if (summaryMetrics.totalProfit >= 0) {
        try {
          // Salvar o lucro total como valor empresarial no banco de dados
          const businessValueSuccess = await dataManager.saveBusinessValue(summaryMetrics.totalProfit);
          
          // Salvar também como lucro empresarial separadamente
          const businessProfitSuccess = await dataManager.saveBusinessProfit(summaryMetrics.totalProfit);
          
          if (businessValueSuccess && businessProfitSuccess) {
            console.log(`✅ [PresumedProfitManager] Valor Empresarial e Lucro Empresarial salvos com sucesso: R$ ${summaryMetrics.totalProfit.toFixed(2)}`);
          } else {
            console.warn('⚠️ [PresumedProfitManager] Falha ao salvar alguns valores:', {
              businessValue: businessValueSuccess,
              businessProfit: businessProfitSuccess
            });
          }
        } catch (error) {
          console.error('❌ [PresumedProfitManager] Erro ao salvar valores empresariais:', error);
        }
      } else {
        console.log(`⚠️ [PresumedProfitManager] Valores zero ou negativos, não salvando: R$ ${summaryMetrics.totalProfit.toFixed(2)}`);
      }
    };

    saveBusinessValue();
  }, [summaryMetrics.totalProfit]);

  // Listener para forçar recálculo quando há vendas
  useEffect(() => {
    const handleForceRecalc = () => {
      console.log('🔄 [PresumedProfitManager] Recálculo forçado solicitado - salvando valor atual');
      
      // Forçar salvamento imediato do valor atual
      const saveCurrentValue = async () => {
        try {
          const success = await dataManager.saveAverageTireProfit(summaryMetrics.averageProfitPerTire);
          if (success) {
            console.log(`✅ [PresumedProfitManager] Valor atual salvo após recálculo forçado: R$ ${summaryMetrics.averageProfitPerTire.toFixed(2)}`);
            
            // Dispara evento customizado
            const event = new CustomEvent('tireProfitUpdated', {
              detail: {
                profit: summaryMetrics.averageProfitPerTire,
                timestamp: Date.now(),
                source: 'PresumedProfitManager-ForceRecalc'
              }
            });
            window.dispatchEvent(event);
          }
        } catch (error) {
          console.error('❌ [PresumedProfitManager] Erro no recálculo forçado:', error);
        }
      };
      
      saveCurrentValue();
    };

    // Adicionar listener para recálculo forçado
    window.addEventListener('forceTireProfitRecalc', handleForceRecalc);

    // Cleanup
    return () => {
      window.removeEventListener('forceTireProfitRecalc', handleForceRecalc);
    };
  }, [summaryMetrics.averageProfitPerTire]);

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-factory-700/50 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-factory-700/50 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-factory-700/50 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-neon-green" />
            <Calculator className="h-5 w-5 text-neon-blue" />
            <Target className="h-5 w-5 text-neon-purple" />
          </div>
          Análise de Lucro - APENAS Produtos com Receitas Válidas
          <div className="flex items-center gap-2 ml-4">
            <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
            <span className="text-xs text-neon-green font-medium">
              SINCRONIZADO com Custo por Pneu
            </span>
          </div>
        </h3>
        <p className="text-tire-300 mt-2">
          Análise detalhada do lucro EXCLUSIVAMENTE para produtos finais com
          receitas válidas cadastradas no sistema de produção. Produtos de
          revenda e produtos sem receitas são AUTOMATICAMENTE EXCLUÍDOS da
          análise. Custos calculados conforme configurações do "Custo por Pneu"
        </p>
        <div className="mt-3 p-3 bg-neon-green/10 rounded-lg border border-neon-green/30">
          <div className="flex items-center gap-2 text-sm mb-2">
            <div className="w-1 h-1 bg-neon-green rounded-full"></div>
            <span className="text-neon-green font-medium">
              Status da Sincronização:
            </span>
          </div>
          <div className="mb-3 p-2 bg-red-500/10 rounded border border-red-500/30">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-500 font-bold">
                🚫 FILTRO RIGOROSO ATIVO: EXCLUSIVAMENTE produtos com receitas
                válidas cadastradas
              </span>
            </div>
            <div className="mt-2 text-xs text-red-400">
              •{" "}
              {
                recipes.filter(
                  (r) => !r.archived && r.materials && r.materials.length > 0,
                ).length
              }{" "}
              receitas válidas disponíveis • Produtos de REVENDA são
              AUTOMATICAMENTE EXCLUÍDOS • Produtos sem receitas são
              AUTOMATICAMENTE EXCLUÍDOS • Produtos não identificados são
              REJEITADOS • Apenas produtos finais com receitas completas são
              analisados
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            <div
              className={`flex items-center gap-1 ${isIncludingLaborCosts ? "text-neon-green" : "text-tire-400"}`}
            >
              <span>{isIncludingLaborCosts ? "✅" : "❌"}</span>
              <span>Mão de Obra</span>
            </div>
            <div
              className={`flex items-center gap-1 ${isIncludingCashFlowExpenses ? "text-neon-green" : "text-tire-400"}`}
            >
              <span>{isIncludingCashFlowExpenses ? "✅" : "❌"}</span>
              <span>Saídas de Caixa</span>
            </div>
            <div
              className={`flex items-center gap-1 ${isIncludingProductionLosses ? "text-neon-green" : "text-tire-400"}`}
            >
              <span>{isIncludingProductionLosses ? "✅" : "❌"}</span>
              <span>Perdas de Produção</span>
            </div>
            <div
              className={`flex items-center gap-1 ${isIncludingDefectiveTireSales ? "text-neon-green" : "text-tire-400"}`}
            >
              <span>{isIncludingDefectiveTireSales ? "✅" : "❌"}</span>
              <span>Pneus Defeituosos</span>
            </div>
            <div
              className={`flex items-center gap-1 ${isIncludingWarrantyValues ? "text-neon-green" : "text-tire-400"}`}
            >
              <span>{isIncludingWarrantyValues ? "✅" : "❌"}</span>
              <span>Valores de Garantia</span>
            </div>
            <div
              className={`flex items-center gap-1 ${isDividingByProduction ? "text-neon-green" : "text-tire-400"}`}
            >
              <span>{isDividingByProduction ? "✅" : "❌"}</span>
              <span>Divisão por Produção</span>
            </div>
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
                  R${" "}
                  {summaryMetrics.totalRevenue.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
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
                  R${" "}
                  {summaryMetrics.totalProfit.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
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
                <p className="text-tire-300 text-sm">
                  Lucro Médio por Produto Final
                </p>
                <p className="text-2xl font-bold text-neon-purple">
                  R${" "}
                  {summaryMetrics.averageProfitPerTire.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
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
                <Percent className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-neon-blue" />
          <Label className="text-tire-200 font-medium">Filtros</Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

      {/* Profit Chart - Ocultar quando hideCharts for true */}
      {!hideCharts && (
        <Card className="bg-factory-800/50 border-tire-600/30 mb-6">
        <CardHeader>
          <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-neon-green" />
            Gráfico - APENAS Produtos com Receitas Válidas
            {profitData.length > 0 && (
              <span className="text-sm font-normal text-neon-green">
                ({profitData.length} produtos com receitas válidas)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profitData.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-tire-500 mx-auto mb-3" />
              <p className="text-red-400 font-medium">
                ❌ NENHUMA venda de produto com receita VÁLIDA encontrada no
                período
              </p>
              <p className="text-red-500 text-xs mt-2 font-medium">
                🔍 FILTRO RIGOROSO ATIVO: Apenas produtos com receitas completas
                são incluídos
              </p>
              <p className="text-tire-500 text-xs mt-1">
                Verifique se os produtos possuem receitas válidas cadastradas no
                sistema de produção
              </p>
            </div>
          ) : (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={profitData.map((item) => ({
                    name: `${item.productName.length > 12 ? item.productName.substring(0, 12) + "..." : item.productName}\n(Lucro/Un: R$ ${item.averageProfitPerUnit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`,
                    fullName: item.productName,
                    quantidade: item.totalSales,
                    lucro: item.totalProfit,
                    lucroPorUnidade: item.averageProfitPerUnit,
                    receita: item.totalRevenue,
                    custo: item.totalCost,
                    margem: item.profitMargin,
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
                      `${value.toLocaleString("pt-BR")} un`
                    }
                    label={{
                      value: "Quantidade Vendida",
                      angle: -90,
                      position: "insideLeft",
                      style: {
                        textAnchor: "middle",
                        fill: "#9CA3AF",
                        fontSize: "12px",
                      },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "quantidade") {
                        return [
                          `${value.toLocaleString("pt-BR")} unidades`,
                          "Quantidade Vendida",
                        ];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label: string) => {
                      const item = profitData.find((p) =>
                        label.includes(
                          p.productName.length > 12
                            ? p.productName.substring(0, 12) + "..."
                            : p.productName,
                        ),
                      );
                      return item
                        ? `${item.productName}\nLucro por Unidade: R$ ${item.averageProfitPerUnit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        : label;
                    }}
                    labelStyle={{ color: "#F9FAFB", fontWeight: "bold" }}
                  />
                  <Bar
                    dataKey="quantidade"
                    fill="#bbe5fc"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
        </Card>
      )}

      {/* Profit Table */}
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-neon-green" />
            Tabela Detalhada - APENAS Produtos com Receitas Válidas
            {profitData.length > 0 && (
              <span className="text-sm font-normal text-neon-green">
                ({profitData.length} produtos com receitas válidas)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profitData.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-tire-500 mx-auto mb-3" />
              <p className="text-red-400 font-medium">
                ❌ NENHUMA venda de produto com receita VÁLIDA encontrada no
                período
              </p>
              <p className="text-red-500 text-xs mt-2 font-medium">
                🔍 FILTRO RIGOROSO ATIVO: Apenas produtos com receitas completas
                são incluídos
              </p>
              <p className="text-tire-500 text-xs mt-1">
                Verifique se os produtos possuem receitas válidas cadastradas no
                sistema de produção
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-tire-600/30">
                    <TableHead className="text-tire-300">
                      Produto Final
                    </TableHead>
                    <TableHead className="text-tire-300 text-right">
                      Vendas
                    </TableHead>
                    <TableHead className="text-tire-300 text-right">
                      Receita Total
                    </TableHead>
                    <TableHead className="text-tire-300 text-right">
                      Custo Total
                    </TableHead>
                    <TableHead className="text-tire-300 text-right">
                      Lucro Total
                    </TableHead>
                    <TableHead className="text-tire-300 text-right">
                      Lucro/Unidade
                    </TableHead>
                    <TableHead className="text-tire-300 text-right">
                      Margem
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitData.map((item, index) => (
                    <TableRow key={index} className="border-tire-600/20">
                      <TableCell className="text-white font-medium">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="secondary"
                          className="bg-neon-blue/20 text-neon-blue border-neon-blue/30"
                        >
                          {item.totalSales}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-neon-green font-medium">
                        R${" "}
                        {item.totalRevenue.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right text-tire-300">
                        R${" "}
                        {item.totalCost.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-bold ${
                            item.totalProfit >= 0
                              ? "text-neon-green"
                              : "text-red-400"
                          }`}
                        >
                          R${" "}
                          {item.totalProfit.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-medium ${
                            item.averageProfitPerUnit >= 0
                              ? "text-neon-purple"
                              : "text-red-400"
                          }`}
                        >
                          R${" "}
                          {item.averageProfitPerUnit.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="secondary"
                          className={`${
                            item.profitMargin >= 20
                              ? "bg-neon-green/20 text-neon-green border-neon-green/30"
                              : item.profitMargin >= 10
                                ? "bg-neon-orange/20 text-neon-orange border-neon-orange/30"
                                : "bg-red-400/20 text-red-400 border-red-400/30"
                          }`}
                        >
                          {item.profitMargin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PresumedProfitManager;
