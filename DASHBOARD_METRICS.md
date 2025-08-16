# Dashboard de Métricas em Tempo Real

## 📊 Visão Geral

Este dashboard foi criado para fornecer métricas em tempo real do seu sistema, incluindo:

- **Saldo em Caixa** - Valor atual disponível
- **Total em Estoque** - Valor total dos produtos em estoque
- **Vendas do Dia/Mês** - Receita de vendas
- **Contas a Receber/Pagar** - Fluxo financeiro
- **Produtos em Baixo Estoque** - Alertas de reposição
- **Clientes Ativos** - Base de clientes
- **Ticket Médio** - Valor médio por venda
- **Margem de Lucro** - Percentual de lucro

## 🚀 Tecnologias Utilizadas

### Frontend
- **React Query (@tanstack/react-query)** - Gerenciamento de estado e cache
- **Recharts** - Visualizações e gráficos
- **Lucide React** - Ícones
- **Tailwind CSS** - Estilização

### Backend
- **Supabase** - Banco de dados e tempo real
- **PostgreSQL** - Database functions para cálculos
- **WebSockets** - Updates em tempo real

## 📁 Estrutura de Arquivos

```
src/
├── components/
│   └── dashboard/
│       ├── Dashboard.tsx          # Página principal
│       ├── MetricCard.tsx         # Card individual de métrica
│       ├── MetricsGrid.tsx        # Grid de cards
│       └── MetricsChart.tsx       # Componente de gráficos
├── hooks/
│   └── useMetrics.ts              # Hooks para dados em tempo real
├── services/
│   └── metricsService.ts          # Serviços de API
├── types/
│   └── metrics.ts                 # Tipos TypeScript
├── utils/
│   └── formatters.ts              # Utilitários de formatação
├── providers/
│   └── QueryProvider.tsx         # Provider do React Query
└── lib/
    └── react-query.ts             # Configuração do React Query
```

## 🔧 Como Usar

### 1. Acesso ao Dashboard
Navegue para `/metrics` após fazer login no sistema.

### 2. Personalização de Métricas
Para adicionar novas métricas, edite:

1. **Tipos** em `src/types/metrics.ts`
2. **Hooks** em `src/hooks/useMetrics.ts`
3. **Serviços** em `src/services/metricsService.ts`
4. **Grid** em `src/components/dashboard/MetricsGrid.tsx`

### 3. Configuração de Tempo Real

As métricas são atualizadas automaticamente através de:
- **WebSockets** do Supabase (tempo real)
- **Polling** a cada 30 segundos (fallback)
- **Invalidação de cache** em mudanças

## 🔄 Implementação com Dados Reais

### Passo 1: Configurar Database Functions
```sql
-- Exemplo: Função para calcular saldo em caixa
CREATE OR REPLACE FUNCTION get_saldo_caixa()
RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(valor), 0)
    FROM movimentos_caixa
    WHERE tipo = 'entrada'
  ) - (
    SELECT COALESCE(SUM(valor), 0)
    FROM movimentos_caixa
    WHERE tipo = 'saida'
  );
END;
$$ LANGUAGE plpgsql;
```

### Passo 2: Atualizar Hooks
```typescript
// Em useMetrics.ts
const { data } = await supabase.rpc('get_saldo_caixa')
```

### Passo 3: Configurar Realtime
```typescript
// Configurar subscriptions para suas tabelas
.on('postgres_changes', { 
  event: '*', 
  schema: 'public',
  table: 'suas_tabelas' 
}, callback)
```

## 📈 Funcionalidades

### ✅ Implementado
- [x] Cards de métricas responsivos
- [x] Gráficos interativos (linha, barra, pizza)
- [x] Sistema de cache inteligente
- [x] Formatação automática (moeda, número, percentual)
- [x] Indicadores de tendência
- [x] Loading states
- [x] Error handling
- [x] Estrutura para tempo real

### 🔄 Para Implementar
- [ ] Conexão com dados reais do banco
- [ ] Database functions específicas
- [ ] Configuração de subscriptions
- [ ] Filtros por período
- [ ] Exportação de relatórios
- [ ] Alertas personalizados

## 🎨 Customização

### Cores dos Cards
```typescript
// Em MetricsGrid.tsx
color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo'
```

### Ícones Disponíveis
```typescript
// Em MetricCard.tsx
icon: 'dollar-sign' | 'package' | 'shopping-cart' | 'users' | 'alert-triangle' | 'credit-card' | 'percent'
```

### Tipos de Gráfico
```typescript
// Em MetricsChart.tsx
chartType: 'line' | 'bar' | 'pie'
```

## 🔧 Configuração de Produção

1. **Variáveis de Ambiente**
   ```env
   VITE_SUPABASE_URL=sua_url
   VITE_SUPABASE_ANON_KEY=sua_chave
   ```

2. **Otimizações**
   - Cache configurado para 5 minutos
   - Retry automático em falhas
   - Debounce em updates
   - Lazy loading de componentes

3. **Monitoramento**
   - React Query Devtools (desenvolvimento)
   - Error boundaries
   - Performance tracking

## 📞 Próximos Passos

1. **Conectar com seus dados reais**
2. **Configurar database functions**
3. **Testar subscriptions em tempo real**
4. **Personalizar métricas conforme necessário**
5. **Implementar filtros e relatórios**

---

**Nota**: Este dashboard está pronto para receber suas implementações específicas. Todos os arquivos base foram criados e a estrutura está preparada para funcionar em produção.
