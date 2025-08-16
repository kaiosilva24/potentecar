import React, { useState, useMemo } from "react";
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
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  BarChart3,
  PieChart,
  Plus,
  Minus,
  Settings,
  Truck,
} from "lucide-react";
import {
  RawMaterial,
  StockItem,
  CashFlowEntry,
  Supplier,
} from "@/types/financial";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface RawMaterialDashboardProps {
  materials?: RawMaterial[];
  stockItems?: StockItem[];
  cashFlowEntries?: CashFlowEntry[];
  suppliers?: Supplier[];
  onStockUpdate?: (
    itemId: string,
    itemType: "material" | "product",
    quantity: number,
    operation: "add" | "remove",
    unitPrice?: number,
  ) => void;
  onAddCashFlowEntry?: (entry: any) => Promise<void>;
  isLoading?: boolean;
}

const RawMaterialDashboard = ({
  materials = [],
  stockItems = [],
  cashFlowEntries = [],
  suppliers = [],
  onStockUpdate = () => {},
  onAddCashFlowEntry = async () => {},
  isLoading = false,
}: RawMaterialDashboardProps) => {
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState("10");
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const activeMaterials = materials.filter((m) => !m.archived);
    const materialStockItems = stockItems.filter(
      (item) => item.item_type === "material",
    );

    const totalMaterials = activeMaterials.length;
    const materialsInStock = materialStockItems.filter(
      (item) => item.quantity > 0,
    ).length;
    const lowStockItems = materialStockItems.filter(
      (item) => item.min_level && item.quantity <= item.min_level,
    ).length;
    const outOfStockItems = materialStockItems.filter(
      (item) => item.quantity === 0,
    ).length;

    const totalStockValue = materialStockItems.reduce(
      (sum, item) => sum + item.total_value,
      0,
    );

    const avgUnitCost =
      materialStockItems.length > 0
        ? materialStockItems.reduce((sum, item) => sum + item.unit_cost, 0) /
          materialStockItems.length
        : 0;

    // Calculate purchase expenses from cash flow
    const materialPurchases = cashFlowEntries.filter(
      (entry) =>
        entry.type === "expense" &&
        (entry.category.toLowerCase().includes("matéria") ||
          entry.category.toLowerCase().includes("material") ||
          entry.category.toLowerCase().includes("fornecedor")),
    );

    const totalPurchaseValue = materialPurchases.reduce(
      (sum, entry) => sum + entry.amount,
      0,
    );

    const monthlyPurchases = materialPurchases
      .filter((entry) => {
        const entryDate = new Date(entry.transaction_date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return entryDate >= thirtyDaysAgo;
      })
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      totalMaterials,
      materialsInStock,
      lowStockItems,
      outOfStockItems,
      totalStockValue,
      avgUnitCost,
      totalPurchaseValue,
      monthlyPurchases,
    };
  }, [materials, stockItems, cashFlowEntries]);

  // Stock level analysis
  const stockAnalysis = useMemo(() => {
    const materialStockItems = stockItems.filter(
      (item) => item.item_type === "material",
    );

    return materialStockItems
      .map((item) => {
        const material = materials.find((m) => m.id === item.item_id);
        const stockLevel =
          item.min_level && item.quantity <= item.min_level
            ? "low"
            : item.quantity === 0
              ? "out"
              : "normal";

        return {
          id: item.item_id,
          name: item.item_name,
          unit: material?.unit || "un",
          quantity: item.quantity,
          minLevel: item.min_level || 0,
          unitCost: item.unit_cost,
          totalValue: item.total_value,
          stockLevel,
          lastUpdated: item.last_updated,
        };
      })
      .sort((a, b) => {
        // Sort by stock level priority (out -> low -> normal)
        const levelPriority = { out: 0, low: 1, normal: 2 };
        return levelPriority[a.stockLevel] - levelPriority[b.stockLevel];
      });
  }, [stockItems, materials]);

  // Chart data for stock levels
  const stockChartData = useMemo(() => {
    return stockAnalysis.slice(0, 10).map((item) => ({
      name:
        item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
      quantity: item.quantity,
      minLevel: item.minLevel,
      value: item.totalValue,
    }));
  }, [stockAnalysis]);

  // Purchase trend data
  const purchaseTrendData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split("T")[0];
    });

    return last30Days.map((date) => {
      const dayPurchases = cashFlowEntries.filter(
        (entry) =>
          entry.type === "expense" &&
          entry.transaction_date === date &&
          (entry.category.toLowerCase().includes("matéria") ||
            entry.category.toLowerCase().includes("material") ||
            entry.category.toLowerCase().includes("fornecedor")),
      );

      const totalAmount = dayPurchases.reduce(
        (sum, entry) => sum + entry.amount,
        0,
      );

      return {
        date: new Date(date).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        amount: totalAmount,
      };
    });
  }, [cashFlowEntries]);

  const handlePurchase = async () => {
    if (!selectedMaterial || !quantity || !unitPrice) return;

    const material = materials.find((m) => m.id === selectedMaterial);
    const supplier = suppliers.find((s) => s.id === selectedSupplier);

    if (!material) return;

    const totalAmount = parseFloat(quantity) * parseFloat(unitPrice);

    try {
      // Add to stock
      onStockUpdate(
        selectedMaterial,
        "material",
        parseFloat(quantity),
        "add",
        parseFloat(unitPrice),
      );

      // Add cash flow entry
      await onAddCashFlowEntry({
        type: "expense",
        category: "Fornecedores",
        reference_id: selectedSupplier || undefined,
        reference_name: supplier?.name || "Compra de Material",
        amount: totalAmount,
        description: `Compra de ${quantity} ${material.unit} de ${material.name} - Preço unitário: ${formatCurrency(parseFloat(unitPrice))}`,
        transaction_date: new Date().toISOString().split("T")[0],
      });

      // Reset form
      setSelectedMaterial("");
      setQuantity("");
      setUnitPrice("");
      setSelectedSupplier("");
      setIsPurchaseDialogOpen(false);
    } catch (error) {
      console.error("Erro ao registrar compra:", error);
    }
  };

  const COLORS = [
    "#10B981",
    "#3B82F6",
    "#8B5CF6",
    "#F59E0B",
    "#EF4444",
    "#EC4899",
    "#06B6D4",
    "#84CC16",
  ];

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
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center">
                <Package className="h-4 w-4 text-white" />
              </div>
              Dashboard de Matéria-Prima
            </h2>
            <p className="text-tire-300 mt-2">
              Controle avançado de estoque e compras de matéria-prima
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog
              open={isPurchaseDialogOpen}
              onOpenChange={setIsPurchaseDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-neon-green to-tire-500 hover:from-tire-600 hover:to-neon-green text-white">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Nova Compra
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-factory-800 border-tire-600/30 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Registrar Compra de Material
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-tire-300">Material</Label>
                    <Select
                      value={selectedMaterial}
                      onValueChange={setSelectedMaterial}
                    >
                      <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                        <SelectValue placeholder="Selecione um material" />
                      </SelectTrigger>
                      <SelectContent className="bg-factory-800 border-tire-600/30">
                        {materials
                          .filter((m) => !m.archived)
                          .map((material) => (
                            <SelectItem
                              key={material.id}
                              value={material.id}
                              className="text-white hover:bg-tire-700/50"
                            >
                              {material.name} ({material.unit})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-tire-300">
                      Fornecedor (Opcional)
                    </Label>
                    <Select
                      value={selectedSupplier}
                      onValueChange={setSelectedSupplier}
                    >
                      <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                        <SelectValue placeholder="Selecione um fornecedor" />
                      </SelectTrigger>
                      <SelectContent className="bg-factory-800 border-tire-600/30">
                        {suppliers
                          .filter((s) => !s.archived)
                          .map((supplier) => (
                            <SelectItem
                              key={supplier.id}
                              value={supplier.id}
                              className="text-white hover:bg-tire-700/50"
                            >
                              {supplier.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-tire-300">Quantidade</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="bg-factory-700/50 border-tire-600/30 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-tire-300">
                        Preço Unitário (R$)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        className="bg-factory-700/50 border-tire-600/30 text-white"
                      />
                    </div>
                  </div>

                  {quantity && unitPrice && (
                    <div className="p-3 bg-factory-700/30 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-tire-300">Total da Compra:</span>
                        <span className="text-neon-green font-bold text-lg">
                          {formatCurrency(
                            parseFloat(quantity) * parseFloat(unitPrice),
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handlePurchase}
                    className="w-full bg-neon-green hover:bg-neon-green/80"
                    disabled={!selectedMaterial || !quantity || !unitPrice}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Compra
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isAlertDialogOpen}
              onOpenChange={setIsAlertDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-factory-700/50 border-tire-600/30 text-tire-300 hover:text-white"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-factory-800 border-tire-600/30 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Configurações de Alerta
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-tire-300">
                      Limite de Estoque Baixo (%)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={alertThreshold}
                      onChange={(e) => setAlertThreshold(e.target.value)}
                      className="bg-factory-700/50 border-tire-600/30 text-white"
                    />
                  </div>
                  <Button
                    onClick={() => setIsAlertDialogOpen(false)}
                    className="w-full bg-neon-green hover:bg-neon-green/80"
                  >
                    Salvar Configuração
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {metrics.lowStockItems > 0 && (
        <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div>
              <h4 className="text-yellow-400 font-medium">
                Atenção: Estoque Baixo
              </h4>
              <p className="text-yellow-300 text-sm mt-1">
                {metrics.lowStockItems} material(is) com estoque abaixo do nível
                mínimo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Total de Materiais</p>
                <p className="text-2xl font-bold text-neon-blue">
                  {metrics.totalMaterials}
                </p>
              </div>
              <div className="text-neon-blue">
                <Package className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Valor Total do Estoque</p>
                <p className="text-2xl font-bold text-neon-green">
                  {formatCurrency(metrics.totalStockValue)}
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
                <p className="text-tire-300 text-sm">Itens com Estoque Baixo</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {metrics.lowStockItems}
                </p>
              </div>
              <div className="text-yellow-400">
                <AlertTriangle className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Compras (30 dias)</p>
                <p className="text-2xl font-bold text-neon-purple">
                  {formatCurrency(metrics.monthlyPurchases)}
                </p>
              </div>
              <div className="text-neon-purple">
                <Truck className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Stock Levels Chart */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-neon-blue" />
              Níveis de Estoque (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    stroke="#9CA3AF"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB",
                    }}
                  />
                  <Bar
                    dataKey="quantity"
                    fill="#10B981"
                    name="Quantidade Atual"
                  />
                  <Bar dataKey="minLevel" fill="#F59E0B" name="Nível Mínimo" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Trend Chart */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-neon-purple" />
              Tendência de Compras (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={purchaseTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB",
                    }}
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Compras",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Analysis Table */}
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-neon-green" />
            Análise Detalhada do Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stockAnalysis.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                  <p className="text-tire-400">Nenhum material em estoque</p>
                </div>
              ) : (
                stockAnalysis.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border ${
                      item.stockLevel === "out"
                        ? "bg-red-900/20 border-red-500/30"
                        : item.stockLevel === "low"
                          ? "bg-yellow-900/20 border-yellow-500/30"
                          : "bg-factory-700/30 border-tire-600/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            item.stockLevel === "out"
                              ? "bg-red-500"
                              : item.stockLevel === "low"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          }`}
                        ></div>
                        <h4 className="text-white font-medium">{item.name}</h4>
                        {item.stockLevel !== "normal" && (
                          <AlertTriangle
                            className={`h-4 w-4 ${
                              item.stockLevel === "out"
                                ? "text-red-400"
                                : "text-yellow-400"
                            }`}
                          />
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-lg font-bold ${
                            item.stockLevel === "out"
                              ? "text-red-400"
                              : item.stockLevel === "low"
                                ? "text-yellow-400"
                                : "text-neon-green"
                          }`}
                        >
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-tire-400">Nível Mínimo:</span>
                        <p className="text-tire-200">
                          {item.minLevel} {item.unit}
                        </p>
                      </div>
                      <div>
                        <span className="text-tire-400">Custo Unitário:</span>
                        <p className="text-tire-200">
                          {formatCurrency(item.unitCost)}
                        </p>
                      </div>
                      <div>
                        <span className="text-tire-400">Valor Total:</span>
                        <p className="text-neon-blue font-medium">
                          {formatCurrency(item.totalValue)}
                        </p>
                      </div>
                      <div>
                        <span className="text-tire-400">Status:</span>
                        <p
                          className={`font-medium ${
                            item.stockLevel === "out"
                              ? "text-red-400"
                              : item.stockLevel === "low"
                                ? "text-yellow-400"
                                : "text-neon-green"
                          }`}
                        >
                          {item.stockLevel === "out" && "Sem Estoque"}
                          {item.stockLevel === "low" && "Estoque Baixo"}
                          {item.stockLevel === "normal" && "Estoque Normal"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RawMaterialDashboard;
