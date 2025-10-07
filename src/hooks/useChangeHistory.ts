// Hook para gerenciar histórico de alterações
import { useState, useEffect, useCallback } from "react";
import {
  changeHistoryManager,
  ChangeHistoryEntry,
  HistorySnapshot,
} from "../utils/changeHistoryManager";

export interface UseChangeHistoryReturn {
  // Estados
  history: HistorySnapshot[];
  isLoading: boolean;
  stats: {
    totalEntries: number;
    currentPosition: number;
    canUndo: boolean;
    canRedo: boolean;
    undoCount: number;
    redoCount: number;
  };

  // Ações
  loadHistory: () => Promise<void>;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  clearOldHistory: (daysToKeep?: number) => Promise<void>;
  recordChange: (
    operation: "CREATE" | "UPDATE" | "DELETE",
    tableName: string,
    recordId: string,
    oldData?: any,
    newData?: any,
    description?: string
  ) => Promise<void>;

  // Utilitários
  refreshStats: () => void;
  canPerformUndo: boolean;
  canPerformRedo: boolean;
}

export const useChangeHistory = (): UseChangeHistoryReturn => {
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEntries: 0,
    currentPosition: 0,
    canUndo: false,
    canRedo: false,
    undoCount: 0,
    redoCount: 0,
  });

  // Carregar histórico
  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const historyData = await changeHistoryManager.getHistoryForDisplay(50);
      setHistory(historyData);
      refreshStats();
    } catch (error) {
      console.error("❌ [useChangeHistory] Erro ao carregar histórico:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Atualizar estatísticas
  const refreshStats = useCallback(() => {
    const newStats = changeHistoryManager.getHistoryStats();
    setStats(newStats);
  }, []);

  // Desfazer alteração
  const undo = useCallback(async (): Promise<boolean> => {
    try {
      const success = await changeHistoryManager.undo();
      if (success) {
        await loadHistory(); // Recarregar histórico
        refreshStats();
      }
      return success;
    } catch (error) {
      console.error("❌ [useChangeHistory] Erro ao desfazer:", error);
      return false;
    }
  }, [loadHistory, refreshStats]);

  // Refazer alteração
  const redo = useCallback(async (): Promise<boolean> => {
    try {
      const success = await changeHistoryManager.redo();
      if (success) {
        await loadHistory(); // Recarregar histórico
        refreshStats();
      }
      return success;
    } catch (error) {
      console.error("❌ [useChangeHistory] Erro ao refazer:", error);
      return false;
    }
  }, [loadHistory, refreshStats]);

  // Limpar histórico antigo
  const clearOldHistory = useCallback(
    async (daysToKeep: number = 30): Promise<void> => {
      try {
        await changeHistoryManager.clearOldHistory(daysToKeep);
        await loadHistory(); // Recarregar histórico
        refreshStats();
      } catch (error) {
        console.error("❌ [useChangeHistory] Erro ao limpar histórico:", error);
        throw error;
      }
    },
    [loadHistory, refreshStats]
  );

  // Registrar alteração
  const recordChange = useCallback(
    async (
      operation: "CREATE" | "UPDATE" | "DELETE",
      tableName: string,
      recordId: string,
      oldData?: any,
      newData?: any,
      description?: string
    ): Promise<void> => {
      try {
        await changeHistoryManager.recordChange(
          operation,
          tableName,
          recordId,
          oldData,
          newData,
          description || `${operation} em ${tableName}`
        );
        await loadHistory(); // Recarregar histórico
        refreshStats();
      } catch (error) {
        console.error(
          "❌ [useChangeHistory] Erro ao registrar alteração:",
          error
        );
        throw error;
      }
    },
    [loadHistory, refreshStats]
  );

  // Carregar histórico inicial
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Computar propriedades derivadas
  const canPerformUndo = stats.canUndo;
  const canPerformRedo = stats.canRedo;

  return {
    // Estados
    history,
    isLoading,
    stats,

    // Ações
    loadHistory,
    undo,
    redo,
    clearOldHistory,
    recordChange,

    // Utilitários
    refreshStats,
    canPerformUndo,
    canPerformRedo,
  };
};

// Hook simplificado para apenas verificar se pode desfazer/refazer
export const useChangeHistoryStatus = () => {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);

  const updateStatus = useCallback(() => {
    const stats = changeHistoryManager.getHistoryStats();
    setCanUndo(stats.canUndo);
    setCanRedo(stats.canRedo);
    setTotalEntries(stats.totalEntries);
  }, []);

  useEffect(() => {
    updateStatus();

    // Atualizar status periodicamente
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, [updateStatus]);

  return {
    canUndo,
    canRedo,
    totalEntries,
    updateStatus,
  };
};

export default useChangeHistory;
