/**
 * Otimizador de useEffects
 * Reduz re-renderizações desnecessárias e melhora performance
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { PerformanceAuditor } from './performanceAuditor';

// Contador global de useEffects
let globalUseEffectCount = 0;
const useEffectRegistry = new Map<string, {
  count: number;
  lastRun: number;
  averageTime: number;
  component: string;
}>();

/**
 * useEffect otimizado com debounce e throttling
 */
export function useOptimizedEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList | undefined,
  options: {
    debounce?: number;
    throttle?: number;
    skipFirstRun?: boolean;
    name?: string;
  } = {}
): void {
  const { debounce = 0, throttle = 0, skipFirstRun = false, name = 'anonymous' } = options;
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastRunRef = useRef<number>(0);
  const isFirstRunRef = useRef(true);
  const cleanupRef = useRef<(() => void) | void>();

  useEffect(() => {
    const startTime = performance.now();
    
    // Registrar useEffect
    globalUseEffectCount++;
    const effectId = `${name}_${globalUseEffectCount}`;
    
    // Pular primeira execução se solicitado
    if (skipFirstRun && isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }

    const runEffect = () => {
      const now = Date.now();
      
      // Throttling - não executar se muito recente
      if (throttle > 0 && now - lastRunRef.current < throttle) {
        console.log(`⏸️ [UseEffectOptimizer] Throttled: ${effectId}`);
        return;
      }

      lastRunRef.current = now;
      
      try {
        // Limpar cleanup anterior se existir
        if (cleanupRef.current) {
          cleanupRef.current();
        }
        
        // Executar efeito
        cleanupRef.current = effect();
        
        const duration = performance.now() - startTime;
        
        // Registrar performance
        PerformanceAuditor.recordOperation(`useEffect_${effectId}`, duration, true);
        
        // Atualizar registry
        const existing = useEffectRegistry.get(effectId) || {
          count: 0,
          lastRun: 0,
          averageTime: 0,
          component: name
        };
        
        existing.count++;
        existing.lastRun = now;
        existing.averageTime = (existing.averageTime * (existing.count - 1) + duration) / existing.count;
        
        useEffectRegistry.set(effectId, existing);
        
        if (duration > 100) {
          console.warn(`🐌 [UseEffectOptimizer] Slow effect: ${effectId} (${duration.toFixed(2)}ms)`);
        }
        
      } catch (error) {
        const duration = performance.now() - startTime;
        PerformanceAuditor.recordOperation(`useEffect_${effectId}`, duration, false);
        console.error(`❌ [UseEffectOptimizer] Error in ${effectId}:`, error);
      }
    };

    // Debouncing - atrasar execução
    if (debounce > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(runEffect, debounce);
    } else {
      runEffect();
    }

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, deps);
}

/**
 * Hook para memoização inteligente baseada em performance
 */
export function useSmartMemo<T>(
  factory: () => T,
  deps: React.DependencyList | undefined,
  options: {
    name?: string;
    maxAge?: number; // ms
    skipExpensiveCalculation?: boolean;
  } = {}
): T {
  const { name = 'anonymous', maxAge = 60000, skipExpensiveCalculation = false } = options;
  
  const lastCalculationRef = useRef<{ value: T; timestamp: number; deps: any[] } | null>(null);
  
  return useMemo(() => {
    const startTime = performance.now();
    
    // Verificar se temos cache válido
    if (lastCalculationRef.current && maxAge > 0) {
      const age = Date.now() - lastCalculationRef.current.timestamp;
      const depsChanged = !deps || !lastCalculationRef.current.deps || 
        deps.some((dep, index) => dep !== lastCalculationRef.current!.deps[index]);
      
      if (age < maxAge && !depsChanged) {
        console.log(`💾 [SmartMemo] Cache hit: ${name}`);
        return lastCalculationRef.current.value;
      }
    }
    
    // Pular cálculo caro se solicitado
    if (skipExpensiveCalculation && lastCalculationRef.current) {
      console.log(`⏭️ [SmartMemo] Skipping expensive calculation: ${name}`);
      return lastCalculationRef.current.value;
    }
    
    // Calcular novo valor
    const value = factory();
    const duration = performance.now() - startTime;
    
    // Armazenar no cache
    lastCalculationRef.current = {
      value,
      timestamp: Date.now(),
      deps: deps ? [...deps] : []
    };
    
    // Registrar performance
    PerformanceAuditor.recordOperation(`useMemo_${name}`, duration, true);
    
    if (duration > 50) {
      console.warn(`🐌 [SmartMemo] Expensive calculation: ${name} (${duration.toFixed(2)}ms)`);
    }
    
    return value;
  }, deps);
}

/**
 * Hook para callback otimizado com throttling
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  options: {
    throttle?: number;
    debounce?: number;
    name?: string;
  } = {}
): T {
  const { throttle = 0, debounce = 0, name = 'anonymous' } = options;
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastCallRef = useRef<number>(0);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    // Throttling
    if (throttle > 0 && now - lastCallRef.current < throttle) {
      console.log(`⏸️ [OptimizedCallback] Throttled: ${name}`);
      return;
    }
    
    const executeCallback = () => {
      lastCallRef.current = Date.now();
      const startTime = performance.now();
      
      try {
        const result = callback(...args);
        const duration = performance.now() - startTime;
        
        PerformanceAuditor.recordOperation(`callback_${name}`, duration, true);
        
        if (duration > 50) {
          console.warn(`🐌 [OptimizedCallback] Slow callback: ${name} (${duration.toFixed(2)}ms)`);
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        PerformanceAuditor.recordOperation(`callback_${name}`, duration, false);
        console.error(`❌ [OptimizedCallback] Error in ${name}:`, error);
        throw error;
      }
    };
    
    // Debouncing
    if (debounce > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(executeCallback, debounce);
    } else {
      return executeCallback();
    }
  }, deps) as T;
}

/**
 * Hook para detectar re-renderizações desnecessárias
 */
export function useRenderTracker(componentName: string, props?: Record<string, any>): void {
  const renderCountRef = useRef(0);
  const prevPropsRef = useRef<Record<string, any>>();
  
  renderCountRef.current++;
  
  useEffect(() => {
    console.log(`🔄 [RenderTracker] ${componentName} renderizado ${renderCountRef.current} vezes`);
    
    if (props && prevPropsRef.current) {
      const changedProps = Object.keys(props).filter(
        key => props[key] !== prevPropsRef.current![key]
      );
      
      if (changedProps.length > 0) {
        console.log(`📝 [RenderTracker] ${componentName} props alteradas:`, changedProps);
      } else {
        console.warn(`⚠️ [RenderTracker] ${componentName} re-renderizado sem mudança de props!`);
      }
    }
    
    prevPropsRef.current = props ? { ...props } : undefined;
  });
  
  // Alertar sobre muitas re-renderizações
  if (renderCountRef.current > 10) {
    console.warn(`🚨 [RenderTracker] ${componentName} renderizado ${renderCountRef.current} vezes - possível problema de performance!`);
  }
}

/**
 * Analisador de useEffects no sistema
 */
export const UseEffectAnalyzer = {
  // Obter estatísticas de useEffects
  getStats(): {
    totalEffects: number;
    slowEffects: Array<{ id: string; averageTime: number; count: number }>;
    frequentEffects: Array<{ id: string; count: number; component: string }>;
  } {
    const effects = Array.from(useEffectRegistry.entries());
    
    return {
      totalEffects: effects.length,
      slowEffects: effects
        .filter(([_, data]) => data.averageTime > 100)
        .map(([id, data]) => ({ id, averageTime: data.averageTime, count: data.count }))
        .sort((a, b) => b.averageTime - a.averageTime),
      frequentEffects: effects
        .filter(([_, data]) => data.count > 20)
        .map(([id, data]) => ({ id, count: data.count, component: data.component }))
        .sort((a, b) => b.count - a.count)
    };
  },

  // Gerar relatório de performance
  generateReport(): string {
    const stats = this.getStats();
    
    let report = `📊 Relatório de UseEffects:\n\n`;
    report += `Total de Effects: ${stats.totalEffects}\n`;
    report += `Effects Lentos (>100ms): ${stats.slowEffects.length}\n`;
    report += `Effects Frequentes (>20x): ${stats.frequentEffects.length}\n\n`;
    
    if (stats.slowEffects.length > 0) {
      report += `🐌 Effects Mais Lentos:\n`;
      stats.slowEffects.slice(0, 5).forEach(effect => {
        report += `• ${effect.id}: ${effect.averageTime.toFixed(2)}ms (${effect.count}x)\n`;
      });
      report += '\n';
    }
    
    if (stats.frequentEffects.length > 0) {
      report += `🔄 Effects Mais Frequentes:\n`;
      stats.frequentEffects.slice(0, 5).forEach(effect => {
        report += `• ${effect.id}: ${effect.count}x (${effect.component})\n`;
      });
    }
    
    return report;
  },

  // Limpar registry
  clear(): void {
    useEffectRegistry.clear();
    globalUseEffectCount = 0;
    console.log('🧹 [UseEffectAnalyzer] Registry limpo');
  }
};

/**
 * Configurações de otimização recomendadas
 */
export const OptimizationPresets = {
  // Para dados que mudam frequentemente
  highFrequency: {
    debounce: 100,
    throttle: 50
  },
  
  // Para operações caras
  expensive: {
    debounce: 500,
    throttle: 1000,
    skipFirstRun: true
  },
  
  // Para sincronização em tempo real
  realtime: {
    throttle: 100
  },
  
  // Para dados de relatórios
  reports: {
    debounce: 1000,
    skipFirstRun: true
  }
};
