import { useState, useEffect, useCallback, useRef } from "react";
import { dataManager } from "@/utils/dataManager";
import type {
  RawMaterial,
  Product,
  Employee,
  Customer,
  Supplier,
  StockItem,
  ProductionRecipe,
  ProductionEntry,
  FixedCost,
  VariableCost,
  CashFlowEntry,
  Salesperson,
  DefectiveTireSale,
  CostSimulation,
  WarrantyEntry,
  ResaleProduct,
  Debt,
} from "@/types/financial";

interface UseDataPersistenceOptions<T> {
  key: string;
  defaultValue: T;
  autoSave?: boolean;
  debounceMs?: number;
  tableName?: string;
}

export function useDataPersistence<T>(options: UseDataPersistenceOptions<T>) {
  const {
    key,
    defaultValue,
    autoSave = true,
    debounceMs = 500,
    tableName,
  } = options;
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        let loadedData: T;

        // Try to load from database first if tableName is provided
        if (tableName) {
          const dbData = await dataManager.loadFromDatabase(tableName);
          loadedData = dbData as T;
          console.log(
            `🔄 [useDataPersistence] Dados carregados do banco para ${key}:`,
            {
              items: Array.isArray(loadedData)
                ? loadedData.length
                : Object.keys(loadedData as any).length,
            }
          );
        } else {
          // Fallback to localStorage
          loadedData = dataManager.loadData(key, defaultValue);
          console.log(
            `🔄 [useDataPersistence] Dados carregados localmente para ${key}:`,
            {
              items: Array.isArray(loadedData)
                ? loadedData.length
                : Object.keys(loadedData as any).length,
            }
          );
        }

        setData(loadedData);
        isInitializedRef.current = true;
      } catch (error) {
        console.error(
          `❌ [useDataPersistence] Erro ao carregar ${key}:`,
          error
        );
        setData(defaultValue);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [key, defaultValue, tableName]);

  // Save data with debouncing
  const saveData = useCallback(
    (dataToSave: T, immediate = false) => {
      if (!isInitializedRef.current) {
        return; // Don't save during initial load
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const performSave = () => {
        setIsSaving(true);
        const success = dataManager.saveData(key, dataToSave);
        if (success) {
          setLastSaved(new Date());
          console.log(`💾 [useDataPersistence] Dados salvos para ${key}:`, {
            items: Array.isArray(dataToSave)
              ? dataToSave.length
              : Object.keys(dataToSave as any).length,
            timestamp: new Date().toISOString(),
          });
        }
        setIsSaving(false);
      };

      if (immediate) {
        performSave();
      } else {
        saveTimeoutRef.current = setTimeout(performSave, debounceMs);
      }
    },
    [key, debounceMs]
  );

  // Auto-save when data changes
  useEffect(() => {
    if (autoSave && isInitializedRef.current) {
      saveData(data);
    }
  }, [data, autoSave, saveData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Manual save function
  const save = useCallback(
    (immediate = false) => {
      saveData(data, immediate);
    },
    [data, saveData]
  );

  // Update data function
  const updateData = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setData((prev) => {
        const newData =
          typeof updater === "function"
            ? (updater as (prev: T) => T)(prev)
            : updater;
        console.log(`🔄 [useDataPersistence] Dados atualizados para ${key}:`, {
          items: Array.isArray(newData)
            ? newData.length
            : Object.keys(newData as any).length,
        });
        return newData;
      });
    },
    [key]
  );

  // Reset to default
  const reset = useCallback(() => {
    setData(defaultValue);
    saveData(defaultValue, true);
  }, [defaultValue, saveData]);

  // Reload from storage
  const reload = useCallback(() => {
    const loadedData = dataManager.loadData(key, defaultValue);
    setData(loadedData);
  }, [key, defaultValue]);

  return {
    data,
    setData: updateData,
    isLoading,
    isSaving,
    lastSaved,
    save,
    reset,
    reload,
  };
}

// Specialized hooks for different data types with database integration
export const useMaterials = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadMaterials = async () => {
      setIsLoading(true);
      const data = await dataManager.loadMaterials();
      setMaterials(data);
      setIsLoading(false);
    };
    loadMaterials();
  }, []);

  const addMaterial = async (
    materialData: Omit<RawMaterial, "id" | "created_at" | "updated_at">
  ) => {
    setIsSaving(true);
    const newMaterial = await dataManager.saveMaterial(materialData);
    if (newMaterial) {
      setMaterials((prev) => [...prev, newMaterial]);
    }
    setIsSaving(false);
    return newMaterial;
  };

  const updateMaterial = async (id: string, updates: Partial<RawMaterial>) => {
    setIsSaving(true);
    const updatedMaterial = await dataManager.updateMaterial(id, updates);
    if (updatedMaterial) {
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? updatedMaterial : m))
      );
    }
    setIsSaving(false);
    return updatedMaterial;
  };

  const deleteMaterial = async (id: string) => {
    console.log(
      `🗑️ [useMaterials] Deletando matéria-prima permanentemente: ${id}`
    );
    setIsSaving(true);

    try {
      const success = await dataManager.deleteMaterial(id);
      if (success) {
        console.log(
          `✅ [useMaterials] Matéria-prima deletada do banco, atualizando estado local`
        );
        setMaterials((prev) => {
          const filtered = prev.filter((material) => material.id !== id);
          console.log(
            `✅ [useMaterials] Estado local atualizado. Materiais removidos: ${prev.length - filtered.length}`
          );
          return filtered;
        });
        console.log(
          `✅ [useMaterials] Matéria-prima deletada permanentemente com sucesso: ${id}`
        );
      } else {
        console.error(
          `❌ [useMaterials] Falha ao deletar matéria-prima: ${id}`
        );
      }
      return success;
    } catch (error) {
      console.error(`❌ [useMaterials] Erro ao deletar matéria-prima:`, error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    materials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    isLoading,
    isSaving,
  };
};

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      const data = await dataManager.loadProducts();
      setProducts(data);
      setIsLoading(false);
    };
    loadProducts();
  }, []);

  const addProduct = async (
    productData: Omit<Product, "id" | "created_at" | "updated_at">
  ) => {
    setIsSaving(true);
    const newProduct = await dataManager.saveProduct(productData);
    if (newProduct) {
      setProducts((prev) => [...prev, newProduct]);
    }
    setIsSaving(false);
    return newProduct;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setIsSaving(true);
    const updatedProduct = await dataManager.updateProduct(id, updates);
    if (updatedProduct) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? updatedProduct : p))
      );
    }
    setIsSaving(false);
    return updatedProduct;
  };

  const deleteProduct = async (id: string) => {
    console.log(`🗑️ [useProducts] Deletando produto permanentemente: ${id}`);
    setIsSaving(true);

    try {
      const success = await dataManager.deleteProduct(id);
      if (success) {
        console.log(
          `✅ [useProducts] Produto deletado do banco, atualizando estado local`
        );
        setProducts((prev) => {
          const filtered = prev.filter((product) => product.id !== id);
          console.log(
            `✅ [useProducts] Estado local atualizado. Produtos removidos: ${prev.length - filtered.length}`
          );
          return filtered;
        });
        console.log(
          `✅ [useProducts] Produto deletado permanentemente com sucesso: ${id}`
        );
      } else {
        console.error(`❌ [useProducts] Falha ao deletar produto: ${id}`);
      }
      return success;
    } catch (error) {
      console.error(`❌ [useProducts] Erro ao deletar produto:`, error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    isLoading,
    isSaving,
  };
};

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      setIsLoading(true);
      const data = await dataManager.loadEmployees();
      setEmployees(data);
      setIsLoading(false);
    };
    loadEmployees();
  }, []);

  const addEmployee = async (
    employeeData: Omit<Employee, "id" | "created_at" | "updated_at">
  ) => {
    setIsSaving(true);
    const newEmployee = await dataManager.saveEmployee(employeeData);
    if (newEmployee) {
      setEmployees((prev) => [...prev, newEmployee]);
    }
    setIsSaving(false);
    return newEmployee;
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    setIsSaving(true);
    const updatedEmployee = await dataManager.updateEmployee(id, updates);
    if (updatedEmployee) {
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? updatedEmployee : e))
      );
    }
    setIsSaving(false);
    return updatedEmployee;
  };

  return { employees, addEmployee, updateEmployee, isLoading, isSaving };
};

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadCustomers = async () => {
      setIsLoading(true);
      const data = await dataManager.loadCustomers();
      setCustomers(data);
      setIsLoading(false);
    };
    loadCustomers();
  }, []);

  const addCustomer = async (
    customerData: Omit<Customer, "id" | "created_at" | "updated_at">
  ) => {
    setIsSaving(true);
    const newCustomer = await dataManager.saveCustomer(customerData);
    if (newCustomer) {
      setCustomers((prev) => [...prev, newCustomer]);
    }
    setIsSaving(false);
    return newCustomer;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    setIsSaving(true);
    const updatedCustomer = await dataManager.updateCustomer(id, updates);
    if (updatedCustomer) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? updatedCustomer : c))
      );
    }
    setIsSaving(false);
    return updatedCustomer;
  };

  return { customers, addCustomer, updateCustomer, isLoading, isSaving };
};

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSuppliers = async () => {
      setIsLoading(true);
      const data = await dataManager.loadSuppliers();
      setSuppliers(data);
      setIsLoading(false);
    };
    loadSuppliers();
  }, []);

  const addSupplier = async (
    supplierData: Omit<Supplier, "id" | "created_at" | "updated_at">
  ) => {
    setIsSaving(true);
    const newSupplier = await dataManager.saveSupplier(supplierData);
    if (newSupplier) {
      setSuppliers((prev) => [...prev, newSupplier]);
    }
    setIsSaving(false);
    return newSupplier;
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    setIsSaving(true);
    const updatedSupplier = await dataManager.updateSupplier(id, updates);
    if (updatedSupplier) {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === id ? updatedSupplier : s))
      );
    }
    setIsSaving(false);
    return updatedSupplier;
  };

  return { suppliers, addSupplier, updateSupplier, isLoading, isSaving };
};

