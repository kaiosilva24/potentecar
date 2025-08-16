// Sistema de Checkpoint para preservar estados importantes
import { dataManager } from './dataManager';

export interface SystemCheckpoint {
  // Métricas calculadas (que realmente existem no DataManager)
  averageTireCost: number;
  averageTireProfit: number;
  averageResaleProfit: number;
  finalProductStockBalance: number;
  
  // Estados de configuração
  costOptions: {
    includeLaborCosts: boolean;
    includeCashFlowExpenses: boolean;
    includeProductionLosses: boolean;
    includeDefectiveTireSales: boolean;
    includeWarrantyValues: boolean;
    divideByProduction: boolean;
  };
  
  // Dados do dashboard (localStorage)
  dashboardData: {
    cashBalance: number;
    totalRevenue: number;
    rawMaterialStockBalance: number;
    resaleProductStockBalance: number;
  };
  
  // Dados específicos de custo por produto (para FinalProductsStock)
  tireAnalysisData: {
    [productKey: string]: {
      costPerTire: number;
      totalRevenue: number;
      quantitySold: number;
      profit: number;
      profitMargin: number;
      timestamp: number;
    };
  };
  
  // Dados sincronizados do TireCostManager
  tireCostManagerData: {
    averageCostPerTire: number;
    totalCostPerTire: number;
    timestamp: number;
  } | null;
  
  // Metadados do checkpoint
  timestamp: number;
  version: string;
  source: string;
  lastUpdated: string;
}

export class CheckpointManager {
  private static instance: CheckpointManager;
  private readonly CHECKPOINT_KEY = 'sistemarec_checkpoint';
  private readonly CHECKPOINT_VERSION = '1.0.0';

  static getInstance(): CheckpointManager {
    if (!CheckpointManager.instance) {
      CheckpointManager.instance = new CheckpointManager();
    }
    return CheckpointManager.instance;
  }

