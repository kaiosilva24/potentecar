/**
 * Fonte única de verdade das métricas financeiras (custo e lucro da empresa).
 *
 * Modelo (definido com o dono):
 * - Estoque/COGS valorizados a CUSTO DE MATÉRIA-PRIMA (o pneu carrega o custo real
 *   gravado em stock_items.unit_cost — conserva o valor do estoque).
 * - Lucro Empresarial = REALIZADO (regime de competência):
 *     Receita de Vendas − COGS = Lucro Bruto
 *     Lucro Bruto − Despesas Operacionais = Lucro Líquido
 * - Compras de fornecedor (matéria-prima) NÃO são despesa: viram estoque e só
 *   entram no resultado como COGS quando o produto é vendido.
 * - Valor Empresarial = patrimônio (Caixa + Estoques + a Receber − Dívidas), separado do lucro.
 *
 * Tudo derivado do banco (stock_items, cash_flow_entries, resale_products, debts).
 * Nenhum valor vem de localStorage.
 */

export interface StockItemLike {
  id: string;
  item_id: string;
  item_name?: string;
  item_type: string; // "material" | "product"
  quantity: number;
  unit_cost: number;
  total_value: number;
}

export interface CashFlowEntryLike {
  type: string; // "income" | "expense"
  category?: string;
  amount: number;
  description?: string;
  transaction_date?: string;
}

export interface ResaleProductLike {
  id: string;
}

export interface DebtLike {
  amount?: number;
  paid?: boolean;
  is_paid?: boolean;
  status?: string;
}

export interface FinancialMetrics {
  // Balanço
  saldoCaixa: number;
  saldoMateriaPrima: number;
  saldoProdutosFinais: number;
  saldoProdutosRevenda: number;
  totalDividas: number;
  valorEmpresarial: number;
  // Quantidades / unitários
  qtdProdutosFinais: number;
  custoMedioPorPneu: number; // custo de MATERIAL médio no estoque
  // Custo CHEIO (absorção): material + rateio de despesas + perdas
  custoAbsorcaoPorPneu: number;
  overheadPorPneu: number; // (despesas + perdas) ÷ produção
  totalProduzido: number;
  valorPerdas: number;
  // Estoque de produtos finais avaliado a custo CHEIO (absorção)
  saldoProdutosFinaisAbsorcao: number;
  // DRE (resultado realizado)
  receitaVendas: number;
  cogs: number;
  lucroBruto: number;
  margemBruta: number;
  despesasOperacionais: number;
  despesasPorCategoria: Record<string, number>;
  comprasFornecedores: number;
  lucroLiquido: number;
  margemLiquida: number;
  lucroMedioPorPneu: number;
  lucroMedioRevenda: number;
  qtdPneusVendidos: number;
  // auditoria
  vendasSemCusto: number;
}

const num = (v: any): number => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return isFinite(n) ? n : 0;
};

