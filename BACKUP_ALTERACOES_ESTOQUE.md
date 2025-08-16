# BACKUP DAS ALTERAÇÕES - SISTEMA DE ESTOQUE DE MATÉRIA-PRIMA

**Data:** 16/08/2025 04:46
**Problema resolvido:** Sistema de atualização de estoque de matéria-prima não funcionava

## ARQUIVOS MODIFICADOS

### 1. src/utils/dataManager.ts (linhas 1978-1999)

**Problema:** Função loadAverageTireCost não permitia valores 0 como custo válido
**Solução:** Retornar finalCost em vez de cost bruto

```typescript
async loadAverageTireCost(): Promise<number> {
  try {
    const { data, error } = await this.supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'average_tire_cost')
      .single();

    if (error) {
      console.error('❌ [DataManager] Erro ao carregar custo médio por pneu:', error);
      return 101.09; // valor padrão
    }

    if (!data) {
      console.log('⚠️ [DataManager] Nenhum custo médio por pneu encontrado, usando padrão');
      return 101.09;
    }

    const cost = Number(data.value);
    const finalCost = isNaN(cost) ? 101.09 : cost;
    
    console.log('✅ [DataManager] Custo médio por pneu carregado:', {
      rawValue: data.value,
      parsedCost: cost,
      finalCost: finalCost
    });
    
    return finalCost; // CORREÇÃO: retorna finalCost em vez de cost
  } catch (error) {
    console.error('❌ [DataManager] Erro inesperado ao carregar custo médio por pneu:', error);
    return 101.09;
  }
}
```

### 2. src/components/stock/StockDashboard.tsx

**A. Import corrigido (linha 546):**
```typescript
const { stockItems, isLoading: stockLoading, updateStockItem, addStockItem } = useStockItems();
```

**B. Função handleStockUpdate completa (linhas 678-812):**

```typescript
const handleStockUpdate = async (
  itemId: string,
  itemType: "material" | "product",
  quantity: number,
  operation: "add" | "remove",
  unitPrice?: number,
  itemNameParam?: string,
) => {
  console.log(`🔄 [StockDashboard] Atualizando estoque:`, {
    itemId,
    itemType,
    quantity,
    operation,
    unitPrice,
    itemNameParam,
  });

  const existingStock = stockItems.find(
    (item) => item.item_id === itemId && item.item_type === itemType,
  );

  if (existingStock) {
    // Update existing stock item
    if (operation === "add") {
      const newQuantity = existingStock.quantity + quantity;
      let newUnitCost = existingStock.unit_cost;

      // Calculate weighted average cost if adding with a price
      if (unitPrice && unitPrice > 0) {
        const currentTotalValue =
          existingStock.quantity * existingStock.unit_cost;
        const newTotalValue = quantity * unitPrice;
        newUnitCost = (currentTotalValue + newTotalValue) / newQuantity;
      }

      const updateData = {
        quantity: newQuantity,
        unit_cost: newUnitCost,
        total_value: newQuantity * newUnitCost,
        last_updated: new Date().toISOString(),
      };

      await updateStockItem(existingStock.id, updateData);
      
      // Dispatch manual do evento para garantir sincronização
      console.log('📡 [StockDashboard] Disparando evento stockItemsUpdated manualmente...');
      window.dispatchEvent(new CustomEvent('stockItemsUpdated', {
        detail: { 
          itemId, 
          itemType, 
          operation: 'add',
          newQuantity,
          timestamp: new Date().toISOString()
        }
      }));
    } else {
      // Remove operation - keep same unit cost
      const newQuantity = Math.max(0, existingStock.quantity - quantity);
      const updateData = {
        quantity: newQuantity,
        total_value: newQuantity * existingStock.unit_cost,
        last_updated: new Date().toISOString(),
      };

      await updateStockItem(existingStock.id, updateData);
      
      // Dispatch manual do evento para garantir sincronização
      console.log('📡 [StockDashboard] Disparando evento stockItemsUpdated manualmente...');
      window.dispatchEvent(new CustomEvent('stockItemsUpdated', {
        detail: { 
          itemId, 
          itemType, 
          operation: 'remove',
          newQuantity,
          timestamp: new Date().toISOString()
        }
      }));
    }
  } else {
    // Create new stock item if it doesn't exist
    console.log(`🆕 [StockDashboard] Item não existe no estoque, criando novo item:`, {
      itemId,
      itemType,
      quantity,
      unitPrice
    });

    // Find the material/product name
    let itemName = itemNameParam || 'Item Desconhecido';
    let unit = 'un';

    if (itemType === 'material') {
      const material = materials.find(m => m.id === itemId);
      if (material) {
        itemName = material.name;
        unit = material.unit;
      }
    } else if (itemType === 'product') {
      const product = products.find(p => p.id === itemId);
      if (product) {
        itemName = product.name;
        unit = product.unit;
      }
    }

    const newStockItemData = {
      item_id: itemId,
      item_name: itemName,
      item_type: itemType,
      unit: unit,
      quantity: operation === "add" ? quantity : 0,
      unit_cost: unitPrice || 0,
      total_value: (operation === "add" ? quantity : 0) * (unitPrice || 0),
      min_level: 0,
      max_level: 0,
      last_updated: new Date().toISOString(),
    };

    console.log(`🆕 [StockDashboard] Criando novo item de estoque:`, newStockItemData);
    
    await addStockItem(newStockItemData);
    
    // Dispatch manual do evento para garantir sincronização
    console.log('📡 [StockDashboard] Disparando evento stockItemsUpdated para novo item...');
    window.dispatchEvent(new CustomEvent('stockItemsUpdated', {
      detail: { 
        itemId, 
        itemType, 
        operation: 'create',
        newQuantity: newStockItemData.quantity,
        timestamp: new Date().toISOString()
      }
    }));
  }
};
```

## FUNCIONALIDADES RESTAURADAS

✅ **Custo por pneu zerado**: Agora aceita valores 0 como custo válido
✅ **Atualização de estoque**: Lógica completa implementada
✅ **Criação automática**: Novos itens criados quando não existem
✅ **Sincronização em tempo real**: Eventos customizados para UI
✅ **Cálculo de custo médio**: Custo médio ponderado na adição com preço

## COMO FAZER O PUSH MANUAL

1. **Pelo VS Code:**
   - Abra a pasta do projeto no VS Code
   - Vá em Source Control (Ctrl+Shift+G)
   - Adicione as alterações (+)
   - Commit com mensagem: "fix: Corrigir sistema de atualização de estoque"
   - Push

2. **Pelo GitHub Desktop:**
   - Adicione o repositório local
   - Commit e push pela interface

3. **Pelo terminal (se git funcionar):**
   ```bash
   cd "c:\Users\kaiob\Downloads\sistemarec-1\sistemarec-1"
   git add .
   git commit -m "fix: Corrigir sistema de atualização de estoque de matéria-prima"
   git push
   ```

## STATUS FINAL
✅ **PROBLEMA RESOLVIDO** - Sistema de estoque funcionando corretamente
⚠️ **PUSH PENDENTE** - Alterações salvas localmente, aguardando envio para GitHub
