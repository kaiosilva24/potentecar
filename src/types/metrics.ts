export interface DashboardMetrics {
  saldoCaixa: number
  totalEstoque: number
  vendasDia: number
  vendasMes: number
  contasReceber: number
  contasPagar: number
  produtosBaixoEstoque: number
  clientesAtivos: number
  ticketMedio: number
  margemLucro: number
  lucroResaleProducts: number
  valorTotalProdutosRevenda: number
}

export interface MetricCard {
  id: string
  title: string
  value: number
  previousValue?: number
  format: 'currency' | 'number' | 'percentage'
  trend?: 'up' | 'down' | 'stable'
  icon: string
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo'
}

export interface ChartData {
  name: string
  value: number
  date?: string
}

export interface MetricHistory {
  date: string
  value: number
  metric_type: string
}