  /**
   * Cria um checkpoint completo do sistema
   */
  async createCheckpoint(source: string = 'manual'): Promise<boolean> {
    try {
      console.log('💾 [CheckpointManager] Criando checkpoint do sistema...');
      
      // Carregar valores que existem no DataManager
      const [
        averageTireCost,
        averageTireProfit,
        averageResaleProfit,
        finalProductStockBalance
      ] = await Promise.all([
        dataManager.loadAverageTireCost(),
        dataManager.loadAverageTireProfit(),
        dataManager.loadAverageResaleProfit(),
        dataManager.loadFinalProductStockBalance()
      ]);

      // Carregar dados do dashboard do localStorage
      const dashboardData = this.loadDashboardDataFromLocalStorage();

      // Carregar opções de custo do localStorage
      const costOptionsStr = localStorage.getItem('tireCostManager_costOptions');
      const costOptions = costOptionsStr ? JSON.parse(costOptionsStr) : {
        includeLaborCosts: true,
        includeCashFlowExpenses: true,
        includeProductionLosses: true,
        includeDefectiveTireSales: false,
        includeWarrantyValues: true,
        divideByProduction: true,
      };

      // Carregar dados específicos de custo por produto (tireAnalysis_*)
      const tireAnalysisData: { [productKey: string]: any } = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tireAnalysis_')) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              tireAnalysisData[key] = JSON.parse(data);
            }
          } catch (error) {
            console.warn(`⚠️ [CheckpointManager] Erro ao carregar ${key}:`, error);
          }
        }
      }

      // Carregar dados sincronizados do TireCostManager
      let tireCostManagerData = null;
      try {
        const syncDataStr = localStorage.getItem('tireCostManager_synchronizedCostData');
        if (syncDataStr) {
          tireCostManagerData = JSON.parse(syncDataStr);
        }
      } catch (error) {
        console.warn('⚠️ [CheckpointManager] Erro ao carregar dados sincronizados do TireCostManager:', error);
      }

      const checkpoint: SystemCheckpoint = {
        // Métricas calculadas
        averageTireCost,
        averageTireProfit,
        averageResaleProfit,
        finalProductStockBalance,
        
        // Dados do dashboard
        dashboardData,
        
        // Configurações
        costOptions,
        
        // Dados específicos de custo por produto
        tireAnalysisData,
        
        // Dados sincronizados do TireCostManager
        tireCostManagerData,
        
        // Metadados
        timestamp: Date.now(),
        version: this.CHECKPOINT_VERSION,
        source,
        lastUpdated: new Date().toISOString(),
      };

      // Salvar checkpoint no localStorage
      localStorage.setItem(this.CHECKPOINT_KEY, JSON.stringify(checkpoint));
      
      // Salvar também no Supabase como backup
      await this.saveCheckpointToSupabase(checkpoint);

      console.log('✅ [CheckpointManager] Checkpoint criado com sucesso:', {
        timestamp: new Date(checkpoint.timestamp).toLocaleString('pt-BR'),
        source: checkpoint.source,
        averageTireCost: `R$ ${checkpoint.averageTireCost.toFixed(2)}`,
        averageTireProfit: `R$ ${checkpoint.averageTireProfit.toFixed(2)}`,
        averageResaleProfit: `R$ ${checkpoint.averageResaleProfit.toFixed(2)}`,
        finalProductStockBalance: `R$ ${checkpoint.finalProductStockBalance.toFixed(2)}`,
      });

      return true;
    } catch (error) {
      console.error('❌ [CheckpointManager] Erro ao criar checkpoint:', error);
      return false;
    }
  }

  /**
   * Restaura o sistema a partir do último checkpoint
   */
  async restoreFromCheckpoint(): Promise<boolean> {
    try {
      console.log('🔄 [CheckpointManager] Restaurando sistema do checkpoint...');
      
      // Tentar carregar do localStorage primeiro
      let checkpoint = this.loadCheckpointFromLocalStorage();
      
      // Se não encontrar no localStorage, tentar Supabase
      if (!checkpoint) {
        checkpoint = await this.loadCheckpointFromSupabase();
      }

      if (!checkpoint) {
        console.warn('⚠️ [CheckpointManager] Nenhum checkpoint encontrado');
        return false;
      }

      console.log('📋 [CheckpointManager] Checkpoint encontrado:', {
        timestamp: new Date(checkpoint.timestamp).toLocaleString('pt-BR'),
        source: checkpoint.source,
        version: checkpoint.version,
      });

      // Restaurar valores no Supabase (apenas os que existem)
      const restorePromises = [
        dataManager.saveAverageTireCost(checkpoint.averageTireCost),
        dataManager.saveAverageTireProfit(checkpoint.averageTireProfit),
        dataManager.saveAverageResaleProfit(checkpoint.averageResaleProfit),
        dataManager.saveFinalProductStockBalance(checkpoint.finalProductStockBalance),
      ];

      const results = await Promise.all(restorePromises);
      const successCount = results.filter(Boolean).length;

      // Restaurar dados do dashboard no localStorage
      this.saveDashboardDataToLocalStorage(checkpoint.dashboardData);

      // Restaurar opções de custo no localStorage
      localStorage.setItem('tireCostManager_costOptions', JSON.stringify(checkpoint.costOptions));

      // Restaurar dados específicos de custo por produto
      let tireAnalysisRestored = 0;
      if (checkpoint.tireAnalysisData) {
        Object.entries(checkpoint.tireAnalysisData).forEach(([key, data]) => {
          try {
            localStorage.setItem(key, JSON.stringify(data));
            tireAnalysisRestored++;
          } catch (error) {
            console.warn(`⚠️ [CheckpointManager] Erro ao restaurar ${key}:`, error);
          }
        });
      }

      // Restaurar dados sincronizados do TireCostManager
      if (checkpoint.tireCostManagerData) {
        try {
          localStorage.setItem('tireCostManager_synchronizedCostData', JSON.stringify(checkpoint.tireCostManagerData));
          console.log('✅ [CheckpointManager] Dados sincronizados do TireCostManager restaurados');
        } catch (error) {
          console.warn('⚠️ [CheckpointManager] Erro ao restaurar dados sincronizados do TireCostManager:', error);
        }
      }

      console.log(`✅ [CheckpointManager] Checkpoint restaurado com sucesso: ${successCount}/${results.length} valores`, {
        averageTireCost: `R$ ${checkpoint.averageTireCost.toFixed(2)}`,
        averageTireProfit: `R$ ${checkpoint.averageTireProfit.toFixed(2)}`,
        averageResaleProfit: `R$ ${checkpoint.averageResaleProfit.toFixed(2)}`,
        finalProductStockBalance: `R$ ${checkpoint.finalProductStockBalance.toFixed(2)}`,
        dashboardData: checkpoint.dashboardData,
        tireAnalysisRestored: `${tireAnalysisRestored} produtos`,
        tireCostManagerData: checkpoint.tireCostManagerData ? 'Restaurado' : 'N/A',
      });

      // Disparar eventos para notificar componentes sobre a restauração
      this.dispatchRestoreEvents(checkpoint);

      return successCount > 0;
    } catch (error) {
      console.error('❌ [CheckpointManager] Erro ao restaurar checkpoint:', error);
      return false;
    }
  }

  /**
   * Carrega dados do dashboard do localStorage
   */
  private loadDashboardDataFromLocalStorage(): {
    cashBalance: number;
    totalRevenue: number;
    rawMaterialStockBalance: number;
    resaleProductStockBalance: number;
  } {
    try {
      // Carregar cada valor individualmente do localStorage
      const cashBalanceStr = localStorage.getItem('dashboard_cashBalance');
      const totalRevenueStr = localStorage.getItem('dashboard_totalRevenue');
      const rawMaterialStr = localStorage.getItem('dashboard_rawMaterialStockBalance');
      const resaleProductStr = localStorage.getItem('dashboard_resaleProductStockBalance');

      const cashBalance = cashBalanceStr ? JSON.parse(cashBalanceStr).value || 0 : 0;
      const totalRevenue = totalRevenueStr ? JSON.parse(totalRevenueStr).value || 0 : 0;
      const rawMaterialStockBalance = rawMaterialStr ? JSON.parse(rawMaterialStr).value || 0 : 0;
      const resaleProductStockBalance = resaleProductStr ? JSON.parse(resaleProductStr).value || 0 : 0;

      return {
        cashBalance,
        totalRevenue,
        rawMaterialStockBalance,
        resaleProductStockBalance,
      };
    } catch (error) {
      console.error('❌ [CheckpointManager] Erro ao carregar dados do dashboard:', error);
      return {
        cashBalance: 0,
        totalRevenue: 0,
        rawMaterialStockBalance: 0,
        resaleProductStockBalance: 0,
      };
    }
  }

  /**
   * Salva dados do dashboard no localStorage
   */
  private saveDashboardDataToLocalStorage(dashboardData: {
    cashBalance: number;
    totalRevenue: number;
    rawMaterialStockBalance: number;
    resaleProductStockBalance: number;
  }): void {
    try {
      // Salvar cada valor individualmente no localStorage
      localStorage.setItem('dashboard_cashBalance', JSON.stringify({
        value: dashboardData.cashBalance,
        timestamp: Date.now(),
        source: 'CheckpointRestore'
      }));

      localStorage.setItem('dashboard_totalRevenue', JSON.stringify({
        value: dashboardData.totalRevenue,
        timestamp: Date.now(),
        source: 'CheckpointRestore'
      }));

      localStorage.setItem('dashboard_rawMaterialStockBalance', JSON.stringify({
        value: dashboardData.rawMaterialStockBalance,
        timestamp: Date.now(),
        source: 'CheckpointRestore'
      }));

      localStorage.setItem('dashboard_resaleProductStockBalance', JSON.stringify({
        value: dashboardData.resaleProductStockBalance,
        timestamp: Date.now(),
        source: 'CheckpointRestore'
      }));

      console.log('💾 [CheckpointManager] Dados do dashboard salvos no localStorage');
    } catch (error) {
      console.error('❌ [CheckpointManager] Erro ao salvar dados do dashboard:', error);
    }
  }

  /**
   * Carrega checkpoint do localStorage
   */
  private loadCheckpointFromLocalStorage(): SystemCheckpoint | null {
    try {
      const checkpointStr = localStorage.getItem(this.CHECKPOINT_KEY);
      if (!checkpointStr) return null;

      const checkpoint = JSON.parse(checkpointStr) as SystemCheckpoint;
      
      // Validar estrutura básica
      if (!checkpoint.timestamp || !checkpoint.version) {
        console.warn('⚠️ [CheckpointManager] Checkpoint inválido no localStorage');
        return null;
      }

      console.log('📱 [CheckpointManager] Checkpoint carregado do localStorage');
      return checkpoint;
    } catch (error) {
      console.error('❌ [CheckpointManager] Erro ao carregar checkpoint do localStorage:', error);
      return null;
    }
  }

  /**
   * Salva checkpoint no Supabase
   */
  private async saveCheckpointToSupabase(checkpoint: SystemCheckpoint): Promise<boolean> {
    try {
      const success = await dataManager.saveSystemSetting('system_checkpoint', JSON.stringify(checkpoint));
      if (success) {
        console.log('☁️ [CheckpointManager] Checkpoint salvo no Supabase');
      }
      return success;
    } catch (error) {
      console.error('❌ [CheckpointManager] Erro ao salvar checkpoint no Supabase:', error);
      return false;
    }
  }

  /**
   * Carrega checkpoint do Supabase
   */
  private async loadCheckpointFromSupabase(): Promise<SystemCheckpoint | null> {
    try {
      const checkpointStr = await dataManager.loadSystemSetting('system_checkpoint');
      if (!checkpointStr) return null;

      const checkpoint = JSON.parse(checkpointStr) as SystemCheckpoint;
      console.log('☁️ [CheckpointManager] Checkpoint carregado do Supabase');
      return checkpoint;
    } catch (error) {
      console.error('❌ [CheckpointManager] Erro ao carregar checkpoint do Supabase:', error);
      return null;
    }
  }

  /**
   * Dispara eventos customizados para notificar componentes sobre a restauração
   */
  private dispatchRestoreEvents(checkpoint: SystemCheckpoint): void {
    // Evento geral de restauração
    window.dispatchEvent(new CustomEvent('systemRestored', {
      detail: {
        timestamp: checkpoint.timestamp,
        source: checkpoint.source,
        version: checkpoint.version,
      }
    }));

    // Eventos específicos para cada métrica
    window.dispatchEvent(new CustomEvent('cashBalanceUpdated', {
      detail: { balance: checkpoint.dashboardData.cashBalance, source: 'CheckpointRestore' }
    }));

    window.dispatchEvent(new CustomEvent('totalRevenueUpdated', {
      detail: { revenue: checkpoint.dashboardData.totalRevenue, source: 'CheckpointRestore' }
    }));

    window.dispatchEvent(new CustomEvent('finalProductStockUpdated', {
      detail: { balance: checkpoint.finalProductStockBalance, source: 'CheckpointRestore' }
    }));

    window.dispatchEvent(new CustomEvent('tireCostUpdated', {
      detail: { averageCostPerTire: checkpoint.averageTireCost, source: 'CheckpointRestore' }
    }));

    window.dispatchEvent(new CustomEvent('tireProfitUpdated', {
      detail: { profit: checkpoint.averageTireProfit, source: 'CheckpointRestore' }
    }));

    window.dispatchEvent(new CustomEvent('resaleProfitUpdated', {
      detail: { profit: checkpoint.averageResaleProfit, source: 'CheckpointRestore' }
    }));

    window.dispatchEvent(new CustomEvent('resaleProductStockUpdated', {
      detail: { balance: checkpoint.dashboardData.resaleProductStockBalance, source: 'CheckpointRestore' }
    }));

    window.dispatchEvent(new CustomEvent('rawMaterialStockUpdated', {
      detail: { balance: checkpoint.dashboardData.rawMaterialStockBalance, source: 'CheckpointRestore' }
    }));

    // Eventos específicos para dados de custo de pneus
    if (checkpoint.tireAnalysisData && Object.keys(checkpoint.tireAnalysisData).length > 0) {
      window.dispatchEvent(new CustomEvent('tireAnalysisDataRestored', {
        detail: { 
          count: Object.keys(checkpoint.tireAnalysisData).length,
          products: Object.keys(checkpoint.tireAnalysisData),
          source: 'CheckpointRestore' 
        }
      }));
    }

    if (checkpoint.tireCostManagerData) {
      window.dispatchEvent(new CustomEvent('tireCostManagerDataRestored', {
        detail: { 
          data: checkpoint.tireCostManagerData,
          source: 'CheckpointRestore' 
        }
      }));
    }

    // Evento geral para forçar atualização de custos
    window.dispatchEvent(new CustomEvent('forceCostDataUpdate', {
      detail: { 
        timestamp: Date.now(),
        source: 'CheckpointRestore' 
      }
    }));

    console.log('📡 [CheckpointManager] Eventos de restauração disparados');
  }



  /**
   * Obtém informações do último checkpoint
   */
  getCheckpointInfo(): { exists: boolean; timestamp?: number; source?: string; age?: string } {
    const checkpoint = this.loadCheckpointFromLocalStorage();
    
    if (!checkpoint) {
      return { exists: false };
    }

    const ageMs = Date.now() - checkpoint.timestamp;
    const ageMinutes = Math.floor(ageMs / (1000 * 60));
    const ageHours = Math.floor(ageMinutes / 60);
    const ageDays = Math.floor(ageHours / 24);

    let age: string;
    if (ageDays > 0) {
      age = `${ageDays} dia(s)`;
    } else if (ageHours > 0) {
      age = `${ageHours} hora(s)`;
    } else {
      age = `${ageMinutes} minuto(s)`;
    }

    return {
      exists: true,
      timestamp: checkpoint.timestamp,
      source: checkpoint.source,
      age,
    };
  }

  /**
   * Remove checkpoint existente
   */
  clearCheckpoint(): boolean {
    try {
      localStorage.removeItem(this.CHECKPOINT_KEY);
      console.log('🗑️ [CheckpointManager] Checkpoint removido');
      return true;
    } catch (error) {
      console.error('❌ [CheckpointManager] Erro ao remover checkpoint:', error);
      return false;
    }
  }
}

// Export singleton instance
export const checkpointManager = CheckpointManager.getInstance();
