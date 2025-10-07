/**
 * Otimizações específicas para queries do Supabase
 * Resolve gargalos de performance em consultas ao banco
 */

import { supabase } from "../../supabase/supabase";
import { PerformanceAuditor } from "./performanceAuditor";

// Cache para queries frequentes
const queryCache = new Map<
  string,
  { data: any; timestamp: number; ttl: number }
>();

/**
 * Wrapper otimizado para queries do Supabase com cache
 */
export class OptimizedSupabaseClient {
  // Cache com TTL configurável
  static async cachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<any>,
    ttlMs: number = 30000 // 30 segundos padrão
  ): Promise<T> {
    // Verificar cache primeiro
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`💾 [SupabaseOptimized] Cache hit: ${cacheKey}`);
      return cached.data;
    }

    // Executar query com monitoramento
    const result = await PerformanceAuditor.analyzeQuery(
      cacheKey.split("_")[0] || "unknown",
      cacheKey.split("_")[1] || "query",
      queryFn
    );

    // Armazenar no cache se bem-sucedido
    if (result && !result.error) {
      queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl: ttlMs,
      });
      console.log(
        `💾 [SupabaseOptimized] Cached: ${cacheKey} (TTL: ${ttlMs}ms)`
      );
    }

    return result;
  }

  // Query otimizada para cash flow com paginação
  static async getCashFlowOptimized(limit: number = 100, offset: number = 0) {
    const cacheKey = `cash_flow_entries_paginated_${limit}_${offset}`;

    return this.cachedQuery(
      cacheKey,
      async () => {
        return await supabase
          .from("cash_flow_entries")
          .select(
            "id, amount, type, category, description, transaction_date, created_at"
          )
          .order("transaction_date", { ascending: false })
          .range(offset, offset + limit - 1);
      },
      60000 // 1 minuto de cache
    );
  }

  // Query otimizada para stock items com campos essenciais
  static async getStockItemsOptimized() {
    const cacheKey = "stock_items_essential";

    return this.cachedQuery(
      cacheKey,
      async () => {
        return await supabase
          .from("stock_items")
          .select(
            "id, item_id, item_name, item_type, quantity, unit_cost, total_value, min_level, last_updated"
          )
          .order("last_updated", { ascending: false });
      },
      45000 // 45 segundos de cache
    );
  }

  // Query otimizada para system settings
  static async getSystemSettingsOptimized() {
    const cacheKey = "system_settings_all";

    return this.cachedQuery(
      cacheKey,
      async () => {
        return await supabase
          .from("system_settings")
          .select("key, value, updated_at");
      },
      120000 // 2 minutos de cache
    );
  }

  // Query otimizada para produtos com filtros
  static async getProductsOptimized(archived: boolean = false) {
    const cacheKey = `products_${archived ? "archived" : "active"}`;

    return this.cachedQuery(
      cacheKey,
      async () => {
        return await supabase
          .from("products")
          .select("id, name, archived, created_at")
          .eq("archived", archived)
          .order("name", { ascending: true });
      },
      90000 // 1.5 minutos de cache
    );
  }

  // Query otimizada para materiais
  static async getMaterialsOptimized() {
    const cacheKey = "raw_materials_active";

    return this.cachedQuery(
      cacheKey,
      async () => {
        return await supabase
          .from("raw_materials")
          .select("id, name, unit, cost_per_unit, created_at")
          .order("name", { ascending: true });
      },
      90000 // 1.5 minutos de cache
    );
  }

  // Batch query para múltiplas tabelas
  static async getBatchDashboardData() {
    console.log(
      "🚀 [SupabaseOptimized] Executando batch query para dashboard..."
    );

    const startTime = performance.now();

    try {
      // Executar queries em paralelo
      const [cashFlow, stockItems, settings, products] = await Promise.all([
        this.getCashFlowOptimized(50), // Apenas últimas 50 entradas
        this.getStockItemsOptimized(),
        this.getSystemSettingsOptimized(),
        this.getProductsOptimized(false), // Apenas produtos ativos
      ]);

      const duration = performance.now() - startTime;
      console.log(
        `✅ [SupabaseOptimized] Batch query concluída em ${duration.toFixed(2)}ms`
      );

      return {
        cashFlow: cashFlow?.data || [],
        stockItems: stockItems?.data || [],
        settings: settings?.data || [],
        products: products?.data || [],
        metadata: {
          duration,
          cached: {
            cashFlow: !!queryCache.get(`cash_flow_entries_paginated_50_0`),
            stockItems: !!queryCache.get("stock_items_essential"),
            settings: !!queryCache.get("system_settings_all"),
            products: !!queryCache.get("products_active"),
          },
        },
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(
        `❌ [SupabaseOptimized] Batch query falhou após ${duration.toFixed(2)}ms:`,
        error
      );
      throw error;
    }
  }

  // Limpar cache específico ou todo o cache
  static clearCache(pattern?: string): void {
    if (pattern) {
      // Limpar apenas chaves que correspondem ao padrão
      for (const key of queryCache.keys()) {
        if (key.includes(pattern)) {
          queryCache.delete(key);
        }
      }
      console.log(`🧹 [SupabaseOptimized] Cache limpo para padrão: ${pattern}`);
    } else {
      // Limpar todo o cache
      queryCache.clear();
      console.log("🧹 [SupabaseOptimized] Todo o cache foi limpo");
    }
  }

  // Invalidar cache quando dados são modificados
  static invalidateCache(table: string): void {
    this.clearCache(table);
    console.log(
      `♻️ [SupabaseOptimized] Cache invalidado para tabela: ${table}`
    );
  }

  // Estatísticas do cache
  static getCacheStats(): {
    totalEntries: number;
    hitRate: number;
    memoryUsage: number;
    oldestEntry: number;
  } {
    const entries = Array.from(queryCache.values());
    const now = Date.now();

    return {
      totalEntries: queryCache.size,
      hitRate: 0, // Seria necessário rastrear hits/misses
      memoryUsage: JSON.stringify(entries).length, // Aproximação
      oldestEntry:
        entries.length > 0
          ? Math.min(...entries.map((e) => now - e.timestamp))
          : 0,
    };
  }

  // Pré-aquecer cache com dados essenciais
  static async warmupCache(): Promise<void> {
    console.log("🔥 [SupabaseOptimized] Aquecendo cache...");

    try {
      await Promise.all([
        this.getSystemSettingsOptimized(),
        this.getStockItemsOptimized(),
        this.getCashFlowOptimized(20), // Apenas últimas 20 para warmup
      ]);

      console.log("✅ [SupabaseOptimized] Cache aquecido com sucesso");
    } catch (error) {
      console.warn("⚠️ [SupabaseOptimized] Erro ao aquecer cache:", error);
    }
  }
}