export const useStockItems = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadStockItems = async () => {
      setIsLoading(true);
      const data = await dataManager.loadStockItems();
      setStockItems(data);
      setIsLoading(false);
    };
    loadStockItems();
  }, []);

  // Listener para evento de recarga forçada dos dados de estoque
  useEffect(() => {
    const handleForceReload = (event: CustomEvent) => {
      const { updatedStockItems } = event.detail;
      console.log("🔄 [useStockItems] Evento de recarga forçada recebido");

      if (updatedStockItems && Array.isArray(updatedStockItems)) {
        console.log(
          `📦 [useStockItems] Atualizando estado com ${updatedStockItems.length} itens`
        );
        setStockItems(updatedStockItems);
      } else {
        // Se não recebeu dados, recarregar do banco
        console.log("🔄 [useStockItems] Recarregando dados do banco...");
        const loadStockItems = async () => {
          setIsLoading(true);
          const data = await dataManager.loadStockItems();
          setStockItems(data);
          setIsLoading(false);
          console.log(
            `✅ [useStockItems] Dados recarregados: ${data.length} itens`
          );
        };
        loadStockItems();
      }
    };

    console.log(
      "🎯 [useStockItems] Registrando listener para evento forceStockItemsReload"
    );

    // Adicionar listener para o evento customizado
    window.addEventListener(
      "forceStockItemsReload",
      handleForceReload as EventListener
    );

    // Cleanup
    return () => {
      console.log(
        "🚫 [useStockItems] Removendo listener para evento forceStockItemsReload"
      );
      window.removeEventListener(
        "forceStockItemsReload",
        handleForceReload as EventListener
      );
    };
  }, []);

  const addStockItem = async (
    stockItemData: Omit<StockItem, "id" | "created_at">
  ) => {
    setIsSaving(true);

    // Remove any fields that don't belong to the stock_items table
    // Note: updated_at field doesn't exist in stock_items table or StockItem type
    const cleanStockItemData = stockItemData;

    console.log("🔥 [useStockItems] Adicionando item ao estoque:", {
      originalData: stockItemData,
      cleanData: cleanStockItemData,
    });

    const newStockItem = await dataManager.saveStockItem(cleanStockItemData);
    if (newStockItem) {
      setStockItems((prev) => [...prev, newStockItem]);
      console.log(
        "✅ [useStockItems] Item adicionado com sucesso:",
        newStockItem
      );

      // Disparar evento customizado para notificar dashboard
      const stockUpdateEvent = new CustomEvent("stockItemsUpdated", {
        detail: {
          timestamp: Date.now(),
          source: "useStockItems-addStockItem",
          action: "INSERT",
          item: newStockItem,
        },
      });
      window.dispatchEvent(stockUpdateEvent);
      console.log(
        "📡 [useStockItems] Evento stockItemsUpdated disparado para adição"
      );
    }
    setIsSaving(false);
    return newStockItem;
  };

  const updateStockItem = async (id: string, updates: Partial<StockItem>) => {
    setIsSaving(true);

    // Remove ALL fields that don't belong to the stock_items table
    const cleanUpdates: any = {};

    // Only include fields that exist in the stock_items table
    const allowedFields = [
      "item_id",
      "item_name",
      "item_type",
      "unit",
      "quantity",
      "unit_cost",
      "total_value",
      "min_level",
      "max_level",
      "last_updated",
    ];

    // Explicitly forbidden fields that should never be sent to Supabase
    const forbiddenFields = ["created_at", "id"];

    Object.keys(updates).forEach((key) => {
      // Skip forbidden fields completely
      if (forbiddenFields.includes(key)) {
        console.warn(`🚫 [useStockItems] Skipping forbidden field: ${key}`);
        return;
      }

      // Only include allowed fields with defined values
      if (
        allowedFields.includes(key) &&
        updates[key as keyof StockItem] !== undefined &&
        updates[key as keyof StockItem] !== null
      ) {
        cleanUpdates[key] = updates[key as keyof StockItem];
      }
    });

    // Double-check that no forbidden fields made it through
    forbiddenFields.forEach((field) => {
      if (cleanUpdates.hasOwnProperty(field)) {
        console.error(
          `❌ [useStockItems] CRITICAL: Forbidden field ${field} found in cleanUpdates!`
        );
        delete cleanUpdates[field];
      }
    });

    console.log("🔥 [useStockItems] Atualizando item do estoque:", {
      id,
      originalUpdates: updates,
      cleanUpdates,
      allowedFields,
      forbiddenFields,
      filteredOutFields: Object.keys(updates).filter(
        (key) => !allowedFields.includes(key) || forbiddenFields.includes(key)
      ),
      hasCleanUpdates: Object.keys(cleanUpdates).length > 0,
      cleanUpdatesKeys: Object.keys(cleanUpdates),
      cleanUpdatesValues: Object.values(cleanUpdates),
    });

    // Validate that we have valid updates
    if (Object.keys(cleanUpdates).length === 0) {
      console.error(
        `❌ [useStockItems] Nenhum campo válido para atualizar no item ${id}`
      );
      console.error(`❌ [useStockItems] Updates originais:`, updates);
      console.error(`❌ [useStockItems] Campos permitidos:`, allowedFields);
      setIsSaving(false);
      return null;
    }

    const updatedStockItem = await dataManager.updateStockItem(
      id,
      cleanUpdates
    );
    if (updatedStockItem) {
      setStockItems((prev) =>
        prev.map((s) => (s.id === id ? updatedStockItem : s))
      );
      console.log(
        "✅ [useStockItems] Item atualizado com sucesso:",
        updatedStockItem
      );

      // Disparar evento customizado para notificar dashboard
      const stockUpdateEvent = new CustomEvent("stockItemsUpdated", {
        detail: {
          timestamp: Date.now(),
          source: "useStockItems-updateStockItem",
          action: "UPDATE",
          item: updatedStockItem,
        },
      });
      window.dispatchEvent(stockUpdateEvent);
      console.log(
        "📡 [useStockItems] Evento stockItemsUpdated disparado para atualização"
      );
    }
    setIsSaving(false);
    return updatedStockItem;
  };

  const removeStockItemByItemId = async (itemId: string) => {
    console.log(
      `🗑️ [useStockItems] Removendo item do estoque por item_id: ${itemId}`
    );
    setIsSaving(true);

    try {
      const success = await dataManager.removeStockItemByItemId(itemId);
      if (success) {
        // Remove from local state
        setStockItems((prev) => {
          const filtered = prev.filter((item) => item.item_id !== itemId);
          console.log(
            `✅ [useStockItems] Estado local atualizado. Itens removidos: ${prev.length - filtered.length}`
          );
          return filtered;
        });
        console.log(
          `✅ [useStockItems] Item removido do estoque com sucesso: ${itemId}`
        );

        // Disparar evento customizado para notificar dashboard
        const stockUpdateEvent = new CustomEvent("stockItemsUpdated", {
          detail: {
            timestamp: Date.now(),
            source: "useStockItems-removeStockItemByItemId",
            action: "DELETE",
            itemId: itemId,
          },
        });
        window.dispatchEvent(stockUpdateEvent);
        console.log(
          "📡 [useStockItems] Evento stockItemsUpdated disparado para remoção"
        );
      } else {
        console.error(
          `❌ [useStockItems] Falha ao remover item do estoque: ${itemId}`
        );
      }
      return success;
    } catch (error) {
      console.error(
        `❌ [useStockItems] Erro ao remover item do estoque:`,
        error
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const createStockItem = async (
    stockItemData: Omit<StockItem, "id" | "created_at">
  ) => {
    setIsSaving(true);

    // Remove any fields that don't belong to the stock_items table
    // Note: updated_at field doesn't exist in stock_items table or StockItem type
    const cleanStockItemData = stockItemData;

    console.log("🔥 [useStockItems] Criando item de estoque:", {
      originalData: stockItemData,
      cleanData: cleanStockItemData,
    });

    const newStockItem = await dataManager.saveStockItem(cleanStockItemData);
    if (newStockItem) {
      setStockItems((prev) => [...prev, newStockItem]);
      console.log("✅ [useStockItems] Item criado com sucesso:", newStockItem);
    }
    setIsSaving(false);
    return newStockItem;
  };

  const loadStockItems = async () => {
    setIsLoading(true);
    const data = await dataManager.loadStockItems();
    setStockItems(data);
    setIsLoading(false);
    console.log(`✅ [useStockItems] Dados recarregados: ${data.length} itens`);
  };

  return {
    stockItems,
    addStockItem,
    createStockItem,
    updateStockItem,
    removeStockItemByItemId,
    loadStockItems,
    isLoading,
    isSaving,
  };
};

export const useRecipes = () => {
  const [recipes, setRecipes] = useState<ProductionRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadRecipes = async () => {
      setIsLoading(true);
      const data = await dataManager.loadRecipes();
      setRecipes(data);
      setIsLoading(false);
    };
    loadRecipes();
  }, []);

  const addRecipe = async (
    recipeData: Omit<ProductionRecipe, "id" | "created_at" | "updated_at">
  ) => {
    setIsSaving(true);
    const newRecipe = await dataManager.saveRecipe(recipeData);
    if (newRecipe) {
      setRecipes((prev) => [...prev, newRecipe]);
    }
    setIsSaving(false);
    return newRecipe;
  };

  const updateRecipe = async (
    id: string,
    updates: Partial<ProductionRecipe>
  ) => {
    setIsSaving(true);
    const updatedRecipe = await dataManager.updateRecipe(id, updates);
    if (updatedRecipe) {
      setRecipes((prev) => prev.map((r) => (r.id === id ? updatedRecipe : r)));
    }
    setIsSaving(false);
    return updatedRecipe;
  };

  return { recipes, addRecipe, updateRecipe, isLoading, isSaving };
};