// Dia local de uma transação, usando a MESMA convenção das telas (new Date(...)),
// para o gráfico/DRE baterem com o que o histórico de vendas mostra.
const localDayKey = (dateStr?: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export interface ProfitPoint {
  date: string; // YYYY-MM-DD
  displayDate: string; // dd/mm
  profit: number; // lucro realizado no dia (Receita − COGS − Despesas oper.)
  receita: number;
  accumulatedProfit: number; // acumulado no período
}

/**
 * Série diária de LUCRO REALIZADO.
 * profit_dia = Σ(receita venda) − Σ(COGS) − Σ(despesas operacionais), tudo do banco.
 * `opts` pode ser um número (últimos N dias) ou um intervalo { from, to } (YYYY-MM-DD).
 */
export function computeProfitSeries(
  input: {
    stockItems: StockItemLike[];
    cashFlowEntries: CashFlowEntryLike[];
    resaleProducts?: ResaleProductLike[];
  },
  opts: number | { days?: number; from?: string; to?: string }
): ProfitPoint[] {
  const stockItems = input.stockItems || [];
  const cashFlow = input.cashFlowEntries || [];
  const stockById = new Map(stockItems.map((s) => [s.id, s]));
  const productByItemId = new Map<string, StockItemLike>();
  for (const s of stockItems) {
    if (s.item_type === "product") productByItemId.set(s.item_id, s);
  }

  const cogsOf = (desc: string): number => {
    const tipo = (desc.match(/TIPO_PRODUTO:\s*(\w+)/) || [])[1];
    const qty = num((desc.match(/Qtd:\s*([0-9.]+)/) || [])[1]);
    const id = (desc.match(/ID_Produto:\s*([^|\s]+)/) || [])[1];
    if (!id || !qty) return 0;
    const row = tipo === "revenda" ? productByItemId.get(id) : stockById.get(id);
    return row ? num(row.unit_cost) * qty : 0;
  };

  const byDay: Record<
    string,
    { receita: number; cogs: number; opex: number }
  > = {};
  for (const e of cashFlow) {
    const d = localDayKey(e.transaction_date);
    if (!d) continue;
    if (!byDay[d]) byDay[d] = { receita: 0, cogs: 0, opex: 0 };
    const amt = num(e.amount);
    if (e.type === "income" && e.category === "venda") {
      byDay[d].receita += amt;
      byDay[d].cogs += cogsOf(e.description || "");
    } else if (
      e.type === "expense" &&
      !SUPPLIER_CATEGORIES.includes(e.category || "")
    ) {
      byDay[d].opex += amt;
    }
  }

  const points: ProfitPoint[] = [];
  let acc = 0;
  const pushDay = (dt: Date) => {
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const dd = byDay[iso] || { receita: 0, cogs: 0, opex: 0 };
    const profit = dd.receita - dd.cogs - dd.opex;
    acc += profit;
    points.push({
      date: iso,
      displayDate: `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`,
      profit,
      receita: dd.receita,
      accumulatedProfit: acc,
    });
  };

  const opt = typeof opts === "number" ? { days: opts } : opts;

  if (opt.from && opt.to) {
    // Intervalo customizado [from, to] inclusive
    let a = new Date(opt.from + "T00:00:00");
    let b = new Date(opt.to + "T00:00:00");
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return points;
    if (a > b) {
      const t = a;
      a = b;
      b = t;
    }
    let guard = 0;
    for (
      const dt = new Date(a);
      dt <= b && guard < 3660;
      dt.setDate(dt.getDate() + 1), guard++
    ) {
      pushDay(new Date(dt));
    }
  } else {
    const days = opt.days && opt.days > 0 ? opt.days : 30;
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - i);
      pushDay(dt);
    }
  }
  return points;
}

// Categorias de DESPESA que compõem o resultado operacional (fornecedor = compra
// de matéria-prima e NÃO entra aqui — vira estoque/COGS).
const OPERATING_EXPENSE_CATEGORIES = [
  "Funcionários",
  "Custos Fixos",
  "Custos Variáveis",
  "Vendedores",
];
const SUPPLIER_CATEGORIES = ["Fornecedores"];

