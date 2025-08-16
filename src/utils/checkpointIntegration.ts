// Exemplo de integração do CheckpointManager na aplicação
import { CheckpointManager } from './checkpointManager';

/**
 * Classe para gerenciar a integração do sistema de checkpoint
 * na aplicação React
 */
export class CheckpointIntegration {
  private static instance: CheckpointIntegration;
  private checkpointManager: CheckpointManager;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.checkpointManager = CheckpointManager.getInstance();
  }

  static getInstance(): CheckpointIntegration {
    if (!CheckpointIntegration.instance) {
      CheckpointIntegration.instance = new CheckpointIntegration();
    }
    return CheckpointIntegration.instance;
  }

  /**
   * Inicializa o sistema de checkpoint na aplicação
   * Deve ser chamado no App.tsx ou no componente principal
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 [CheckpointIntegration] Inicializando sistema de checkpoint...');
      
      // Restaurar estado do último checkpoint
      await this.restoreFromLastCheckpoint();
      
      // Configurar salvamento automático
      this.setupAutoSave();
      
      // Configurar listeners para eventos importantes
      this.setupEventListeners();
      
      console.log('✅ [CheckpointIntegration] Sistema de checkpoint inicializado com sucesso');
    } catch (error) {
      console.error('❌ [CheckpointIntegration] Erro ao inicializar sistema de checkpoint:', error);
    }
  }

  /**
   * Restaura o estado do último checkpoint disponível
   */
  private async restoreFromLastCheckpoint(): Promise<void> {
    const checkpointInfo = this.checkpointManager.getCheckpointInfo();
    
    if (checkpointInfo.exists) {
      console.log(`📥 [CheckpointIntegration] Checkpoint encontrado (${checkpointInfo.age})`);
      
      // Perguntar ao usuário se deseja restaurar (opcional)
      const shouldRestore = await this.askUserToRestore(checkpointInfo);
      
      if (shouldRestore) {
        await this.checkpointManager.restoreFromCheckpoint();
        console.log('✅ [CheckpointIntegration] Estado restaurado do checkpoint');
      }
    } else {
      console.log('ℹ️ [CheckpointIntegration] Nenhum checkpoint encontrado');
    }
  }

  /**
   * Pergunta ao usuário se deseja restaurar o checkpoint
   * (implementação opcional - pode ser automático)
   */
  private async askUserToRestore(checkpointInfo: any): Promise<boolean> {
    // Por enquanto, sempre restaurar automaticamente
    // Em uma implementação real, você pode mostrar um modal/toast
    return true;
    
    // Exemplo de implementação com confirmação:
    // return window.confirm(
    //   `Encontrado checkpoint de ${checkpointInfo.age}. Deseja restaurar o estado anterior?`
    // );
  }

  /**
   * Configura o salvamento automático de checkpoints
   */
  private setupAutoSave(): void {
    // Salvar checkpoint a cada 5 minutos
    this.autoSaveInterval = setInterval(async () => {
      try {
        await this.checkpointManager.createCheckpoint();
        console.log('💾 [CheckpointIntegration] Checkpoint automático criado');
      } catch (error) {
        console.error('❌ [CheckpointIntegration] Erro no checkpoint automático:', error);
      }
    }, 5 * 60 * 1000); // 5 minutos
  }

  /**
   * Configura listeners para eventos importantes que devem
   * disparar a criação de checkpoints
   */
  private setupEventListeners(): void {
    // Eventos que indicam mudanças importantes no estado
    const importantEvents = [
      'tireCostUpdated',
      'finalProductStockUpdated',
      'cashBalanceUpdated',
      'totalRevenueUpdated'
    ];

    // Debounce para evitar muitos checkpoints seguidos
    let debounceTimer: NodeJS.Timeout | null = null;

    const handleImportantEvent = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(async () => {
        try {
          await this.checkpointManager.createCheckpoint();
          console.log('💾 [CheckpointIntegration] Checkpoint criado por evento importante');
        } catch (error) {
          console.error('❌ [CheckpointIntegration] Erro ao criar checkpoint por evento:', error);
        }
      }, 2000); // Aguarda 2 segundos após o último evento
    };

    // Adicionar listeners
    importantEvents.forEach(eventName => {
      window.addEventListener(eventName, handleImportantEvent);
    });

    // Salvar checkpoint antes de fechar a página
    window.addEventListener('beforeunload', async () => {
      try {
        await this.checkpointManager.createCheckpoint();
        console.log('💾 [CheckpointIntegration] Checkpoint criado antes de fechar');
      } catch (error) {
        console.error('❌ [CheckpointIntegration] Erro ao criar checkpoint final:', error);
      }
    });
  }

  /**
   * Cria um checkpoint manualmente
   */
  async createManualCheckpoint(): Promise<void> {
    try {
      await this.checkpointManager.createCheckpoint();
      console.log('💾 [CheckpointIntegration] Checkpoint manual criado');
    } catch (error) {
      console.error('❌ [CheckpointIntegration] Erro ao criar checkpoint manual:', error);
      throw error;
    }
  }

  /**
   * Restaura do checkpoint manualmente
   */
  async restoreManually(): Promise<void> {
    try {
      await this.checkpointManager.restoreFromCheckpoint();
      console.log('📥 [CheckpointIntegration] Restauração manual concluída');
    } catch (error) {
      console.error('❌ [CheckpointIntegration] Erro na restauração manual:', error);
      throw error;
    }
  }

  /**
   * Obtém informações do checkpoint atual
   */
  getCheckpointStatus(): any {
    return this.checkpointManager.getCheckpointInfo();
  }

  /**
   * Limpa recursos e para o salvamento automático
   */
  cleanup(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    console.log('🧹 [CheckpointIntegration] Recursos limpos');
  }
}

// Hook React para usar o sistema de checkpoint
export const useCheckpoint = () => {
  const integration = CheckpointIntegration.getInstance();

  return {
    createCheckpoint: () => integration.createManualCheckpoint(),
    restoreCheckpoint: () => integration.restoreManually(),
    getStatus: () => integration.getCheckpointStatus(),
  };
};
