// Wrapper do DataManager que integra o sistema de histórico de alterações
import { dataManager } from "./dataManager";
import { changeHistoryManager } from "./changeHistoryManager";

export class DataManagerWithHistory {
  private static instance: DataManagerWithHistory;

  static getInstance(): DataManagerWithHistory {
    if (!DataManagerWithHistory.instance) {
      DataManagerWithHistory.instance = new DataManagerWithHistory();
    }
    return DataManagerWithHistory.instance;
  }

  // Wrapper para saveToDatabase com histórico
  async saveToDatabase<T extends { id?: string; created_at?: string; updated_at?: string; last_updated?: string }>(
    tableName: string,
    data: T,
    description?: string
  ): Promise<T | null> {
    try {
      // Determinar se é CREATE ou UPDATE
      const isUpdate = data.id && !data.id.startsWith("temp_");
      let oldData = null;

      // Se for UPDATE, buscar dados antigos primeiro
      if (isUpdate) {
        try {
          const { data: existingData, error } = await dataManager.supabase
            .from(tableName)
            .select('*')
            .eq('id', data.id)
            .single();

          if (!error && existingData) {
            oldData = existingData;
          }
        } catch (error) {
          console.warn('⚠️ [DataManagerWithHistory] Não foi possível buscar dados antigos:', error);
        }
      }

      // Executar a operação original
      const result = await dataManager.saveToDatabase(tableName, data);

      if (result) {
        // Registrar no histórico
        const operation = isUpdate ? 'UPDATE' : 'CREATE';
        const recordId = result.id || data.id || 'unknown';
        const autoDescription = this.generateAutoDescription(operation, tableName, data);
        
        await changeHistoryManager.recordChange(
          operation,
          tableName,
          recordId,
          oldData,
          result,
          description || autoDescription
        );

        console.log(`✅ [DataManagerWithHistory] ${operation} registrado no histórico:`, {
          tableName,
          recordId,
          description: description || autoDescription
        });
      }

      return result;
    } catch (error) {
      console.error('❌ [DataManagerWithHistory] Erro ao salvar com histórico:', error);
      throw error;
    }
  }

  // Wrapper para deleteFromDatabase com histórico
  async deleteFromDatabase(
    tableName: string,
    id: string,
    description?: string
  ): Promise<boolean> {
    try {
      // Buscar dados antes de deletar
      let oldData = null;
      try {
        const { data: existingData, error } = await dataManager.supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();

        if (!error && existingData) {
          oldData = existingData;
        }
      } catch (error) {
        console.warn('⚠️ [DataManagerWithHistory] Não foi possível buscar dados antes da exclusão:', error);
      }

      // Executar a exclusão
      const { error } = await dataManager.supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`❌ [DataManagerWithHistory] Erro ao deletar de ${tableName}:`, error);
        return false;
      }

      // Registrar no histórico
      const autoDescription = this.generateAutoDescription('DELETE', tableName, { id });
      
      await changeHistoryManager.recordChange(
        'DELETE',
        tableName,
        id,
        oldData,
        null,
        description || autoDescription
      );

      console.log(`✅ [DataManagerWithHistory] DELETE registrado no histórico:`, {
        tableName,
        recordId: id,
        description: description || autoDescription
      });