export const useProductionEntries = () => {
  const [productionEntries, setProductionEntries] = useState<ProductionEntry[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProductionEntries = async () => {
      setIsLoading(true);
      const data = await dataManager.loadProductionEntries();
      console.log(
        "🔄 [useProductionEntries] Carregando entradas de produção:",
        data.length
      );
      setProductionEntries(data);
      setIsLoading(false);
    };
    loadProductionEntries();
  }, []);

  const addProductionEntry = async (
    entryData: Omit<ProductionEntry, "id" | "created_at">
  ) => {
    console.log("📝 [useProductionEntries] Adicionando entrada de produção:", {
      ...entryData,
      production_date_formatted: new Date(
        entryData.production_date
      ).toLocaleDateString("pt-BR"),
    });
    setIsSaving(true);

    let newEntry: ProductionEntry | null = null;

    try {
      newEntry = await dataManager.saveProductionEntry(entryData);
      if (newEntry) {
        console.log(
          "✅ [useProductionEntries] Entrada salva no banco, atualizando estado local:",
          {
            id: newEntry.id,
            product_name: newEntry.product_name,
            quantity_produced: newEntry.quantity_produced,
            production_date: newEntry.production_date,
            production_date_formatted: new Date(
              newEntry.production_date
            ).toLocaleDateString("pt-BR"),
          }
        );

        // Add to the beginning of the array to show most recent first
        setProductionEntries((prev) => {
          const updated = [newEntry!, ...prev];
          console.log(
            "🔄 [useProductionEntries] Estado local atualizado. Total de entradas:",
            updated.length
          );
          return updated;
        });

        // Force a refresh from database to ensure consistency
        setTimeout(async () => {
          console.log(
            "🔄 [useProductionEntries] Forçando refresh do banco de dados..."
          );
          const freshData = await dataManager.loadProductionEntries();
          setProductionEntries(freshData);
          console.log(
            "✅ [useProductionEntries] Dados atualizados do banco:",
            freshData.length
          );
        }, 500);
      } else {
        console.error(
          "❌ [useProductionEntries] Falha ao salvar entrada de produção - retorno nulo"
        );
        throw new Error("Entrada de produção não foi salva corretamente");
      }
    } catch (error) {
      console.error(
        "❌ [useProductionEntries] Erro crítico ao salvar entrada:",
        error
      );
      throw error;
    } finally {
      setIsSaving(false);
    }

    return newEntry;
  };

  const deleteProductionEntry = async (id: string) => {
    console.log("🗑️ [useProductionEntries] Deletando entrada de produção:", id);
    setIsSaving(true);
    const success = await dataManager.deleteProductionEntry(id);
    if (success) {
      console.log(
        "✅ [useProductionEntries] Entrada deletada, atualizando estado local"
      );
      setProductionEntries((prev) => prev.filter((entry) => entry.id !== id));
    } else {
      console.error(
        "❌ [useProductionEntries] Falha ao deletar entrada de produção"
      );
    }
    setIsSaving(false);
    return success;
  };

  // Function to manually refresh the production entries
  const refreshProductionEntries = async () => {
    console.log(
      "🔄 [useProductionEntries] Atualizando entradas de produção manualmente"
    );
    setIsLoading(true);
    const data = await dataManager.loadProductionEntries();
    console.log("✅ [useProductionEntries] Entradas atualizadas:", data.length);
    setProductionEntries(data);
    setIsLoading(false);
  };

  return {
    productionEntries,
    addProductionEntry,
    deleteProductionEntry,
    refreshProductionEntries,
    isLoading,
    isSaving,
  };
};

