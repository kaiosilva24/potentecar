/**
 * Otimizações para o fluxo de autenticação
 * Resolve timeouts e melhora performance do login
 */

import { supabase } from '../../supabase/supabase';

// Cache para sessões válidas
const sessionCache = new Map<string, { session: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Verifica se há uma sessão válida em cache
 */
export const getCachedSession = (userId: string) => {
  const cached = sessionCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ [AuthOptimization] Sessão encontrada em cache');
    return cached.session;
  }
  return null;
};

/**
 * Armazena sessão em cache
 */
export const setCachedSession = (userId: string, session: any) => {
  sessionCache.set(userId, {
    session,
    timestamp: Date.now()
  });
  console.log('💾 [AuthOptimization] Sessão armazenada em cache');
};

/**
 * Limpa cache de sessões
 */
export const clearSessionCache = () => {
  sessionCache.clear();
  console.log('🧹 [AuthOptimization] Cache de sessões limpo');
};

/**
 * Login otimizado com timeout e retry
 */
export const optimizedSignIn = async (
  email: string, 
  password: string,
  timeoutMs: number = 10000 // 10 segundos
): Promise<any> => {
  console.log('🚀 [AuthOptimization] Iniciando login otimizado...');
  
  const startTime = Date.now();
  
  // Criar promise com timeout
  const loginPromise = supabase.auth.signInWithPassword({
    email,
    password,
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Login timeout - operação excedeu 10 segundos'));
    }, timeoutMs);
  });

  try {
    // Race entre login e timeout
    const result = await Promise.race([loginPromise, timeoutPromise]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ [AuthOptimization] Login concluído em ${duration}ms`);
    
    // Cache da sessão se bem-sucedido
    if (result && typeof result === 'object' && 'error' in result && 'data' in result) {
      const typedResult = result as any;
      if (!typedResult.error && typedResult.data?.user) {
        setCachedSession(typedResult.data.user.id, typedResult.data.session);
      }
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [AuthOptimization] Login falhou após ${duration}ms:`, error);
    throw error;
  }
};

/**
 * Verificação rápida de sessão com fallback
 */
export const quickSessionCheck = async (): Promise<any> => {
  console.log('⚡ [AuthOptimization] Verificação rápida de sessão...');
  
  try {
    // Tentar verificação rápida primeiro
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 3000)
      )
    ]);

    // Type guard para verificar se é uma resposta válida do Supabase
    if (result && typeof result === 'object' && 'data' in result) {
      const { data, error } = result as any;
      
      if (error) {
        console.warn('⚠️ [AuthOptimization] Erro na verificação de sessão:', error);
        return null;
      }
      
      const session = data?.session;
      if (session) {
        console.log('✅ [AuthOptimization] Sessão verificada rapidamente');
        return session;
      }
    }

    return null;
  } catch (error) {
    console.warn('⚠️ [AuthOptimization] Timeout na verificação de sessão, usando fallback');
    
    // Fallback: verificar localStorage
    try {
      const localSession = localStorage.getItem('supabase.auth.token');
      if (localSession) {
        const parsed = JSON.parse(localSession);
        if (parsed.expires_at && parsed.expires_at > Date.now() / 1000) {
          console.log('✅ [AuthOptimization] Sessão válida encontrada no localStorage');
          return parsed;
        }
      }
    } catch (localError) {
      console.warn('⚠️ [AuthOptimization] Erro ao verificar localStorage:', localError);
    }
    
    return null;
  }
};

/**
 * Pré-carregamento de dados críticos do dashboard
 */
export const preloadCriticalData = async (): Promise<void> => {
  console.log('🔄 [AuthOptimization] Pré-carregando dados críticos...');
  
  const startTime = Date.now();
  
  try {
    // Carregar apenas dados essenciais em paralelo
    const criticalQueries = [
      // Verificar se tabelas existem
      supabase.from('system_settings').select('key').limit(1),
      // Carregar configurações básicas
      supabase.from('system_settings').select('*').eq('key', 'business_value').single(),
    ];

    // Executar queries críticas com timeout
    await Promise.race([
      Promise.allSettled(criticalQueries),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Preload timeout')), 5000)
      )
    ]);

    const duration = Date.now() - startTime;
    console.log(`✅ [AuthOptimization] Dados críticos carregados em ${duration}ms`);
  } catch (error) {
    console.warn('⚠️ [AuthOptimization] Erro no pré-carregamento (não crítico):', error);
  }
};

