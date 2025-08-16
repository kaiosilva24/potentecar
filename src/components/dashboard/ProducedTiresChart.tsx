import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package2, Calendar, BarChart3 } from "lucide-react";
import { StockItem, ProductionEntry } from "@/types/financial";

interface ProducedTiresChartProps {
  stockItems?: StockItem[];
  productionEntries?: ProductionEntry[];
  isLoading?: boolean;
}

const ProducedTiresChart = ({
  stockItems = [],
  productionEntries = [],
  isLoading = false,
}: ProducedTiresChartProps) => {
  // Filter stock items to show only produced tires (products)
  const producedTiresStock = stockItems.filter(
    (item) => item.item_type === "product",
  );

  // Prepare data for charts
  const getChartData = () => {
    return producedTiresStock.map((item) => ({
      name:
        item.item_name.length > 15
          ? item.item_name.substring(0, 15) + "..."
          : item.item_name,
      fullName: item.item_name,
      quantity: item.quantity,
      value: item.total_value,
      unit: item.unit,
    }));
  };

  // Get production data by month
  const getProductionByMonth = () => {
    const monthlyData: { [key: string]: number } = {};

    productionEntries.forEach((entry) => {
      const date = new Date(entry.production_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }
      monthlyData[monthKey] += entry.quantity_produced;
    });

    return Object.entries(monthlyData)
      .map(([month, quantity]) => ({
        month,
        quantity,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  };

  const chartData = getChartData();
  const productionData = getProductionByMonth();
  const totalTires = chartData.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

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
          <p className="text-neon-green">
            Quantidade: {data.quantity} {data.unit}
          </p>
          <p className="text-neon-blue">Valor: {formatCurrency(data.value)}</p>
        </div>
      );
    }
    return null;
  };

  const COLORS = [
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
  ];

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
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
    <div className="w-full max-w-6xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-neon-orange" />
          Dashboard de Pneus Produzidos
        </h3>
        <p className="text-tire-300 mt-2">
          Visualização do estoque e produção de pneus recauchutados
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Total de Pneus</p>
                <p className="text-2xl font-bold text-neon-orange">
                  {totalTires.toFixed(0)}
                </p>
              </div>
              <div className="text-neon-orange">
                <Package2 className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Valor Total</p>
                <p className="text-lg font-bold text-neon-blue">
                  {formatCurrency(totalValue)}
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
                <p className="text-tire-300 text-sm">Tipos de Pneus</p>
                <p className="text-2xl font-bold text-neon-purple">
                  {chartData.length}
                </p>
              </div>
              <div className="text-neon-purple">
                <BarChart3 className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Stock Chart */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
              Estoque Atual por Tipo
              <Badge
                variant="outline"
                className="text-tire-300 border-tire-600"
              >
                {chartData.length} Tipos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-center py-8">
                <Package2 className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                <p className="text-tire-400">Nenhum pneu produzido ainda</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
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
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Production by Month */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Produção por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productionData.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                <p className="text-tire-400">Nenhuma produção registrada</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar
                    dataKey="quantity"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribution Pie Chart */}
      {chartData.length > 0 && (
        <Card className="mt-6 bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Distribuição do Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="quantity"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProducedTiresChart;