export const useCustomUnits = () => {
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadCustomUnits = async () => {
      setIsLoading(true);
      const data = await dataManager.loadCustomUnits();
      setCustomUnits(data);
      setIsLoading(false);
    };
    loadCustomUnits();
  }, []);

  const addCustomUnit = async (unit: string) => {
    setIsSaving(true);
    const success = await dataManager.saveCustomUnit(unit);
    if (success) {
      setCustomUnits((prev) => [...prev, unit]);
    }
    setIsSaving(false);
    return success;
  };

  const removeCustomUnit = async (unit: string) => {
    setIsSaving(true);
    const success = await dataManager.deleteCustomUnit(unit);
    if (success) {
      setCustomUnits((prev) => prev.filter((u) => u !== unit));
    }
    setIsSaving(false);
    return success;
  };

  return { customUnits, addCustomUnit, removeCustomUnit, isLoading, isSaving };
};

// Financial hooks
export const useFixedCosts = () => {
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadFixedCosts = async () => {
      setIsLoading(true);
      const data = await dataManager.loadFixedCosts();
      setFixedCosts(data);
      setIsLoading(false);
    };
    loadFixedCosts();
  }, []);

  const addFixedCost = async (
    costData: Omit<FixedCost, "id" | "created_at" | "updated_at">
  ) => {
    setIsSaving(true);
    const newCost = await dataManager.saveFixedCost(costData);
    if (newCost) {
      setFixedCosts((prev) => [...prev, newCost]);
    }
    setIsSaving(false);
    return newCost;
  };

  const updateFixedCost = async (id: string, updates: Partial<FixedCost>) => {
    setIsSaving(true);
    const updatedCost = await dataManager.updateFixedCost(id, updates);
    if (updatedCost) {
      setFixedCosts((prev) => prev.map((c) => (c.id === id ? updatedCost : c)));
    }
    setIsSaving(false);
    return updatedCost;
  };

  return { fixedCosts, addFixedCost, updateFixedCost, isLoading, isSaving };
};

export const useVariableCosts = () => {
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadVariableCosts = async () => {
      setIsLoading(true);
      const data = await dataManager.loadVariableCosts();
      setVariableCosts(data);
      setIsLoading(false);
    };
    loadVariableCosts();
  }, []);

  const addVariableCost = async (
    costData: Omit<VariableCost, "id" | "created_at" | "updated_at">
  ) => {
    setIsSaving(true);
    const newCost = await dataManager.saveVariableCost(costData);
    if (newCost) {
      setVariableCosts((prev) => [...prev, newCost]);
    }
    setIsSaving(false);
    return newCost;
  };

  const updateVariableCost = async (
    id: string,
    updates: Partial<VariableCost>
  ) => {
    setIsSaving(true);
    const updatedCost = await dataManager.updateVariableCost(id, updates);
    if (updatedCost) {
      setVariableCosts((prev) =>
        prev.map((c) => (c.id === id ? updatedCost : c))
      );
    }
    setIsSaving(false);
    return updatedCost;
  };

  return {
    variableCosts,
    addVariableCost,
    updateVariableCost,
    isLoading,
    isSaving,
  };
};

export const useCashFlow = () => {
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await dataManager.loadCashFlowEntries();
      setCashFlowEntries(data);
    } catch (error) {
      console.error("Erro ao carregar entradas de fluxo de caixa:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addCashFlowEntry = useCallback(
    async (entry: Omit<CashFlowEntry, "id" | "created_at">) => {
      try {
        const newEntry = await dataManager.saveCashFlowEntry(entry);
        if (newEntry) {
          setCashFlowEntries((prev) => {
            const updatedEntries = [...prev, newEntry];

            // Calcular novo saldo em tempo real
            setTimeout(() => {
              const totalIncome = updatedEntries
                .filter((entry) => entry.type === "income")
                .reduce((sum, entry) => sum + entry.amount, 0);
              const totalExpense = updatedEntries
                .filter((entry) => entry.type === "expense")
                .reduce((sum, entry) => sum + entry.amount, 0);
              const newBalance = totalIncome - totalExpense;

              console.log(
                `💰 [useCashFlow] Novo saldo calculado: R$ ${newBalance.toFixed(2)}`
              );

              // Disparar evento para atualizar dashboard
              const balanceUpdateEvent = new CustomEvent("cashBalanceUpdated", {
                detail: {
                  balance: newBalance,
                  timestamp: Date.now(),
                  source: "useCashFlow-addEntry",
                },
              });
              window.dispatchEvent(balanceUpdateEvent);
            }, 100);

            return updatedEntries;
          });
          return newEntry;
        }
      } catch (error) {
        console.error("Erro ao adicionar entrada de fluxo de caixa:", error);
        throw error;
      }
    },
    []
  );

  const updateCashFlowEntry = useCallback(
    async (id: string, updates: Partial<CashFlowEntry>) => {
      try {
        const success = await dataManager.updateCashFlowEntry(id, updates);
        if (success) {
          setCashFlowEntries((prev) => {
            const updatedEntries = prev.map((entry) =>
              entry.id === id ? { ...entry, ...updates } : entry
            );

            // Calcular novo saldo em tempo real
            setTimeout(() => {
              const totalIncome = updatedEntries
                .filter((entry) => entry.type === "income")
                .reduce((sum, entry) => sum + entry.amount, 0);
              const totalExpense = updatedEntries
                .filter((entry) => entry.type === "expense")
                .reduce((sum, entry) => sum + entry.amount, 0);
              const newBalance = totalIncome - totalExpense;

              console.log(
                `💰 [useCashFlow] Saldo recalculado após atualização: R$ ${newBalance.toFixed(2)}`
              );

              // Disparar evento para atualizar dashboard
              const balanceUpdateEvent = new CustomEvent("cashBalanceUpdated", {
                detail: {
                  balance: newBalance,
                  timestamp: Date.now(),
                  source: "useCashFlow-updateEntry",
                },
              });
              window.dispatchEvent(balanceUpdateEvent);
            }, 100);

            return updatedEntries;
          });
        }
        return success;
      } catch (error) {
        console.error("Erro ao atualizar entrada de fluxo de caixa:", error);
        throw error;
      }
    },
    []
  );

  const deleteCashFlowEntry = useCallback(async (id: string) => {
    try {
      const success = await dataManager.deleteCashFlowEntry(id);
      if (success) {
        setCashFlowEntries((prev) => {
          const updatedEntries = prev.filter((entry) => entry.id !== id);

          // Calcular novo saldo em tempo real
          setTimeout(() => {
            const totalIncome = updatedEntries
              .filter((entry) => entry.type === "income")
              .reduce((sum, entry) => sum + entry.amount, 0);
            const totalExpense = updatedEntries
              .filter((entry) => entry.type === "expense")
              .reduce((sum, entry) => sum + entry.amount, 0);
            const newBalance = totalIncome - totalExpense;

            console.log(
              `💰 [useCashFlow] Saldo recalculado após exclusão: R$ ${newBalance.toFixed(2)}`
            );

            // Disparar evento para atualizar dashboard
            const balanceUpdateEvent = new CustomEvent("cashBalanceUpdated", {
              detail: {
                balance: newBalance,
                timestamp: Date.now(),
                source: "useCashFlow-deleteEntry",
              },
            });
            window.dispatchEvent(balanceUpdateEvent);
          }, 100);

          return updatedEntries;
        });
      }
      return success;
    } catch (error) {
      console.error("Erro ao deletar entrada de fluxo de caixa:", error);
      throw error;
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    cashFlowEntries,
    addCashFlowEntry,
    updateCashFlowEntry,
    deleteCashFlowEntry,
    isLoading,
    refreshData: loadData,
  };
};

export const useSalespeople = () => {
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSalespeople = async () => {
      setIsLoading(true);
      const data = await dataManager.loadSalespeople();
      setSalespeople(data);
      setIsLoading(false);
    };
    loadSalespeople();
  }, []);

  const addSalesperson = async (
    salespersonData: Omit<Salesperson, "id" | "created_at" | "updated_at">
  ) => {
    setIsSaving(true);
    const newSalesperson = await dataManager.saveSalesperson(salespersonData);
    if (newSalesperson) {
      setSalespeople((prev) => [...prev, newSalesperson]);
    }
    setIsSaving(false);
    return newSalesperson;
  };

  const updateSalesperson = async (
    id: string,
    updates: Partial<Salesperson>
  ) => {
    setIsSaving(true);
    const updatedSalesperson = await dataManager.updateSalesperson(id, updates);
    if (updatedSalesperson) {
      setSalespeople((prev) =>
        prev.map((s) => (s.id === id ? updatedSalesperson : s))
      );
    }
    setIsSaving(false);
    return updatedSalesperson;
  };

  return {
    salespeople,
    addSalesperson,
    updateSalesperson,
    isLoading,
    isSaving,
  };
};

