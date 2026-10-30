import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductionRegistration from "./ProductionRegistration";
import DailyProduction from "./DailyProduction";
import ProductionLossHistory from "./ProductionLossHistory";
import {
  useMaterials,
  useProducts,
  useRecipes,
  useProductionEntries,
  useStockItems,
} from "@/hooks/useDataPersistence";
import { dataManager } from "@/utils/dataManager";
import type {
  ProductionRecipe,
  ProductionEntry,
  StockItem,
} from "@/types/financial";

interface ProductionDashboardProps {
  onRefresh?: () => void;
  isLoading?: boolean;
  onStockUpdate?: (
    itemId: string,
    itemType: "material" | "product",
    quantity: number,
    operation: "add" | "remove",
    unitPrice?: number,
    itemName?: string
  ) => Promise<void>;
}

interface DailyProductionProps {
  recipes?: ProductionRecipe[];
  stockItems?: StockItem[];
  productionEntries?: ProductionEntry[];
  onSubmit?: (
    entry: Omit<ProductionEntry, "id" | "created_at">
  ) => Promise<void>;
  onDelete?: (entryId: string) => Promise<void>;
  onStockUpdate?: (
    itemId: string,
    itemType: "material" | "product",
    quantity: number,
    operation: "add" | "remove",
    unitPrice?: number,
    itemName?: string
  ) => Promise<void>;
  isLoading?: boolean;
}

