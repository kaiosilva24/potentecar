/**
 * Sistema de lazy loading inteligente
 * Carrega dados sob demanda para melhorar performance inicial
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OptimizedSupabaseClient } from './supabaseOptimizations';
import { PerformanceAuditor } from './performanceAuditor';

export interface LazyLoadConfig {
  priority: 'critical' | 'high' | 'medium' | 'low';
  delay: number; // ms
  dependencies?: string[];
  condition?: () => boolean;
}

export interface LazyLoadItem {
  id: string;
  loader: () => Promise<any>;
  config: LazyLoadConfig;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  data?: any;
  error?: string;
}

/**
 * Gerenciador de lazy loading inteligente
 */
export class IntelligentLazyLoader {
  private static items: Map<string, LazyLoadItem> = new Map();
  private static loadQueue: string[] = [];
  private static isProcessing = false;
  private static listeners: Map<string, ((data: any) => void)[]> = new Map();

  // Registrar item para lazy loading
  static register(
    id: string,
    loader: () => Promise<any>,
    config: LazyLoadConfig
  ): void {
    const item: LazyLoadItem = {
      id,
      loader,
      config,
      status: 'pending'
    };

    this.items.set(id, item);
    
    // Adicionar à fila baseado na prioridade
    this.addToQueue(id);
    
    console.log(`📋 [LazyLoader] Registrado: ${id} (${config.priority})`);
  }

  // Adicionar à fila de carregamento
  private static addToQueue(id: string): void {
    const item = this.items.get(id);
    if (!item) return;

    // Remover se já estiver na fila
    const existingIndex = this.loadQueue.indexOf(id);
    if (existingIndex !== -1) {
      this.loadQueue.splice(existingIndex, 1);
    }

    // Inserir baseado na prioridade
    const priorities = ['critical', 'high', 'medium', 'low'];
    const itemPriority = priorities.indexOf(item.config.priority);
    
    let insertIndex = this.loadQueue.length;
    for (let i = 0; i < this.loadQueue.length; i++) {
      const queueItem = this.items.get(this.loadQueue[i]);
      if (queueItem) {
        const queuePriority = priorities.indexOf(queueItem.config.priority);
        if (itemPriority < queuePriority) {
          insertIndex = i;
          break;
        }
      }
    }

    this.loadQueue.splice(insertIndex, 0, id);
    
    // Iniciar processamento se não estiver rodando
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // Processar fila de carregamento
  private static async processQueue(): Promise<void> {
    if (this.isProcessing || this.loadQueue.length === 0) return;

    this.isProcessing = true;
    console.log(`🔄 [LazyLoader] Processando fila: ${this.loadQueue.length} itens`);

    while (this.loadQueue.length > 0) {
      const id = this.loadQueue.shift();
      if (!id) continue;

      const item = this.items.get(id);
      if (!item || item.status !== 'pending') continue;

      // Verificar dependências
      if (item.config.dependencies) {
        const dependenciesReady = item.config.dependencies.every(depId => {
          const dep = this.items.get(depId);
          return dep && dep.status === 'loaded';
        });

        if (!dependenciesReady) {
          // Recolocar no final da fila
          this.loadQueue.push(id);
          continue;
        }
      }

      // Verificar condição
      if (item.config.condition && !item.config.condition()) {
        // Recolocar no final da fila
        this.loadQueue.push(id);
        continue;
      }

      // Aguardar delay se especificado
      if (item.config.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, item.config.delay));
      }

      // Carregar item
      await this.loadItem(id);
    }

