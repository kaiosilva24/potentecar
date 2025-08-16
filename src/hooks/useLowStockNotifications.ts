import { useState, useEffect } from 'react';
import { dataManager } from '../utils/dataManager';

export interface LowStockItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  category: 'raw_materials' | 'produced_tires' | 'final_products' | 'resale_products';
  categoryLabel: string;
}

export const useLowStockNotifications = () => {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const checkLowStock = async () => {
    try {
      setIsLoading(true);
      const allLowStockItems: LowStockItem[] = [];

      // Check Raw Materials - using same logic as charts
      const rawMaterials = await dataManager.loadFromDatabase('raw_materials');
      if (rawMaterials) {
        rawMaterials.forEach((material: any) => {
          // Same logic as charts: minLevel > 0 && quantity <= minLevel
          if (material.minStock > 0 && material.currentStock <= material.minStock) {
            allLowStockItems.push({
              id: material.id,
              name: material.name,
              currentStock: material.currentStock,
              minStock: material.minStock,
              category: 'raw_materials',
              categoryLabel: 'Matéria-Prima'
            });
          }
        });
      }

      // Check Stock Items (this is where the actual stock data is stored)
      const stockItems = await dataManager.loadFromDatabase('stock_items');
      if (stockItems) {
        // Get products and raw materials for names
        const products = await dataManager.loadFromDatabase('products');
        const rawMaterials = await dataManager.loadFromDatabase('raw_materials');
        
        stockItems.forEach((stockItem: any) => {
          const quantity = stockItem.quantity || 0;
          const minLevel = stockItem.min_level || 0;
          
          // Same logic as charts: minLevel > 0 && quantity <= minLevel
          if (minLevel > 0 && quantity <= minLevel) {
            let itemName = stockItem.item_name || 'Item desconhecido';
            let categoryLabel = 'Produto';
            let category: 'raw_materials' | 'produced_tires' | 'final_products' | 'resale_products' = 'final_products';
            
            // Determine category based on item_type
            if (stockItem.item_type === 'raw_material') {
              category = 'raw_materials';
              categoryLabel = 'Matéria-Prima';
              
              // Try to get more detailed name from raw_materials table
              const rawMaterial = rawMaterials?.find((rm: any) => rm.id === stockItem.item_id);
              if (rawMaterial && typeof rawMaterial === 'object' && 'name' in rawMaterial) {
                itemName = (rawMaterial as any).name;
              }
            } else if (stockItem.item_type === 'product') {
              // Try to get more detailed name from products table
              const product = products?.find((p: any) => p.id === stockItem.item_id);
              if (product && typeof product === 'object' && 'name' in product) {
                itemName = (product as any).name;
                
                // Determine if it's a tire or final product based on name
                if (itemName.toLowerCase().includes('pneu') || 
                    itemName.toLowerCase().includes('tire') ||
                    itemName.toLowerCase().includes('aro')) {
                  category = 'produced_tires';
                  categoryLabel = 'Pneus Produzidos';
                } else {
                  category = 'final_products';
                  categoryLabel = 'Produtos Finais';
                }
              }
            } else if (stockItem.item_type === 'resale') {
              category = 'resale_products';
              categoryLabel = 'Produtos de Revenda';
            }
            
            allLowStockItems.push({
              id: stockItem.item_id || stockItem.id,
              name: itemName,
              currentStock: quantity,
              minStock: minLevel,
              category,
              categoryLabel
            });
          }
        });
      }

      setLowStockItems(allLowStockItems);
      setLastUpdate(new Date());
      console.log("📊 [LowStockNotifications] Verificação de estoque baixo concluída:", allLowStockItems.length, "itens");
      if (allLowStockItems.length > 0) {
        console.log("📊 [LowStockNotifications] Itens com estoque baixo encontrados:", allLowStockItems.map(item => ({
          name: item.name,
          category: item.categoryLabel,
          current: item.currentStock,
          min: item.minStock
        })));
      }
    } catch (error) {
      console.error("❌ [LowStockNotifications] Erro ao verificar estoque baixo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check low stock on mount and every 30 seconds
  useEffect(() => {
    checkLowStock();
    
    const interval = setInterval(() => {
      checkLowStock();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    lowStockItems,
    lowStockCount: lowStockItems.length,
    isLoading,
    lastUpdate,
    refreshLowStock: checkLowStock
  };
};
