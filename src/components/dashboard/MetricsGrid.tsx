import React from 'react'
import { MetricCard } from './MetricCard'
import { useDashboardMetrics } from '../../hooks/useMetrics'
import { MetricCard as MetricCardType } from '../../types/metrics'
import { supabase } from '../../../supabase/supabase'
import { dataManager } from '../../utils/dataManager'

export const MetricsGrid: React.FC = () => {
  const { data: metrics, isLoading, error } = useDashboardMetrics()

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Erro ao carregar métricas: {error.message}</p>
      </div>
    )
  }

  // Configuração dos cards de métricas
  const metricCards: MetricCardType[] = [
    {
      id: 'saldo-caixa',
      title: 'Saldo em Caixa',
      value: metrics?.saldoCaixa || 0,
      format: 'currency',
      icon: 'dollar-sign',
      color: 'green',
      trend: 'up'
    },
    {
      id: 'total-estoque',
      title: 'Total em Estoque',
      value: metrics?.totalEstoque || 0,
      format: 'currency',
      icon: 'package',
      color: 'blue',
      trend: 'stable'
    },
    {
      id: 'vendas-dia',
      title: 'Vendas do Dia',
      value: metrics?.vendasDia || 0,
      format: 'currency',
      icon: 'shopping-cart',
      color: 'green',
      trend: 'up'
    },
    {
      id: 'vendas-mes',
      title: 'Vendas do Mês',
      value: metrics?.vendasMes || 0,
      format: 'currency',
      icon: 'shopping-cart',
      color: 'green',
      trend: 'up'
    },
    {
      id: 'contas-receber',
      title: 'Contas a Receber',
      value: metrics?.contasReceber || 0,
      format: 'currency',
      icon: 'credit-card',
      color: 'yellow',
      trend: 'stable'
    },
    {
      id: 'contas-pagar',
      title: 'Contas a Pagar',
      value: metrics?.contasPagar || 0,
      format: 'currency',
      icon: 'credit-card',
      color: 'red',
      trend: 'down'
    },
    {
      id: 'produtos-baixo-estoque',
      title: 'Produtos em Baixo Estoque',
      value: metrics?.produtosBaixoEstoque || 0,
      format: 'number',
      icon: 'alert-triangle',
      color: 'red',
      trend: 'stable'
    },
    {
      id: 'clientes-ativos',
      title: 'Clientes Ativos',
      value: metrics?.clientesAtivos || 0,
      format: 'number',
      icon: 'users',
      color: 'blue',
      trend: 'up'
    },
    {
      id: 'ticket-medio',
      title: 'Ticket Médio',
      value: metrics?.ticketMedio || 0,
      format: 'currency',
      icon: 'dollar-sign',
      color: 'purple',
      trend: 'up'
    },
    {
      id: 'margem-lucro',
      title: 'Margem de Lucro',
      value: metrics?.margemLucro || 0,
      format: 'percentage',
      icon: 'percent',
      color: 'indigo',
      trend: 'stable'
    },
    {
      id: 'lucro-produtos-revenda',
      title: 'Lucro Produtos Revenda',
      value: metrics?.lucroResaleProducts || 0,
      format: 'currency',
      icon: 'trending-up',
      color: 'green',
      trend: 'up'
    },
    {
      id: 'valor-total-produtos-revenda',
      title: 'Valor Total Produtos Revenda',
      value: metrics?.valorTotalProdutosRevenda || 0,
      format: 'currency',
      icon: 'package',
      color: 'blue',
      trend: 'stable'
    }
  ]

  const handleClearCache = () => {
    console.log(' [DEBUG] Limpando TODOS os caches manualmente...');
    
    // Limpar localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('dashboard') || key.includes('stock') || key.includes('metrics') || key.includes('tireProfitValue'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(` [DEBUG] Removido: ${key}`);
    });
    
    // Forçar reload da página
    console.log(' [DEBUG] Recarregando página...');
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div>
        {/* Botão de debug temporário */}
        <button 
          onClick={handleClearCache}
          className="mb-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
           LIMPAR CACHE E RECARREGAR
        </button>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-4 bg-muted rounded" />
              </div>
              <div>
                <div className="h-8 w-24 bg-muted rounded mb-2" />
                <div className="h-3 w-32 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          {/* Botões de debug temporários */}
          <button 
            onClick={handleClearCache}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            🧽 LIMPAR CACHE
          </button>
          
          <button 
            onClick={async () => {
              console.log('🔍 [DEBUG] Executando verificação de valores...');
              
              try {
                
                // Buscar dados diretamente do Supabase
                const { data: stockItems, error } = await supabase
                  .from('stock_items')
                  .select('*')
                  .order('item_name');
                
                if (error) {
                  console.error('❌ [DEBUG] Erro ao buscar dados:', error);
                  return;
                }
                
                console.log(`✅ [DEBUG] Encontrados ${stockItems.length} itens de estoque:`);
                console.table(stockItems.map(item => ({
                  Nome: item.item_name,
                  Tipo: item.item_type,
                  Quantidade: item.quantity,
                  'Custo Unit.': `R$ ${item.unit_cost.toFixed(2)}`,
                  'Valor Total': `R$ ${(item.quantity * item.unit_cost).toFixed(2)}`,
                  'Atualizado': item.last_updated
                })));
                
                // Calcular valor total manualmente
                const totalManual = stockItems.reduce((sum, item) => {
                  return sum + (item.quantity * item.unit_cost);
                }, 0);
                
                // Verificar o que o dataManager retorna
                const totalDataManager = await dataManager.calculateTotalStockValue();
                
                console.log('📊 [DEBUG] COMPARAÇÃO DE VALORES:');
                console.log(`🔢 Cálculo Manual: R$ ${totalManual.toFixed(2)}`);
                console.log(`🔧 DataManager: R$ ${totalDataManager.toFixed(2)}`);
                console.log(`🎯 Valores iguais: ${totalManual === totalDataManager ? '✅ SIM' : '❌ NÃO'}`);
                
                if (totalManual !== totalDataManager) {
                  console.warn('⚠️ [DEBUG] VALORES DIFERENTES! Investigando...');
                  
                  // Verificar localStorage
                  console.log('🗄 [DEBUG] Verificando localStorage...');
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.includes('stock') || key.includes('value'))) {
                      console.log(`🗎 localStorage[${key}]:`, localStorage.getItem(key));
                    }
                  }
                }
                
              } catch (error) {
                console.error('❌ [DEBUG] Erro geral:', error);
              }
            }}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            🔍 DEBUG VALORES
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            🔄 RECARREGAR
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {metricCards.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  )
}