export interface ComputeOptions {
  /** Filtra o DRE por período (inclusive). Balanço/estoque é sempre o atual. */
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export function computeFinancialMetrics(
  input: {
    stockItems: StockItemLike[];
    cashFlowEntries: CashFlowEntryLike[];
    resaleProducts?: ResaleProductLike[];
    debts?: DebtLike[];
    productionEntries?: any[];
  },
  options: ComputeOptions = {}
): FinancialMetrics {
  const stockItems = input.stockItems || [];
  const cashFlow = input.cashFlowEntries || [];
  const resaleIds = new Set((input.resaleProducts || []).map((p) => p.id));
  const debts = input.debts || [];
  const productionEntries = input.productionEntries || [];

  // --- Balanço (sempre estado atual) ---
  const materials = stockItems.filter((s) => s.item_type === "material");
  const productsAll = stockItems.filter((s) => s.item_type === "product");
  // "Produtos finais" = produtos que NÃO são de revenda
  const finais = productsAll.filter((s) => !resaleIds.has(s.item_id));
  const revenda = productsAll.filter((s) => resaleIds.has(s.item_id));

  const saldoMateriaPrima = materials.reduce((a, s) => a + num(s.total_value), 0);
  const saldoProdutosFinais = finais.reduce((a, s) => a + num(s.total_value), 0);
  const saldoProdutosRevenda = revenda.reduce((a, s) => a + num(s.total_value), 0);
  const qtdProdutosFinais = finais.reduce((a, s) => a + num(s.quantity), 0);
  const custoMedioPorPneu =
    qtdProdutosFinais > 0 ? saldoProdutosFinais / qtdProdutosFinais : 0;

  // Saldo de caixa = todo dinheiro que entrou − saiu (pendentes têm amount 0)
  const saldoCaixa = cashFlow.reduce((a, e) => {
    const amt = num(e.amount);
    return e.type === "income" ? a + amt : e.type === "expense" ? a - amt : a;
  }, 0);

  const totalDividas = debts.reduce((a, d) => {
    const paid =
      d.paid === true || d.is_paid === true || d.status === "pago" || d.status === "paid";
    return paid ? a : a + num(d.amount);
  }, 0);

  // Total produzido (base do rateio de absorção)
  const totalProduzido = productionEntries.reduce(
    (a, e) => a + num(e.quantity_produced),
    0
  );

  // --- DRE (realizado, com filtro de período opcional) ---
  const stockById = new Map(stockItems.map((s) => [s.id, s]));
  const productByItemId = new Map<string, StockItemLike>();
  const productByName = new Map<string, StockItemLike>();
  const materialByItemId = new Map<string, StockItemLike>();
  for (const s of stockItems) {
    if (s.item_type === "product") {
      productByItemId.set(s.item_id, s);
      productByName.set((s.item_name || "").trim().toLowerCase(), s);
    }
    if (s.item_type === "material") materialByItemId.set(s.item_id, s);
  }

  // Valor das PERDAS (pneus perdidos × custo material do produto + perdas de material)
  const valorPerdas = productionEntries.reduce((a, e) => {
    let v = 0;
    const prod = productByName.get((e.product_name || "").trim().toLowerCase());
    const prodCost = prod ? num(prod.unit_cost) : 0;
    v += num(e.production_loss) * prodCost;
    if (Array.isArray(e.material_loss)) {
      for (const ml of e.material_loss) {
        const mat = materialByItemId.get(ml.material_id);
        v += num(ml.quantity_lost) * (mat ? num(mat.unit_cost) : 0);
      }
    }
    return a + v;
  }, 0);

  const inPeriod = (e: CashFlowEntryLike): boolean => {
    if (!options.from && !options.to) return true;
    const d = localDayKey(e.transaction_date);
    if (!d) return true;
    if (options.from && d < options.from) return false;
    if (options.to && d > options.to) return false;
    return true;
  };

  const cogsOf = (desc: string): { cost: number; ok: boolean } => {
    const tipo = (desc.match(/TIPO_PRODUTO:\s*(\w+)/) || [])[1];
    const qty = num((desc.match(/Qtd:\s*([0-9.]+)/) || [])[1]);
    const id = (desc.match(/ID_Produto:\s*([^|\s]+)/) || [])[1];
    if (!id || !qty) return { cost: 0, ok: false };
    let row: StockItemLike | undefined;
    if (tipo === "revenda") row = productByItemId.get(id);
    else row = stockById.get(id); // final e materia_prima gravam o id da linha de estoque
    if (!row) return { cost: 0, ok: false };
    return { cost: num(row.unit_cost) * qty, ok: true };
  };

  let receitaVendas = 0;
  let cogs = 0;
  let qtdPneusVendidos = 0;
  let vendasSemCusto = 0;
  let receitaRevenda = 0;
  let cogsRevenda = 0;
  let qtdRevendaVendida = 0;
  const despesasPorCategoria: Record<string, number> = {};
  let comprasFornecedores = 0;

  for (const e of cashFlow) {
    if (!inPeriod(e)) continue;
    const amt = num(e.amount);
    if (e.type === "income" && e.category === "venda") {
      receitaVendas += amt;
      const desc = e.description || "";
      const tipo = (desc.match(/TIPO_PRODUTO:\s*(\w+)/) || [])[1];
      const qtdItem = num((desc.match(/Qtd:\s*([0-9.]+)/) || [])[1]);
      const { cost, ok } = cogsOf(desc);
      if (ok) {
        cogs += cost;
        if (tipo === "final") qtdPneusVendidos += qtdItem;
        if (tipo === "revenda") {
          receitaRevenda += amt;
          cogsRevenda += cost;
          qtdRevendaVendida += qtdItem;
        }
      } else {
        vendasSemCusto += 1;
      }
    } else if (e.type === "expense") {
      const cat = e.category || "(sem categoria)";
      if (SUPPLIER_CATEGORIES.includes(cat)) {
        comprasFornecedores += amt;
      } else {
        despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + amt;
      }
    }
  }

  const despesasOperacionais = Object.entries(despesasPorCategoria).reduce(
    (a, [, v]) => a + v,
    0
  );

  // --- CUSTO POR ABSORÇÃO (custo CHEIO por pneu) ---
  // custo cheio = material médio + (despesas operacionais + perdas) ÷ produção.
  // Válido quando calculado sobre TODO o histórico (sem filtro de período).
  const overheadPorPneu =
    totalProduzido > 0
      ? (despesasOperacionais + valorPerdas) / totalProduzido
      : 0;
  const custoAbsorcaoPorPneu = custoMedioPorPneu + overheadPorPneu;
  const saldoProdutosFinaisAbsorcao = qtdProdutosFinais * custoAbsorcaoPorPneu;
  // Valor Empresarial avalia os produtos finais a custo CHEIO (absorção)
  const valorEmpresarial =
    saldoCaixa +
    saldoMateriaPrima +
    saldoProdutosFinaisAbsorcao +
    saldoProdutosRevenda -
    totalDividas;

  const lucroBruto = receitaVendas - cogs;
  const lucroLiquido = lucroBruto - despesasOperacionais;
  const margemBruta = receitaVendas > 0 ? (lucroBruto / receitaVendas) * 100 : 0;
  const margemLiquida = receitaVendas > 0 ? (lucroLiquido / receitaVendas) * 100 : 0;
  const lucroMedioPorPneu =
    qtdPneusVendidos > 0 ? lucroBruto / qtdPneusVendidos : 0;
  const lucroMedioRevenda =
    qtdRevendaVendida > 0
      ? (receitaRevenda - cogsRevenda) / qtdRevendaVendida
      : 0;

  return {
    lucroMedioRevenda,
    saldoCaixa,
    saldoMateriaPrima,
    saldoProdutosFinais,
    saldoProdutosRevenda,
    totalDividas,
    valorEmpresarial,
    qtdProdutosFinais,
    custoMedioPorPneu,
    custoAbsorcaoPorPneu,
    overheadPorPneu,
    totalProduzido,
    valorPerdas,
    saldoProdutosFinaisAbsorcao,
    receitaVendas,
    cogs,
    lucroBruto,
    margemBruta,
    despesasOperacionais,
    despesasPorCategoria,
    comprasFornecedores,
    lucroLiquido,
    margemLiquida,
    lucroMedioPorPneu,
    qtdPneusVendidos,
    vendasSemCusto,
  };
}
