// Sistema de histórico de alterações para desfazer/refazer mudanças
import { supabase } from "../../supabase/supabase";

export interface ChangeHistoryEntry {
  id?: string;
  operation_type: 'CREATE' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  old_data?: any;
  new_data?: any;
  user_id?: string;
  description: string;
  timestamp: string;
  created_at?: string;
  updated_at?: string;
}

export interface HistorySnapshot {
  id: string;
  timestamp: string;
  description: string;
  changes: ChangeHistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
}

export class ChangeHistoryManager {
  private static instance: ChangeHistoryManager;
  private currentPosition: number = -1;
  private historyStack: ChangeHistoryEntry[] = [];
  private maxHistorySize: number = 100;

  static getInstance(): ChangeHistoryManager {
    if (!ChangeHistoryManager.instance) {
      ChangeHistoryManager.instance = new ChangeHistoryManager();
    }
    return ChangeHistoryManager.instance;
  }

  // Registrar uma alteração no histórico
  async recordChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    tableName: string,
    recordId: string,
    oldData: any = null,
    newData: any = null,
    description: string
  ): Promise<void> {
    try {
      const changeEntry: ChangeHistoryEntry = {
        operation_type: operation,
        table_name: tableName,
        record_id: recordId,
        old_data: oldData,
        new_data: newData,
        description,
        timestamp: new Date().toISOString(),
      };

      // Salvar no banco de dados
      const { data, error } = await supabase
        .from('change_history')
        .insert([changeEntry])
        .select()
        .single();

      if (error) {
        console.error('❌ [ChangeHistoryManager] Erro ao salvar histórico:', error);
        throw error;
      }

      // Adicionar ao stack local
      this.addToStack(data);

      console.log('✅ [ChangeHistoryManager] Alteração registrada:', {
        operation,
        tableName,
        recordId,
        description
      });

    } catch (error) {
      console.error('❌ [ChangeHistoryManager] Erro ao registrar alteração:', error);
      throw error;
    }
  }

  // Adicionar ao stack local
  private addToStack(entry: ChangeHistoryEntry): void {
    // Remove entradas futuras se estamos no meio do histórico
    if (this.currentPosition < this.historyStack.length - 1) {
      this.historyStack = this.historyStack.slice(0, this.currentPosition + 1);
    }

    // Adiciona nova entrada
    this.historyStack.push(entry);
    this.currentPosition = this.historyStack.length - 1;

    // Limita o tamanho do histórico
    if (this.historyStack.length > this.maxHistorySize) {
      this.historyStack = this.historyStack.slice(-this.maxHistorySize);
      this.currentPosition = this.historyStack.length - 1;
    }
  }

  // Desfazer última alteração
  async undo(): Promise<boolean> {
    if (!this.canUndo()) {
      console.log('🚫 [ChangeHistoryManager] Não há alterações para desfazer');
      return false;
    }

    try {
      const currentEntry = this.historyStack[this.currentPosition];
      console.log('🔄 [ChangeHistoryManager] Desfazendo alteração:', currentEntry);

      const success = await this.revertChange(currentEntry);
      
      if (success) {
        this.currentPosition--;
        console.log('✅ [ChangeHistoryManager] Alteração desfeita com sucesso');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [ChangeHistoryManager] Erro ao desfazer alteração:', error);
      return false;
    }
  }

  // Refazer próxima alteração
  async redo(): Promise<boolean> {
    if (!this.canRedo()) {
      console.log('🚫 [ChangeHistoryManager] Não há alterações para refazer');
      return false;
    }

    try {
      this.currentPosition++;
      const nextEntry = this.historyStack[this.currentPosition];
      console.log('🔄 [ChangeHistoryManager] Refazendo alteração:', nextEntry);

      const success = await this.applyChange(nextEntry);
      
      if (success) {
        console.log('✅ [ChangeHistoryManager] Alteração refeita com sucesso');
        return true;
      } else {
        this.currentPosition--; // Volta posição se falhou
      }

      return success;
    } catch (error) {
      console.error('❌ [ChangeHistoryManager] Erro ao refazer alteração:', error);
      this.currentPosition--; // Volta posição se deu erro
      return false;
    }
  }

  // Reverter uma alteração específica
  private async revertChange(entry: ChangeHistoryEntry): Promise<boolean> {
    try {
      switch (entry.operation_type) {
        case 'CREATE':
          // Se foi criado, deletar
          const { error: deleteError } = await supabase
            .from(entry.table_name)
            .delete()
            .eq('id', entry.record_id);
          
          if (deleteError) throw deleteError;
          break;

        case 'UPDATE':
          // Se foi atualizado, restaurar dados antigos
          if (!entry.old_data) {
            console.error('❌ [ChangeHistoryManager] Dados antigos não encontrados para reversão');
            return false;
          }

          const { error: updateError } = await supabase
            .from(entry.table_name)
            .update(entry.old_data)
            .eq('id', entry.record_id);
          
          if (updateError) throw updateError;
          break;

        case 'DELETE':
          // Se foi deletado, recriar
          if (!entry.old_data) {
            console.error('❌ [ChangeHistoryManager] Dados antigos não encontrados para recriação');
            return false;
          }

          const { error: insertError } = await supabase
            .from(entry.table_name)
            .insert([{ ...entry.old_data, id: entry.record_id }]);
          
          if (insertError) throw insertError;
          break;

        default:
          console.error('❌ [ChangeHistoryManager] Tipo de operação desconhecido:', entry.operation_type);
          return false;
      }

      return true;
    } catch (error) {
      console.error('❌ [ChangeHistoryManager] Erro ao reverter alteração:', error);
      return false;
    }
  }

  // Aplicar uma alteração específica
  private async applyChange(entry: ChangeHistoryEntry): Promise<boolean> {
    try {
      switch (entry.operation_type) {
        case 'CREATE':
          // Recriar o registro
          if (!entry.new_data) {
            console.error('❌ [ChangeHistoryManager] Novos dados não encontrados para criação');
            return false;
          }

          const { error: insertError } = await supabase
            .from(entry.table_name)
            .insert([{ ...entry.new_data, id: entry.record_id }]);
          
          if (insertError) throw insertError;
          break;

        case 'UPDATE':
          // Aplicar novos dados
          if (!entry.new_data) {
            console.error('❌ [ChangeHistoryManager] Novos dados não encontrados para atualização');
            return false;
          }

          const { error: updateError } = await supabase
            .from(entry.table_name)
            .update(entry.new_data)
            .eq('id', entry.record_id);
          
          if (updateError) throw updateError;
          break;

        case 'DELETE':
          // Deletar novamente
          const { error: deleteError } = await supabase
            .from(entry.table_name)
            .delete()
            .eq('id', entry.record_id);
          
          if (deleteError) throw deleteError;
          break;

        default:
          console.error('❌ [ChangeHistoryManager] Tipo de operação desconhecido:', entry.operation_type);
          return false;
      }

      return true;
    } catch (error) {
      console.error('❌ [ChangeHistoryManager] Erro ao aplicar alteração:', error);
      return false;
    }
  }

  // Verificar se pode desfazer
  canUndo(): boolean {
    return this.currentPosition >= 0;
  }

  // Verificar se pode refazer
  canRedo(): boolean {
    return this.currentPosition < this.historyStack.length - 1;
  }

  // Carregar histórico do banco de dados
  async loadHistory(limit: number = 50): Promise<ChangeHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('change_history')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ [ChangeHistoryManager] Erro ao carregar histórico:', error);
        throw error;
      }

      // Atualizar stack local
      this.historyStack = data.reverse(); // Reverter para ordem cronológica
      this.currentPosition = this.historyStack.length - 1;

      console.log('✅ [ChangeHistoryManager] Histórico carregado:', data.length, 'entradas');
      return data;
    } catch (error) {
      console.error('❌ [ChangeHistoryManager] Erro ao carregar histórico:', error);
      return [];
    }
  }

  // Obter histórico formatado para exibição
  async getHistoryForDisplay(limit: number = 20): Promise<HistorySnapshot[]> {
    try {
      const history = await this.loadHistory(limit);
      
      return history.map((entry, index) => ({
        id: entry.id || `temp_${index}`,
        timestamp: entry.timestamp,
        description: entry.description,
        changes: [entry],
        canUndo: index <= this.currentPosition,
        canRedo: index > this.currentPosition
      }));
    } catch (error) {
      console.error('❌ [ChangeHistoryManager] Erro ao formatar histórico:', error);
      return [];
    }
  }

  // Limpar histórico antigo
  async clearOldHistory(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { error } = await supabase
        .from('change_history')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        console.error('❌ [ChangeHistoryManager] Erro ao limpar histórico antigo:', error);
        throw error;
      }

      console.log('✅ [ChangeHistoryManager] Histórico antigo limpo');
    } catch (error) {
      console.error('❌ [ChangeHistoryManager] Erro ao limpar histórico:', error);
    }
  }

  // Obter estatísticas do histórico
  getHistoryStats(): {
    totalEntries: number;
    currentPosition: number;
    canUndo: boolean;
    canRedo: boolean;
    undoCount: number;
    redoCount: number;
  } {
    return {
      totalEntries: this.historyStack.length,
      currentPosition: this.currentPosition,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.currentPosition + 1,
      redoCount: this.historyStack.length - this.currentPosition - 1
    };
  }
}

// Instância singleton
export const changeHistoryManager = ChangeHistoryManager.getInstance();