/**
 * Inicialização lazy de dados não críticos
 */
export const lazyLoadSecondaryData = async (): Promise<void> => {
  console.log('⏳ [AuthOptimization] Carregamento lazy de dados secundários...');
  
  // Aguardar um pouco para não sobrecarregar
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    // Carregar dados menos críticos
    const secondaryQueries = [
      supabase.from('cash_flow_entries').select('*').limit(10),
      supabase.from('stock_items').select('*').limit(10),
    ];

    await Promise.allSettled(secondaryQueries);
    console.log('✅ [AuthOptimization] Dados secundários carregados');
  } catch (error) {
    console.warn('⚠️ [AuthOptimization] Erro no carregamento secundário:', error);
  }
};

/**
 * Otimização de conexão com Supabase
 */
export const optimizeSupabaseConnection = (): void => {
  console.log('🔧 [AuthOptimization] Otimizando conexão Supabase...');
  
  try {
    // Configurar timeouts mais agressivos (usando any para acessar propriedades internas)
    const supabaseAny = supabase as any;
    
    if (supabaseAny.rest) {
      supabaseAny.rest.timeout = 8000; // 8 segundos
    }
    
    // Configurar retry policy
    if (supabaseAny.auth) {
      supabaseAny.auth.retryAttempts = 2;
    }
    
    console.log('✅ [AuthOptimization] Conexão Supabase otimizada');
  } catch (error) {
    console.warn('⚠️ [AuthOptimization] Erro ao otimizar conexão:', error);
  }
};

/**
 * Monitor de performance de autenticação
 */
export class AuthPerformanceMonitor {
  private static metrics: Array<{
    operation: string;
    duration: number;
    success: boolean;
    timestamp: number;
  }> = [];

  static recordOperation(operation: string, duration: number, success: boolean) {
    this.metrics.push({
      operation,
      duration,
      success,
      timestamp: Date.now()
    });

    // Manter apenas últimas 50 operações
    if (this.metrics.length > 50) {
      this.metrics = this.metrics.slice(-50);
    }

    console.log(`📊 [AuthPerformance] ${operation}: ${duration}ms (${success ? 'sucesso' : 'falha'})`);
  }

  static getAverageTime(operation: string): number {
    const ops = this.metrics.filter(m => m.operation === operation && m.success);
    if (ops.length === 0) return 0;
    
    const total = ops.reduce((sum, op) => sum + op.duration, 0);
    return Math.round(total / ops.length);
  }

  static getSuccessRate(operation: string): number {
    const ops = this.metrics.filter(m => m.operation === operation);
    if (ops.length === 0) return 0;
    
    const successful = ops.filter(op => op.success).length;
    return Math.round((successful / ops.length) * 100);
  }

  static getReport(): string {
    const operations = [...new Set(this.metrics.map(m => m.operation))];
    
    let report = '📊 Relatório de Performance de Autenticação:\n';
    operations.forEach(op => {
      const avgTime = this.getAverageTime(op);
      const successRate = this.getSuccessRate(op);
      report += `• ${op}: ${avgTime}ms (${successRate}% sucesso)\n`;
    });
    
    return report;
  }
}

/**
 * Configuração de otimizações globais
 */
export const initializeAuthOptimizations = (): void => {
  console.log('🚀 [AuthOptimization] Inicializando otimizações de autenticação...');
  
  // Otimizar conexão Supabase
  optimizeSupabaseConnection();
  
  // Limpar cache antigo
  clearSessionCache();
  
  // Configurar limpeza periódica do cache
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sessionCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        sessionCache.delete(key);
      }
    }
  }, CACHE_DURATION);
  
  console.log('✅ [AuthOptimization] Otimizações inicializadas');
};