export const useDefectiveTireSales = () => {
  const [defectiveTireSales, setDefectiveTireSales] = useState<
    DefectiveTireSale[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadDefectiveTireSales = async () => {
      setIsLoading(true);
      try {
        const data = await dataManager.loadDefectiveTireSales();
        console.log(
          "🔄 [useDefectiveTireSales] Carregando vendas de pneus defeituosos:",
          {
            total: data.length,
            vendas: data.map((sale) => ({
              id: sale.id,
              tire_name: sale.tire_name,
              quantity: sale.quantity,
              sale_value: sale.sale_value,
              sale_date: sale.sale_date,
            })),
          }
        );
        setDefectiveTireSales(data);
      } catch (error) {
        console.error(
          "❌ [useDefectiveTireSales] Erro ao carregar vendas:",
          error
        );
        setDefectiveTireSales([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadDefectiveTireSales();
  }, []);

  const addDefectiveTireSale = async (
    saleData: Omit<DefectiveTireSale, "id" | "created_at">
  ) => {
    console.log(
      "📝 [useDefectiveTireSales] INICIANDO registro de venda de pneu defeituoso:",
      {
        ...saleData,
        sale_date_formatted: new Date(saleData.sale_date).toLocaleDateString(
          "pt-BR"
        ),
      }
    );
    setIsSaving(true);

    let newSale: DefectiveTireSale | null = null;

    try {
      // Step 1: Save to database
      console.log(
        "🔄 [useDefectiveTireSales] Passo 1: Salvando no banco de dados..."
      );
      newSale = await dataManager.saveDefectiveTireSale(saleData);

      if (!newSale) {
        throw new Error("DataManager retornou null - falha ao salvar no banco");
      }

      console.log(
        "✅ [useDefectiveTireSales] Passo 1 CONCLUÍDO - Venda salva no banco:",
        {
          id: newSale.id,
          tire_name: newSale.tire_name,
          quantity: newSale.quantity,
          sale_value: newSale.sale_value,
          sale_date: newSale.sale_date,
          sale_date_formatted: new Date(newSale.sale_date).toLocaleDateString(
            "pt-BR"
          ),
        }
      );

      // Step 2: Update local state immediately
      console.log(
        "🔄 [useDefectiveTireSales] Passo 2: Atualizando estado local..."
      );
      setDefectiveTireSales((prev) => {
        const updated = [newSale!, ...prev];
        console.log(
          "✅ [useDefectiveTireSales] Passo 2 CONCLUÍDO - Estado local atualizado:",
          {
            vendas_anteriores: prev.length,
            vendas_atuais: updated.length,
            nova_venda_id: newSale!.id,
            primeira_venda_na_lista: updated[0]?.id,
          }
        );
        return updated;
      });

      // Step 3: Force multiple refreshes to ensure consistency
      console.log(
        "🔄 [useDefectiveTireSales] Passo 3: Iniciando refreshes de segurança..."
      );

      // Immediate refresh
      setTimeout(async () => {
        try {
          console.log("🔄 [useDefectiveTireSales] Refresh imediato (500ms)...");
          const freshData = await dataManager.loadDefectiveTireSales();
          setDefectiveTireSales(freshData);
          console.log(
            "✅ [useDefectiveTireSales] Refresh imediato concluído:",
            {
              total: freshData.length,
              contem_nova_venda: freshData.some(
                (sale) => sale.id === newSale!.id
              ),
            }
          );
        } catch (error) {
          console.error(
            "❌ [useDefectiveTireSales] Erro no refresh imediato:",
            error
          );
        }
      }, 500);

      // Second refresh
      setTimeout(async () => {
        try {
          console.log("🔄 [useDefectiveTireSales] Segundo refresh (1500ms)...");
          const freshData = await dataManager.loadDefectiveTireSales();
          setDefectiveTireSales(freshData);
          console.log("✅ [useDefectiveTireSales] Segundo refresh concluído:", {
            total: freshData.length,
            contem_nova_venda: freshData.some(
              (sale) => sale.id === newSale!.id
            ),
          });
        } catch (error) {
          console.error(
            "❌ [useDefectiveTireSales] Erro no segundo refresh:",
            error
          );
        }
      }, 1500);

      // Final refresh
      setTimeout(async () => {
        try {
          console.log("🔄 [useDefectiveTireSales] Refresh final (3000ms)...");
          const freshData = await dataManager.loadDefectiveTireSales();
          setDefectiveTireSales(freshData);
          console.log("✅ [useDefectiveTireSales] Refresh final concluído:", {
            total: freshData.length,
            contem_nova_venda: freshData.some(
              (sale) => sale.id === newSale!.id
            ),
          });
        } catch (error) {
          console.error(
            "❌ [useDefectiveTireSales] Erro no refresh final:",
            error
          );
        }
      }, 3000);

      console.log(
        "🎉 [useDefectiveTireSales] PROCESSO COMPLETO - Venda registrada com sucesso!"
      );
    } catch (error) {
      console.error(
        "❌ [useDefectiveTireSales] ERRO CRÍTICO ao salvar venda:",
        {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          saleData,
        }
      );

      // Remove from local state if it was added
      if (newSale) {
        setDefectiveTireSales((prev) =>
          prev.filter((sale) => sale.id !== newSale!.id)
        );
      }

      throw error;
    } finally {
      setIsSaving(false);
    }

    return newSale;
  };

  const deleteDefectiveTireSale = async (id: string) => {
    console.log(
      "🗑️ [useDefectiveTireSales] Deletando venda de pneu defeituoso:",
      id
    );
    setIsSaving(true);

    try {
      const success = await dataManager.deleteDefectiveTireSale(id);
      if (success) {
        console.log(
          "✅ [useDefectiveTireSales] Venda deletada, atualizando estado local"
        );
        setDefectiveTireSales((prev) => prev.filter((sale) => sale.id !== id));

        // Force refresh after deletion
        setTimeout(async () => {
          const freshData = await dataManager.loadDefectiveTireSales();
          setDefectiveTireSales(freshData);
        }, 500);
      } else {
        console.error(
          "❌ [useDefectiveTireSales] Falha ao deletar venda de pneu defeituoso"
        );
      }
      return success;
    } catch (error) {
      console.error("❌ [useDefectiveTireSales] Erro ao deletar venda:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Function to manually refresh the defective tire sales
  const refreshDefectiveTireSales = async () => {
    console.log(
      "🔄 [useDefectiveTireSales] REFRESH MANUAL - Atualizando vendas de pneus defeituosos..."
    );
    setIsLoading(true);

    try {
      const data = await dataManager.loadDefectiveTireSales();
      console.log("✅ [useDefectiveTireSales] REFRESH MANUAL concluído:", {
        total: data.length,
        vendas: data.map((sale) => ({
          id: sale.id,
          tire_name: sale.tire_name,
          sale_date: sale.sale_date,
        })),
      });
      setDefectiveTireSales(data);
    } catch (error) {
      console.error(
        "❌ [useDefectiveTireSales] Erro no refresh manual:",
        error
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    defectiveTireSales,
    addDefectiveTireSale,
    deleteDefectiveTireSale,
    refreshDefectiveTireSales,
    isLoading,
    isSaving,
  };
};

export const useCostSimulations = () => {
  const [costSimulations, setCostSimulations] = useState<CostSimulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadCostSimulations = async () => {
      setIsLoading(true);
      try {
        const data = await dataManager.loadCostSimulations();
        console.log("🔄 [useCostSimulations] Carregando simulações de custo:", {
          total: data.length,
          simulacoes: data.map((sim) => ({
            id: sim.id,
            name: sim.name,
            simulation_type: sim.simulation_type,
            created_at: sim.created_at,
          })),
        });
        setCostSimulations(data);
      } catch (error) {
        console.error(
          "❌ [useCostSimulations] Erro ao carregar simulações:",
          error
        );
        setCostSimulations([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadCostSimulations();
  }, []);

  const addCostSimulation = async (
    simulationData: Omit<CostSimulation, "id" | "created_at" | "updated_at">
  ) => {
    console.log("📝 [useCostSimulations] INICIANDO salvamento de simulação:", {
      name: simulationData.name,
      simulation_type: simulationData.simulation_type,
      cost_options: simulationData.cost_options,
    });
    setIsSaving(true);

    let newSimulation: CostSimulation | null = null;

    try {
      console.log(
        "🔄 [useCostSimulations] Salvando simulação no banco de dados..."
      );
      newSimulation = await dataManager.saveCostSimulation(simulationData);

      if (!newSimulation) {
        throw new Error(
          "DataManager retornou null - falha ao salvar simulação"
        );
      }

      console.log("✅ [useCostSimulations] Simulação salva no banco:", {
        id: newSimulation.id,
        name: newSimulation.name,
        simulation_type: newSimulation.simulation_type,
        created_at: newSimulation.created_at,
      });

      // Update local state
      setCostSimulations((prev) => {
        const updated = [newSimulation!, ...prev];
        console.log("✅ [useCostSimulations] Estado local atualizado:", {
          simulacoes_anteriores: prev.length,
          simulacoes_atuais: updated.length,
          nova_simulacao_id: newSimulation!.id,
        });
        return updated;
      });

      console.log(
        "🎉 [useCostSimulations] PROCESSO COMPLETO - Simulação salva com sucesso!"
      );
    } catch (error) {
      console.error(
        "❌ [useCostSimulations] ERRO CRÍTICO ao salvar simulação:",
        {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          simulationData,
        }
      );
      throw error;
    } finally {
      setIsSaving(false);
    }

    return newSimulation;
  };

  const updateCostSimulation = async (
    id: string,
    updates: Partial<CostSimulation>
  ) => {
    console.log("🔄 [useCostSimulations] Atualizando simulação:", {
      id,
      updates,
    });
    setIsSaving(true);

    try {
      const updatedSimulation = await dataManager.updateCostSimulation(
        id,
        updates
      );
      if (updatedSimulation) {
        setCostSimulations((prev) =>
          prev.map((sim) => (sim.id === id ? updatedSimulation : sim))
        );
        console.log(
          "✅ [useCostSimulations] Simulação atualizada:",
          updatedSimulation
        );
      }
      return updatedSimulation;
    } catch (error) {
      console.error(
        "❌ [useCostSimulations] Erro ao atualizar simulação:",
        error
      );
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCostSimulation = async (id: string) => {
    console.log("🗑️ [useCostSimulations] Deletando simulação:", id);
    setIsSaving(true);

    try {
      const success = await dataManager.deleteCostSimulation(id);
      if (success) {
        console.log(
          "✅ [useCostSimulations] Simulação deletada, atualizando estado local"
        );
        setCostSimulations((prev) => prev.filter((sim) => sim.id !== id));
      } else {
        console.error("❌ [useCostSimulations] Falha ao deletar simulação");
      }
      return success;
    } catch (error) {
      console.error(
        "❌ [useCostSimulations] Erro ao deletar simulação:",
        error
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Function to manually refresh the cost simulations
  const refreshCostSimulations = async () => {
    console.log(
      "🔄 [useCostSimulations] REFRESH MANUAL - Atualizando simulações..."
    );
    setIsLoading(true);

    try {
      const data = await dataManager.loadCostSimulations();
      console.log("✅ [useCostSimulations] REFRESH MANUAL concluído:", {
        total: data.length,
      });
      setCostSimulations(data);
    } catch (error) {
      console.error("❌ [useCostSimulations] Erro no refresh manual:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    costSimulations,
    addCostSimulation,
    updateCostSimulation,
    deleteCostSimulation,
    refreshCostSimulations,
    isLoading,
    isSaving,
  };
};

export const useResaleProducts = () => {
  const [resaleProducts, setResaleProducts] = useState<ResaleProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadResaleProducts = async () => {
      setIsLoading(true);
      const data = await dataManager.loadResaleProducts();
      setResaleProducts(data);
      setIsLoading(false);
    };
    loadResaleProducts();
  }, []);

  const addResaleProduct = async (
    productData: Omit<ResaleProduct, "id" | "created_at" | "updated_at">
  ) => {
    setIsSaving(true);
    const newProduct = await dataManager.saveResaleProduct(productData);
    if (newProduct) {
      setResaleProducts((prev) => [...prev, newProduct]);
    }
    setIsSaving(false);
    return newProduct;
  };

  const updateResaleProduct = async (
    id: string,
    updates: Partial<ResaleProduct>
  ) => {
    setIsSaving(true);
    const updatedProduct = await dataManager.updateResaleProduct(id, updates);
    if (updatedProduct) {
      setResaleProducts((prev) =>
        prev.map((p) => (p.id === id ? updatedProduct : p))
      );
    }
    setIsSaving(false);
    return updatedProduct;
  };

  return {
    resaleProducts,
    addResaleProduct,
    updateResaleProduct,
    isLoading,
    isSaving,
  };
};

export const useWarrantyEntries = () => {
  const [warrantyEntries, setWarrantyEntries] = useState<WarrantyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadWarrantyEntries = async () => {
      setIsLoading(true);
      try {
        const data = await dataManager.loadWarrantyEntries();
        console.log(
          "🔄 [useWarrantyEntries] Carregando entradas de garantia:",
          data.length
        );
        setWarrantyEntries(data);
      } catch (error) {
        console.error(
          "❌ [useWarrantyEntries] Erro ao carregar garantias:",
          error
        );
        setWarrantyEntries([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadWarrantyEntries();
  }, []);

  const addWarrantyEntry = async (
    warrantyData: Omit<WarrantyEntry, "id" | "created_at">
  ) => {
    console.log("📝 [useWarrantyEntries] INICIANDO registro de garantia:", {
      customer_name: warrantyData.customer_name,
      product_name: warrantyData.product_name,
      warranty_date: warrantyData.warranty_date,
      salesperson_name: warrantyData.salesperson_name,
      quantity: warrantyData.quantity,
    });
    setIsSaving(true);

    let newWarranty: WarrantyEntry | null = null;

    try {
      console.log(
        "🔄 [useWarrantyEntries] Salvando garantia no banco de dados..."
      );
      newWarranty = await dataManager.saveWarrantyEntry(warrantyData);

      if (!newWarranty) {
        throw new Error("DataManager retornou null - falha ao salvar garantia");
      }

      console.log("✅ [useWarrantyEntries] Garantia salva no banco:", {
        id: newWarranty.id,
        customer_name: newWarranty.customer_name,
        product_name: newWarranty.product_name,
        warranty_date: newWarranty.warranty_date,
        created_at: newWarranty.created_at,
      });

      // Update local state immediately
      setWarrantyEntries((prev) => {
        const updated = [newWarranty!, ...prev];
        console.log("✅ [useWarrantyEntries] Estado local atualizado:", {
          garantias_anteriores: prev.length,
          garantias_atuais: updated.length,
          nova_garantia_id: newWarranty!.id,
        });
        return updated;
      });

      console.log(
        "🎉 [useWarrantyEntries] PROCESSO COMPLETO - Garantia registrada com sucesso!"
      );
    } catch (error) {
      console.error(
        "❌ [useWarrantyEntries] ERRO CRÍTICO ao salvar garantia:",
        {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          warrantyData,
        }
      );
      throw error;
    } finally {
      setIsSaving(false);
    }

    return newWarranty;
  };

  const loadWarrantyEntriesByCustomer = async (customerId: string) => {
    try {
      console.log(
        `🔄 [useWarrantyEntries] Carregando garantias do cliente: ${customerId}`
      );
      const data = await dataManager.loadWarrantyEntriesByCustomer(customerId);
      console.log(
        `✅ [useWarrantyEntries] Garantias do cliente carregadas:`,
        data.length
      );
      return data;
    } catch (error) {
      console.error(
        "❌ [useWarrantyEntries] Erro ao carregar garantias do cliente:",
        error
      );
      return [];
    }
  };

  const deleteWarrantyEntry = async (id: string) => {
    console.log("🗑️ [useWarrantyEntries] Deletando entrada de garantia:", id);
    setIsSaving(true);

    try {
      const success = await dataManager.deleteWarrantyEntry(id);
      if (success) {
        console.log(
          "✅ [useWarrantyEntries] Garantia deletada, atualizando estado local"
        );
        setWarrantyEntries((prev) => prev.filter((entry) => entry.id !== id));
      } else {
        console.error(
          "❌ [useWarrantyEntries] Falha ao deletar entrada de garantia"
        );
      }
      return success;
    } catch (error) {
      console.error("❌ [useWarrantyEntries] Erro ao deletar garantia:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    warrantyEntries,
    addWarrantyEntry,
    deleteWarrantyEntry,
    loadWarrantyEntriesByCustomer,
    isLoading,
    isSaving,
  };
};

// Interface for cost calculation options (shared between TireCostManager and Dashboard)
interface CostCalculationOptions {
  includeLaborCosts: boolean;
  includeCashFlowExpenses: boolean;
  includeProductionLosses: boolean;
  includeDefectiveTireSales: boolean;
  includeWarrantyValues: boolean;
  divideByProduction: boolean;
}

// Interface for synchronized cost data
interface SynchronizedCostData {
  averageCostPerTire: number;
  lastUpdated: string;
  costOptions: CostCalculationOptions;
}

// Hook to manage shared cost calculation options and synchronized cost data
export const useCostCalculationOptions = () => {
  const [costOptions, setCostOptions] = useState<CostCalculationOptions>(() => {
    const saved = localStorage.getItem("tireCostManager_costOptions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log(
          "🔄 [useCostCalculationOptions] Opções de custo carregadas do localStorage:",
          parsed
        );
        return parsed;
      } catch (error) {
        console.error(
          "❌ [useCostCalculationOptions] Erro ao carregar opções de custo:",
          error
        );
      }
    }

    const defaultOptions = {
      includeLaborCosts: false,
      includeCashFlowExpenses: false,
      includeProductionLosses: false,
      includeDefectiveTireSales: false,
      includeWarrantyValues: false,
      divideByProduction: true,
    };

    console.log(
      "🔄 [useCostCalculationOptions] Usando opções padrão:",
      defaultOptions
    );

    return defaultOptions;
  });

  // State for synchronized cost data
  const [synchronizedCostData, setSynchronizedCostData] =
    useState<SynchronizedCostData | null>(() => {
      const saved = localStorage.getItem(
        "tireCostManager_synchronizedCostData"
      );
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          console.log(
            "🔄 [useCostCalculationOptions] Dados de custo sincronizados carregados:",
            {
              averageCostPerTire: parsed.averageCostPerTire,
              lastUpdated: parsed.lastUpdated,
            }
          );
          return parsed;
        } catch (error) {
          console.error(
            "❌ [useCostCalculationOptions] Erro ao carregar dados sincronizados:",
            error
          );
        }
      }
      return null;
    });

  // Listen for changes in localStorage (when TireCostManager updates the options or cost data)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "tireCostManager_costOptions" && e.newValue) {
        try {
          const newOptions = JSON.parse(e.newValue);
          console.log(
            "🔄 [useCostCalculationOptions] Opções atualizadas via localStorage:",
            {
              anterior: costOptions,
              nova: newOptions,
            }
          );
          setCostOptions(newOptions);
        } catch (error) {
          console.error(
            "❌ [useCostCalculationOptions] Erro ao processar mudança do localStorage:",
            error
          );
        }
      }

      if (e.key === "tireCostManager_synchronizedCostData" && e.newValue) {
        try {
          const newCostData = JSON.parse(e.newValue);
          console.log(
            "🔄 [useCostCalculationOptions] Dados de custo sincronizados atualizados via localStorage:",
            {
              anterior: synchronizedCostData?.averageCostPerTire || 0,
              nova: newCostData.averageCostPerTire,
              lastUpdated: newCostData.lastUpdated,
            }
          );
          setSynchronizedCostData(newCostData);
        } catch (error) {
          console.error(
            "❌ [useCostCalculationOptions] Erro ao processar mudança dos dados sincronizados:",
            error
          );
        }
      }
    };

    // Listen for storage events from other tabs/components
    window.addEventListener("storage", handleStorageChange);

    // Also check for changes periodically (in case changes happen in the same tab)
    const interval = setInterval(() => {
      // Check cost options
      const savedOptions = localStorage.getItem("tireCostManager_costOptions");
      if (savedOptions) {
        try {
          const parsed = JSON.parse(savedOptions);
          // Only update if there are actual changes
          if (JSON.stringify(parsed) !== JSON.stringify(costOptions)) {
            console.log(
              "🔄 [useCostCalculationOptions] Opções atualizadas via polling:",
              {
                anterior: costOptions,
                nova: parsed,
              }
            );
            setCostOptions(parsed);
          }
        } catch (error) {
          console.error(
            "❌ [useCostCalculationOptions] Erro no polling do localStorage (opções):",
            error
          );
        }
      }

      // Check synchronized cost data
      const savedCostData = localStorage.getItem(
        "tireCostManager_synchronizedCostData"
      );
      if (savedCostData) {
        try {
          const parsed = JSON.parse(savedCostData);
          // Only update if there are actual changes
          if (JSON.stringify(parsed) !== JSON.stringify(synchronizedCostData)) {
            console.log(
              "🔄 [useCostCalculationOptions] Dados de custo sincronizados atualizados via polling:",
              {
                anterior: synchronizedCostData?.averageCostPerTire || 0,
                nova: parsed.averageCostPerTire,
                lastUpdated: parsed.lastUpdated,
              }
            );
            setSynchronizedCostData(parsed);
          }
        } catch (error) {
          console.error(
            "❌ [useCostCalculationOptions] Erro no polling do localStorage (dados sincronizados):",
            error
          );
        }
      }
    }, 5000); // Verifica a cada 5s (era 1s: pesado com N telas montadas)

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [costOptions, synchronizedCostData]);

  return {
    costOptions,
    synchronizedCostData,
    averageCostPerTire: synchronizedCostData?.averageCostPerTire || 0,
    isIncludingLaborCosts: costOptions.includeLaborCosts,
    isIncludingCashFlowExpenses: costOptions.includeCashFlowExpenses,
    isIncludingProductionLosses: costOptions.includeProductionLosses,
    isIncludingDefectiveTireSales: costOptions.includeDefectiveTireSales,
    isIncludingWarrantyValues: costOptions.includeWarrantyValues,
    isDividingByProduction: costOptions.divideByProduction,
  };
};

// Hook for managing debts with Supabase integration
export const useDebts = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadDebts = async () => {
      setIsLoading(true);
      try {
        const data = await dataManager.loadDebts();
        console.log("🔍 [useDebts] Dívidas carregadas - dados brutos:", data);
        console.log("🔍 [useDebts] Primeira dívida detalhada:", data[0]);
        if (data[0]) {
          console.log("🔍 [useDebts] Tipos dos campos da primeira dívida:", {
            remaining_amount: typeof data[0].remaining_amount,
            total_amount: typeof data[0].total_amount,
            paid_amount: typeof data[0].paid_amount,
            remaining_amount_value: data[0].remaining_amount,
            total_amount_value: data[0].total_amount,
            paid_amount_value: data[0].paid_amount,
          });
        }

        // Log all debts with their paid_amount values
        data.forEach((debt, index) => {
          console.log(`💰 [useDebts] Debt ${index + 1} (${debt.id}):`, {
            description: debt.description,
            total_amount: debt.total_amount,
            paid_amount: debt.paid_amount,
            remaining_amount: debt.remaining_amount,
            paid_amount_type: typeof debt.paid_amount,
            paid_amount_raw: debt.paid_amount,
          });
        });
        setDebts(data);
        console.log("✅ [useDebts] Dívidas carregadas:", data.length);
      } catch (error) {
        console.error("❌ [useDebts] Erro ao carregar dívidas:", error);
        setDebts([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadDebts();
  }, []);

  const addDebt = async (
    debtData: Omit<Debt, "id" | "created_at" | "updated_at">
  ) => {
    console.log("🚀 [useDebts] Iniciando addDebt...");
    console.log("📝 [useDebts] Dados recebidos:", debtData);

    setIsSaving(true);
    try {
      console.log("📤 [useDebts] Chamando dataManager.saveDebt...");
      const newDebt = await dataManager.saveDebt(debtData);
      console.log("📥 [useDebts] Resposta do dataManager.saveDebt:", newDebt);

      if (newDebt) {
        setDebts((prev) => {
          const updated = [...prev, newDebt];
          console.log(
            "🔄 [useDebts] Estado de dívidas atualizado. Total:",
            updated.length
          );
          return updated;
        });
        console.log("✅ [useDebts] Dívida adicionada com sucesso:", newDebt.id);
        return newDebt;
      } else {
        console.log("⚠️ [useDebts] dataManager.saveDebt retornou null");
        throw new Error("Falha ao salvar dívida - resultado null");
      }
    } catch (error) {
      console.error("❌ [useDebts] Erro ao adicionar dívida:", error);
      console.error("❌ [useDebts] Stack trace:", error.stack);
      throw error;
    } finally {
      setIsSaving(false);
      console.log("🏁 [useDebts] addDebt finalizado");
    }
  };

  const updateDebt = async (id: string, updates: Partial<Debt>) => {
    setIsSaving(true);
    try {
      const success = await dataManager.updateDebt(id, updates);
      if (success) {
        setDebts((prev) =>
          prev.map((debt) =>
            debt.id === id
              ? { ...debt, ...updates, updated_at: new Date().toISOString() }
              : debt
          )
        );
        console.log(" [useDebts] Dívida atualizada:", id);
        return true;
      }
      return false;
    } catch (error) {
      console.error(" [useDebts] Erro ao atualizar dívida:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDebt = async (id: string) => {
    setIsSaving(true);
    try {
      const success = await dataManager.deleteDebt(id);
      if (success) {
        setDebts((prev) => prev.filter((debt) => debt.id !== id));
        console.log(" [useDebts] Dívida excluída:", id);
        return true;
      }
      return false;
    } catch (error) {
      console.error(" [useDebts] Erro ao excluir dívida:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const refreshDebts = async () => {
    setIsLoading(true);
    try {
      const data = await dataManager.loadDebts();
      setDebts(data);
      console.log(" [useDebts] Dívidas recarregadas:", data.length);
    } catch (error) {
      console.error(" [useDebts] Erro ao recarregar dívidas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    debts,
    addDebt,
    updateDebt,
    deleteDebt,
    refreshDebts,
    isLoading,
    isSaving,
  };
};