      return true;
    } catch (error) {
      console.error('❌ [DataManagerWithHistory] Erro ao deletar com histórico:', error);
      return false;
    }
  }

  // Gerar descrição automática baseada na operação
  private generateAutoDescription(operation: string, tableName: string, data: any): string {
    const tableNames: { [key: string]: string } = {
      'clients': 'Cliente',
      'products': 'Produto',
      'services': 'Serviço',
      'transactions': 'Transação',
      'tire_inventory': 'Estoque de Pneus',
      'service_items': 'Item de Serviço',
      'system_settings': 'Configuração do Sistema',
      'cash_flow': 'Fluxo de Caixa',
      'expenses': 'Despesa',
      'debts': 'Dívida',
      'stock_items': 'Item de Estoque',
      'production_entries': 'Entrada de Produção',
      'raw_materials': 'Matéria-Prima',
      'resale_products': 'Produto de Revenda',
      'business_value_history': 'Histórico de Valor Empresarial',
      'tire_cost_history': 'Histórico de Custo de Pneu',
    };

    const tableFriendlyName = tableNames[tableName] || tableName;
    
    // Tentar extrair um identificador do registro
    let identifier = '';
    if (data.name) identifier = data.name;
    else if (data.description) identifier = data.description;
    else if (data.product_name) identifier = data.product_name;
    else if (data.client_name) identifier = data.client_name;
    else if (data.title) identifier = data.title;
    else if (data.id) identifier = `ID: ${data.id}`;

    switch (operation) {
      case 'CREATE':
        return `${tableFriendlyName} criado${identifier ? `: ${identifier}` : ''}`;
      case 'UPDATE':
        return `${tableFriendlyName} atualizado${identifier ? `: ${identifier}` : ''}`;
      case 'DELETE':
        return `${tableFriendlyName} excluído${identifier ? `: ${identifier}` : ''}`;
      default:
        return `Operação ${operation} em ${tableFriendlyName}${identifier ? `: ${identifier}` : ''}`;
    }
  }

  // Métodos proxy para manter compatibilidade com o dataManager original
  get supabase() {
    return dataManager.supabase;
  }

  // Proxy para todos os outros métodos do dataManager
  async loadClients() { return dataManager.loadClients(); }
  async loadProducts() { return dataManager.loadProducts(); }
  async loadServices() { return dataManager.loadServices(); }
  async loadTransactions() { return dataManager.loadTransactions(); }
  async loadStockItems() { return dataManager.loadStockItems(); }
  async loadCashFlowEntries() { return dataManager.loadCashFlowEntries(); }
  async loadExpenses() { return dataManager.loadExpenses(); }
  async loadDebts() { return dataManager.loadDebts(); }
  async loadResaleProducts() { return dataManager.loadResaleProducts(); }
  async loadBusinessValue() { return dataManager.loadBusinessValue(); }
  async saveBusinessValue(value: number) { return dataManager.saveBusinessValue(value); }
  async loadAverageTireCost() { return dataManager.loadAverageTireCost(); }
  async saveAverageTireCost(cost: number) { return dataManager.saveAverageTireCost(cost); }
  async loadSystemSetting(key: string) { return dataManager.loadSystemSetting(key); }
  async saveSystemSetting(key: string, value: any) { return dataManager.saveSystemSetting(key, value); }
  async exportDatabase() { return dataManager.exportDatabase(); }
  async importDatabase(data: string) { return dataManager.importDatabase(data); }
  generateBackupFileName() { return dataManager.generateBackupFileName(); }

  // Métodos específicos com histórico para operações críticas
  async saveClient(client: any, description?: string) {
    return this.saveToDatabase('clients', client, description);
  }

  async saveProduct(product: any, description?: string) {
    return this.saveToDatabase('products', product, description);
  }

  async saveService(service: any, description?: string) {
    return this.saveToDatabase('services', service, description);
  }

  async saveTransaction(transaction: any, description?: string) {
    return this.saveToDatabase('transactions', transaction, description);
  }

  async saveStockItem(stockItem: any, description?: string) {
    return this.saveToDatabase('stock_items', stockItem, description);
  }

  async saveCashFlowEntry(entry: any, description?: string) {
    return this.saveToDatabase('cash_flow', entry, description);
  }

  async saveExpense(expense: any, description?: string) {
    return this.saveToDatabase('expenses', expense, description);
  }

  async saveDebt(debt: any, description?: string) {
    return this.saveToDatabase('debts', debt, description);
  }

  async saveResaleProduct(product: any, description?: string) {
    return this.saveToDatabase('resale_products', product, description);
  }

  async deleteClient(id: string, description?: string) {
    return this.deleteFromDatabase('clients', id, description);
  }

  async deleteProduct(id: string, description?: string) {
    return this.deleteFromDatabase('products', id, description);
  }

  async deleteService(id: string, description?: string) {
    return this.deleteFromDatabase('services', id, description);
  }

  async deleteTransaction(id: string, description?: string) {
    return this.deleteFromDatabase('transactions', id, description);
  }

  async deleteStockItem(id: string, description?: string) {
    return this.deleteFromDatabase('stock_items', id, description);
  }

  async deleteCashFlowEntry(id: string, description?: string) {
    return this.deleteFromDatabase('cash_flow', id, description);
  }

  async deleteExpense(id: string, description?: string) {
    return this.deleteFromDatabase('expenses', id, description);
  }

  async deleteDebt(id: string, description?: string) {
    return this.deleteFromDatabase('debts', id, description);
  }

  async deleteResaleProduct(id: string, description?: string) {
    return this.deleteFromDatabase('resale_products', id, description);
  }
}

// Instância singleton
export const dataManagerWithHistory = DataManagerWithHistory.getInstance();
