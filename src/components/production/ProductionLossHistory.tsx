import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
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
  AlertTriangle,
  Calendar,
  Filter,
  X,
  CalendarDays,
  TrendingDown,
  BarChart3,
  Activity,
  Palette,
  Settings,
  RotateCcw,
  History,
} from "lucide-react";
import { ProductionEntry } from "@/types/financial";
import { dataManager } from "@/utils/dataManager";

interface ProductionLossHistoryProps {
  productionEntries?: ProductionEntry[];
  isLoading?: boolean;
  stockItems?: Array<{
    item_id: string;
    item_name: string;
    item_type: string;
    unit_cost: number;
    quantity: number;
  }>;
}

const ProductionLossHistory = ({
  productionEntries = [],
  isLoading = false,
  stockItems = [],
}: ProductionLossHistoryProps) => {
  // Estados para filtros
  const [dateFilterType, setDateFilterType] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [chartType] = useState<"bar" | "line" | "area">("line");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  // Estado para dados processados com valores financeiros
  const [chartData, setChartData] = useState<
    Array<{
      date: string;
      displayDate: string;
      productionLosses: number;
      materialLosses: number;
      totalLosses: number;
      productionLossValue: number;
      materialLossValue: number;
      totalLossValue: number;
      entriesCount: number;
      productsCount: number;
      averageProductionLoss: string;
      averageMaterialLoss: string;
      productionLossDetails: Array<{
        productName: string;
        quantity: number;
        unitCost: number;
        totalValue: number;
      }>;
      materialLossDetails: Array<{
        materialName: string;
        quantity: number;
        unitCost: number;
        totalValue: number;
        unit: string;
      }>;
    }>
  >([]);

  // Estados para configuração de cores
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [colorSettings, setColorSettings] = useState({
    productionLossColor: "#EF4444", // Vermelho para perdas de produção
    materialLossColor: "#8B5CF6", // Roxo para perdas de matéria-prima
    totalLossColor: "#bbe5fc", // Azul claro para total de perdas
    backgroundGradient: "#FEE2E2", // Fundo suave para área
  });

  // Carregar configurações salvas do localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("lossHistoryColorSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setColorSettings((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error("Erro ao carregar configurações de cores:", error);
      }
    }
  }, []);

  // Carregar dados de perdas com valores financeiros
  useEffect(() => {
    const loadLossData = async () => {
      try {
        const data = await getFilteredLossData();
        setChartData(data);
      } catch (error) {
        console.error("Erro ao carregar dados de perdas:", error);
        setChartData([]);
      }
    };

    loadLossData();
  }, [
    productionEntries,
    stockItems,
    dateFilterType,
    customStartDate,
    customEndDate,
    selectedYear,
    selectedMonth,
    groupBy,
  ]);

  // Salvar configurações no localStorage
  const saveColorSettings = () => {
    localStorage.setItem(
      "lossHistoryColorSettings",
      JSON.stringify(colorSettings)
    );
  };

  // Resetar cores para o padrão
  const resetToDefaultColors = () => {
    const defaultSettings = {
      productionLossColor: "#EF4444",
      materialLossColor: "#8B5CF6",
      totalLossColor: "#bbe5fc",
      backgroundGradient: "#FEE2E2",
    };
    setColorSettings(defaultSettings);
    localStorage.setItem(
      "lossHistoryColorSettings",
      JSON.stringify(defaultSettings)
    );
  };

  // Função auxiliar para calcular custo de produção de um produto baseado nos materiais
  const getProductionCost = async (
    productName: string,
    materialsConsumed: Array<{
      material_id: string;
      material_name: string;
      quantity_consumed: number;
      unit: string;
    }>
  ): Promise<number> => {
    try {
      let totalMaterialCost = 0;

      console.log(
        `🔍 [ProductionLossHistory] Calculando custo de produção para "${productName}"`
      );

      for (const material of materialsConsumed) {
        const stockItem = stockItems.find(
          (item) =>
            item.item_id === material.material_id &&
            item.item_type === "material"
        );

        if (stockItem) {
          const materialCost = material.quantity_consumed * stockItem.unit_cost;
          totalMaterialCost += materialCost;
          console.log(
            `📦 [ProductionLossHistory] Material "${material.material_name}": ${material.quantity_consumed}${material.unit} × R$ ${stockItem.unit_cost.toFixed(2)} = R$ ${materialCost.toFixed(2)}`
          );
        } else {
          console.warn(
            `⚠️ [ProductionLossHistory] Material não encontrado no estoque: ${material.material_name}`
          );
        }
      }

      console.log(
        `💰 [ProductionLossHistory] Custo total de produção para "${productName}": R$ ${totalMaterialCost.toFixed(2)}`
      );
      return totalMaterialCost;
    } catch (error) {
      console.error(
        `❌ [ProductionLossHistory] Erro ao calcular custo de produção para "${productName}":`,
        error
      );
      return 0;
    }
  };

  // Atualizar cor específica
  const updateColor = (key: string, value: string) => {
    setColorSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Função para filtrar dados de produção e calcular valores financeiros
  const getFilteredLossData = async () => {
    if (!productionEntries || productionEntries.length === 0) {
      return [];
    }

    let filteredEntries = [...productionEntries];
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Aplicar filtros de data
    switch (dateFilterType) {
      case "today":
        // Apply +1 day workaround to match saved production dates
        const todayWithWorkaround = new Date(today);
        todayWithWorkaround.setDate(today.getDate() + 1);
        const todayStr = todayWithWorkaround.toISOString().split("T")[0];
        filteredEntries = filteredEntries.filter(
          (entry) => entry.production_date === todayStr
        );
        console.log("🔥 [ProductionLossHistory] Filtro 'hoje' aplicado:", {
          todayOriginal: today.toISOString().split("T")[0],
          todayWithWorkaround: todayStr,
          reason: "Workaround +1 dia para alinhar com salvamento",
        });
        break;
      case "yesterday":
        // Apply +1 day workaround to match saved production dates
        const yesterdayWithWorkaround = new Date(yesterday);
        yesterdayWithWorkaround.setDate(yesterday.getDate() + 1);
        const yesterdayStr = yesterdayWithWorkaround
          .toISOString()
          .split("T")[0];
        filteredEntries = filteredEntries.filter(
          (entry) => entry.production_date === yesterdayStr
        );
        console.log("🔥 [ProductionLossHistory] Filtro 'ontem' aplicado:", {
          yesterdayOriginal: yesterday.toISOString().split("T")[0],
          yesterdayWithWorkaround: yesterdayStr,
          reason: "Workaround +1 dia para alinhar com salvamento",
        });
        break;
      case "last7days":
        // Apply +1 day workaround to match saved production dates
        const last7DaysWithWorkaround = new Date(
          today.getTime() - 7 * 24 * 60 * 60 * 1000
        );
        last7DaysWithWorkaround.setDate(last7DaysWithWorkaround.getDate() + 1);
        const todayEnd7WithWorkaround = new Date(today);
        todayEnd7WithWorkaround.setDate(today.getDate() + 1);
        filteredEntries = filteredEntries.filter((entry) => {
          const entryDate = new Date(entry.production_date);
          return (
            entryDate >= last7DaysWithWorkaround &&
            entryDate <= todayEnd7WithWorkaround
          );
        });
        console.log(
          "🔥 [ProductionLossHistory] Filtro 'últimos 7 dias' aplicado:",
          {
            startOriginal: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            startWithWorkaround: last7DaysWithWorkaround
              .toISOString()
              .split("T")[0],
            endOriginal: today.toISOString().split("T")[0],
            endWithWorkaround: todayEnd7WithWorkaround
              .toISOString()
              .split("T")[0],
            reason: "Workaround +1 dia para alinhar com salvamento",
          }
        );
        break;
      case "last30days":
        // Apply +1 day workaround to match saved production dates
        const last30DaysWithWorkaround = new Date(
          today.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        last30DaysWithWorkaround.setDate(
          last30DaysWithWorkaround.getDate() + 1
        );
        const todayEnd30WithWorkaround = new Date(today);
        todayEnd30WithWorkaround.setDate(today.getDate() + 1);
        filteredEntries = filteredEntries.filter((entry) => {
          const entryDate = new Date(entry.production_date);
          return (
            entryDate >= last30DaysWithWorkaround &&
            entryDate <= todayEnd30WithWorkaround
          );
        });
        console.log(
          "🔥 [ProductionLossHistory] Filtro 'últimos 30 dias' aplicado:",
          {
            startOriginal: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            startWithWorkaround: last30DaysWithWorkaround
              .toISOString()
              .split("T")[0],
            endOriginal: today.toISOString().split("T")[0],
            endWithWorkaround: todayEnd30WithWorkaround
              .toISOString()
              .split("T")[0],
            reason: "Workaround +1 dia para alinhar com salvamento",
          }
        );
        break;
      case "year":
        if (selectedYear) {
          filteredEntries = filteredEntries.filter((entry) =>
            entry.production_date.startsWith(selectedYear)
          );
        }
        break;
      case "month":
        if (selectedMonth) {
          filteredEntries = filteredEntries.filter((entry) =>
            entry.production_date.startsWith(selectedMonth)
          );
        }
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          // Apply +1 day workaround to match saved production dates
          const startDate = new Date(customStartDate);
          startDate.setDate(startDate.getDate() + 1);
          const endDate = new Date(customEndDate);
          endDate.setDate(endDate.getDate() + 1);
          filteredEntries = filteredEntries.filter((entry) => {
            const entryDate = new Date(entry.production_date);
            return entryDate >= startDate && entryDate <= endDate;
          });
          console.log(
            "🔥 [ProductionLossHistory] Filtro personalizado aplicado:",
            {
              startOriginal: customStartDate,
              startWithWorkaround: startDate.toISOString().split("T")[0],
              endOriginal: customEndDate,
              endWithWorkaround: endDate.toISOString().split("T")[0],
              reason: "Workaround +1 dia para alinhar com salvamento",
            }
          );
        } else if (customStartDate) {
          // Apply +1 day workaround to match saved production dates
          const startDate = new Date(customStartDate);
          startDate.setDate(startDate.getDate() + 1);
          filteredEntries = filteredEntries.filter((entry) => {
            const entryDate = new Date(entry.production_date);
            return entryDate >= startDate;
          });
          console.log(
            "🔥 [ProductionLossHistory] Filtro personalizado (só início) aplicado:",
            {
              startOriginal: customStartDate,
              startWithWorkaround: startDate.toISOString().split("T")[0],
              reason: "Workaround +1 dia para alinhar com salvamento",
            }
          );
        } else if (customEndDate) {
          // Apply +1 day workaround to match saved production dates
          const endDate = new Date(customEndDate);
          endDate.setDate(endDate.getDate() + 1);
          filteredEntries = filteredEntries.filter((entry) => {
            const entryDate = new Date(entry.production_date);
            return entryDate <= endDate;
          });
          console.log(
            "🔥 [ProductionLossHistory] Filtro personalizado (só fim) aplicado:",
            {
              endOriginal: customEndDate,
              endWithWorkaround: endDate.toISOString().split("T")[0],
              reason: "Workaround +1 dia para alinhar com salvamento",
            }
          );
        }
        break;
      case "all":
      default:
        // Não aplicar filtro
        break;
    }

    // Agrupar dados por data
    const groupedData = new Map<
      string,
      {
        date: string;
        displayDate: string;
        productionLosses: number;
        materialLosses: number;
        totalLosses: number;
        productionLossValue: number;
        materialLossValue: number;
        totalLossValue: number;
        entriesCount: number;
        products: Set<string>;
        productionLossDetails: Array<{
          productName: string;
          quantity: number;
          unitCost: number;
          totalValue: number;
        }>;
        materialLossDetails: Array<{
          materialName: string;
          quantity: number;
          unitCost: number;
          totalValue: number;
          unit: string;
        }>;
      }
    >();

    for (const entry of filteredEntries) {
      const entryDate = new Date(entry.production_date);
      let groupKey: string;
      let displayDate: string;

      // Agrupar por período selecionado
      switch (groupBy) {
        case "week":
          // Agrupar por semana (domingo a sábado)
          const weekStart = new Date(entryDate);
          weekStart.setDate(entryDate.getDate() - entryDate.getDay());
          groupKey = weekStart.toISOString().split("T")[0];
          displayDate = `Semana de ${weekStart.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })}`;
          break;
        case "month":
          // Agrupar por mês
          groupKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, "0")}`;
          displayDate = entryDate.toLocaleDateString("pt-BR", {
            year: "numeric",
            month: "long",
          });
          break;
        case "day":
        default:
          // Agrupar por dia
          groupKey = entry.production_date;
          displayDate = entryDate.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
          break;
      }

      const existing = groupedData.get(groupKey) || {
        date: groupKey,
        displayDate,
        productionLosses: 0,
        materialLosses: 0,
        totalLosses: 0,
        productionLossValue: 0,
        materialLossValue: 0,
        totalLossValue: 0,
        entriesCount: 0,
        products: new Set<string>(),
        productionLossDetails: [],
        materialLossDetails: [],
      };

      // Somar perdas de produção
      const productionLoss = entry.production_loss || 0;
      existing.productionLosses += productionLoss;

      // Calcular valor financeiro das perdas de produção baseado no custo dos materiais
      if (productionLoss > 0 && entry.materials_consumed) {
        const productionCostPerUnit = await getProductionCost(
          entry.product_name,
          entry.materials_consumed
        );
        const unitCost =
          entry.quantity_produced > 0
            ? productionCostPerUnit / entry.quantity_produced
            : 0;
        const productionLossValue = productionLoss * unitCost;
        existing.productionLossValue += productionLossValue;

        // Adicionar detalhes da perda de produção
        existing.productionLossDetails.push({
          productName: entry.product_name,
          quantity: productionLoss,
          unitCost: unitCost,
          totalValue: productionLossValue,
        });

        console.log(
          `💸 [ProductionLossHistory] Perda de produção "${entry.product_name}": ${productionLoss} x R$ ${unitCost.toFixed(2)} (custo materiais) = R$ ${productionLossValue.toFixed(2)}`
        );
      }

      // Somar perdas de material
      let materialLossQuantity = 0;
      let materialLossValue = 0;
      if (entry.material_loss && Array.isArray(entry.material_loss)) {
        for (const loss of entry.material_loss) {
          materialLossQuantity += loss.quantity_lost;

          // Calcular valor financeiro das perdas de material
          const stockItem = stockItems.find(
            (item) =>
              item.item_id === loss.material_id && item.item_type === "material"
          );

          if (stockItem && loss.quantity_lost > 0) {
            const lossValue = loss.quantity_lost * stockItem.unit_cost;
            materialLossValue += lossValue;

            // Adicionar detalhes da perda de material
            existing.materialLossDetails.push({
              materialName: loss.material_name,
              quantity: loss.quantity_lost,
              unitCost: stockItem.unit_cost,
              totalValue: lossValue,
              unit: loss.unit,
            });

            console.log(
              `📦 [ProductionLossHistory] Perda de material "${loss.material_name}": ${loss.quantity_lost} x R$ ${stockItem.unit_cost.toFixed(2)} = R$ ${lossValue.toFixed(2)}`
            );
          } else if (loss.quantity_lost > 0) {
            console.warn(
              `⚠️ [ProductionLossHistory] Material não encontrado no estoque para calcular valor da perda: ${loss.material_name}`
            );
          }
        }
        existing.materialLosses += materialLossQuantity;
        existing.materialLossValue += materialLossValue;
      }

      // Total de perdas (quantidade e valor)
      existing.totalLosses =
        existing.productionLosses + existing.materialLosses;
      existing.totalLossValue =
        existing.productionLossValue + existing.materialLossValue;
      existing.entriesCount += 1;
      existing.products.add(entry.product_name);

      groupedData.set(groupKey, existing);
    }

    // Converter para array e ordenar por data
    const chartData = Array.from(groupedData.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => ({
        ...item,
        productsCount: item.products.size,
        averageProductionLoss:
          item.entriesCount > 0
            ? (item.productionLosses / item.entriesCount).toFixed(1)
            : "0",
        averageMaterialLoss:
          item.entriesCount > 0
            ? (item.materialLosses / item.entriesCount).toFixed(1)
            : "0",
      }));

    return chartData;
  };

  // Calcular métricas
  const calculateMetrics = () => {
    const totalProductionLosses = chartData.reduce(
      (sum, item) => sum + item.productionLosses,
      0
    );
    const totalMaterialLosses = chartData.reduce(
      (sum, item) => sum + item.materialLosses,
      0
    );
    const totalLosses = totalProductionLosses + totalMaterialLosses;

    // Valores financeiros das perdas
    const totalProductionLossValue = chartData.reduce(
      (sum, item) => sum + item.productionLossValue,
      0
    );
    const totalMaterialLossValue = chartData.reduce(
      (sum, item) => sum + item.materialLossValue,
      0
    );
    const totalLossValue = totalProductionLossValue + totalMaterialLossValue;

    const totalEntries = chartData.reduce(
      (sum, item) => sum + item.entriesCount,
      0
    );
    const averageLossPerEntry =
      totalEntries > 0 ? totalLosses / totalEntries : 0;
    const daysWithLosses = chartData.filter(
      (item) => item.totalLosses > 0
    ).length;
    const totalDays = chartData.length;
    const lossFrequency =
      totalDays > 0 ? (daysWithLosses / totalDays) * 100 : 0;

    return {
      totalProductionLosses,
      totalMaterialLosses,
      totalLosses,
      totalProductionLossValue,
      totalMaterialLossValue,
      totalLossValue,
      totalEntries,
      averageLossPerEntry,
      daysWithLosses,
      totalDays,
      lossFrequency,
    };
  };

  const metrics = calculateMetrics();

  // Obter anos disponíveis
  const getAvailableYears = () => {
    const years = new Set<string>();
    productionEntries.forEach((entry) => {
      const year = entry.production_date.split("-")[0];
      years.add(year);
    });
    return Array.from(years).sort().reverse();
  };

  // Obter meses disponíveis
  const getAvailableMonths = () => {
    const months = new Set<string>();
    productionEntries.forEach((entry) => {
      const yearMonth = entry.production_date.substring(0, 7); // YYYY-MM
      months.add(yearMonth);
    });
    return Array.from(months).sort().reverse();
  };

  // Limpar filtros
  const handleClearFilters = () => {
    setDateFilterType("last30days");
    setCustomStartDate("");
    setCustomEndDate("");
    setSelectedYear("");
    setSelectedMonth("");
  };

  // Verificar se há filtros ativos
  const hasActiveFilters =
    dateFilterType !== "last30days" ||
    customStartDate ||
    customEndDate ||
    selectedYear ||
    selectedMonth;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="border-2 border-tire-600/60 rounded-lg p-4 shadow-2xl max-w-md z-[9999] relative"
          style={{
            backgroundColor: "#0f172a",
            boxShadow:
              "0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 0 2px rgba(255, 255, 255, 0.1), inset 0 0 0 1000px #0f172a",
          }}
        >
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              backgroundColor: "#0f172a",
              zIndex: -1,
              opacity: 1,
            }}
          />
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              backgroundColor: "#111827",
              zIndex: -2,
              opacity: 1,
            }}
          />
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              backgroundColor: "#1e293b",
              zIndex: -3,
              opacity: 1,
            }}
          />
          <p className="text-white font-medium mb-3 relative z-10">
            {data.displayDate}
          </p>

          {/* Perdas de Produção */}
          <div className="border-b border-tire-600/20 pb-2 mb-2 relative z-10">
            <p className="text-red-400 font-medium mb-1">
              Perdas de Produção: {data.productionLosses} unidades
            </p>
            <p className="text-red-300 text-sm mb-2">
              Custo das Perdas: R${" "}
              {data.productionLossValue?.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || "0,00"}
            </p>
            {data.productionLossDetails &&
              data.productionLossDetails.length > 0 && (
                <div className="text-xs text-red-200 space-y-1">
                  {data.productionLossDetails.map(
                    (detail: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span>• {detail.productName}:</span>
                        <span>
                          {detail.quantity} × R$ {detail.unitCost.toFixed(2)}{" "}
                          (custo) = R$ {detail.totalValue.toFixed(2)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
          </div>

          {/* Perdas de Matéria-Prima */}
          <div className="border-b border-tire-600/20 pb-2 mb-2 relative z-10">
            <p className="text-orange-400 font-medium mb-1">
              Perdas de Matéria-Prima: {data.materialLosses} unidades
            </p>
            <p className="text-orange-300 text-sm mb-2">
              Custo das Perdas: R${" "}
              {data.materialLossValue?.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || "0,00"}
            </p>
            {data.materialLossDetails &&
              data.materialLossDetails.length > 0 && (
                <div className="text-xs text-orange-200 space-y-1">
                  {data.materialLossDetails.map(
                    (detail: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span>• {detail.materialName}:</span>
                        <span>
                          {detail.quantity}
                          {detail.unit} × R$ {detail.unitCost.toFixed(2)}{" "}
                          (custo) = R$ {detail.totalValue.toFixed(2)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
          </div>

          {/* Total Geral */}
          <div className="border-b border-tire-600/20 pb-2 mb-2 relative z-10">
            <p className="font-bold" style={{ color: "#bbe5fc" }}>
              Total de Perdas: {data.totalLosses} unidades
            </p>
            <p className="font-bold text-lg" style={{ color: "#bbe5fc" }}>
              Custo Total das Perdas: R${" "}
              {data.totalLossValue?.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || "0,00"}
            </p>
          </div>

          {/* Informações Adicionais */}
          <div className="text-tire-300 text-xs space-y-1 relative z-10">
            <p>Entradas de Produção: {data.entriesCount}</p>
            <p>Produtos Diferentes: {data.productsCount}</p>
            <p>
              Média Perdas/Entrada: {data.averageProductionLoss} (prod) +{" "}
              {data.averageMaterialLoss} (mat)
            </p>
          </div>
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
                <History className="h-5 w-5 text-red-400" />
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                <Palette className="h-5 w-5 text-neon-purple" />
              </div>
              Histórico de Perdas - Análise Temporal
            </h3>
            <p className="text-tire-300 mt-2">
              Visualização histórica das perdas de produção e matéria-prima ao
              longo do tempo
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
                    Configurações de Cores do Histórico de Perdas
                  </DialogTitle>
                  <DialogDescription className="text-tire-300">
                    Personalize as cores do gráfico de histórico de perdas
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
                        <Label className="text-tire-300">
                          Perdas de Produção
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={colorSettings.productionLossColor}
                            onChange={(e) =>
                              updateColor("productionLossColor", e.target.value)
                            }
                            className="w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                          />
                          <Input
                            type="text"
                            value={colorSettings.productionLossColor}
                            onChange={(e) =>
                              updateColor("productionLossColor", e.target.value)
                            }
                            className="bg-factory-700/50 border-tire-600/30 text-white"
                            placeholder="#EF4444"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-tire-300">
                          Perdas de Matéria-Prima
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={colorSettings.materialLossColor}
                            onChange={(e) =>
                              updateColor("materialLossColor", e.target.value)
                            }
                            className="w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                          />
                          <Input
                            type="text"
                            value={colorSettings.materialLossColor}
                            onChange={(e) =>
                              updateColor("materialLossColor", e.target.value)
                            }
                            className="bg-factory-700/50 border-tire-600/30 text-white"
                            placeholder="#F59E0B"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-tire-300">Total de Perdas</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={colorSettings.totalLossColor}
                            onChange={(e) =>
                              updateColor("totalLossColor", e.target.value)
                            }
                            className="w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                          />
                          <Input
                            type="text"
                            value={colorSettings.totalLossColor}
                            onChange={(e) =>
                              updateColor("totalLossColor", e.target.value)
                            }
                            className="bg-factory-700/50 border-tire-600/30 text-white"
                            placeholder="#DC2626"
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
                <p className="text-tire-300 text-sm">Total Perdas Produção</p>
                <p className="text-2xl font-bold text-red-400">
                  {metrics.totalProductionLosses.toLocaleString("pt-BR")}
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
                <p className="text-tire-300 text-sm">Total Perdas Material</p>
                <p className="text-2xl font-bold text-orange-400">
                  {metrics.totalMaterialLosses.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="text-orange-400">
                <AlertTriangle className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Total Geral Perdas</p>
                <p className="text-2xl font-bold text-red-600">
                  {metrics.totalLosses.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="text-red-600">
                <Activity className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Custo Total de Perdas</p>
                <p className="text-2xl font-bold text-neon-orange">
                  R${" "}
                  {metrics.totalLossValue.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
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
            Filtros de Período e Visualização
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Tipo de Filtro */}
          <div className="space-y-2">
            <Label className="text-tire-300 text-sm">Período:</Label>
            <Select
              value={dateFilterType}
              onValueChange={(value) => {
                setDateFilterType(value);
                if (value !== "year") setSelectedYear("");
                if (value !== "month") setSelectedMonth("");
                if (value !== "custom") {
                  setCustomStartDate("");
                  setCustomEndDate("");
                }
              }}
            >
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

          {/* Agrupamento */}
          <div className="space-y-2">
            <Label className="text-tire-300 text-sm">Agrupar por:</Label>
            <Select
              value={groupBy}
              onValueChange={(value: "day" | "week" | "month") =>
                setGroupBy(value)
              }
            >
              <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-factory-800 border-tire-600/30">
                <SelectItem
                  value="day"
                  className="text-white hover:bg-tire-700/50"
                >
                  Dia
                </SelectItem>
                <SelectItem
                  value="week"
                  className="text-white hover:bg-tire-700/50"
                >
                  Semana
                </SelectItem>
                <SelectItem
                  value="month"
                  className="text-white hover:bg-tire-700/50"
                >
                  Mês
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtros condicionais */}
          {dateFilterType === "year" && (
            <div className="space-y-2">
              <Label className="text-tire-300 text-sm">Ano:</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent className="bg-factory-800 border-tire-600/30">
                  {getAvailableYears().map((year) => (
                    <SelectItem
                      key={year}
                      value={year}
                      className="text-white hover:bg-tire-700/50"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {dateFilterType === "month" && (
            <div className="space-y-2">
              <Label className="text-tire-300 text-sm">Mês:</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent className="bg-factory-800 border-tire-600/30">
                  {getAvailableMonths().map((month) => {
                    const [year, monthNum] = month.split("-");
                    const monthName = new Date(
                      parseInt(year),
                      parseInt(monthNum) - 1
                    ).toLocaleDateString("pt-BR", {
                      year: "numeric",
                      month: "long",
                    });
                    return (
                      <SelectItem
                        key={month}
                        value={month}
                        className="text-white hover:bg-tire-700/50"
                      >
                        {monthName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Filtros de Período Personalizado */}
        {dateFilterType === "custom" && (
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

        {/* Indicador de Filtros Ativos */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-red-400/20 rounded text-red-400 text-xs">
              <History className="h-3 w-3" />
              {dateFilterType === "today" && "Hoje"}
              {dateFilterType === "yesterday" && "Ontem"}
              {dateFilterType === "last7days" && "Últimos 7 dias"}
              {dateFilterType === "year" && `Ano: ${selectedYear}`}
              {dateFilterType === "month" && `Mês: ${selectedMonth}`}
              {dateFilterType === "custom" && "Período personalizado"}
              {dateFilterType === "all" && "Todos os períodos"}
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-neon-blue/20 rounded text-neon-blue text-xs">
              <BarChart3 className="h-3 w-3" />
              Agrupado por{" "}
              {groupBy === "day"
                ? "dia"
                : groupBy === "week"
                  ? "semana"
                  : "mês"}
            </div>
          </div>
        )}
      </div>

      {/* Gráfico */}
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-red-400" />
            Histórico de Perdas ao Longo do Tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Legenda Personalizada */}
          {chartData.length > 0 && (
            <div className="flex flex-wrap justify-center gap-6 mb-6 p-3 bg-factory-800/30 rounded-lg border border-tire-600/20">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-0.5 rounded"
                  style={{ backgroundColor: colorSettings.productionLossColor }}
                />
                <span className="text-sm text-tire-200">
                  Perdas de Produção
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-0.5 rounded"
                  style={{ backgroundColor: colorSettings.materialLossColor }}
                />
                <span className="text-sm text-tire-200">
                  Perdas de Matéria-Prima
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-0.5 rounded border-dashed border-2"
                  style={{ borderColor: colorSettings.totalLossColor }}
                />
                <span className="text-sm text-tire-200">Total de Perdas</span>
              </div>
            </div>
          )}

          {chartData.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-tire-500 mx-auto mb-3" />
              <p className="text-tire-400">
                {hasActiveFilters
                  ? "Nenhuma perda encontrada no período selecionado"
                  : "Nenhuma perda registrada"}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              {chartType === "area" ? (
                <AreaChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="productionLosses"
                    stackId="1"
                    name="Perdas de Produção"
                    stroke={colorSettings.productionLossColor}
                    fill={colorSettings.productionLossColor}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="materialLosses"
                    stackId="1"
                    name="Perdas de Matéria-Prima"
                    stroke={colorSettings.materialLossColor}
                    fill={colorSettings.materialLossColor}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              ) : chartType === "bar" ? (
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="productionLosses"
                    name="Perdas de Produção"
                    fill={colorSettings.productionLossColor}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="materialLosses"
                    name="Perdas de Matéria-Prima"
                    fill={colorSettings.materialLossColor}
                    opacity={0.8}
                    radius={[3, 3, 0, 0]}
                  />

                  <Bar
                    dataKey="totalLosses"
                    name="Total de Perdas"
                    fill={colorSettings.totalLossColor}
                    opacity={0.6}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              ) : (
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="productionLosses"
                    name="Perdas de Produção"
                    stroke={colorSettings.productionLossColor}
                    strokeWidth={3}
                    dot={{
                      fill: colorSettings.productionLossColor,
                      strokeWidth: 2,
                      r: 4,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="materialLosses"
                    name="Perdas de Matéria-Prima"
                    stroke={colorSettings.materialLossColor}
                    strokeWidth={2}
                    dot={{
                      fill: colorSettings.materialLossColor,
                      strokeWidth: 2,
                      r: 3,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="totalLosses"
                    name="Total de Perdas"
                    stroke={colorSettings.totalLossColor}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{
                      fill: colorSettings.totalLossColor,
                      strokeWidth: 2,
                      r: 3,
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

export default ProductionLossHistory;
