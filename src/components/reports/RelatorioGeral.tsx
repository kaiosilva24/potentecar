import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileBarChart,
  TrendingUp,
  Factory,
  ShoppingBag,
  Package,
  DollarSign,
  Boxes,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  useCashFlow,
  useProductionEntries,
  useStockItems,
  useResaleProducts,
  useDebts,
} from "@/hooks/useDataPersistence";
import {
  computeFinancialMetrics,
  computeProfitSeries,
} from "@/utils/financialMetrics";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
} from "@/utils/formatters";

interface RelatorioGeralProps {
  isLoading?: boolean;
  onRefresh?: () => void;
}

// Dia local — MESMA convenção do financialMetrics (new Date local), para o
// relatório bater com o DRE do Dashboard.
const localDayKey = (dateStr?: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function periodRange(
  type: string,
  cs: string,
  ce: string
): { from?: string; to?: string; label: string } {
  const today = new Date();
  switch (type) {
    case "today":
      return { from: keyOf(today), to: keyOf(today), label: "Hoje" };
    case "last7days": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: keyOf(from), to: keyOf(today), label: "Últimos 7 dias" };
    }
    case "last30days": {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from: keyOf(from), to: keyOf(today), label: "Últimos 30 dias" };
    }
    case "thisMonth":
      return {
        from: keyOf(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: keyOf(today),
        label: "Este mês",
      };
    case "lastMonth": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: keyOf(first), to: keyOf(last), label: "Mês passado" };
    }
    case "custom":
      return {
        from: cs || undefined,
        to: ce || undefined,
        label: "Período personalizado",
      };
    case "all":
    default:
      return { from: undefined, to: undefined, label: "Todo o período" };
  }
}

const COLORS = {
  final: "#3b82f6",
  revenda: "#f97316",
  materia_prima: "#22c55e",
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#a855f7",
};

const tipoLabel: Record<string, string> = {
  final: "Produto Final",
  revenda: "Revenda",
  materia_prima: "Matéria-Prima",
};

