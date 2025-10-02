/**
 * Sistema de auditoria de performance
 * Identifica gargalos e operações lentas no sistema
 */

import React from 'react';
import { supabase } from '../../supabase/supabase';

export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: any;
}

export interface QueryAnalysis {
  table: string;
  operation: string;
  duration: number;
  rowCount?: number;
  success: boolean;
  query?: string;
}

export class PerformanceAuditor {
  private static metrics: PerformanceMetric[] = [];
  private static queryAnalytics: QueryAnalysis[] = [];
  private static isEnabled = true;

  // Iniciar medição de performance
  static startMeasurement(operation: string, metadata?: any): string {
    if (!this.isEnabled) return '';
    
    const id = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.metrics.push({
      operation,
      startTime: performance.now(),
      success: false,
      metadata
    });

    console.log(`⏱️ [PerformanceAuditor] Iniciando: ${operation}`, metadata);
    return id;
  }

  // Finalizar medição de performance
  static endMeasurement(operation: string, success: boolean = true, error?: string): void {
    if (!this.isEnabled) return;

    const metric = this.metrics.find(m => 
      m.operation === operation && 
      !m.endTime
    );

    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      metric.error = error;

      const status = success ? '✅' : '❌';
      const color = metric.duration > 5000 ? '🔴' : metric.duration > 2000 ? '🟡' : '🟢';
      
      console.log(`${status} [PerformanceAuditor] ${color} ${operation}: ${metric.duration.toFixed(2)}ms`, {
        success,
        error,
        metadata: metric.metadata
      });

      // Alertar sobre operações muito lentas
      if (metric.duration > 10000) {
        console.warn(`🚨 [PerformanceAuditor] OPERAÇÃO MUITO LENTA: ${operation} (${metric.duration.toFixed(2)}ms)`);
      }
    }
  }

  // Analisar query do Supabase
  static async analyzeQuery<T>(
    table: string, 
    operation: string, 
    queryFn: () => Promise<any>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      console.log(`🔍 [QueryAnalyzer] Executando: ${operation} em ${table}`);
      
      const result = await queryFn();
      const duration = performance.now() - startTime;
      
      const analysis: QueryAnalysis = {
        table,
        operation,
        duration,
        success: true,
        rowCount: result?.data?.length || (result?.count !== undefined ? result.count : undefined)
      };

      this.queryAnalytics.push(analysis);

      const color = duration > 3000 ? '🔴' : duration > 1000 ? '🟡' : '🟢';
      console.log(`${color} [QueryAnalyzer] ${table}.${operation}: ${duration.toFixed(2)}ms`, {
        rowCount: analysis.rowCount,
        hasError: !!result?.error
      });

      if (duration > 5000) {
        console.warn(`🐌 [QueryAnalyzer] Query lenta detectada: ${table}.${operation} (${duration.toFixed(2)}ms)`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.queryAnalytics.push({
        table,
        operation,
        duration,
        success: false
      });

      console.error(`❌ [QueryAnalyzer] Erro em ${table}.${operation}:`, error);
      throw error;
    }
  }

  // Auditoria completa do sistema
  static async runSystemAudit(): Promise<{
    slowOperations: PerformanceMetric[];
    slowQueries: QueryAnalysis[];
    recommendations: string[];
    summary: any;
  }> {
    console.log('🔍 [PerformanceAuditor] Iniciando auditoria completa do sistema...');

    const slowOperations = this.metrics
      .filter(m => m.duration && m.duration > 2000)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));

    const slowQueries = this.queryAnalytics
      .filter(q => q.duration > 1000)
      .sort((a, b) => b.duration - a.duration);

    const recommendations: string[] = [];

    // Analisar operações lentas
    if (slowOperations.length > 0) {
      recommendations.push(`🐌 ${slowOperations.length} operações lentas detectadas (>2s)`);
      
      const slowestOp = slowOperations[0];
      if (slowestOp.duration && slowestOp.duration > 10000) {
        recommendations.push(`🚨 Operação crítica: ${slowestOp.operation} (${slowestOp.duration.toFixed(2)}ms)`);
      }
    }

    // Analisar queries lentas
    if (slowQueries.length > 0) {
      recommendations.push(`🗄️ ${slowQueries.length} queries lentas detectadas (>1s)`);
      
      const slowestQuery = slowQueries[0];
      if (slowestQuery.duration > 5000) {
        recommendations.push(`🚨 Query crítica: ${slowestQuery.table}.${slowestQuery.operation} (${slowestQuery.duration.toFixed(2)}ms)`);
      }
    }

    // Analisar padrões
    const operationCounts = this.metrics.reduce((acc, m) => {
      acc[m.operation] = (acc[m.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const frequentOps = Object.entries(operationCounts)
      .filter(([_, count]) => count > 10)
      .sort(([_, a], [__, b]) => b - a);

    if (frequentOps.length > 0) {
      recommendations.push(`🔄 Operações muito frequentes: ${frequentOps.map(([op, count]) => `${op}(${count}x)`).join(', ')}`);
    }

    const summary = {
      totalOperations: this.metrics.length,
      totalQueries: this.queryAnalytics.length,
      slowOperations: slowOperations.length,
      slowQueries: slowQueries.length,
      averageOperationTime: this.metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / this.metrics.length,
      averageQueryTime: this.queryAnalytics.reduce((sum, q) => sum + q.duration, 0) / this.queryAnalytics.length,
      successRate: (this.metrics.filter(m => m.success).length / this.metrics.length) * 100
    };

    console.log('📊 [PerformanceAuditor] Auditoria concluída:', summary);

    return {
      slowOperations,
      slowQueries,
      recommendations,
      summary
    };
  }

  // Auditoria específica do dashboard
  static async auditDashboardLoad(): Promise<void> {
    console.log('🏠 [PerformanceAuditor] Auditando carregamento do dashboard...');

    const dashboardStart = this.startMeasurement('dashboard_full_load');

    try {
      // Testar queries críticas do dashboard
      await Promise.all([
        this.analyzeQuery('cash_flow_entries', 'dashboard_cash_flow', async () => 
          await supabase.from('cash_flow_entries').select('*').limit(100)
        ),
        this.analyzeQuery('stock_items', 'dashboard_stock', async () => 
          await supabase.from('stock_items').select('*').limit(50)
        ),
        this.analyzeQuery('system_settings', 'dashboard_settings', async () => 
          await supabase.from('system_settings').select('*')
        ),
      ]);

      this.endMeasurement('dashboard_full_load', true);
    } catch (error) {
      this.endMeasurement('dashboard_full_load', false, error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }

  // Auditoria de hooks de dados
  static auditDataHooks(): void {
    console.log('🪝 [PerformanceAuditor] Auditando hooks de dados...');

    // Monitorar useEffect excessivos
    const originalUseEffect = React.useEffect;
    let useEffectCount = 0;

    // @ts-ignore
    React.useEffect = (...args) => {
      useEffectCount++;
      if (useEffectCount > 50) {
        console.warn(`⚠️ [PerformanceAuditor] Muitos useEffects detectados: ${useEffectCount}`);
      }
      return originalUseEffect(...args);
    };
  }

  // Limpar métricas antigas
  static clearOldMetrics(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    this.metrics = this.metrics.filter(m => m.startTime > oneHourAgo);
    this.queryAnalytics = this.queryAnalytics.filter(q => q.duration > oneHourAgo);
    
    console.log('🧹 [PerformanceAuditor] Métricas antigas removidas');
  }

  // Obter relatório de performance
  static getPerformanceReport(): string {
    const totalOps = this.metrics.length;
    const slowOps = this.metrics.filter(m => m.duration && m.duration > 2000).length;
    const failedOps = this.metrics.filter(m => !m.success).length;
    
    const totalQueries = this.queryAnalytics.length;
    const slowQueries = this.queryAnalytics.filter(q => q.duration > 1000).length;
    
    return `
📊 Relatório de Performance:

🔧 Operações:
• Total: ${totalOps}
• Lentas (>2s): ${slowOps} (${((slowOps/totalOps)*100).toFixed(1)}%)
• Falhadas: ${failedOps} (${((failedOps/totalOps)*100).toFixed(1)}%)

🗄️ Queries:
• Total: ${totalQueries}
• Lentas (>1s): ${slowQueries} (${((slowQueries/totalQueries)*100).toFixed(1)}%)

⚡ Recomendações:
${slowOps > 0 ? '• Otimizar operações lentas' : '✅ Operações em boa performance'}
${slowQueries > 0 ? '• Otimizar queries do banco' : '✅ Queries em boa performance'}
${failedOps > 0 ? '• Investigar falhas recorrentes' : '✅ Taxa de sucesso boa'}
    `.trim();
  }

  // Habilitar/desabilitar auditoria
  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`${enabled ? '🟢' : '🔴'} [PerformanceAuditor] Auditoria ${enabled ? 'habilitada' : 'desabilitada'}`);
  }

  // Obter métricas brutas
  static getMetrics(): { metrics: PerformanceMetric[]; queries: QueryAnalysis[] } {
    return {
      metrics: [...this.metrics],
      queries: [...this.queryAnalytics]
    };
  }
}

// Wrapper para monitorar funções automaticamente
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  operationName: string
): T {
  return ((...args: any[]) => {
    const id = PerformanceAuditor.startMeasurement(operationName, { args: args.length });
    
    try {
      const result = fn(...args);
      
      // Se é uma Promise, aguardar conclusão
      if (result && typeof result.then === 'function') {
        return result
          .then((res: any) => {
            PerformanceAuditor.endMeasurement(operationName, true);
            return res;
          })
          .catch((error: any) => {
            PerformanceAuditor.endMeasurement(operationName, false, error?.message);
            throw error;
          });
      } else {
        PerformanceAuditor.endMeasurement(operationName, true);
        return result;
      }
    } catch (error) {
      PerformanceAuditor.endMeasurement(operationName, false, error instanceof Error ? error.message : 'Erro desconhecido');
      throw error;
    }
  }) as T;
}

// Auto-limpeza periódica
setInterval(() => {
  PerformanceAuditor.clearOldMetrics();
}, 30 * 60 * 1000); // A cada 30 minutos