    this.isProcessing = false;
    console.log('✅ [LazyLoader] Fila processada completamente');
  }

  // Carregar item específico
  private static async loadItem(id: string): Promise<void> {
    const item = this.items.get(id);
    if (!item) return;

    item.status = 'loading';
    console.log(`⏳ [LazyLoader] Carregando: ${id}`);

    const startTime = performance.now();

    try {
      const data = await item.loader();
      const duration = performance.now() - startTime;

      item.status = 'loaded';
      item.data = data;

      PerformanceAuditor.recordOperation(`lazy_load_${id}`, duration, true);
      console.log(`✅ [LazyLoader] Carregado: ${id} (${duration.toFixed(2)}ms)`);

      // Notificar listeners
      this.notifyListeners(id, data);

    } catch (error) {
      const duration = performance.now() - startTime;
      
      item.status = 'error';
      item.error = error instanceof Error ? error.message : 'Erro desconhecido';

      PerformanceAuditor.recordOperation(`lazy_load_${id}`, duration, false);
      console.error(`❌ [LazyLoader] Erro ao carregar ${id}:`, error);

      // Notificar listeners sobre erro
      this.notifyListeners(id, null, item.error);
    }
  }

  // Notificar listeners
  private static notifyListeners(id: string, data: any, error?: string): void {
    const listeners = this.listeners.get(id) || [];
    listeners.forEach(listener => {
      try {
        listener(error ? { error } : data);
      } catch (err) {
        console.error(`❌ [LazyLoader] Erro no listener para ${id}:`, err);
      }
    });
  }

  // Adicionar listener para item
  static addListener(id: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, []);
    }
    
    this.listeners.get(id)!.push(callback);

    // Retornar função de cleanup
    return () => {
      const listeners = this.listeners.get(id);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  // Forçar carregamento imediato
  static async forceLoad(id: string): Promise<any> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Item não encontrado: ${id}`);
    }

    if (item.status === 'loaded') {
      return item.data;
    }

    if (item.status === 'loading') {
      // Aguardar carregamento atual
      return new Promise((resolve, reject) => {
        const cleanup = this.addListener(id, (data) => {
          cleanup();
          if (data?.error) {
            reject(new Error(data.error));
          } else {
            resolve(data);
          }
        });
      });
    }

    // Carregar imediatamente
    await this.loadItem(id);
    return item.data;
  }

  // Obter status de todos os itens
  static getStatus(): Record<string, { status: string; priority: string; hasData: boolean }> {
    const status: Record<string, any> = {};
    
    for (const [id, item] of this.items.entries()) {
      status[id] = {
        status: item.status,
        priority: item.config.priority,
        hasData: !!item.data,
        error: item.error
      };
    }

    return status;
  }

  // Limpar itens carregados
  static cleanup(): void {
    let cleaned = 0;
    
    for (const [id, item] of this.items.entries()) {
      if (item.status === 'loaded' || item.status === 'error') {
        this.items.delete(id);
        this.listeners.delete(id);
        cleaned++;
      }
    }

    console.log(`🧹 [LazyLoader] Limpeza: ${cleaned} itens removidos`);
  }
}

/**
 * Hook para usar lazy loading em componentes React
 */
export function useLazyLoad<T>(
  id: string,
  loader: () => Promise<T>,
  config: LazyLoadConfig
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const registeredRef = useRef(false);

  // Registrar item no lazy loader
  useEffect(() => {
    if (!registeredRef.current) {
      IntelligentLazyLoader.register(id, loader, config);
      registeredRef.current = true;

      // Adicionar listener
      const cleanup = IntelligentLazyLoader.addListener(id, (result) => {
        if (result?.error) {
          setError(result.error);
          setLoading(false);
        } else {
          setData(result);
          setError(null);
          setLoading(false);
        }
      });

      return cleanup;
    }
  }, [id]);

  // Função para recarregar
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await IntelligentLazyLoader.forceLoad(id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao recarregar');
    } finally {
      setLoading(false);
    }
  }, [id]);

  return { data, loading, error, reload };
}

/**
 * Configurações pré-definidas para diferentes tipos de dados
 */
export const LazyLoadPresets = {
  // Dados críticos - carregam imediatamente
  critical: {
    priority: 'critical' as const,
    delay: 0
  },

  // Dados do dashboard - carregam após dados críticos
  dashboard: {
    priority: 'high' as const,
    delay: 500,
    dependencies: ['auth', 'settings']
  },

  // Dados de relatórios - carregam quando necessário
  reports: {
    priority: 'medium' as const,
    delay: 2000
  },

  // Dados de histórico - carregam por último
  history: {
    priority: 'low' as const,
    delay: 5000
  },

  // Dados condicionais - carregam apenas se usuário acessar
  conditional: (condition: () => boolean) => ({
    priority: 'medium' as const,
    delay: 1000,
    condition
  })
};

/**
 * Inicializar sistema de lazy loading para o dashboard
 */
export const initializeDashboardLazyLoading = () => {
  console.log('🚀 [LazyLoader] Inicializando lazy loading do dashboard...');

  // Registrar dados críticos
  IntelligentLazyLoader.register(
    'auth_session',
    async () => {
      // Verificação de sessão já otimizada
      return { session: 'verified' };
    },
    LazyLoadPresets.critical
  );

  // Registrar configurações do sistema
  IntelligentLazyLoader.register(
    'system_settings',
    OptimizedSupabaseClient.getSystemSettingsOptimized,
    LazyLoadPresets.critical
  );

  // Registrar dados do dashboard
  IntelligentLazyLoader.register(
    'dashboard_data',
    OptimizedSupabaseClient.getBatchDashboardData,
    LazyLoadPresets.dashboard
  );

  // Registrar dados de estoque
  IntelligentLazyLoader.register(
    'stock_data',
    OptimizedSupabaseClient.getStockItemsOptimized,
    {
      ...LazyLoadPresets.dashboard,
      dependencies: ['system_settings']
    }
  );

  console.log('✅ [LazyLoader] Dashboard lazy loading configurado');
};