const RelatorioGeral = ({ isLoading = false }: RelatorioGeralProps) => {
  const { cashFlowEntries } = useCashFlow();
  const { productionEntries } = useProductionEntries();
  const { stockItems } = useStockItems();
  const { resaleProducts } = useResaleProducts();
  const { debts } = useDebts();

  const [dateFilterType, setDateFilterType] = useState("last30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const range = useMemo(
    () => periodRange(dateFilterType, customStartDate, customEndDate),
    [dateFilterType, customStartDate, customEndDate]
  );
  const { from, to } = range;

  const inRange = (dateStr?: string) => {
    const d = localDayKey(dateStr);
    if (!d) return true;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  // Métricas do período (mesma fonte do Dashboard/Financeiro)
  const m = useMemo(
    () =>
      computeFinancialMetrics(
        {
          stockItems: stockItems as any,
          cashFlowEntries: cashFlowEntries as any,
          resaleProducts: resaleProducts as any,
          debts: debts as any,
          productionEntries: productionEntries as any,
        },
        from && to ? { from, to } : {}
      ),
    [stockItems, cashFlowEntries, resaleProducts, debts, productionEntries, from, to]
  );

  // Série diária de lucro/receita (para gráfico)
  const series = useMemo(
    () =>
      computeProfitSeries(
        {
          stockItems: stockItems as any,
          cashFlowEntries: cashFlowEntries as any,
          resaleProducts: resaleProducts as any,
        },
        from && to ? { from, to } : 30
      ),
    [stockItems, cashFlowEntries, resaleProducts, from, to]
  );

  // Mapas de custo (id -> unit_cost)
  const stockById = useMemo(
    () => new Map(stockItems.map((s: any) => [s.id, s])),
    [stockItems]
  );
  const productByItemId = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of stockItems as any[]) {
      if (s.item_type === "product") map.set(s.item_id, s);
    }
    return map;
  }, [stockItems]);
  const productByName = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of stockItems as any[]) {
      if (s.item_type === "product")
        map.set((s.item_name || "").trim().toLowerCase(), s);
    }
    return map;
  }, [stockItems]);

  const g = (re: RegExp, s: string) => (s.match(re) || [])[1]?.trim();

  // Linhas de venda detalhadas (venda + venda_prazo) no período
  const saleRows = useMemo(() => {
    return (cashFlowEntries as any[])
      .filter(
        (e) =>
          e.type === "income" &&
          (e.category === "venda" || e.category === "venda_prazo") &&
          inRange(e.transaction_date)
      )
      .map((e) => {
        const d = e.description || "";
        const tipo = g(/TIPO_PRODUTO:\s*(\w+)/, d) || "final";
        const qtd = Number(g(/Qtd:\s*([0-9.]+)/, d) || "0");
        const id = g(/ID_Produto:\s*([^|\s]+)/, d);
        const row =
          tipo === "revenda" ? productByItemId.get(id!) : stockById.get(id!);
        const custoUnit = row ? Number(row.unit_cost) || 0 : 0;
        const pendente = e.category === "venda_prazo";
        const receita = pendente
          ? Number(g(/Valor_Original:\s*([\d.]+)/, d) || "0")
          : Number(e.amount) || 0;
        return {
          data: e.transaction_date,
          tipo,
          vendedor: g(/Vendedor:\s*([^|]+)/, d) || "-",
          produto: g(/Produto:\s*([^|]+)/, d) || "-",
          qtd,
          receita,
          custoUnit,
          custo: custoUnit * qtd,
          lucro: receita - custoUnit * qtd,
          metodo: g(/Método:\s*([^|]+)/, d) || "-",
          pago: !pendente,
        };
      })
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [cashFlowEntries, from, to, stockById, productByItemId]);

  // Produção no período
  const prodRows = useMemo(() => {
    return (productionEntries as any[])
      .filter((e) => inRange(e.production_date))
      .map((e) => {
        const prod = productByName.get((e.product_name || "").trim().toLowerCase());
        const custoUnit = prod ? Number(prod.unit_cost) || 0 : 0;
        return {
          data: e.production_date,
          produto: e.product_name,
          qtd: Number(e.quantity_produced) || 0,
          perda: Number(e.production_loss) || 0,
          garantia: Number(e.warranty_loss) || 0,
          materiais: Array.isArray(e.materials_consumed)
            ? e.materials_consumed.length
            : 0,
          custoMaterial: (Number(e.quantity_produced) || 0) * custoUnit,
          raw: e,
        };
      })
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [productionEntries, from, to, productByName]);

  // Compras de matéria-prima (Fornecedores) no período
  const compraRows = useMemo(() => {
    return (cashFlowEntries as any[])
      .filter(
        (e) =>
          e.type === "expense" &&
          e.category === "Fornecedores" &&
          inRange(e.transaction_date)
      )
      .map((e) => ({
        data: e.transaction_date,
        descricao: e.reference_name || "-",
        valor: Number(e.amount) || 0,
      }))
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [cashFlowEntries, from, to]);

  // Consumo de matéria-prima no período (agregado por material)
  const consumoRows = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; unidade: string }>();
    for (const e of productionEntries as any[]) {
      if (!inRange(e.production_date)) continue;
      if (!Array.isArray(e.materials_consumed)) continue;
      for (const mc of e.materials_consumed) {
        const key = mc.material_name || mc.material_id;
        const cur = map.get(key) || {
          nome: mc.material_name || "-",
          qtd: 0,
          unidade: mc.unit || "",
        };
        cur.qtd += Number(mc.quantity_consumed) || 0;
        map.set(key, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qtd - a.qtd);
  }, [productionEntries, from, to]);

  // Estoque atual de matéria-prima (posição atual, não do período)
  const materialStock = useMemo(() => {
    return (stockItems as any[])
      .filter((s) => s.item_type === "material")
      .map((s) => ({
        nome: s.item_name,
        qtd: Number(s.quantity) || 0,
        unidade: s.unit || "-",
        custoUnit: Number(s.unit_cost) || 0,
        total: Number(s.total_value) || 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [stockItems]);

  // Rollups de vendas (só pagas, para bater com m.*)
  const byVendedor = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of saleRows) {
      if (!r.pago) continue;
      const cur = map.get(r.vendedor) || {
        vendedor: r.vendedor,
        vendas: 0,
        qtd: 0,
        receita: 0,
        custo: 0,
        lucro: 0,
      };
      cur.vendas += 1;
      cur.qtd += r.qtd;
      cur.receita += r.receita;
      cur.custo += r.custo;
      cur.lucro += r.lucro;
      map.set(r.vendedor, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.receita - a.receita);
  }, [saleRows]);

  const byProduto = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of saleRows) {
      if (!r.pago) continue;
      const k = `${r.tipo}||${r.produto}`;
      const cur = map.get(k) || {
        produto: r.produto,
        tipo: r.tipo,
        qtd: 0,
        receita: 0,
        lucro: 0,
      };
      cur.qtd += r.qtd;
      cur.receita += r.receita;
      cur.lucro += r.lucro;
      map.set(k, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.receita - a.receita);
  }, [saleRows]);

  const prodResumo = useMemo(() => {
    const totQtd = prodRows.reduce((a, r) => a + r.qtd, 0);
    const totPerda = prodRows.reduce((a, r) => a + r.perda, 0);
    const totGarantia = prodRows.reduce((a, r) => a + r.garantia, 0);
    const totCusto = prodRows.reduce((a, r) => a + r.custoMaterial, 0);
    return { totQtd, totPerda, totGarantia, totCusto };
  }, [prodRows]);

  // Dados de gráficos
  const receitaPorTipo = [
    { nome: "Final", receita: m.receitaFinal, lucro: m.lucroFinal },
    { nome: "Revenda", receita: m.receitaRevenda, lucro: m.lucroRevenda },
    {
      nome: "Matéria-Prima",
      receita: m.receitaMateriaPrima,
      lucro: m.lucroMateriaPrima,
    },
  ];
  const pieData = receitaPorTipo
    .filter((d) => d.receita > 0)
    .map((d) => ({ name: d.nome, value: d.receita }));

  const cardBase =
    "bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200";
  const tabTrigger =
    "data-[state=active]:bg-neon-blue/20 data-[state=active]:text-neon-blue text-tire-300";

  const KpiCard = ({
    title,
    value,
    sub,
    icon,
    color = "text-tire-200",
  }: {
    title: string;
    value: string;
    sub?: string;
    icon: React.ReactNode;
    color?: string;
  }) => (
    <Card className={cardBase}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-tire-300 text-sm font-medium">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-tire-400 mt-1">{sub}</p>}
          </div>
          <div className="p-2 rounded-full bg-blue-500/20">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-2 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-neon-blue/20 to-neon-purple/20">
            <FileBarChart className="h-6 w-6 text-neon-blue" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Relatório Geral
            </h2>
            <p className="text-sm text-tire-400">
              Produção, Vendas e Matéria-Prima — {range.label}
            </p>
          </div>
        </div>
      </div>

      {/* Filtro de período */}
      <Card className={cardBase}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label className="text-tire-300 text-sm">Período:</Label>
              <Select value={dateFilterType} onValueChange={setDateFilterType}>
                <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-factory-800 border-tire-600/30">
                  <SelectItem value="today" className="text-white">
                    Hoje
                  </SelectItem>
                  <SelectItem value="last7days" className="text-white">
                    Últimos 7 dias
                  </SelectItem>
                  <SelectItem value="last30days" className="text-white">
                    Últimos 30 dias
                  </SelectItem>
                  <SelectItem value="thisMonth" className="text-white">
                    Este mês
                  </SelectItem>
                  <SelectItem value="lastMonth" className="text-white">
                    Mês passado
                  </SelectItem>
                  <SelectItem value="custom" className="text-white">
                    Período personalizado
                  </SelectItem>
                  <SelectItem value="all" className="text-white">
                    Todo o período
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateFilterType === "custom" && (
              <>
                <div className="space-y-2">
                  <Label className="text-tire-300 text-sm">Data início:</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-factory-700/50 border-tire-600/30 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-tire-300 text-sm">Data fim:</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-factory-700/50 border-tire-600/30 text-white"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Receita Total"
          value={formatCurrency(m.receitaVendas)}
          sub={`${formatNumber(
            m.qtdPneusVendidos + m.qtdRevendaVendida + m.qtdMateriaPrimaVendida
          )} itens vendidos`}
          icon={<DollarSign className="h-5 w-5 text-green-400" />}
          color="text-green-400"
        />
        <KpiCard
          title="Lucro Bruto"
          value={formatCurrency(m.lucroBruto)}
          sub={`Margem ${formatPercentage(m.margemBruta)}`}
          icon={<TrendingUp className="h-5 w-5 text-blue-400" />}
          color={m.lucroBruto >= 0 ? "text-green-400" : "text-red-400"}
        />
        <KpiCard
          title="Despesas Operacionais"
          value={formatCurrency(m.despesasOperacionais)}
          sub="Funcionários, custos, vendedores…"
          icon={<Wallet className="h-5 w-5 text-red-400" />}
          color="text-red-400"
        />
        <KpiCard
          title="Lucro Líquido"
          value={formatCurrency(m.lucroLiquido)}
          sub={`Margem ${formatPercentage(m.margemLiquida)}`}
          icon={<TrendingUp className="h-5 w-5 text-blue-400" />}
          color={m.lucroLiquido >= 0 ? "text-green-400" : "text-red-400"}
        />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-factory-800/50 border border-tire-600/30">
          <TabsTrigger value="overview" className={tabTrigger}>
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="production" className={tabTrigger}>
            Produção
          </TabsTrigger>
          <TabsTrigger value="sales" className={tabTrigger}>
            Vendas
          </TabsTrigger>
          <TabsTrigger value="materials" className={tabTrigger}>
            Matéria-Prima
          </TabsTrigger>
        </TabsList>

        {/* ======================= VISÃO GERAL ======================= */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Comparação Final / Revenda / Matéria-Prima */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: "Produtos Finais",
                icon: <Package className="h-5 w-5 text-blue-400" />,
                receita: m.receitaFinal,
                lucro: m.lucroFinal,
                qtd: m.qtdPneusVendidos,
              },
              {
                label: "Produtos Revenda",
                icon: <ShoppingBag className="h-5 w-5 text-orange-400" />,
                receita: m.receitaRevenda,
                lucro: m.lucroRevenda,
                qtd: m.qtdRevendaVendida,
              },
              {
                label: "Matéria-Prima",
                icon: <Factory className="h-5 w-5 text-emerald-400" />,
                receita: m.receitaMateriaPrima,
                lucro: m.lucroMateriaPrima,
                qtd: m.qtdMateriaPrimaVendida,
              },
            ].map((c) => (
              <Card key={c.label} className={cardBase}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-tire-300 text-sm font-medium">
                      {c.label}
                    </p>
                    {c.icon}
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(c.receita)}
                  </p>
                  <div className="flex justify-between text-xs text-tire-400 mt-2">
                    <span>{formatNumber(Math.round(c.qtd))} itens</span>
                    <span
                      className={
                        c.lucro >= 0 ? "text-neon-green" : "text-red-400"
                      }
                    >
                      Lucro {formatCurrency(c.lucro)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Série diária */}
            <Card className={cardBase}>
              <CardHeader>
                <CardTitle className="text-white text-base">
                  Receita e Lucro por Dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="displayDate" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: 8,
                        color: "#fff",
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="receita"
                      name="Receita"
                      stroke={COLORS.blue}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      name="Lucro"
                      stroke={COLORS.green}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Participação da receita por tipo */}
            <Card className={cardBase}>
              <CardHeader>
                <CardTitle className="text-white text-base">
                  Participação da Receita por Tipo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={(e: any) => e.name}
                    >
                      {pieData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.name === "Final"
                              ? COLORS.final
                              : entry.name === "Revenda"
                                ? COLORS.revenda
                                : COLORS.materia_prima
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: 8,
                        color: "#fff",
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {m.vendasSemCusto > 0 && (
            <p className="text-xs text-tire-500">
              * {m.vendasSemCusto} venda(s) sem custo resolvido não entram nos
              totais de custo/lucro.
            </p>
          )}
        </TabsContent>

        {/* ======================= PRODUÇÃO ======================= */}
        <TabsContent value="production" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="Produzido"
              value={formatNumber(prodResumo.totQtd)}
              sub="unidades"
              icon={<Factory className="h-5 w-5 text-blue-400" />}
            />
            <KpiCard
              title="Perdas"
              value={formatNumber(prodResumo.totPerda)}
              sub="unidades"
              icon={<Package className="h-5 w-5 text-red-400" />}
              color="text-red-400"
            />
            <KpiCard
              title="Garantias"
              value={formatNumber(prodResumo.totGarantia)}
              sub="unidades"
              icon={<Package className="h-5 w-5 text-orange-400" />}
            />
            <KpiCard
              title="Custo de Material"
              value={formatCurrency(prodResumo.totCusto)}
              sub="produzido no período"
              icon={<DollarSign className="h-5 w-5 text-blue-400" />}
            />
          </div>

          <Card className={cardBase}>
            <CardHeader>
              <CardTitle className="text-white text-base">
                Produção Detalhada ({prodRows.length} registros)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[480px] overflow-auto rounded-md border border-tire-700/30">
                <Table>
                  <TableHeader className="sticky top-0 bg-factory-800 z-10">
                    <TableRow className="border-tire-700/40">
                      <TableHead className="text-tire-300">Data</TableHead>
                      <TableHead className="text-tire-300">Produto</TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Qtd Produzida
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Perda
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Garantia
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Materiais
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Custo Material
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prodRows.map((r, i) => (
                      <TableRow key={i} className="border-tire-700/20">
                        <TableCell className="text-tire-200">
                          {formatDate(r.data)}
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          {r.produto}
                        </TableCell>
                        <TableCell className="text-right text-neon-green">
                          {formatNumber(r.qtd)}
                        </TableCell>
                        <TableCell className="text-right text-red-400">
                          {r.perda ? formatNumber(r.perda) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-tire-300">
                          {r.garantia ? formatNumber(r.garantia) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-tire-300">
                          {r.materiais}
                        </TableCell>
                        <TableCell className="text-right text-tire-200">
                          {formatCurrency(r.custoMaterial)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {prodRows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-tire-400 py-6"
                        >
                          Nenhuma produção no período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  {prodRows.length > 0 && (
                    <TableFooter className="bg-factory-800/80">
                      <TableRow className="border-tire-700/40">
                        <TableCell
                          colSpan={2}
                          className="text-white font-semibold"
                        >
                          Total
                        </TableCell>
                        <TableCell className="text-right text-neon-green font-semibold">
                          {formatNumber(prodResumo.totQtd)}
                        </TableCell>
                        <TableCell className="text-right text-red-400 font-semibold">
                          {formatNumber(prodResumo.totPerda)}
                        </TableCell>
                        <TableCell className="text-right text-tire-300 font-semibold">
                          {formatNumber(prodResumo.totGarantia)}
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right text-tire-100 font-semibold">
                          {formatCurrency(prodResumo.totCusto)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================= VENDAS ======================= */}
        <TabsContent value="sales" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={cardBase}>
              <CardHeader>
                <CardTitle className="text-white text-base">
                  Receita por Tipo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={receitaPorTipo}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="nome" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: 8,
                        color: "#fff",
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Legend />
                    <Bar dataKey="receita" name="Receita" fill={COLORS.blue} />
                    <Bar dataKey="lucro" name="Lucro" fill={COLORS.green} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={cardBase}>
              <CardHeader>
                <CardTitle className="text-white text-base">
                  Vendas por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[260px] overflow-auto rounded-md border border-tire-700/30">
                  <Table>
                    <TableHeader className="sticky top-0 bg-factory-800 z-10">
                      <TableRow className="border-tire-700/40">
                        <TableHead className="text-tire-300">
                          Vendedor
                        </TableHead>
                        <TableHead className="text-tire-300 text-right">
                          Qtd
                        </TableHead>
                        <TableHead className="text-tire-300 text-right">
                          Receita
                        </TableHead>
                        <TableHead className="text-tire-300 text-right">
                          Lucro
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byVendedor.map((v, i) => (
                        <TableRow key={i} className="border-tire-700/20">
                          <TableCell className="text-white">
                            {v.vendedor}
                          </TableCell>
                          <TableCell className="text-right text-tire-200">
                            {formatNumber(Math.round(v.qtd))}
                          </TableCell>
                          <TableCell className="text-right text-green-400">
                            {formatCurrency(v.receita)}
                          </TableCell>
                          <TableCell className="text-right text-neon-green">
                            {formatCurrency(v.lucro)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {byVendedor.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-tire-400 py-6"
                          >
                            Sem vendas no período.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vendas detalhadas */}
          <Card className={cardBase}>
            <CardHeader>
              <CardTitle className="text-white text-base">
                Vendas Detalhadas ({saleRows.length} registros)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[520px] overflow-auto rounded-md border border-tire-700/30">
                <Table>
                  <TableHeader className="sticky top-0 bg-factory-800 z-10">
                    <TableRow className="border-tire-700/40">
                      <TableHead className="text-tire-300">Data</TableHead>
                      <TableHead className="text-tire-300">Tipo</TableHead>
                      <TableHead className="text-tire-300">Vendedor</TableHead>
                      <TableHead className="text-tire-300">Produto</TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Qtd
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Receita
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Custo
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Lucro
                      </TableHead>
                      <TableHead className="text-tire-300">Método</TableHead>
                      <TableHead className="text-tire-300">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleRows.map((r, i) => (
                      <TableRow key={i} className="border-tire-700/20">
                        <TableCell className="text-tire-200 whitespace-nowrap">
                          {formatDate(r.data)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-tire-600/40 text-tire-200"
                            style={{
                              color:
                                COLORS[r.tipo as keyof typeof COLORS] ||
                                "#e5e7eb",
                            }}
                          >
                            {tipoLabel[r.tipo] || r.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-tire-200">
                          {r.vendedor}
                        </TableCell>
                        <TableCell className="text-white">{r.produto}</TableCell>
                        <TableCell className="text-right text-tire-200">
                          {formatNumber(Math.round(r.qtd))}
                        </TableCell>
                        <TableCell className="text-right text-green-400">
                          {formatCurrency(r.receita)}
                        </TableCell>
                        <TableCell className="text-right text-tire-300">
                          {formatCurrency(r.custo)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${r.lucro >= 0 ? "text-neon-green" : "text-red-400"}`}
                        >
                          {formatCurrency(r.lucro)}
                        </TableCell>
                        <TableCell className="text-tire-300">
                          {r.metodo}
                        </TableCell>
                        <TableCell>
                          {r.pago ? (
                            <span className="text-neon-green text-xs">Pago</span>
                          ) : (
                            <span className="text-orange-400 text-xs">
                              Pendente
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {saleRows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="text-center text-tire-400 py-6"
                        >
                          Nenhuma venda no período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-tire-500 mt-2">
                Totais recebidos no período: Receita{" "}
                {formatCurrency(m.receitaVendas)} · Custo {formatCurrency(m.cogs)}{" "}
                · Lucro {formatCurrency(m.lucroBruto)} (pendentes não somam até o
                recebimento).
              </p>
            </CardContent>
          </Card>

          {/* Por produto */}
          <Card className={cardBase}>
            <CardHeader>
              <CardTitle className="text-white text-base">
                Vendas por Produto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto rounded-md border border-tire-700/30">
                <Table>
                  <TableHeader className="sticky top-0 bg-factory-800 z-10">
                    <TableRow className="border-tire-700/40">
                      <TableHead className="text-tire-300">Produto</TableHead>
                      <TableHead className="text-tire-300">Tipo</TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Qtd
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Receita
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Lucro
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Margem
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byProduto.map((p, i) => (
                      <TableRow key={i} className="border-tire-700/20">
                        <TableCell className="text-white">{p.produto}</TableCell>
                        <TableCell className="text-tire-300 text-xs">
                          {tipoLabel[p.tipo] || p.tipo}
                        </TableCell>
                        <TableCell className="text-right text-tire-200">
                          {formatNumber(Math.round(p.qtd))}
                        </TableCell>
                        <TableCell className="text-right text-green-400">
                          {formatCurrency(p.receita)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${p.lucro >= 0 ? "text-neon-green" : "text-red-400"}`}
                        >
                          {formatCurrency(p.lucro)}
                        </TableCell>
                        <TableCell className="text-right text-tire-300">
                          {p.receita > 0
                            ? formatPercentage((p.lucro / p.receita) * 100)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {byProduto.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-tire-400 py-6"
                        >
                          Sem vendas no período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================= MATÉRIA-PRIMA ======================= */}
        <TabsContent value="materials" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="Vendas de MP"
              value={formatCurrency(m.receitaMateriaPrima)}
              sub={`${formatNumber(Math.round(m.qtdMateriaPrimaVendida))} un · lucro ${formatCurrency(m.lucroMateriaPrima)}`}
              icon={<Factory className="h-5 w-5 text-emerald-400" />}
              color="text-green-400"
            />
            <KpiCard
              title="Compras (Fornecedores)"
              value={formatCurrency(m.comprasFornecedores)}
              sub="no período"
              icon={<DollarSign className="h-5 w-5 text-red-400" />}
              color="text-red-400"
            />
            <KpiCard
              title="Estoque Atual"
              value={formatCurrency(m.saldoMateriaPrima)}
              sub="posição atual"
              icon={<Boxes className="h-5 w-5 text-blue-400" />}
            />
            <KpiCard
              title="Perdas de Material"
              value={formatCurrency(m.valorPerdas)}
              sub="acumulado (todo período)"
              icon={<Package className="h-5 w-5 text-orange-400" />}
              color="text-orange-400"
            />
          </div>

          {/* Vendas de MP detalhadas */}
          <Card className={cardBase}>
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Factory className="h-4 w-4 text-emerald-400" /> Vendas de
                Matéria-Prima no Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[360px] overflow-auto rounded-md border border-tire-700/30">
                <Table>
                  <TableHeader className="sticky top-0 bg-factory-800 z-10">
                    <TableRow className="border-tire-700/40">
                      <TableHead className="text-tire-300">Data</TableHead>
                      <TableHead className="text-tire-300">Material</TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Qtd
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Receita
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Custo
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Lucro
                      </TableHead>
                      <TableHead className="text-tire-300">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleRows
                      .filter((r) => r.tipo === "materia_prima")
                      .map((r, i) => (
                        <TableRow key={i} className="border-tire-700/20">
                          <TableCell className="text-tire-200 whitespace-nowrap">
                            {formatDate(r.data)}
                          </TableCell>
                          <TableCell className="text-white">
                            {r.produto}
                          </TableCell>
                          <TableCell className="text-right text-tire-200">
                            {formatNumber(Math.round(r.qtd))}
                          </TableCell>
                          <TableCell className="text-right text-green-400">
                            {formatCurrency(r.receita)}
                          </TableCell>
                          <TableCell className="text-right text-tire-300">
                            {formatCurrency(r.custo)}
                          </TableCell>
                          <TableCell
                            className={`text-right ${r.lucro >= 0 ? "text-neon-green" : "text-red-400"}`}
                          >
                            {formatCurrency(r.lucro)}
                          </TableCell>
                          <TableCell>
                            {r.pago ? (
                              <span className="text-neon-green text-xs">
                                Pago
                              </span>
                            ) : (
                              <span className="text-orange-400 text-xs">
                                Pendente
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    {saleRows.filter((r) => r.tipo === "materia_prima")
                      .length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-tire-400 py-6"
                        >
                          Nenhuma venda de matéria-prima no período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Consumo na produção */}
            <Card className={cardBase}>
              <CardHeader>
                <CardTitle className="text-white text-base">
                  Consumo na Produção (período)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[360px] overflow-auto rounded-md border border-tire-700/30">
                  <Table>
                    <TableHeader className="sticky top-0 bg-factory-800 z-10">
                      <TableRow className="border-tire-700/40">
                        <TableHead className="text-tire-300">Material</TableHead>
                        <TableHead className="text-tire-300 text-right">
                          Qtd Consumida
                        </TableHead>
                        <TableHead className="text-tire-300">Unidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consumoRows.map((c, i) => (
                        <TableRow key={i} className="border-tire-700/20">
                          <TableCell className="text-white">{c.nome}</TableCell>
                          <TableCell className="text-right text-tire-200">
                            {formatNumber(Math.round(c.qtd * 100) / 100)}
                          </TableCell>
                          <TableCell className="text-tire-300">
                            {c.unidade}
                          </TableCell>
                        </TableRow>
                      ))}
                      {consumoRows.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center text-tire-400 py-6"
                          >
                            Sem consumo no período.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Compras */}
            <Card className={cardBase}>
              <CardHeader>
                <CardTitle className="text-white text-base">
                  Compras de Fornecedores (período)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[360px] overflow-auto rounded-md border border-tire-700/30">
                  <Table>
                    <TableHeader className="sticky top-0 bg-factory-800 z-10">
                      <TableRow className="border-tire-700/40">
                        <TableHead className="text-tire-300">Data</TableHead>
                        <TableHead className="text-tire-300">
                          Descrição
                        </TableHead>
                        <TableHead className="text-tire-300 text-right">
                          Valor
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {compraRows.map((c, i) => (
                        <TableRow key={i} className="border-tire-700/20">
                          <TableCell className="text-tire-200 whitespace-nowrap">
                            {formatDate(c.data)}
                          </TableCell>
                          <TableCell className="text-white">
                            {c.descricao}
                          </TableCell>
                          <TableCell className="text-right text-red-400">
                            {formatCurrency(c.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {compraRows.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center text-tire-400 py-6"
                          >
                            Sem compras no período.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estoque atual */}
          <Card className={cardBase}>
            <CardHeader>
              <CardTitle className="text-white text-base">
                Estoque Atual de Matéria-Prima (posição atual)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] overflow-auto rounded-md border border-tire-700/30">
                <Table>
                  <TableHeader className="sticky top-0 bg-factory-800 z-10">
                    <TableRow className="border-tire-700/40">
                      <TableHead className="text-tire-300">Material</TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Qtd
                      </TableHead>
                      <TableHead className="text-tire-300">Unidade</TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Custo Unit
                      </TableHead>
                      <TableHead className="text-tire-300 text-right">
                        Valor Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialStock.map((s, i) => (
                      <TableRow key={i} className="border-tire-700/20">
                        <TableCell className="text-white">{s.nome}</TableCell>
                        <TableCell className="text-right text-tire-200">
                          {formatNumber(Math.round(s.qtd * 100) / 100)}
                        </TableCell>
                        <TableCell className="text-tire-300">
                          {s.unidade}
                        </TableCell>
                        <TableCell className="text-right text-tire-300">
                          {formatCurrency(s.custoUnit)}
                        </TableCell>
                        <TableCell className="text-right text-tire-100">
                          {formatCurrency(s.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="bg-factory-800/80">
                    <TableRow className="border-tire-700/40">
                      <TableCell
                        colSpan={4}
                        className="text-white font-semibold"
                      >
                        Total em estoque
                      </TableCell>
                      <TableCell className="text-right text-neon-green font-semibold">
                        {formatCurrency(m.saldoMateriaPrima)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RelatorioGeral;
