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
  custoMedioPorPneu: number;
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
  qtdPneusVendidos: number;
  // auditoria
  vendasSemCusto: number;
}

const num = (v: any): number => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return isFinite(n) ? n : 0;
};

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
  },
  options: ComputeOptions = {}
): FinancialMetrics {
  const stockItems = input.stockItems || [];
  const cashFlow = input.cashFlowEntries || [];
  const resaleIds = new Set((input.resaleProducts || []).map((p) => p.id));
  const debts = input.debts || [];

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

  const valorEmpresarial =
    saldoCaixa +
    saldoMateriaPrima +
    saldoProdutosFinais +
    saldoProdutosRevenda -
    totalDividas;

  // --- DRE (realizado, com filtro de período opcional) ---
  const stockById = new Map(stockItems.map((s) => [s.id, s]));
  const productByItemId = new Map<string, StockItemLike>();
  for (const s of stockItems) {
    if (s.item_type === "product") productByItemId.set(s.item_id, s);
  }

  const inPeriod = (e: CashFlowEntryLike): boolean => {
    if (!options.from && !options.to) return true;
    const d = (e.transaction_date || "").slice(0, 10);
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
  const despesasPorCategoria: Record<string, number> = {};
  let comprasFornecedores = 0;

  for (const e of cashFlow) {
    if (!inPeriod(e)) continue;
    const amt = num(e.amount);
    if (e.type === "income" && e.category === "venda") {
      receitaVendas += amt;
      const desc = e.description || "";
      const { cost, ok } = cogsOf(desc);
      if (ok) {
        cogs += cost;
        if (/TIPO_PRODUTO:\s*final/.test(desc)) {
          qtdPneusVendidos += num((desc.match(/Qtd:\s*([0-9.]+)/) || [])[1]);
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
  const lucroBruto = receitaVendas - cogs;
  const lucroLiquido = lucroBruto - despesasOperacionais;
  const margemBruta = receitaVendas > 0 ? (lucroBruto / receitaVendas) * 100 : 0;
  const margemLiquida = receitaVendas > 0 ? (lucroLiquido / receitaVendas) * 100 : 0;
  const lucroMedioPorPneu =
    qtdPneusVendidos > 0 ? lucroBruto / qtdPneusVendidos : 0;

  return {
    saldoCaixa,
    saldoMateriaPrima,
    saldoProdutosFinais,
    saldoProdutosRevenda,
    totalDividas,
    valorEmpresarial,
    qtdProdutosFinais,
    custoMedioPorPneu,
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