/**
 * Configurações de otimização para diferentes cenários
 */
export const SupabaseOptimizationConfig = {
  // Configurações para dashboard principal
  dashboard: {
    cashFlowLimit: 50,
    cacheTTL: 60000, // 1 minuto
    enableBatchQueries: true,
  },

  // Configurações para relatórios
  reports: {
    cashFlowLimit: 1000,
    cacheTTL: 300000, // 5 minutos
    enableBatchQueries: false,
  },

  // Configurações para tempo real
  realtime: {
    cacheTTL: 10000, // 10 segundos
    enableBatchQueries: false,
  },
};

/**
 * Middleware para interceptar e otimizar queries automáticamente
 */
export const createOptimizedSupabaseClient = () => {
  const originalFrom = supabase.from.bind(supabase);

  // Interceptar chamadas para adicionar otimizações
  supabase.from = ((table: string) => {
    const query = originalFrom(table);
    const originalSelect = query.select.bind(query);

    // Adicionar timeout automático
    query.select = ((...args: any[]) => {
      const result = originalSelect(...args);

      // Adicionar timeout de 10 segundos
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout: ${table}`)), 10000);
      });

      // Race entre query e timeout
      return Promise.race([result, timeoutPromise]);
    }) as any;

    return query;
  }) as any;

  console.log("🔧 [SupabaseOptimized] Cliente otimizado configurado");
  return supabase;
};

// Auto-limpeza do cache a cada 5 minutos
setInterval(
  () => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of queryCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        queryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(
        `🧹 [SupabaseOptimized] Auto-limpeza: ${cleaned} entradas expiradas removidas`
      );
    }
  },
  5 * 60 * 1000
);
