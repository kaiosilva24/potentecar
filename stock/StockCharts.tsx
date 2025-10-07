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
  ReferenceLine,
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

interface StockChartsProps {
  materials?: RawMaterial[];
  products?: Product[];
  stockItems?: StockItem[];
  productType?: "all" | "final" | "resale";
  isLoading?: boolean;
}

const StockCharts = ({
  materials = [],
  products = [],
  stockItems = [],
  productType = "all",
  isLoading = false,
}: StockChartsProps) => {
  // Estados para controle de ordenação
  const [materialSortBy, setMaterialSortBy] = useState<string>("quantity");
  const [productSortBy, setProductSortBy] = useState<string>("quantity");
  const [materialSortOrder, setMaterialSortOrder] = useState<"asc" | "desc">(
    "desc",
  );
  const [productSortOrder, setProductSortOrder] = useState<"asc" | "desc">(
    "desc",
  );

  // Estados para configuração de cores
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [colorSettings, setColorSettings] = useState({
    quantityColor: "#FF8C00", // Laranja para quantidade atual
    lowStockColor: "#FF3838", // Vermelho para estoque baixo
    minLevelColor: "#FFD700", // Dourado para nível mínimo
  });

  // Carregar configurações salvas do localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("stockChartColorSettings");
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
      "stockChartColorSettings",
      JSON.stringify(colorSettings),
    );
  };

  // Resetar cores para o padrão
  const resetToDefaultColors = () => {
    const defaultSettings = {
      quantityColor: "#FF8C00",
      lowStockColor: "#FF3838",
      minLevelColor: "#FFD700",
    };
    setColorSettings(defaultSettings);
    localStorage.setItem(
      "stockChartColorSettings",
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

  // Função para obter dados dos produtos finais apenas
  const getProductChartData = (
    products: Product[],
    stockItems: StockItem[]
  ) => {
    console.log('🔍 [StockCharts] Iniciando getProductChartData:', {
      productsCount: products.length,
      stockItemsCount: stockItems.length
    });

    // Apenas produtos finais
    const finalProducts = products.filter(p => !p.archived).map(product => ({
      ...product,
      type: 'final' as const
    }));

    console.log('📊 [StockCharts] Produtos finais processados:', {
      totalProducts: finalProducts.length
    });

    const chartData = finalProducts.map(product => {
      const stockItem = stockItems.find(item => 
        item.item_id === product.id && 
        item.item_type === 'product'
      );

      const quantity = stockItem?.quantity || 0;
      const totalValue = stockItem?.total_value || 0;

      console.log(`📦 [StockCharts] Produto processado: ${product.name}`, {
        type: product.type,
        quantity,
        stockFound: !!stockItem,
        stockId: stockItem?.id
      });

      return {
        name: product.name.length > 15 ? `${product.name.substring(0, 15)}...` : product.name,
        fullName: product.name,
        quantity,
        totalValue,
        minimumLevel: product.minimum_level || 0,
        type: product.type,
        unit: product.unit
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
  const productData = getProductChartData(products, stockItems);

  // Calcular dados dos produtos finais
  const productChartData = getProductChartData(
    products, 
    stockItems
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

  const getMinLevelColor = () => {
    return colorSettings.minLevelColor;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-factory-800 border border-tire-600/30 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.fullName}</p>
          {data.productType && (
            <p
              className={`text-xs font-medium mb-1 ${
                data.productType === "final"
                  ? "text-neon-green"
                  : "text-neon-cyan"
              }`}
            >
              {data.productType === "final"
                ? "🏭 Produto Final"
                : "🛒 Produto Revenda"}
            </p>
          )}
          <p className="text-neon-green">
            Quantidade: {data.quantity} {data.unit}
          </p>
          {data.minLevel > 0 && (
            <p className="text-yellow-400">
              Nível Mínimo: {data.minLevel} {data.unit}
            </p>
          )}
          {data.totalValue > 0 && (
            <p className="text-tire-300">
              Valor Total: {formatCurrency(data.totalValue)}
            </p>
          )}
          <p className="text-tire-400 text-sm capitalize">
            Status: {data.status === "low" ? "Estoque Baixo" : "Normal"}
          </p>
        </div>
      );
    }
    return null;
  };

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

          {/* Botão de Configurações de Cores */}
          <Dialog open={showColorSettings} onOpenChange={setShowColorSettings}>
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
                  Configurações de Cores do Gráfico
                </DialogTitle>
                <DialogDescription className="text-tire-300">
                  Personalize as cores das colunas do gráfico de estoque
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
                      <Label className="text-tire-300">Quantidade Atual</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={colorSettings.quantityColor}
                          onChange={(e) =>
                            updateColor("quantityColor", e.target.value)
                          }
                          className="w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                        />
                        <Input
                          type="text"
                          value={colorSettings.quantityColor}
                          onChange={(e) =>
                            updateColor("quantityColor", e.target.value)
                          }
                          className="bg-factory-700/50 border-tire-600/30 text-white"
                          placeholder="#FF8C00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-tire-300">Estoque Baixo</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={colorSettings.lowStockColor}
                          onChange={(e) =>
                            updateColor("lowStockColor", e.target.value)
                          }
                          className="w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                        />
                        <Input
                          type="text"
                          value={colorSettings.lowStockColor}
                          onChange={(e) =>
                            updateColor("lowStockColor", e.target.value)
                          }
                          className="bg-factory-700/50 border-tire-600/30 text-white"
                          placeholder="#FF3838"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-tire-300">Nível Mínimo</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={colorSettings.minLevelColor}
                          onChange={(e) =>
                            updateColor("minLevelColor", e.target.value)
                          }
                          className="w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                        />
                        <Input
                          type="text"
                          value={colorSettings.minLevelColor}
                          onChange={(e) =>
                            updateColor("minLevelColor", e.target.value)
                          }
                          className="bg-factory-700/50 border-tire-600/30 text-white"
                          placeholder="#FFD700"
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
                  <Legend />
                  <Bar
                    dataKey="quantity"
                    name="Quantidade Atual"
                    fill={getQuantityBarColor()}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="minLevel"
                    name="Nível Mínimo"
                    fill={getMinLevelColor()}
                    opacity={0.8}
                    radius={[3, 3, 0, 0]}
                  />
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
                Estoque de Produtos Finais
                <span className="text-xs text-tire-400">
                  ({finalProductsCount} produtos)
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
                  <Legend />
                  <Bar
                    dataKey="quantity"
                    name="Quantidade Atual"
                    fill={getQuantityBarColor()}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="minLevel"
                    name="Nível Mínimo"
                    fill={getMinLevelColor()}
                    opacity={0.8}
                    radius={[3, 3, 0, 0]}
                  />
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