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
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart,
  Target,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { CashFlowEntry } from "@/types/financial";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
} from "recharts";

interface CashBalanceDashboardProps {
  cashFlowEntries?: CashFlowEntry[];
  isLoading?: boolean;
}

const CashBalanceDashboard = ({
  cashFlowEntries = [],
  isLoading = false,
}: CashBalanceDashboardProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState("30"); // days
  const [alertThreshold, setAlertThreshold] = useState("1000");
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calculate metrics based on selected period
  const metrics = useMemo(() => {
    const periodDays = parseInt(selectedPeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    const periodEntries = cashFlowEntries.filter(
      (entry) => new Date(entry.transaction_date) >= cutoffDate,
    );

    const totalIncome = cashFlowEntries
      .filter((entry) => entry.type === "income")
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalExpense = cashFlowEntries
      .filter((entry) => entry.type === "expense")
      .reduce((sum, entry) => sum + entry.amount, 0);

    const currentBalance = totalIncome - totalExpense;

    const periodIncome = periodEntries
      .filter((entry) => entry.type === "income")
      .reduce((sum, entry) => sum + entry.amount, 0);

    const periodExpense = periodEntries
      .filter((entry) => entry.type === "expense")
      .reduce((sum, entry) => sum + entry.amount, 0);

    const periodBalance = periodIncome - periodExpense;

    // Calculate daily averages
    const avgDailyIncome = periodIncome / periodDays;
    const avgDailyExpense = periodExpense / periodDays;
    const avgDailyBalance = periodBalance / periodDays;

    // Projection for next 30 days
    const projectedIncome = avgDailyIncome * 30;
    const projectedExpense = avgDailyExpense * 30;
    const projectedBalance = currentBalance + avgDailyBalance * 30;

    // Category breakdown
    const categoryBreakdown = cashFlowEntries.reduce(
      (acc, entry) => {
        if (!acc[entry.category]) {
          acc[entry.category] = { income: 0, expense: 0 };
        }
        if (entry.type === "income") {
          acc[entry.category].income += entry.amount;
        } else {
          acc[entry.category].expense += entry.amount;
        }
        return acc;
      },
      {} as Record<string, { income: number; expense: number }>,
    );

    return {
      currentBalance,
      totalIncome,
      totalExpense,
      periodIncome,
      periodExpense,
      periodBalance,
      avgDailyIncome,
      avgDailyExpense,
      avgDailyBalance,
      projectedIncome,
      projectedExpense,
      projectedBalance,
      categoryBreakdown,
    };
  }, [cashFlowEntries, selectedPeriod]);

  // Generate chart data for balance evolution
  const balanceChartData = useMemo(() => {
    const sortedEntries = [...cashFlowEntries].sort(
      (a, b) =>
        new Date(a.transaction_date).getTime() -
        new Date(b.transaction_date).getTime(),
    );

    let runningBalance = 0;
    const data: {
      date: string;
      balance: number;
      income: number;
      expense: number;
    }[] = [];

    // Group by date
    const dailyData = sortedEntries.reduce(
      (acc, entry) => {
        const date = entry.transaction_date;
        if (!acc[date]) {
          acc[date] = { income: 0, expense: 0 };
        }
        if (entry.type === "income") {
          acc[date].income += entry.amount;
        } else {
          acc[date].expense += entry.amount;
        }
        return acc;
      },
      {} as Record<string, { income: number; expense: number }>,
    );

    Object.entries(dailyData)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .forEach(([date, { income, expense }]) => {
        runningBalance += income - expense;
        data.push({
          date: new Date(date).toLocaleDateString("pt-BR"),
          balance: runningBalance,
          income,
          expense,
        });
      });

    return data.slice(-30); // Last 30 days
  }, [cashFlowEntries]);

  // Category pie chart data
  const categoryPieData = useMemo(() => {
    return Object.entries(metrics.categoryBreakdown)
      .map(([category, data]) => ({
        name: category,
        value: data.expense,
        income: data.income,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 categories
  }, [metrics.categoryBreakdown]);

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

  const isLowBalance = metrics.currentBalance < parseFloat(alertThreshold);
  const isNegativeProjection = metrics.projectedBalance < 0;

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
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-green to-neon-blue flex items-center justify-center">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              Dashboard de Saldo de Caixa
            </h2>
            <p className="text-tire-300 mt-2">
              Análise detalhada do fluxo de caixa e projeções financeiras
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40 bg-factory-700/50 border-tire-600/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-factory-800 border-tire-600/30">
                <SelectItem
                  value="7"
                  className="text-white hover:bg-tire-700/50"
                >
                  Últimos 7 dias
                </SelectItem>
                <SelectItem
                  value="30"
                  className="text-white hover:bg-tire-700/50"
                >
                  Últimos 30 dias
                </SelectItem>
                <SelectItem
                  value="90"
                  className="text-white hover:bg-tire-700/50"
                >
                  Últimos 90 dias
                </SelectItem>
              </SelectContent>
            </Select>
            <Dialog
              open={isAlertDialogOpen}
              onOpenChange={setIsAlertDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-factory-700/50 border-tire-600/30 text-tire-300 hover:text-white"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Alertas
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-factory-800 border-tire-600/30 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    Configurar Alertas de Saldo
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-tire-300">
                      Limite Mínimo de Saldo (R$)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
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
      {(isLowBalance || isNegativeProjection) && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div>
              <h4 className="text-red-400 font-medium">Atenção Necessária</h4>
              <div className="text-red-300 text-sm mt-1">
                {isLowBalance && (
                  <p>
                    • Saldo atual abaixo do limite configurado (
                    {formatCurrency(parseFloat(alertThreshold))})
                  </p>
                )}
                {isNegativeProjection && (
                  <p>• Projeção indica saldo negativo em 30 dias</p>
                )}
              </div>
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
                <p className="text-tire-300 text-sm">Saldo Atual</p>
                <p
                  className={`text-2xl font-bold ${
                    metrics.currentBalance >= 0
                      ? "text-neon-green"
                      : "text-red-400"
                  }`}
                >
                  {formatCurrency(metrics.currentBalance)}
                </p>
              </div>
              <div
                className={
                  metrics.currentBalance >= 0
                    ? "text-neon-green"
                    : "text-red-400"
                }
              >
                <DollarSign className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">
                  Média Diária ({selectedPeriod} dias)
                </p>
                <p
                  className={`text-2xl font-bold ${
                    metrics.avgDailyBalance >= 0
                      ? "text-neon-blue"
                      : "text-red-400"
                  }`}
                >
                  {formatCurrency(metrics.avgDailyBalance)}
                </p>
              </div>
              <div
                className={
                  metrics.avgDailyBalance >= 0
                    ? "text-neon-blue"
                    : "text-red-400"
                }
              >
                <BarChart3 className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Projeção 30 Dias</p>
                <p
                  className={`text-2xl font-bold ${
                    metrics.projectedBalance >= 0
                      ? "text-neon-purple"
                      : "text-red-400"
                  }`}
                >
                  {formatCurrency(metrics.projectedBalance)}
                </p>
              </div>
              <div
                className={
                  metrics.projectedBalance >= 0
                    ? "text-neon-purple"
                    : "text-red-400"
                }
              >
                <Target className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">
                  Período ({selectedPeriod} dias)
                </p>
                <p
                  className={`text-2xl font-bold ${
                    metrics.periodBalance >= 0
                      ? "text-neon-orange"
                      : "text-red-400"
                  }`}
                >
                  {formatCurrency(metrics.periodBalance)}
                </p>
              </div>
              <div
                className={
                  metrics.periodBalance >= 0
                    ? "text-neon-orange"
                    : "text-red-400"
                }
              >
                <Calendar className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Balance Evolution Chart */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-neon-green" />
              Evolução do Saldo (Últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80" style={{ minHeight: '320px', minWidth: '300px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={320}>
                <LineChart data={balanceChartData}>
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
                      "Saldo",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-neon-purple" />
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80" style={{ minHeight: '320px', minWidth: '300px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={320}>
                <RechartsPieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F9FAFB",
                    }}
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Gasto",
                    ]}
                  />
                  <RechartsPieChart
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </RechartsPieChart>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categoryPieData.slice(0, 6).map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-tire-300 text-xs truncate">
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Analysis */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Análise de Entradas vs Saídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-neon-green/10 rounded-lg border border-neon-green/30">
                <div className="flex items-center gap-3">
                  <ArrowUpCircle className="h-5 w-5 text-neon-green" />
                  <div>
                    <p className="text-neon-green font-medium">
                      Total de Entradas
                    </p>
                    <p className="text-tire-300 text-sm">
                      Período de {selectedPeriod} dias
                    </p>
                  </div>
                </div>
                <span className="text-neon-green font-bold text-lg">
                  {formatCurrency(metrics.periodIncome)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-400/10 rounded-lg border border-red-400/30">
                <div className="flex items-center gap-3">
                  <ArrowDownCircle className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="text-red-400 font-medium">Total de Saídas</p>
                    <p className="text-tire-300 text-sm">
                      Período de {selectedPeriod} dias
                    </p>
                  </div>
                </div>
                <span className="text-red-400 font-bold text-lg">
                  {formatCurrency(metrics.periodExpense)}
                </span>
              </div>

              <div className="pt-3 border-t border-tire-600/30">
                <div className="flex justify-between items-center">
                  <span className="text-tire-300">
                    Média Diária de Entradas:
                  </span>
                  <span className="text-neon-green font-medium">
                    {formatCurrency(metrics.avgDailyIncome)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-tire-300">Média Diária de Saídas:</span>
                  <span className="text-red-400 font-medium">
                    {formatCurrency(metrics.avgDailyExpense)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projections */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Projeções Financeiras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-factory-700/30 rounded-lg">
                <h4 className="text-white font-medium mb-3">
                  Projeção para os próximos 30 dias:
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-tire-300">Entradas Projetadas:</span>
                    <span className="text-neon-green">
                      {formatCurrency(metrics.projectedIncome)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tire-300">Saídas Projetadas:</span>
                    <span className="text-red-400">
                      {formatCurrency(metrics.projectedExpense)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-tire-600/30">
                    <span className="text-white font-medium">
                      Saldo Projetado:
                    </span>
                    <span
                      className={`font-bold ${
                        metrics.projectedBalance >= 0
                          ? "text-neon-blue"
                          : "text-red-400"
                      }`}
                    >
                      {formatCurrency(metrics.projectedBalance)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-factory-700/30 rounded-lg">
                <h4 className="text-white font-medium mb-3">Recomendações:</h4>
                <div className="space-y-2 text-sm">
                  {metrics.projectedBalance < 0 && (
                    <div className="flex items-start gap-2 text-red-400">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Atenção: Projeção indica saldo negativo. Considere
                        reduzir gastos ou aumentar receitas.
                      </span>
                    </div>
                  )}
                  {metrics.avgDailyExpense > metrics.avgDailyIncome && (
                    <div className="flex items-start gap-2 text-yellow-400">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Gastos diários excedem receitas. Monitore o fluxo de
                        caixa de perto.
                      </span>
                    </div>
                  )}
                  {metrics.currentBalance > parseFloat(alertThreshold) * 5 && (
                    <div className="flex items-start gap-2 text-neon-green">
                      <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Saldo saudável. Considere investimentos ou reservas de
                        emergência.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CashBalanceDashboard;
