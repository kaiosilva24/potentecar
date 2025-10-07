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
  Factory,
  Calendar,
  Filter,
  X,
  CalendarDays,
  TrendingUp,
  BarChart3,
  Activity,
  Palette,
  Settings,
  RotateCcw,
} from "lucide-react";
import { ProductionEntry } from "@/types/financial";

interface ProductionChartProps {
  productionEntries?: ProductionEntry[];
  isLoading?: boolean;
}

const ProductionChart = ({
  productionEntries = [],
  isLoading = false,
}: ProductionChartProps) => {
  // Estados para filtros
  const [dateFilterType, setDateFilterType] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  // Estados para configuração de cores
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [colorSettings, setColorSettings] = useState({
    producedColor: "#10B981", // Verde para produção
    productionLossesColor: "#EF4444", // Vermelho para perdas de produção
    materialLossesColor: "#F59E0B", // Laranja para perdas de matéria-prima
    efficiencyColor: "#3B82F6", // Azul para eficiência
  });

  // Carregar configurações salvas do localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("productionChartColorSettings");
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
      "productionChartColorSettings",
      JSON.stringify(colorSettings),
    );
  };

  // Resetar cores para o padrão
  const resetToDefaultColors = () => {
    const defaultSettings = {
      producedColor: "#10B981",
      productionLossesColor: "#EF4444",
      materialLossesColor: "#F59E0B",
      efficiencyColor: "#3B82F6",
    };
    setColorSettings(defaultSettings);
    localStorage.setItem(
      "productionChartColorSettings",
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

  // Função para filtrar dados de produção
  const getFilteredProductionData = () => {
    if (!productionEntries || productionEntries.length === 0) {
      return [];
    }

    let filteredEntries = [...productionEntries];
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Aplicar filtros de data
    switch (dateFilterType) {
      case "today":
        const todayStr = today.toISOString().split("T")[0];
        filteredEntries = filteredEntries.filter(
          (entry) => entry.production_date === todayStr,
        );
        break;
      case "yesterday":
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        filteredEntries = filteredEntries.filter(
          (entry) => entry.production_date === yesterdayStr,
        );
        break;
      case "last7days":
        const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredEntries = filteredEntries.filter((entry) => {
          const entryDate = new Date(entry.production_date);
          return entryDate >= last7Days && entryDate <= today;
        });
        break;
      case "year":
        if (selectedYear) {
          filteredEntries = filteredEntries.filter((entry) =>
            entry.production_date.startsWith(selectedYear),
          );
        }
        break;
      case "month":
        if (selectedMonth) {
          filteredEntries = filteredEntries.filter((entry) =>
            entry.production_date.startsWith(selectedMonth),
          );
        }
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          filteredEntries = filteredEntries.filter((entry) => {
            const entryDate = new Date(entry.production_date);
            return entryDate >= startDate && entryDate <= endDate;
          });
        } else if (customStartDate) {
          const startDate = new Date(customStartDate);
          filteredEntries = filteredEntries.filter((entry) => {
            const entryDate = new Date(entry.production_date);
            return entryDate >= startDate;
          });
        } else if (customEndDate) {
          const endDate = new Date(customEndDate);
          filteredEntries = filteredEntries.filter((entry) => {
            const entryDate = new Date(entry.production_date);
            return entryDate <= endDate;
          });
        }
        break;
      case "all":
      default:
        // Não aplicar filtro
        break;
    }

    // Agrupar dados por produto
    const groupedData = new Map<
      string,
      {
        productName: string;
        totalProduced: number;
        totalProductionLosses: number;
        totalMaterialLosses: number;
        totalLosses: number;
        entries: ProductionEntry[];
        productionDays: number;
      }
    >();

    filteredEntries.forEach((entry) => {
      const productName = entry.product_name;
      const existing = groupedData.get(productName) || {
        productName,
        totalProduced: 0,
        totalProductionLosses: 0,
        totalMaterialLosses: 0,
        totalLosses: 0,
        entries: [],
        productionDays: 0,
      };

      existing.totalProduced += entry.quantity_produced;

      // Separar perdas de produção
      const productionLoss = entry.production_loss || 0;
      existing.totalProductionLosses += productionLoss;

      // Separar perdas de material
      let materialLossQuantity = 0;
      if (entry.material_loss && Array.isArray(entry.material_loss)) {
        materialLossQuantity = entry.material_loss.reduce(
          (sum, loss) => sum + loss.quantity_lost,
          0,
        );
        existing.totalMaterialLosses += materialLossQuantity;
      }

      // Total de perdas (soma de ambas)
      existing.totalLosses =
        existing.totalProductionLosses + existing.totalMaterialLosses;

      existing.entries.push(entry);

      groupedData.set(productName, existing);
    });

    // Calcular dias de produção únicos para cada produto
    groupedData.forEach((productData, productName) => {
      const uniqueDates = new Set(
        productData.entries.map((entry) => entry.production_date),
      );
      productData.productionDays = uniqueDates.size;
    });

    // Converter para array e ordenar por quantidade produzida (maior para menor)
    const chartData = Array.from(groupedData.values())
      .sort((a, b) => b.totalProduced - a.totalProduced)
      .map((item) => ({
        ...item,
        efficiency:
          item.totalProduced > 0
            ? (
                ((item.totalProduced - item.totalLosses) / item.totalProduced) *
                100
              ).toFixed(1)
            : "0",
        averagePerDay:
          item.productionDays > 0
            ? (item.totalProduced / item.productionDays).toFixed(1)
            : "0",
      }));

    return chartData;
  };

  const chartData = getFilteredProductionData();

  // Calcular métricas
  const calculateMetrics = () => {
    const totalProduced = chartData.reduce(
      (sum, item) => sum + item.totalProduced,
      0,
    );
    const totalProductionLosses = chartData.reduce(
      (sum, item) => sum + item.totalProductionLosses,
      0,
    );
    const totalMaterialLosses = chartData.reduce(
      (sum, item) => sum + item.totalMaterialLosses,
      0,
    );
    const totalLosses = totalProductionLosses + totalMaterialLosses;
    const averageEfficiency =
      chartData.length > 0
        ? chartData.reduce(
            (sum, item) => sum + parseFloat(item.efficiency),
            0,
          ) / chartData.length
        : 0;
    const productionDays = chartData.length;
    const averagePerDay =
      productionDays > 0 ? totalProduced / productionDays : 0;

    return {
      totalProduced,
      totalProductionLosses,
      totalMaterialLosses,
      totalLosses,
      averageEfficiency,
      productionDays,
      averagePerDay,
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
    setDateFilterType("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSelectedYear("");
    setSelectedMonth("");
  };

  // Verificar se há filtros ativos
  const hasActiveFilters =
    dateFilterType !== "all" ||
    customStartDate ||
    customEndDate ||
    selectedYear ||
    selectedMonth;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-factory-800 border border-tire-600/30 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.productName}</p>
          <p className="text-neon-green">
            Produzido: {data.totalProduced} unidades
          </p>
          <p className="text-red-400">
            Perdas de Produção: {data.totalProductionLosses} unidades
          </p>
          <p className="text-orange-400">
            Perdas de Matéria-Prima: {data.totalMaterialLosses} unidades
          </p>
          <p className="text-gray-400">
            Total de Perdas: {data.totalLosses} unidades
          </p>
          <p className="text-neon-blue">Eficiência: {data.efficiency}%</p>
          <p className="text-neon-orange">
            Média/Dia: {data.averagePerDay} unidades
          </p>
          <p className="text-tire-300 text-sm">
            Dias de Produção: {data.productionDays}
          </p>
          <p className="text-tire-300 text-sm">
            Entradas: {data.entries.length}
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
                <Factory className="h-5 w-5 text-neon-green" />
                <Activity className="h-5 w-5 text-neon-blue" />
                <Palette className="h-5 w-5 text-neon-purple" />
              </div>
              Gráfico de Produção - Cores Personalizáveis
            </h3>
            <p className="text-tire-300 mt-2">
              Visualização da produção ao longo do tempo com filtros avançados e
              cores personalizáveis
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
                    Configurações de Cores do Gráfico de Produção
                  </DialogTitle>
                  <DialogDescription className="text-tire-300">
                    Personalize as cores das colunas do gráfico de produção
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Cores Principais */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white flex items-center gap-2">
                      <Settings className="h-4 w-4 text-neon-blue" />
                      Cores do Gráfico
                    </h4>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-tire-300">Produção</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={colorSettings.producedColor}
                            onChange={(e) =>
                              updateColor("producedColor", e.target.value)
                            }
                            className="w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                          />
                          <Input
                            type="text"
                            value={colorSettings.producedColor}
                            onChange={(e) =>
                              updateColor("producedColor", e.target.value)
                            }
                            className="bg-factory-700/50 border-tire-600/30 text-white"
                            placeholder="#10B981"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-tire-300">
                          Perdas de Produção
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={colorSettings.productionLossesColor}
                            onChange={(e) =>
                              updateColor(
                                "productionLossesColor",
                                e.target.value,
                              )
                            }
                            className="w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                          />
                          <Input
                            type="text"
                            value={colorSettings.productionLossesColor}
                            onChange={(e) =>
                              updateColor(
                                "productionLossesColor",
                                e.target.value,
                              )
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
                            value={colorSettings.materialLossesColor}
                            onChange={(e) =>
                              updateColor("materialLossesColor", e.target.value)
                            }
                            className="w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                          />
                          <Input
                            type="text"
                            value={colorSettings.materialLossesColor}
                            onChange={(e) =>
                              updateColor("materialLossesColor", e.target.value)
                            }
                            className="bg-factory-700/50 border-tire-600/30 text-white"
                            placeholder="#F59E0B"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-tire-300">
                          Linha de Eficiência
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={colorSettings.efficiencyColor}
                            onChange={(e) =>
                              updateColor("efficiencyColor", e.target.value)
                            }
                            className="w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                          />
                          <Input
                            type="text"
                            value={colorSettings.efficiencyColor}
                            onChange={(e) =>
                              updateColor("efficiencyColor", e.target.value)
                            }
                            className="bg-factory-700/50 border-tire-600/30 text-white"
                            placeholder="#3B82F6"
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Total Produzido</p>
                <p className="text-2xl font-bold text-neon-green">
                  {metrics.totalProduced.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="text-neon-green">
                <Factory className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Perdas de Produção</p>
                <p className="text-2xl font-bold text-red-400">
                  {metrics.totalProductionLosses.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="text-red-400">
                <TrendingUp className="h-8 w-8 rotate-180" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Perdas de Material</p>
                <p className="text-2xl font-bold text-orange-400">
                  {metrics.totalMaterialLosses.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="text-orange-400">
                <TrendingUp className="h-8 w-8 rotate-180" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Eficiência Média</p>
                <p className="text-2xl font-bold text-neon-blue">
                  {metrics.averageEfficiency.toFixed(1)}%
                </p>
              </div>
              <div className="text-neon-blue">
                <Activity className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Dias de Produção</p>
                <p className="text-2xl font-bold text-neon-orange">
                  {metrics.productionDays}
                </p>
              </div>
              <div className="text-neon-orange">
                <Calendar className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Média/Dia</p>
                <p className="text-2xl font-bold text-neon-purple">
                  {metrics.averagePerDay.toFixed(0)}
                </p>
              </div>
              <div className="text-neon-purple">
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
          {/* Tipo de Filtro */}
          <div className="space-y-2">
            <Label className="text-tire-300 text-sm">Período:</Label>
            <Select
              value={dateFilterType}
              onValueChange={(value) => {
                setDateFilterType(value);
                // Reset other filters when changing type
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
                  value="today"
                  className="text-white hover:bg-tire-700/50"
                >
                  Hoje
                </SelectItem>
                <SelectItem
                  value="yesterday"
                  className="text-white hover:bg-tire-700/50"
                >
                  Ontem
                </SelectItem>
                <SelectItem
                  value="last7days"
                  className="text-white hover:bg-tire-700/50"
                >
                  Últimos 7 dias
                </SelectItem>
                <SelectItem
                  value="year"
                  className="text-white hover:bg-tire-700/50"
                >
                  Ano específico
                </SelectItem>
                <SelectItem
                  value="month"
                  className="text-white hover:bg-tire-700/50"
                >
                  Mês específico
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

          {/* Filtro de Ano */}
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

          {/* Filtro de Mês */}
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
                      parseInt(monthNum) - 1,
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

          {/* Filtros de Período Personalizado */}
          {dateFilterType === "custom" && (
            <>
              <div className="space-y-2">
                <Label className="text-tire-300 text-sm">Data Inicial:</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
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
                  <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="pl-9 bg-factory-700/50 border-tire-600/30 text-white"
                  />
                </div>
              </div>
            </>
          )}

          {/* Tipo de Gráfico */}
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

        {/* Indicador de Filtros Ativos */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {dateFilterType !== "all" && (
              <div className="flex items-center gap-1 px-2 py-1 bg-neon-green/20 rounded text-neon-green text-xs">
                <Calendar className="h-3 w-3" />
                {dateFilterType === "today" && "Hoje"}
                {dateFilterType === "yesterday" && "Ontem"}
                {dateFilterType === "last7days" && "Últimos 7 dias"}
                {dateFilterType === "year" && `Ano: ${selectedYear}`}
                {dateFilterType === "month" && `Mês: ${selectedMonth}`}
                {dateFilterType === "custom" && "Período personalizado"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gráfico */}
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
            <Factory className="h-5 w-5 text-neon-green" />
            Produção por Produto
            {chartData.length > 0 && (
              <span className="text-sm font-normal text-tire-400">
                ({chartData.length}{" "}
                {chartData.length === 1 ? "produto" : "produtos"})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-center py-8">
              <Factory className="h-12 w-12 text-tire-500 mx-auto mb-3" />
              <p className="text-tire-400">
                {hasActiveFilters
                  ? "Nenhum produto encontrado no período selecionado"
                  : "Nenhum produto produzido registrado"}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              {chartType === "bar" ? (
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="productName"
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="totalProduced"
                    name="Produzido"
                    fill={colorSettings.producedColor}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="totalProductionLosses"
                    name="Perdas de Produção"
                    fill={colorSettings.productionLossesColor}
                    opacity={0.8}
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="totalMaterialLosses"
                    name="Perdas de Matéria-Prima"
                    fill={colorSettings.materialLossesColor}
                    opacity={0.8}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              ) : (
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="productName"
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalProduced"
                    name="Produzido"
                    stroke={colorSettings.producedColor}
                    strokeWidth={3}
                    dot={{
                      fill: colorSettings.producedColor,
                      strokeWidth: 2,
                      r: 4,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalProductionLosses"
                    name="Perdas de Produção"
                    stroke={colorSettings.productionLossesColor}
                    strokeWidth={2}
                    dot={{
                      fill: colorSettings.productionLossesColor,
                      strokeWidth: 2,
                      r: 3,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalMaterialLosses"
                    name="Perdas de Matéria-Prima"
                    stroke={colorSettings.materialLossesColor}
                    strokeWidth={2}
                    dot={{
                      fill: colorSettings.materialLossesColor,
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

export default ProductionChart;
