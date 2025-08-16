
export interface ResaleProductStockData {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  totalValue: number;
  profitMargin: number;
  lastUpdated: string;
  createdAt: string;
}

export interface ResaleProductStockSummary {
  totalProducts: number;
  productsInStock: number;
  totalValue: number;
  averageMargin: number;
  lastUpdated: string;
}

class ResaleProductsStockManager {
  private readonly STORAGE_KEY = "resale_products_stock_data";
  private readonly BACKUP_KEY = "resale_products_stock_backup";

  /**
   * Carrega todos os dados de estoque do localStorage
   */
  loadStockData(): ResaleProductStockData[] {
    try {
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      if (savedData) {
        const data = JSON.parse(savedData);
        console.log(`✅ [ResaleStockManager] Dados carregados: ${data.length} produtos`);
        return data;
      }
    } catch (error) {
      console.error("❌ [ResaleStockManager] Erro ao carregar dados:", error);
      // Tentar carregar backup
      return this.loadBackupData();
    }
    return [];
  }

  /**
   * Salva os dados de estoque no localStorage e cria backup
   */
  saveStockData(data: ResaleProductStockData[]): boolean {
    try {
      // Criar backup dos dados atuais
      const currentData = localStorage.getItem(this.STORAGE_KEY);
      if (currentData) {
        localStorage.setItem(this.BACKUP_KEY, currentData);
      }

      // Salvar novos dados
      const dataWithTimestamp = data.map(item => ({
        ...item,
        lastUpdated: new Date().toISOString()
      }));

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataWithTimestamp, null, 2));
      console.log(`✅ [ResaleStockManager] Dados salvos: ${data.length} produtos`);
      return true;
    } catch (error) {
      console.error("❌ [ResaleStockManager] Erro ao salvar dados:", error);
      return false;
    }
  }

  /**
   * Carrega dados de backup
   */
  private loadBackupData(): ResaleProductStockData[] {
    try {
      const backupData = localStorage.getItem(this.BACKUP_KEY);
      if (backupData) {
        console.log("🔄 [ResaleStockManager] Carregando dados de backup");
        return JSON.parse(backupData);
      }
    } catch (error) {
      console.error("❌ [ResaleStockManager] Erro ao carregar backup:", error);
    }
    return [];
  }

  /**
   * Adiciona ou atualiza um produto no estoque
   */
  updateProductStock(productData: Omit<ResaleProductStockData, 'lastUpdated' | 'createdAt'>): boolean {
    try {
      const currentData = this.loadStockData();
      const existingIndex = currentData.findIndex(item => item.productId === productData.productId);

      const timestamp = new Date().toISOString();
      const fullProductData: ResaleProductStockData = {
        ...productData,
        lastUpdated: timestamp,
        createdAt: existingIndex >= 0 ? currentData[existingIndex].createdAt : timestamp
      };

      if (existingIndex >= 0) {
        // Atualizar produto existente
        currentData[existingIndex] = fullProductData;
        console.log(`🔄 [ResaleStockManager] Produto atualizado: ${productData.productName}`);
      } else {
        // Adicionar novo produto
        currentData.push(fullProductData);
        console.log(`➕ [ResaleStockManager] Novo produto adicionado: ${productData.productName}`);
      }

      return this.saveStockData(currentData);
    } catch (error) {
      console.error("❌ [ResaleStockManager] Erro ao atualizar produto:", error);
      return false;
    }
  }

  /**
   * Remove um produto do estoque
   */
  removeProductStock(productId: string): boolean {
    try {
      const currentData = this.loadStockData();
      const filteredData = currentData.filter(item => item.productId !== productId);
      
      if (filteredData.length < currentData.length) {
        console.log(`🗑️ [ResaleStockManager] Produto removido: ${productId}`);
        return this.saveStockData(filteredData);
      }
      
      return false;
    } catch (error) {
      console.error("❌ [ResaleStockManager] Erro ao remover produto:", error);
      return false;
    }
  }

  /**
   * Busca um produto específico
   */
  getProductStock(productId: string): ResaleProductStockData | null {
    try {
      const data = this.loadStockData();
      return data.find(item => item.productId === productId) || null;
    } catch (error) {
      console.error("❌ [ResaleStockManager] Erro ao buscar produto:", error);
      return null;
    }
  }

  /**
   * Calcula resumo dos dados de estoque
   */
  getStockSummary(): ResaleProductStockSummary {
    try {
      const data = this.loadStockData();
      
      const totalProducts = data.length;
      const productsInStock = data.filter(item => item.quantity > 0).length;
      const totalValue = data.reduce((sum, item) => sum + item.totalValue, 0);
      const averageMargin = totalProducts > 0 
        ? data.reduce((sum, item) => sum + item.profitMargin, 0) / totalProducts 
        : 0;

      const lastUpdated = data.length > 0 
        ? data.reduce((latest, item) => 
            new Date(item.lastUpdated) > new Date(latest) ? item.lastUpdated : latest, 
            data[0].lastUpdated
          )
        : new Date().toISOString();

      return {
        totalProducts,
        productsInStock,
        totalValue,
        averageMargin,
        lastUpdated
      };
    } catch (error) {
      console.error("❌ [ResaleStockManager] Erro ao calcular resumo:", error);
      return {
        totalProducts: 0,
        productsInStock: 0,
        totalValue: 0,
        averageMargin: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Exporta dados para arquivo JSON
   */
  exportToFile(filename?: string): void {
    try {
      const data = this.loadStockData();
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        products: data,
        summary: this.getStockSummary()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `estoque_produtos_revenda_${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`📥 [ResaleStockManager] Arquivo exportado: ${link.download}`);
    } catch (error) {
      console.error("❌ [ResaleStockManager] Erro ao exportar arquivo:", error);
    }
  }

  /**
   * Importa dados de arquivo JSON
   */
  importFromFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importData = JSON.parse(content);
          
          // Verificar formato do arquivo
          let products: ResaleProductStockData[] = [];
          
          if (importData.products && Array.isArray(importData.products)) {
            // Formato novo com metadados
            products = importData.products;
          } else if (Array.isArray(importData)) {
            // Formato antigo (array direto)
            products = importData;
          } else {
            throw new Error("Formato de arquivo inválido");
          }

          // Validar e salvar dados
          const validProducts = products.filter(this.validateProductData);
          const success = this.saveStockData(validProducts);
          
          if (success) {
            console.log(`📤 [ResaleStockManager] Arquivo importado: ${validProducts.length} produtos`);
          }
          
          resolve(success);
        } catch (error) {
          console.error("❌ [ResaleStockManager] Erro ao importar arquivo:", error);
          resolve(false);
        }
      };

      reader.onerror = () => {
        console.error("❌ [ResaleStockManager] Erro ao ler arquivo");
        resolve(false);
      };

      reader.readAsText(file);
    });
  }

  /**
   * Valida estrutura dos dados de produto
   */
  private validateProductData(product: any): product is ResaleProductStockData {
    return (
      typeof product === 'object' &&
      typeof product.productId === 'string' &&
      typeof product.productName === 'string' &&
      typeof product.unit === 'string' &&
      typeof product.quantity === 'number' &&
      typeof product.purchasePrice === 'number' &&
      typeof product.salePrice === 'number' &&
      typeof product.totalValue === 'number' &&
      typeof product.profitMargin === 'number'
    );
  }

  /**
   * Limpa todos os dados de estoque
   */
  clearAllData(): boolean {
    try {
      // Criar backup antes de limpar
      const currentData = localStorage.getItem(this.STORAGE_KEY);
      if (currentData) {
        localStorage.setItem(`${this.BACKUP_KEY}_${Date.now()}`, currentData);
      }

      localStorage.removeItem(this.STORAGE_KEY);
      console.log("🧹 [ResaleStockManager] Todos os dados foram limpos");
      return true;
    } catch (error) {
      console.error("❌ [ResaleStockManager] Erro ao limpar dados:", error);
      return false;
    }
  }
}

// Instância singleton do gerenciador
export const resaleProductsStockManager = new ResaleProductsStockManager();

// Funções utilitárias para facilitar uso
export const loadResaleProductsStock = () => resaleProductsStockManager.loadStockData();
export const saveResaleProductsStock = (data: ResaleProductStockData[]) => resaleProductsStockManager.saveStockData(data);
export const updateResaleProductStock = (productData: Omit<ResaleProductStockData, 'lastUpdated' | 'createdAt'>) => 
  resaleProductsStockManager.updateProductStock(productData);
export const getResaleProductStock = (productId: string) => resaleProductsStockManager.getProductStock(productId);
export const getResaleStockSummary = () => resaleProductsStockManager.getStockSummary();
export const exportResaleStockToFile = (filename?: string) => resaleProductsStockManager.exportToFile(filename);
export const importResaleStockFromFile = (file: File) => resaleProductsStockManager.importFromFile(file);
export const clearResaleStockData = () => resaleProductsStockManager.clearAllData();