const ProductionDashboard = ({
  onRefresh = () => {},
  isLoading = false,
  onStockUpdate = async () => {},
}: ProductionDashboardProps) => {
  const [activeTab, setActiveTab] = useState("registration");

  // Use database hooks
  const { materials, isLoading: materialsLoading } = useMaterials();
  const { products, isLoading: productsLoading } = useProducts();
  const {
    recipes,
    addRecipe,
    updateRecipe,
    isLoading: recipesLoading,
  } = useRecipes();
  const {
    productionEntries,
    addProductionEntry,
    deleteProductionEntry,
    refreshProductionEntries,
    isLoading: entriesLoading,
  } = useProductionEntries();
  const {
    stockItems,
    addStockItem,
    adjustStockItem,
    isLoading: stockLoading,
  } = useStockItems();

  // Archive handler that updates the database
  const handleArchiveRecipe = async (recipeId: string) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (recipe) {
      await updateRecipe(recipeId, { archived: !recipe.archived });
    }
  };

  // Simplified stock update handler that updates the database directly
  const handleStockUpdate = async (
    itemId: string,
    itemType: "material" | "product",
    quantity: number,
    operation: "add" | "remove",
    unitPrice?: number,
    itemName?: string
  ) => {
    console.log(`🔥 [ProductionDashboard] STOCK UPDATE INICIADO:`, {
      itemId,
      itemType,
      quantity,
      operation,
      unitPrice,
      itemName,
      totalStockItems: stockItems.length,
    });

    try {
      // Find existing stock item
      const existingStock = stockItems.find(
        (item) => item.item_id === itemId && item.item_type === itemType
      );

      console.log(`🔍 [ProductionDashboard] Procurando item no estoque:`, {
        itemId,
        itemType,
        found: !!existingStock,
        existingStock: existingStock
          ? {
              id: existingStock.id,
              name: existingStock.item_name,
              quantity: existingStock.quantity,
              unit: existingStock.unit,
            }
          : null,
      });

      if (existingStock) {
        const delta = operation === "add" ? quantity : -quantity;

        console.log(`📝 [ProductionDashboard] Atualizando item existente:`, {
          itemName: existingStock.item_name,
          oldQuantity: existingStock.quantity,
          delta,
          operation,
          quantityChange: quantity,
        });

        const updateResult = await adjustStockItem(existingStock.id, delta, {
          unitCostForIncoming: operation === "add" ? unitPrice : undefined,
        });

        if (!updateResult) {
          throw new Error(
            `Falha ao atualizar stock item ${existingStock.item_name} (ID: ${existingStock.id})`
          );
        }

        console.log(`✅ [ProductionDashboard] Item atualizado com sucesso:`, {
          itemName: existingStock.item_name,
          oldQuantity: existingStock.quantity,
          newQuantity: updateResult.quantity,
          operation,
          quantityChange: quantity,
        });
      } else {
        // Create new stock item if adding
        if (operation === "add") {
          let finalItemName = itemName || itemId;
          let finalUnit = "un";
          let realItemId = itemId;

          // Try to get proper name and unit from materials/products
          if (itemType === "material") {
            const material = materials.find((m) => m.id === itemId);
            if (material) {
              finalItemName = material.name;
              finalUnit = material.unit;
              realItemId = material.id;
            }
          } else if (itemType === "product") {
            finalUnit = "un"; // Products are usually counted in units

            // For new products (tires), we need to create the product first if it doesn't exist
            if (itemId.startsWith("temp_")) {
              console.log(`🆕 [ProductionDashboard] Criando novo produto:`, {
                name: finalItemName,
                unit: finalUnit,
              });

              // Create the product in the products table first
              const newProduct = await dataManager.saveProduct({
                name: finalItemName,
                unit: finalUnit,
                archived: false,
              });

              if (newProduct) {
                realItemId = newProduct.id;
                console.log(
                  `✅ [ProductionDashboard] Produto criado com ID:`,
                  realItemId
                );
              } else {
                throw new Error(`Falha ao criar produto: ${finalItemName}`);
              }
            }
          }

          console.log(
            `🆕 [ProductionDashboard] Criando novo item de estoque:`,
            {
              realItemId,
              finalItemName,
              itemType,
              quantity,
              finalUnit,
            }
          );

          const newStockItem = {
            item_id: realItemId,
            item_name: finalItemName,
            item_type: itemType,
            unit: finalUnit,
            quantity: quantity,
            unit_cost: unitPrice || 0,
            total_value: quantity * (unitPrice || 0),
            last_updated: new Date().toISOString(),
          };

          console.log(
            `🔧 [ProductionDashboard] Dados preparados para addStockItem:`,
            newStockItem
          );

          const createResult = await addStockItem(newStockItem);

          if (!createResult) {
            throw new Error(`Falha ao criar novo stock item: ${finalItemName}`);
          }

          console.log(
            `✅ [ProductionDashboard] Novo item criado com sucesso:`,
            {
              itemId: createResult.id,
              itemName: finalItemName,
              quantity,
              unit: finalUnit,
            }
          );
        } else {
          console.warn(
            `⚠️ [ProductionDashboard] Tentativa de remover item inexistente:`,
            {
              itemId,
              itemType,
              operation,
            }
          );
        }
      }

      console.log(
        `🎉 [ProductionDashboard] STOCK UPDATE CONCLUÍDO COM SUCESSO!`
      );
    } catch (error) {
      console.error(
        `❌ [ProductionDashboard] ERRO CRÍTICO em handleStockUpdate:`,
        {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          itemId,
          itemType,
          operation,
          quantity,
        }
      );
      throw error;
    }
  };

  // Delete production entry handler
  const handleDeleteProductionEntry = async (entryId: string) => {
    await deleteProductionEntry(entryId);
    // Refresh the production entries to ensure UI is updated
    await refreshProductionEntries();
  };

  // Enhanced production entry handler that ensures immediate UI update
  const handleAddProductionEntry = async (
    entryData: Omit<ProductionEntry, "id" | "created_at">
  ) => {
    console.log("🏭 [ProductionDashboard] Registrando entrada de produção:", {
      ...entryData,
      production_date_formatted: new Date(
        entryData.production_date
      ).toLocaleDateString("pt-BR"),
    });

    // Workaround já aplicado em DailyProduction.tsx - usar dados como recebidos
    console.log(
      "🗓️ [ProductionDashboard] Recebendo dados com workaround já aplicado:",
      {
        production_date: entryData.production_date,
        reason: "Workaround aplicado em DailyProduction.tsx",
      }
    );

    try {
      const result = await addProductionEntry(entryData);

      if (result) {
        console.log(
          "✅ [ProductionDashboard] Entrada registrada com sucesso:",
          {
            id: result.id,
            product_name: result.product_name,
            production_date: result.production_date,
            production_date_formatted: new Date(
              result.production_date
            ).toLocaleDateString("pt-BR"),
          }
        );

        // Multiple refresh attempts to ensure data consistency
        console.log(
          "🔄 [ProductionDashboard] Iniciando múltiplas atualizações do histórico..."
        );

        // Immediate refresh
        await refreshProductionEntries();

        // Additional refresh after 1 second
        setTimeout(async () => {
          await refreshProductionEntries();
          console.log(
            "🔄 [ProductionDashboard] Segunda atualização do histórico concluída"
          );
        }, 1000);

        // Final refresh after 2 seconds
        setTimeout(async () => {
          await refreshProductionEntries();
          console.log(
            "🔄 [ProductionDashboard] Atualização final do histórico concluída"
          );
        }, 2000);
      } else {
        console.error(
          "❌ [ProductionDashboard] Falha ao registrar entrada - resultado nulo"
        );
        throw new Error("Falha ao registrar entrada de produção");
      }

      return result;
    } catch (error) {
      console.error(
        "❌ [ProductionDashboard] Erro crítico ao registrar produção:",
        error
      );
      throw error;
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-green to-neon-purple flex items-center justify-center">
            <span className="text-white font-bold text-lg">🏭</span>
          </div>
          Dashboard de Produção
        </h2>
        <p className="text-tire-300 mt-2">
          Gerencie receitas de produção e registre a produção diária
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-factory-800/50 border border-tire-600/30">
          <TabsTrigger
            value="registration"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20"
          >
            Cadastro de Produção
          </TabsTrigger>
          <TabsTrigger
            value="daily"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20"
          >
            Produção Diária
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20"
          >
            Histórico de Perdas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registration">
          <ProductionRegistration
            isLoading={materialsLoading || recipesLoading || stockLoading}
            materials={materials}
            recipes={recipes}
            stockItems={stockItems}
            onSubmit={addRecipe}
            onArchive={handleArchiveRecipe}
            onUpdate={updateRecipe}
          />
        </TabsContent>

        <TabsContent value="daily">
          <DailyProduction
            isLoading={recipesLoading || entriesLoading || stockLoading}
            recipes={recipes}
            stockItems={stockItems}
            productionEntries={productionEntries}
            onSubmit={handleAddProductionEntry}
            onDelete={handleDeleteProductionEntry}
            onStockUpdate={handleStockUpdate}
          />
        </TabsContent>

        <TabsContent value="history">
          <ProductionLossHistory
            productionEntries={productionEntries}
            isLoading={entriesLoading}
            stockItems={stockItems}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductionDashboard;
