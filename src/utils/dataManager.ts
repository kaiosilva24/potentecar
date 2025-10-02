// Utility functions for data persistence and management with Supabase
import { supabase } from "../../supabase/supabase";
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
  PendingSale,
  Debt,
} from "@/types/financial";

export class DataManager {
  private static instance: DataManager;
  private listeners: Map<string, Set<() => void>> = new Map();

  // Access Supabase client from the imported instance
  private get supabase() {
    return supabase;
  }

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  // Generic database operations
  async saveToDatabase<
    T extends {
      id?: string;
      created_at?: string;
      updated_at?: string;
      last_updated?: string;
    },
  >(tableName: string, data: T): Promise<T | null> {
    try {
      const { id, created_at, updated_at, last_updated, ...dataToSave } = data;

      console.log(`🔧 [DataManager] saveToDatabase para ${tableName}:`, {
        originalData: data,
        cleanedData: dataToSave,
        removedFields: { id, created_at, updated_at, last_updated },
      });

      if (!id || id.startsWith("temp_")) {
        // Insert new record (no id or temp id)
        console.log(`🆕 [DataManager] Inserindo novo registro em ${tableName}...`);
        const { data: insertedData, error } = await this.supabase
          .from(tableName)
          .insert([dataToSave])
          .select()
          .single();

        if (error) {
          console.error(
            `❌ [DataManager] Erro detalhado ao inserir em ${tableName}:`,
            {
              error,
              dataToSave,
              originalData: data,
            },
          );
          throw error;
        }

        console.log(
          `✅ [DataManager] Dados inseridos em ${tableName}:`,
          insertedData,
        );
        
        // Log específico para production_entries para debug da data
        if (tableName === 'production_entries' && insertedData) {
          console.log('🔍 [DataManager] DEBUG DATA SALVA:', {
            production_date_raw: (insertedData as any).production_date,
            production_date_type: typeof (insertedData as any).production_date,
            production_date_parsed: new Date((insertedData as any).production_date),
            production_date_formatted_ptbr: new Date((insertedData as any).production_date).toLocaleDateString('pt-BR'),
            production_date_formatted_iso: new Date((insertedData as any).production_date).toISOString(),
            timezone_offset: new Date().getTimezoneOffset(),
            current_date: new Date().toISOString(),
            data_enviada_para_supabase: dataToSave,
            data_retornada_do_supabase: insertedData,
          });
        }
        
        return insertedData;
      } else if (id) {
        // Update existing record
        const { data: updatedData, error } = await this.supabase
          .from(tableName)
          .update(dataToSave)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error(
            `❌ [DataManager] Erro detalhado ao atualizar em ${tableName}:`,
            {
              error,
              dataToSave,
              originalData: data,
              id,
            },
          );
          throw error;
        }

        console.log(
          `✅ [DataManager] Dados atualizados em ${tableName}:`,
          updatedData,
        );
        return updatedData;
      }

      return null;
    } catch (error) {
      console.error(`❌ [DataManager] Erro ao salvar em ${tableName}:`, error);
      return null;
    }
  }

  async loadFromDatabase<T>(tableName: string): Promise<T[]> {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log(
        `✅ [DataManager] Dados carregados de ${tableName}:`,
        data?.length || 0,
      );
      return data || [];
    } catch (error) {
      console.error(
        `❌ [DataManager] Erro ao carregar de ${tableName}:`,
        error,
      );
      return [];
    }
  }

  private async updateInDatabase(tableName: string, id: string, updates: any): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error(`Erro ao atualizar ${tableName}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Erro ao atualizar ${tableName}:`, error);
      return false;
    }
  }

  private async deleteFromDatabase(tableName: string, id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Erro ao deletar de ${tableName}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Erro ao deletar de ${tableName}:`, error);
      return false;
    }
  }

  // Remove stock item by item_id (for when products are archived)
  async removeStockItemByItemId(itemId: string): Promise<boolean> {
    try {
      console.log(
        `🗑️ [DataManager] Removendo item do estoque por item_id: ${itemId}`,
      );

      // First, find the stock item to get details for logging
      const { data: stockItem, error: findError } = await this.supabase
        .from("stock_items")
        .select("*")
        .eq("item_id", itemId)
        .single();

      if (findError) {
        if (findError.code === "PGRST116") {
          console.log(
            `ℹ️ [DataManager] Item não encontrado no estoque: ${itemId}`,
          );
          return true; // Not an error if item doesn't exist in stock
        }
        throw findError;
      }

      if (stockItem) {
        console.log(`📦 [DataManager] Item encontrado no estoque:`, {
          id: stockItem.id,
          item_name: stockItem.item_name,
          quantity: stockItem.quantity,
          total_value: stockItem.total_value,
        });

        // Delete the stock item
        const { error: deleteError } = await this.supabase
          .from("stock_items")
          .delete()
          .eq("item_id", itemId);

        if (deleteError) throw deleteError;

        console.log(`✅ [DataManager] Item removido do estoque com sucesso:`, {
          item_id: itemId,
          item_name: stockItem.item_name,
          quantidade_removida: stockItem.quantity,
        });
      }

      return true;
    } catch (error) {
      console.error(
        `❌ [DataManager] Erro ao remover item do estoque por item_id ${itemId}:`,
        {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      return false;
    }
  }

  // Specific methods for each entity type
  async saveMaterial(
    material: Omit<RawMaterial, "id" | "created_at" | "updated_at">,
  ): Promise<RawMaterial | null> {
    return this.saveToDatabase("raw_materials", {
      ...material,
      id: `temp_${Date.now()}`,
    });
  }

  async loadMaterials(): Promise<RawMaterial[]> {
    return this.loadFromDatabase<RawMaterial>("raw_materials");
  }

  async updateMaterial(
    id: string,
    updates: Partial<RawMaterial>,
  ): Promise<RawMaterial | null> {
    return this.saveToDatabase("raw_materials", { ...updates, id });
  }

  // Delete material permanently
  async deleteMaterial(id: string): Promise<boolean> {
    try {
      console.log(
        `🗑️ [DataManager] Deletando matéria-prima permanentemente: ${id}`,
      );

      // First, remove any related stock items
      console.log(
        `🗑️ [DataManager] Removendo itens de estoque relacionados à matéria-prima: ${id}`,
      );
      const { error: stockError } = await this.supabase
        .from("stock_items")
        .delete()
        .eq("item_id", id)
        .eq("item_type", "material");

      if (stockError) {
        console.warn(
          "⚠️ [DataManager] Erro ao remover itens de estoque (pode não existir):",
          stockError,
        );
        // Continue with material deletion even if stock removal fails
      } else {
        console.log("✅ [DataManager] Itens de estoque removidos com sucesso");
      }

      // Then delete the material
      const { error: materialError } = await this.supabase
        .from("raw_materials")
        .delete()
        .eq("id", id);

      if (materialError) {
        console.error(
          "❌ [DataManager] Erro ao deletar matéria-prima:",
          materialError,
        );
        return false;
      }

      console.log(
        "✅ [DataManager] Matéria-prima deletada permanentemente com sucesso",
      );
      return true;
    } catch (error) {
      console.error(
        "❌ [DataManager] Erro crítico ao deletar matéria-prima:",
        error,
      );
      return false;
    }
  }

  async saveProduct(
    product: Omit<Product, "id" | "created_at" | "updated_at">,
  ): Promise<Product | null> {
    return this.saveToDatabase("products", {
      ...product,
      id: `temp_${Date.now()}`,
    });
  }

  async loadProducts(): Promise<Product[]> {
    return this.loadFromDatabase<Product>("products");
  }

  async updateProduct(
    id: string,
    updates: Partial<Product>,
  ): Promise<Product | null> {
    return this.saveToDatabase("products", { ...updates, id });
  }

  // Delete product permanently
  async deleteProduct(id: string): Promise<boolean> {
    try {
      console.log(`🗑️ [DataManager] Deletando produto permanentemente: ${id}`);

      // First, remove any related stock items
      console.log(
        `🗑️ [DataManager] Removendo itens de estoque relacionados ao produto: ${id}`,
      );
      const { error: stockError } = await this.supabase
        .from("stock_items")
        .delete()
        .eq("item_id", id)
        .eq("item_type", "product");

      if (stockError) {
        console.warn(
          "⚠️ [DataManager] Erro ao remover itens de estoque (pode não existir):",
          stockError,
        );
        // Continue with product deletion even if stock removal fails
      } else {
        console.log("✅ [DataManager] Itens de estoque removidos com sucesso");
      }

      // Then delete the product
      const { error: productError } = await this.supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (productError) {
        console.error(
          "❌ [DataManager] Erro ao deletar produto:",
          productError,
        );
        return false;
      }

      console.log(
        "✅ [DataManager] Produto deletado permanentemente com sucesso",
      );

      // Recalcular e atualizar o saldo de produtos finais após exclusão
      console.log("🔄 [DataManager] Recalculando saldo de produtos finais após exclusão...");
      await this.recalculateFinalProductStockBalance();

      return true;
    } catch (error) {
      console.error("❌ [DataManager] Erro crítico ao deletar produto:", error);
      return false;
    }
  }

  async saveEmployee(
    employee: Omit<Employee, "id" | "created_at" | "updated_at">,
  ): Promise<Employee | null> {
    return this.saveToDatabase("employees", {
      ...employee,
      id: `temp_${Date.now()}`,
    });
  }

  async loadEmployees(): Promise<Employee[]> {
    return this.loadFromDatabase<Employee>("employees");
  }

  async updateEmployee(
    id: string,
    updates: Partial<Employee>,
  ): Promise<Employee | null> {
    return this.saveToDatabase("employees", { ...updates, id });
  }

  async saveCustomer(
    customer: Omit<Customer, "id" | "created_at" | "updated_at">,
  ): Promise<Customer | null> {
    return this.saveToDatabase("customers", {
      ...customer,
      id: `temp_${Date.now()}`,
    });
  }

  async loadCustomers(): Promise<Customer[]> {
    return this.loadFromDatabase<Customer>("customers");
  }

  async updateCustomer(
    id: string,
    updates: Partial<Customer>,
  ): Promise<Customer | null> {
    return this.saveToDatabase("customers", { ...updates, id });
  }

  async saveSupplier(
    supplier: Omit<Supplier, "id" | "created_at" | "updated_at">,
  ): Promise<Supplier | null> {
    return this.saveToDatabase("suppliers", {
      ...supplier,
      id: `temp_${Date.now()}`,
    });
  }

  async loadSuppliers(): Promise<Supplier[]> {
    return this.loadFromDatabase<Supplier>("suppliers");
  }

  async updateSupplier(
    id: string,
    updates: Partial<Supplier>,
  ): Promise<Supplier | null> {
    return this.saveToDatabase("suppliers", { ...updates, id });
  }

  async saveStockItem(
    stockItem: Omit<StockItem, "id" | "created_at">,
  ): Promise<StockItem | null> {
    try {
      // Remove fields that don't exist in the stock_items table
      const {
        last_updated,
        updated_at, // This field doesn't exist in stock_items table
        ...dataToSave
      } = stockItem;

      // Validar tipos aceitos
      const validItemTypes = ["material", "product", "resaleProduct"];
      if (!validItemTypes.includes(dataToSave.item_type)) {
        console.warn(`⚠️ [DataManager] Tipo de item não reconhecido: ${dataToSave.item_type}, convertendo para 'product'`);
        dataToSave.item_type = "product";
      }

      console.log(
        `🔧 [DataManager] Inserindo stock item com dados:`,
        dataToSave,
      );

      const { data: insertedData, error } = await this.supabase
        .from("stock_items")
        .insert([dataToSave])
        .select()
        .single();

      if (error) {
        console.error(
          `❌ [DataManager] Erro detalhado ao inserir stock item:`,
          {
            error,
            dataToSave,
            originalStockItem: stockItem,
          },
        );
        throw error;
      }

      console.log(
        `✅ [DataManager] Stock item inserido com sucesso:`,
        insertedData,
      );
      return insertedData;
    } catch (error) {
      console.error(`❌ [DataManager] Erro ao salvar stock item:`, error);
      return null;
    }
  }

  async loadStockItems(): Promise<StockItem[]> {
    return this.loadFromDatabase<StockItem>("stock_items");
  }

  async updateStockItem(
    id: string,
    updates: Partial<StockItem>,
  ): Promise<StockItem | null> {
    try {
      // First, check if the stock item exists
      const { data: existingItem, error: checkError } = await this.supabase
        .from("stock_items")
        .select("id, item_name, quantity")
        .eq("id", id)
        .single();

      if (checkError) {
        console.error(
          `❌ [DataManager] Erro ao verificar se stock item existe:`,
          {
            id,
            errorMessage: checkError.message,
            errorCode: checkError.code,
            errorDetails: checkError.details,
          },
        );
        throw new Error(
          `Stock item com ID ${id} não encontrado: ${checkError.message}`,
        );
      }

      if (!existingItem) {
        console.error(`❌ [DataManager] Stock item não encontrado:`, { id });
        throw new Error(`Stock item com ID ${id} não encontrado`);
      }

      console.log(`✅ [DataManager] Stock item encontrado:`, existingItem);

      // Create a clean object with only allowed fields for stock_items table
      const dataToUpdate: any = {};

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

      // Explicitly filter out any forbidden fields
      const forbiddenFields = ["updated_at", "created_at", "id"];

      Object.keys(updates).forEach((key) => {
        // Skip forbidden fields completely
        if (forbiddenFields.includes(key)) {
          console.warn(`🚫 [DataManager] Skipping forbidden field: ${key}`);
          return;
        }

        // Only include allowed fields with defined values
        if (
          allowedFields.includes(key) &&
          updates[key as keyof StockItem] !== undefined &&
          updates[key as keyof StockItem] !== null
        ) {
          dataToUpdate[key] = updates[key as keyof StockItem];
        }
      });

      console.log(`🔧 [DataManager] Atualizando stock item ${id} com dados:`, {
        originalUpdates: updates,
        dataToUpdate,
        allowedFields,
        forbiddenFields,
        filteredOutFields: Object.keys(updates).filter(
          (key) =>
            !allowedFields.includes(key) || forbiddenFields.includes(key),
        ),
        hasDataToUpdate: Object.keys(dataToUpdate).length > 0,
        dataToUpdateKeys: Object.keys(dataToUpdate),
        dataToUpdateValues: Object.values(dataToUpdate),
      });

      // Validate that we have data to update
      if (Object.keys(dataToUpdate).length === 0) {
        console.warn(
          `⚠️ [DataManager] Nenhum dado válido para atualizar no stock item ${id}`,
        );
        console.warn(`⚠️ [DataManager] Updates originais:`, updates);
        console.warn(`⚠️ [DataManager] Campos permitidos:`, allowedFields);
        return null;
      }

      // Validate that the ID exists and is not empty
      if (!id || id.trim() === "") {
        console.error(
          `❌ [DataManager] ID inválido para atualizar stock item:`,
          { id, type: typeof id },
        );
        return null;
      }

      console.log(
        `🚀 [DataManager] Executando query Supabase para stock item ${id}...`,
      );

      // Double-check that no forbidden fields made it through
      forbiddenFields.forEach((field) => {
        if (dataToUpdate.hasOwnProperty(field)) {
          console.error(
            `❌ [DataManager] CRITICAL: Forbidden field ${field} found in dataToUpdate!`,
          );
          delete dataToUpdate[field];
        }
      });

      // Validate data types before sending to Supabase
      const validatedData: any = {};
      Object.entries(dataToUpdate).forEach(([key, value]) => {
        if (
          key === "quantity" ||
          key === "unit_cost" ||
          key === "total_value" ||
          key === "min_level" ||
          key === "max_level"
        ) {
          // Ensure numeric fields are numbers
          const numValue =
            typeof value === "string" ? parseFloat(value) : value;
          if (isNaN(numValue)) {
            console.error(
              `❌ [DataManager] Valor inválido para campo numérico ${key}:`,
              value,
            );
            throw new Error(`Valor inválido para campo ${key}: ${value}`);
          }
          validatedData[key] = numValue;
        } else {
          // String fields
          validatedData[key] = value;
        }
      });

      console.log(`🔍 [DataManager] Dados validados para update:`, {
        original: dataToUpdate,
        validated: validatedData,
      });

      const { data: updatedData, error } = await this.supabase
        .from("stock_items")
        .update(validatedData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(
          `❌ [DataManager] Erro detalhado ao atualizar stock item:`,
          {
            errorMessage: error.message,
            errorCode: error.code,
            errorDetails: error.details,
            errorHint: error.hint,
            fullError: error,
            id,
            dataToUpdate,
            originalUpdates: updates,
            finalDataKeys: Object.keys(dataToUpdate),
            supabaseQuery: `UPDATE stock_items SET ${Object.keys(dataToUpdate)
              .map((key) => `${key} = ?`)
              .join(", ")} WHERE id = '${id}'`,
          },
        );
        throw error;
      }

      console.log(
        `✅ [DataManager] Stock item atualizado com sucesso:`,
        updatedData,
      );
      return updatedData;
    } catch (error) {
      console.error(`❌ [DataManager] Erro ao atualizar stock item:`, {
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorCode: (error as any)?.code,
        errorDetails: (error as any)?.details,
        errorHint: (error as any)?.hint,
        fullError: error,
        stackTrace: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }

  async saveRecipe(
    recipe: Omit<ProductionRecipe, "id" | "created_at" | "updated_at">,
  ): Promise<ProductionRecipe | null> {
    return this.saveToDatabase("production_recipes", {
      ...recipe,
      id: `temp_${Date.now()}`,
    });
  }

  async loadRecipes(): Promise<ProductionRecipe[]> {
    return this.loadFromDatabase<ProductionRecipe>("production_recipes");
  }

  async updateRecipe(
    id: string,
    updates: Partial<ProductionRecipe>,
  ): Promise<ProductionRecipe | null> {
    return this.saveToDatabase("production_recipes", { ...updates, id });
  }

  async saveProductionEntry(
    entry: Omit<ProductionEntry, "id" | "created_at">,
  ): Promise<ProductionEntry | null> {
    console.log("🚀 [DataManager] INÍCIO - saveProductionEntry chamado:", {
      entry_recebida: entry,
      production_date_original: entry.production_date,
      timestamp: new Date().toISOString()
    });

    // WORKAROUND: Add +2 days to compensate Supabase UTC conversion
    // Based on logs: sending +1 day still results in -1 day, so we need +2 days
    const originalDate = new Date(entry.production_date);
    const adjustedDate = new Date(originalDate);
    adjustedDate.setDate(originalDate.getDate() + 2);
    const adjustedDateString = `${adjustedDate.getFullYear()}-${String(adjustedDate.getMonth() + 1).padStart(2, "0")}-${String(adjustedDate.getDate()).padStart(2, "0")}`;
    
    const adjustedEntry = {
      ...entry,
      production_date: adjustedDateString
    };
    
    console.log("💾 [DataManager] WORKAROUND APLICADO - Salvando entrada de produção:", {
      production_date_original: entry.production_date,
      production_date_ajustada: adjustedDateString,
      originalDate_obj: originalDate,
      adjustedDate_obj: adjustedDate,
      reason: "Workaround +2 dias para compensar conversão UTC do Supabase (ajustado baseado nos logs)",
      production_date_tipo: typeof adjustedDateString,
      entry_final: adjustedEntry
    });

    try {
      const result = await this.saveToDatabase("production_entries", {
        ...adjustedEntry,
        id: `temp_${Date.now()}`,
      });

      if (result) {
        console.log("✅ [DataManager] Entrada de produção salva com sucesso:", {
          id: result.id,
          product_name: result.product_name,
          production_date: result.production_date,
          production_date_formatted: new Date(
            result.production_date,
          ).toLocaleDateString("pt-BR"),
        });
      } else {
        console.error(
          "❌ [DataManager] Falha ao salvar entrada de produção - resultado nulo",
        );
      }

      return result;
    } catch (error) {
      console.error(
        "❌ [DataManager] Erro crítico ao salvar entrada de produção:",
        error,
      );
      return null;
    }
  }

  async loadProductionEntries(): Promise<ProductionEntry[]> {
    console.log("🔄 [DataManager] Carregando entradas de produção do banco...");

    try {
      const entries =
        await this.loadFromDatabase<ProductionEntry>("production_entries");

      console.log("✅ [DataManager] Entradas de produção carregadas:", {
        total: entries.length,
        entries: entries.map((e) => ({
          id: e.id,
          product_name: e.product_name,
          production_date: e.production_date,
          production_date_formatted: new Date(
            e.production_date,
          ).toLocaleDateString("pt-BR"),
        })),
      });

      return entries;
    } catch (error) {
      console.error(
        "❌ [DataManager] Erro ao carregar entradas de produção:",
        error,
      );
      return [];
    }
  }

  async deleteProductionEntry(id: string): Promise<boolean> {
    return this.deleteFromDatabase("production_entries", id);
  }

  async saveCustomUnit(unit: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from("custom_units")
        .insert([{ unit_name: unit }]);

      if (error) throw error;

      console.log(`✅ [DataManager] Unidade customizada salva:`, unit);
      return true;
    } catch (error) {
      console.error(
        `❌ [DataManager] Erro ao salvar unidade customizada:`,
        error,
      );
      return false;
    }
  }

  async loadCustomUnits(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from("custom_units")
        .select("unit_name")
        .order("unit_name");

      if (error) throw error;

      const units = data?.map((item) => item.unit_name) || [];
      console.log(
        `✅ [DataManager] Unidades customizadas carregadas:`,
        units.length,
      );
      return units;
    } catch (error) {
      console.error(
        `❌ [DataManager] Erro ao carregar unidades customizadas:`,
        error,
      );
      return [];
    }
  }

  async deleteCustomUnit(unit: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from("custom_units")
        .delete()
        .eq("unit_name", unit);

      if (error) throw error;

      console.log(`✅ [DataManager] Unidade customizada deletada:`, unit);
      return true;
    } catch (error) {
      console.error(
        `❌ [DataManager] Erro ao deletar unidade customizada:`,
        error,
      );
      return false;
    }
  }

  // Fixed Costs methods
  async saveFixedCost(
    fixedCost: Omit<FixedCost, "id" | "created_at" | "updated_at">,
  ): Promise<FixedCost | null> {
    return this.saveToDatabase("fixed_costs", {
      ...fixedCost,
      id: `temp_${Date.now()}`,
    });
  }

  async loadFixedCosts(): Promise<FixedCost[]> {
    return this.loadFromDatabase<FixedCost>("fixed_costs");
  }

  async updateFixedCost(
    id: string,
    updates: Partial<FixedCost>,
  ): Promise<FixedCost | null> {
    return this.saveToDatabase("fixed_costs", { ...updates, id });
  }

  // Variable Costs methods
  async saveVariableCost(
    variableCost: Omit<VariableCost, "id" | "created_at" | "updated_at">,
  ): Promise<VariableCost | null> {
    return this.saveToDatabase("variable_costs", {
      ...variableCost,
      id: `temp_${Date.now()}`,
    });
  }

  async loadVariableCosts(): Promise<VariableCost[]> {
    return this.loadFromDatabase<VariableCost>("variable_costs");
  }

  async updateVariableCost(
    id: string,
    updates: Partial<VariableCost>,
  ): Promise<VariableCost | null> {
    return this.saveToDatabase("variable_costs", { ...updates, id });
  }

  // Cash Flow methods
  async saveCashFlowEntry(
    entry: Omit<CashFlowEntry, "id" | "created_at">,
  ): Promise<CashFlowEntry | null> {
    console.log('💰 [DataManager] Salvando entrada de cash flow:', {
      type: entry.type,
      category: entry.category,
      reference_name: entry.reference_name,
      amount: entry.amount,
      transaction_date: entry.transaction_date,
      timestamp: new Date().toISOString()
    });

    const result = await this.saveToDatabase("cash_flow_entries", {
      ...entry,
      id: `temp_${Date.now()}`,
    });

    if (result) {
      console.log('✅ [DataManager] Entrada de cash flow salva com sucesso:', {
        id: result.id,
        type: result.type,
        category: result.category,
        amount: result.amount
      });

      // Disparar evento customizado para notificar sobre nova entrada de cash flow
      const cashFlowEvent = new CustomEvent('cashFlowEntryAdded', {
        detail: {
          entry: result,
          timestamp: Date.now(),
          source: 'DataManager-saveCashFlowEntry'
        }
      });
      window.dispatchEvent(cashFlowEvent);
    }

    return result;
  }

  async loadCashFlowEntries(): Promise<CashFlowEntry[]> {
    return this.loadFromDatabase<CashFlowEntry>("cash_flow_entries");
  }

  async updateCashFlowEntry(id: string, updates: Partial<CashFlowEntry>): Promise<boolean> {
    try {
      console.log('💰 [DataManager] Atualizando entrada de cash flow:', {
        id: id,
        updates: updates,
        timestamp: new Date().toISOString()
      });

      const success = await this.updateInDatabase("cash_flow_entries", id, updates);

      if (success) {
        console.log('✅ [DataManager] Entrada de cash flow atualizada com sucesso:', {
          id: id,
          updatedFields: Object.keys(updates)
        });
      } else {
        console.error('❌ [DataManager] Falha ao atualizar entrada de cash flow:', id);
      }

      return success;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao atualizar entrada de cash flow:', error);
      return false;
    }
  }

  async deleteCashFlowEntry(id: string): Promise<boolean> {
    return this.deleteFromDatabase("cash_flow_entries", id);
  }

  // Salespeople methods
  async saveSalesperson(
    salesperson: Omit<Salesperson, "id" | "created_at" | "updated_at">,
  ): Promise<Salesperson | null> {
    return this.saveToDatabase("salespeople", {
      ...salesperson,
      id: `temp_${Date.now()}`,
    });
  }

  async loadSalespeople(): Promise<Salesperson[]> {
    return this.loadFromDatabase<Salesperson>("salespeople");
  }

  async updateSalesperson(
    id: string,
    updates: Partial<Salesperson>,
  ): Promise<Salesperson | null> {
    return this.saveToDatabase("salespeople", { ...updates, id });
  }

  // Defective Tire Sales methods
  async saveDefectiveTireSale(
    sale: Omit<DefectiveTireSale, "id" | "created_at">,
  ): Promise<DefectiveTireSale | null> {
    console.log(
      "💾 [DataManager] INICIANDO salvamento de venda de pneu defeituoso:",
      {
        ...sale,
        sale_date_formatted: new Date(sale.sale_date).toLocaleDateString(
          "pt-BR",
        ),
      },
    );

    try {
      // Validate required fields
      if (
        !sale.tire_name ||
        !sale.quantity ||
        !sale.unit_price ||
        !sale.sale_value ||
        !sale.sale_date
      ) {
        throw new Error(
          "Campos obrigatórios faltando na venda de pneu defeituoso",
        );
      }

      // Clean data with all required fields
      const cleanSaleData = {
        tire_name: sale.tire_name.trim(),
        quantity: Number(sale.quantity),
        unit_price: Number(sale.unit_price),
        sale_value: Number(sale.sale_value),
        description: sale.description?.trim() || null,
        sale_date: sale.sale_date,
      };

      console.log(
        "🔧 [DataManager] Dados limpos para inserção:",
        cleanSaleData,
      );

      // Validate numeric fields
      if (isNaN(cleanSaleData.quantity) || cleanSaleData.quantity <= 0) {
        throw new Error(`Quantidade inválida: ${sale.quantity}`);
      }
      if (isNaN(cleanSaleData.unit_price) || cleanSaleData.unit_price <= 0) {
        throw new Error(`Preço unitário inválido: ${sale.unit_price}`);
      }
      if (isNaN(cleanSaleData.sale_value) || cleanSaleData.sale_value <= 0) {
        throw new Error(`Valor de venda inválido: ${sale.sale_value}`);
      }

      // Validate date format
      const dateTest = new Date(cleanSaleData.sale_date);
      if (isNaN(dateTest.getTime())) {
        throw new Error(`Data de venda inválida: ${sale.sale_date}`);
      }

      // Use direct Supabase insertion for better error handling
      const { data: insertedData, error } = await this.supabase
        .from("defective_tire_sales")
        .insert([cleanSaleData])
        .select()
        .single();

      if (error) {
        console.error(
          "❌ [DataManager] Erro detalhado ao inserir venda de pneu defeituoso:",
          {
            error,
            errorMessage: error.message,
            errorCode: error.code,
            errorDetails: error.details,
            errorHint: error.hint,
            cleanSaleData,
            originalSale: sale,
          },
        );
        throw error;
      }

      if (!insertedData) {
        throw new Error("Supabase retornou dados nulos após inserção");
      }

      console.log(
        "✅ [DataManager] Venda de pneu defeituoso salva com SUCESSO:",
        {
          id: insertedData.id,
          tire_name: insertedData.tire_name,
          quantity: insertedData.quantity,
          unit_price: insertedData.unit_price,
          sale_value: insertedData.sale_value,
          sale_date: insertedData.sale_date,
          sale_date_formatted: new Date(
            insertedData.sale_date,
          ).toLocaleDateString("pt-BR"),
          created_at: insertedData.created_at,
        },
      );

      // Verify the data was actually saved by querying it back
      console.log(
        "🔍 [DataManager] Verificando se a venda foi realmente salva...",
      );
      const { data: verificationData, error: verificationError } =
        await this.supabase
          .from("defective_tire_sales")
          .select("*")
          .eq("id", insertedData.id)
          .single();

      if (verificationError || !verificationData) {
        console.error(
          "❌ [DataManager] ERRO na verificação - venda não encontrada após inserção:",
          {
            verificationError,
            insertedId: insertedData.id,
          },
        );
        throw new Error(
          "Venda não foi encontrada após inserção - possível problema de consistência",
        );
      }

      console.log(
        "✅ [DataManager] VERIFICAÇÃO CONCLUÍDA - Venda confirmada no banco:",
        {
          id: verificationData.id,
          tire_name: verificationData.tire_name,
          quantity: verificationData.quantity,
          unit_price: verificationData.unit_price,
          sale_value: verificationData.sale_value,
          created_at: verificationData.created_at,
        },
      );

      return insertedData;
    } catch (error) {
      console.error(
        "❌ [DataManager] ERRO CRÍTICO ao salvar venda de pneu defeituoso:",
        {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          originalSale: sale,
          table: "defective_tire_sales",
        },
      );
      return null;
    }
  }

  async loadDefectiveTireSales(): Promise<DefectiveTireSale[]> {
    console.log(
      "🔄 [DataManager] CARREGANDO vendas de pneus defeituosos do banco...",
    );

    try {
      // Use direct Supabase query for better error handling
      const { data: sales, error } = await this.supabase
        .from("defective_tire_sales")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ [DataManager] Erro detalhado ao carregar vendas:", {
          error,
          errorMessage: error.message,
          errorCode: error.code,
          errorDetails: error.details,
        });
        throw error;
      }

      const salesData = sales || [];

      console.log("✅ [DataManager] Vendas de pneus defeituosos CARREGADAS:", {
        total: salesData.length,
        tabela: "defective_tire_sales",
        primeiras_vendas: salesData.slice(0, 3).map((s) => ({
          id: s.id,
          tire_name: s.tire_name,
          quantity: s.quantity,
          unit_price: s.unit_price,
          sale_value: s.sale_value,
          sale_date: s.sale_date,
          sale_date_formatted: new Date(s.sale_date).toLocaleDateString(
            "pt-BR",
          ),
          created_at: s.created_at,
        })),
      });

      // Validate data structure
      const validSales = salesData.filter((sale) => {
        const isValid =
          sale.id &&
          sale.tire_name &&
          sale.quantity &&
          sale.unit_price &&
          sale.sale_value &&
          sale.sale_date;
        if (!isValid) {
          console.warn(
            "⚠️ [DataManager] Venda com dados inválidos encontrada:",
            sale,
          );
        }
        return isValid;
      });

      if (validSales.length !== salesData.length) {
        console.warn(
          `⚠️ [DataManager] ${salesData.length - validSales.length} vendas com dados inválidos foram filtradas`,
        );
      }

      return validSales;
    } catch (error) {
      console.error(
        "❌ [DataManager] ERRO CRÍTICO ao carregar vendas de pneus defeituosos:",
        {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      return [];
    }
  }

  async deleteDefectiveTireSale(id: string): Promise<boolean> {
    return this.deleteFromDatabase("defective_tire_sales", id);
  }

  // Cost Simulation methods
  async saveCostSimulation(
    simulation: Omit<CostSimulation, "id" | "created_at" | "updated_at">,
  ): Promise<CostSimulation | null> {
    console.log(
      "💾 [DataManager] INICIANDO salvamento de simulação de custo:",
      {
        name: simulation.name,
        simulation_type: simulation.simulation_type,
        cost_options: simulation.cost_options,
      },
    );

    try {
      // Validate required fields
      if (!simulation.name || !simulation.simulation_type) {
        throw new Error("Campos obrigatórios faltando na simulação de custo");
      }

      // Clean data with all required fields
      const cleanSimulationData = {
        name: simulation.name.trim(),
        description: simulation.description?.trim() || null,
        simulation_type: simulation.simulation_type,
        cost_options: simulation.cost_options,
        simulation_data: simulation.simulation_data,
        results: simulation.results || null,
      };

      console.log(
        "🔧 [DataManager] Dados limpos para inserção:",
        cleanSimulationData,
      );

      // Use direct Supabase insertion for better error handling
      const { data: insertedData, error } = await this.supabase
        .from("cost_simulations")
        .insert([cleanSimulationData])
        .select()
        .single();

      if (error) {
        console.error(
          "❌ [DataManager] Erro detalhado ao inserir simulação de custo:",
          {
            error,
            errorMessage: error.message,
            errorCode: error.code,
            errorDetails: error.details,
            errorHint: error.hint,
            cleanSimulationData,
            originalSimulation: simulation,
          },
        );
        throw error;
      }

      if (!insertedData) {
        throw new Error("Supabase retornou dados nulos após inserção");
      }

      console.log("✅ [DataManager] Simulação de custo salva com SUCESSO:", {
        id: insertedData.id,
        name: insertedData.name,
        simulation_type: insertedData.simulation_type,
        created_at: insertedData.created_at,
      });

      return insertedData;
    } catch (error) {
      console.error(
        "❌ [DataManager] ERRO CRÍTICO ao salvar simulação de custo:",
        {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          originalSimulation: simulation,
          table: "cost_simulations",
        },
      );
      return null;
    }
  }

  async loadCostSimulations(): Promise<CostSimulation[]> {
    console.log("🔄 [DataManager] CARREGANDO simulações de custo do banco...");

    try {
      // Use direct Supabase query for better error handling
      const { data: simulations, error } = await this.supabase
        .from("cost_simulations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(
          "❌ [DataManager] Erro detalhado ao carregar simulações:",
          {
            error,
            errorMessage: error.message,
            errorCode: error.code,
            errorDetails: error.details,
          },
        );
        throw error;
      }

      const simulationsData = simulations || [];

      console.log("✅ [DataManager] Simulações de custo CARREGADAS:", {
        total: simulationsData.length,
        tabela: "cost_simulations",
        primeiras_simulacoes: simulationsData.slice(0, 3).map((s) => ({
          id: s.id,
          name: s.name,
          simulation_type: s.simulation_type,
          created_at: s.created_at,
        })),
      });

      // Validate data structure
      const validSimulations = simulationsData.filter((simulation) => {
        const isValid =
          simulation.id &&
          simulation.name &&
          simulation.simulation_type &&
          simulation.cost_options &&
          simulation.simulation_data;
        if (!isValid) {
          console.warn(
            "⚠️ [DataManager] Simulação com dados inválidos encontrada:",
            simulation,
          );
        }
        return isValid;
      });

      if (validSimulations.length !== simulationsData.length) {
        console.warn(
          `⚠️ [DataManager] ${simulationsData.length - validSimulations.length} simulações com dados inválidos foram filtradas`,
        );
      }

      return validSimulations;
    } catch (error) {
      console.error(
        "❌ [DataManager] ERRO CRÍTICO ao carregar simulações de custo:",
        {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      return [];
    }
  }

  async updateCostSimulation(
    id: string,
    updates: Partial<CostSimulation>,
  ): Promise<CostSimulation | null> {
    console.log("🔄 [DataManager] ATUALIZANDO simulação de custo:", {
      id,
      updates,
    });

    try {
      // Remove fields that shouldn't be updated
      const { id: _, created_at, ...dataToUpdate } = updates;

      // Clean the data
      const cleanUpdates: any = {};
      Object.keys(dataToUpdate).forEach((key) => {
        if (dataToUpdate[key as keyof CostSimulation] !== undefined) {
          cleanUpdates[key] = dataToUpdate[key as keyof CostSimulation];
        }
      });

      if (Object.keys(cleanUpdates).length === 0) {
        console.warn(
          `⚠️ [DataManager] Nenhum dado válido para atualizar na simulação ${id}`,
        );
        return null;
      }

      const { data: updatedData, error } = await this.supabase
        .from("cost_simulations")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(
          "❌ [DataManager] Erro detalhado ao atualizar simulação de custo:",
          {
            error,
            errorMessage: error.message,
            errorCode: error.code,
            errorDetails: error.details,
            id,
            cleanUpdates,
            originalUpdates: updates,
          },
        );
        throw error;
      }

      console.log(
        "✅ [DataManager] Simulação de custo atualizada com sucesso:",
        updatedData,
      );
      return updatedData;
    } catch (error) {
      console.error(
        "❌ [DataManager] ERRO CRÍTICO ao atualizar simulação de custo:",
        {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          id,
          updates,
        },
      );
      return null;
    }
  }

  async deleteCostSimulation(id: string): Promise<boolean> {
    console.log("🗑️ [DataManager] DELETANDO simulação de custo:", id);
    return this.deleteFromDatabase("cost_simulations", id);
  }

  // Resale Products methods
  async saveResaleProduct(
    resaleProduct: Omit<ResaleProduct, "id" | "created_at" | "updated_at">,
  ): Promise<ResaleProduct | null> {
    return this.saveToDatabase("resale_products", {
      ...resaleProduct,
      id: `temp_${Date.now()}`,
    });
  }

  async loadResaleProducts(): Promise<ResaleProduct[]> {
    return this.loadFromDatabase<ResaleProduct>("resale_products");
  }

  async updateResaleProduct(
    id: string,
    updates: Partial<ResaleProduct>,
  ): Promise<ResaleProduct | null> {
    return this.saveToDatabase("resale_products", { ...updates, id });
  }

  // Warranty Entry methods
  async saveWarrantyEntry(
    warrantyEntry: Omit<WarrantyEntry, "id" | "created_at">,
  ): Promise<WarrantyEntry | null> {
    console.log(
      "💾 [DataManager] INICIANDO salvamento de entrada de garantia:",
      {
        customer_name: warrantyEntry.customer_name,
        product_name: warrantyEntry.product_name,
        quantity: warrantyEntry.quantity,
        warranty_date: warrantyEntry.warranty_date,
        warranty_date_formatted: new Date(
          warrantyEntry.warranty_date,
        ).toLocaleDateString("pt-BR"),
      },
    );

    try {
      // Validate required fields
      if (
        !warrantyEntry.customer_id ||
        !warrantyEntry.customer_name ||
        !warrantyEntry.product_name ||
        !warrantyEntry.salesperson_name ||
        !warrantyEntry.quantity ||
        !warrantyEntry.warranty_date
      ) {
        throw new Error("Campos obrigatórios faltando na entrada de garantia");
      }

      // Clean data with all required fields
      const cleanWarrantyData = {
        customer_id: warrantyEntry.customer_id.trim(),
        customer_name: warrantyEntry.customer_name.trim(),
        product_name: warrantyEntry.product_name.trim(),
        salesperson_name: warrantyEntry.salesperson_name.trim(),
        quantity: Number(warrantyEntry.quantity),
        warranty_date: warrantyEntry.warranty_date,
        description: warrantyEntry.description?.trim() || null,
      };

      console.log(
        "🔧 [DataManager] Dados limpos para inserção:",
        cleanWarrantyData,
      );

      // Validate numeric fields
      if (
        isNaN(cleanWarrantyData.quantity) ||
        cleanWarrantyData.quantity <= 0
      ) {
        throw new Error(`Quantidade inválida: ${warrantyEntry.quantity}`);
      }

      // Validate date format
      const dateTest = new Date(cleanWarrantyData.warranty_date);
      if (isNaN(dateTest.getTime())) {
        throw new Error(
          `Data de garantia inválida: ${warrantyEntry.warranty_date}`,
        );
      }

      // Use direct Supabase insertion for better error handling
      const { data: insertedData, error } = await this.supabase
        .from("warranty_entries")
        .insert([cleanWarrantyData])
        .select()
        .single();

      if (error) {
        console.error(
          "❌ [DataManager] Erro detalhado ao inserir entrada de garantia:",
          {
            error,
            errorMessage: error.message,
            errorCode: error.code,
            errorDetails: error.details,
            errorHint: error.hint,
            cleanWarrantyData,
            originalWarrantyEntry: warrantyEntry,
          },
        );
        throw error;
      }

      if (!insertedData) {
        throw new Error("Supabase retornou dados nulos após inserção");
      }

      console.log("✅ [DataManager] Entrada de garantia salva com SUCESSO:", {
        id: insertedData.id,
        customer_name: insertedData.customer_name,
        product_name: insertedData.product_name,
        salesperson_name: insertedData.salesperson_name,
        quantity: insertedData.quantity,
        warranty_date: insertedData.warranty_date,
        warranty_date_formatted: new Date(
          insertedData.warranty_date,
        ).toLocaleDateString("pt-BR"),
        created_at: insertedData.created_at,
      });

      // Verify the data was actually saved by querying it back
      console.log(
        "🔍 [DataManager] Verificando se a garantia foi realmente salva...",
      );
      const { data: verificationData, error: verificationError } =
        await this.supabase
          .from("warranty_entries")
          .select("*")
          .eq("id", insertedData.id)
          .single();

      if (verificationError || !verificationData) {
        console.error(
          "❌ [DataManager] ERRO na verificação - garantia não encontrada após inserção:",
          {
            verificationError,
            insertedId: insertedData.id,
          },
        );
        throw new Error(
          "Garantia não foi encontrada após inserção - possível problema de consistência",
        );
      }

      console.log(
        "✅ [DataManager] VERIFICAÇÃO CONCLUÍDA - Garantia confirmada no banco:",
        {
          id: verificationData.id,
          customer_name: verificationData.customer_name,
          product_name: verificationData.product_name,
          quantity: verificationData.quantity,
          warranty_date: verificationData.warranty_date,
          created_at: verificationData.created_at,
        },
      );

      return insertedData;
    } catch (error) {
      console.error(
        "❌ [DataManager] ERRO CRÍTICO ao salvar entrada de garantia:",
        {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          originalWarrantyEntry: warrantyEntry,
          table: "warranty_entries",
        },
      );
      return null;
    }
  }

  async loadWarrantyEntries(): Promise<WarrantyEntry[]> {
    console.log("🔄 [DataManager] CARREGANDO entradas de garantia do banco...");

    try {
      // Use direct Supabase query for better error handling
      const { data: warranties, error } = await this.supabase
        .from("warranty_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(
          "❌ [DataManager] Erro detalhado ao carregar garantias:",
          {
            error,
            errorMessage: error.message,
            errorCode: error.code,
            errorDetails: error.details,
          },
        );
        throw error;
      }

      const warrantiesData = warranties || [];

      console.log("✅ [DataManager] Entradas de garantia CARREGADAS:", {
        total: warrantiesData.length,
        tabela: "warranty_entries",
        primeiras_garantias: warrantiesData.slice(0, 3).map((w) => ({
          id: w.id,
          customer_name: w.customer_name,
          product_name: w.product_name,
          salesperson_name: w.salesperson_name,
          quantity: w.quantity,
          warranty_date: w.warranty_date,
          warranty_date_formatted: new Date(w.warranty_date).toLocaleDateString(
            "pt-BR",
          ),
          created_at: w.created_at,
        })),
      });

      // Validate data structure
      const validWarranties = warrantiesData.filter((warranty) => {
        const isValid =
          warranty.id &&
          warranty.customer_id &&
          warranty.customer_name &&
          warranty.product_name &&
          warranty.salesperson_name &&
          warranty.quantity &&
          warranty.warranty_date;
        if (!isValid) {
          console.warn(
            "⚠️ [DataManager] Garantia com dados inválidos encontrada:",
            warranty,
          );
        }
        return isValid;
      });

      if (validWarranties.length !== warrantiesData.length) {
        console.warn(
          `⚠️ [DataManager] ${warrantiesData.length - validWarranties.length} garantias com dados inválidos foram filtradas`,
        );
      }

      return validWarranties;
    } catch (error) {
      console.error(
        "❌ [DataManager] ERRO CRÍTICO ao carregar entradas de garantia:",
        {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      return [];
    }
  }

  async deleteWarrantyEntry(id: string): Promise<boolean> {
    console.log("🗑️ [DataManager] DELETANDO entrada de garantia:", id);
    return this.deleteFromDatabase("warranty_entries", id);
  }

  async loadWarrantyEntriesByCustomer(
    customerId: string,
  ): Promise<WarrantyEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from("warranty_entries")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log(
        `✅ [DataManager] Garantias do cliente ${customerId} carregadas:`,
        data?.length || 0,
      );
      return data || [];
    } catch (error) {
      console.error(
        `❌ [DataManager] Erro ao carregar garantias do cliente ${customerId}:`,
        error,
      );
      return [];
    }
  }

  // Legacy localStorage methods for backward compatibility
  saveData<T>(key: string, data: T): boolean {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
      localStorage.setItem(`${key}_backup`, serializedData);
      localStorage.setItem(`${key}_timestamp`, new Date().toISOString());

      console.log(`✅ [DataManager] Dados salvos localmente: ${key}`);
      this.notifyListeners(key);
      return true;
    } catch (error) {
      console.error(
        `❌ [DataManager] Erro ao salvar localmente ${key}:`,
        error,
      );
      return false;
    }
  }

  loadData<T>(key: string, defaultValue: T): T {
    try {
      let savedData = localStorage.getItem(key);

      if (!savedData) {
        savedData = localStorage.getItem(`${key}_backup`);
        if (savedData) {
          console.warn(`⚠️ [DataManager] Usando backup para ${key}`);
        }
      }

      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log(`✅ [DataManager] Dados carregados localmente: ${key}`);
        return parsedData;
      }
    } catch (error) {
      console.error(
        `❌ [DataManager] Erro ao carregar localmente ${key}:`,
        error,
      );
    }

    console.log(`🆕 [DataManager] Usando valor padrão para ${key}`);
    return defaultValue;
  }

  // Subscribe to data changes
  subscribe(key: string, callback: () => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  // Notify listeners of data changes
  private notifyListeners(key: string): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback();
        } catch (error) {
          console.error(
            `❌ [DataManager] Erro no listener para ${key}:`,
            error,
          );
        }
      });
    }
  }

  // Get all stored keys
  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        key.startsWith("tire-factory-") &&
        !key.includes("_backup") &&
        !key.includes("_timestamp")
      ) {
        keys.push(key);
      }
    }
    return keys;
  }

  // Export all data
  exportAllData(): Record<string, any> {
    const allData: Record<string, any> = {};
    const keys = this.getAllKeys();

    keys.forEach((key) => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          allData[key] = JSON.parse(data);
        }
      } catch (error) {
        console.error(`❌ [DataManager] Erro ao exportar ${key}:`, error);
      }
    });

    return allData;
  }

  // Import all data
  importAllData(data: Record<string, any>): boolean {
    try {
      Object.entries(data).forEach(([key, value]) => {
        this.saveData(key, value);
      });
      console.log(`✅ [DataManager] Dados importados com sucesso`);
      return true;
    } catch (error) {
      console.error(`❌ [DataManager] Erro ao importar dados:`, error);
      return false;
    }
  }

  // Clear all data
  clearAllData(): void {
    const keys = this.getAllKeys();
    keys.forEach((key) => {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_backup`);
      localStorage.removeItem(`${key}_timestamp`);
    });
    console.log(`🗑️ [DataManager] Todos os dados foram limpos`);
  }

  // Get storage usage info
  getStorageInfo(): { used: number; available: number; keys: string[] } {
    let used = 0;
    const keys = this.getAllKeys();

    keys.forEach((key) => {
      const data = localStorage.getItem(key);
      if (data) {
        used += data.length;
      }
    });

    // Estimate available space (localStorage limit is usually 5-10MB)
    const estimated = 5 * 1024 * 1024; // 5MB

    return {
      used,
      available: estimated - used,
      keys,
    };
  }

  /**
   * Salva o custo médio por pneu no Supabase
   */
  async saveAverageTireCost(cost: number): Promise<boolean> {
    try {
      console.log(`💾 [DataManager] Salvando custo médio por pneu: R$ ${cost.toFixed(2)}`);

      const { error } = await this.supabase
        .from('system_settings')
        .upsert({
          key: 'average_tire_cost',
          value: cost.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('❌ [DataManager] Erro ao salvar no Supabase:', error);
        return false;
      }

      console.log('✅ [DataManager] Custo médio por pneu salvo no Supabase com sucesso');
      return true;

    } catch (error) {
      console.error('❌ [DataManager] Erro ao salvar custo médio por pneu:', error);
      return false;
    }
  }

  /**
   * Busca o custo médio por pneu do Supabase
   */
  async loadAverageTireCost(): Promise<number> {
    try {
      console.log('🔄 [DataManager] Carregando custo médio por pneu do Supabase...');

      const { data, error } = await this.supabase
        .from('system_settings')
        .select('value, updated_at')
        .eq('key', 'average_tire_cost')
        .single();

      if (error || !data) {
        console.warn('⚠️ [DataManager] Custo médio por pneu não encontrado no Supabase, usando valor padrão');
        return 101.09; // Valor padrão
      }

      const cost = Number(data.value);
      // Permitir valor 0 (zero) como válido
      const finalCost = isNaN(cost) ? 101.09 : cost;
      console.log(`✅ [DataManager] Custo médio por pneu carregado do Supabase: R$ ${finalCost.toFixed(2)}`);

      return finalCost;

    } catch (error) {
      console.error('❌ [DataManager] Erro ao carregar custo médio por pneu:', error);
      return 101.09; // Valor padrão em caso de erro
    }
  }

  /**
   * Subscreve às mudanças do custo médio por pneu em tempo real
   */
  subscribeToTireCostChanges(callback: (cost: number) => void): () => void {
    console.log('🔔 [DataManager] Iniciando subscription para custo médio por pneu...');

    const subscription = this.supabase
      .channel('tire-cost-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.average_tire_cost'
        },
        (payload) => {
          console.log('🔄 [DataManager] Mudança detectada no custo médio por pneu:', payload);

          if (payload.new && typeof payload.new === 'object' && 'value' in payload.new) {
            const newCost = Number(payload.new.value) || 101.09;
            console.log(`💰 [DataManager] Novo custo médio por pneu recebido: R$ ${newCost.toFixed(2)}`);

            // Chama callback
            callback(newCost);
          }
        }
      )
      .subscribe();

    // Retorna função para cancelar subscription
    return () => {
      console.log('🔕 [DataManager] Cancelando subscription do custo médio por pneu');
      subscription.unsubscribe();
    };
  }

  /**
   * Salva o lucro médio por pneu no Supabase e localStorage
   */
  async saveAverageTireProfit(profit: number): Promise<boolean> {
    try {
      console.log(`💰 [DataManager] Salvando lucro médio por pneu: R$ ${profit.toFixed(2)}`);

      // Tenta salvar no Supabase usando upsert
      const { error: supabaseError } = await this.supabase
        .from('system_settings')
        .upsert({
          key: 'average_tire_profit',
          value: profit,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (supabaseError) {
        console.warn('⚠️ [DataManager] Erro ao salvar no Supabase (tabela pode não existir):', supabaseError);
        console.log('📱 [DataManager] Salvando apenas no localStorage como fallback');
      } else {
        console.log('✅ [DataManager] Lucro médio por pneu salvo no Supabase com sucesso');
      }

      return true;

    } catch (error) {
      console.error('❌ [DataManager] Erro crítico ao salvar lucro médio por pneu:', error);
      return false;
    }
  }
  /**
   * Busca o lucro médio por pneu do Supabase com fallback para localStorage
   */
  async loadAverageTireProfit(): Promise<number> {
    try {
      console.log('🔄 [DataManager] Carregando lucro médio por pneu do Supabase...');

      // Tenta carregar do Supabase primeiro
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('value, updated_at')
        .eq('key', 'average_tire_profit')
        .single();

      if (!error && data && data.value !== null) {
        const profit = Number(data.value);
        if (!isNaN(profit) && profit > 0) {
          console.log(`✅ [DataManager] Lucro médio por pneu carregado do Supabase: R$ ${profit.toFixed(2)}`);
          return profit;
        }
      }

      console.warn('⚠️ [DataManager] Supabase não retornou valor válido, usando valor padrão');
      return 78.77; // Valor padrão
    } catch (error) {
      console.error('❌ [DataManager] Erro ao carregar lucro médio por pneu:', error);
      return 78.77; // Valor padrão em caso de erro
    }
  }

  /**
   * Configura subscription em tempo real para mudanças no lucro médio por pneu
  subscribeToTireProfitChanges(callback: (newProfit: number) => void): () => void {
    console.log('🔔 [DataManager] Iniciando subscription para lucro médio por pneu...');

    const subscription = this.supabase
      .channel('tire_profit_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.average_tire_profit'
        },
        (payload) => {
          console.log('🔄 [DataManager] Mudança detectada no lucro médio por pneu:', payload);

          if (payload.new && typeof payload.new === 'object' && 'value' in payload.new) {
            const newProfit = Number(payload.new.value) || 78.77;
            console.log(`📡 [DataManager] Novo lucro médio por pneu recebido: R$ ${newProfit.toFixed(2)}`);

            // Chama callback
            callback(newProfit);
          }
        }
      )
      .subscribe();

    // Retorna função para cancelar subscription
    return () => {
      console.log('🔕 [DataManager] Cancelando subscription do lucro médio por pneu');
      subscription.unsubscribe();
    };
  }

  /**
   * Salva o lucro médio de produtos de revenda no Supabase e localStorage
   */
  async saveAverageResaleProfit(profit: number): Promise<boolean> {
    try {
      console.log(`💰 [DataManager] Salvando lucro médio de produtos de revenda: R$ ${profit.toFixed(2)}`);

      // Tenta salvar no Supabase usando upsert
      const { error: supabaseError } = await this.supabase
        .from('system_settings')
        .upsert({
          key: 'average_resale_profit',
          value: profit,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (supabaseError) {
        console.warn('⚠️ [DataManager] Erro ao salvar no Supabase (tabela pode não existir):', supabaseError);
        console.log('📱 [DataManager] Salvando apenas no localStorage como fallback');
      } else {
        console.log('✅ [DataManager] Lucro médio de produtos de revenda salvo no Supabase com sucesso');
      }

      return true;

    } catch (error) {
      console.error('❌ [DataManager] Erro crítico ao salvar lucro médio de produtos de revenda:', error);
      return false;
    }
  }

  /**
   * Salva o lucro médio de produtos de revenda apenas no Supabase (sem localStorage)
   */
  async saveAverageResaleProfit(profit: number): Promise<boolean> {
    try {
      console.log(`💾 [DataManager] Salvando lucro médio de produtos de revenda: R$ ${profit.toFixed(2)}`);

      const { error } = await this.supabase
        .from('system_settings')
        .upsert({
          key: 'average_resale_profit',
          value: profit.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('❌ [DataManager] Erro ao salvar no Supabase:', error);
        return false;
      }

      console.log('✅ [DataManager] Lucro médio de produtos de revenda salvo no Supabase com sucesso');
      return true;

    } catch (error) {
      console.error('❌ [DataManager] Erro ao salvar lucro médio de produtos de revenda:', error);
      return false;
    }
  }

  /**
   * Busca o lucro médio de produtos de revenda apenas do Supabase (sem localStorage)
   */
  async loadAverageResaleProfit(): Promise<number> {
    try {
      console.log('🔄 [DataManager] Carregando lucro médio de produtos de revenda do Supabase...');

      const { data, error } = await this.supabase
        .from('system_settings')
        .select('value, updated_at')
        .eq('key', 'average_resale_profit')
        .single();

      if (error) {
        console.warn('⚠️ [DataManager] Erro ao carregar do Supabase:', error.message);
        return 0; // Valor padrão
      }

      const profit = Number(data.value) || 0;
      console.log(`✅ [DataManager] Lucro médio de produtos de revenda carregado do Supabase: R$ ${profit.toFixed(2)}`);

      return profit;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao carregar lucro médio de produtos de revenda:', error);
      return 0; // Valor padrão em caso de erro
    }
  }

  /**
   * Configura subscription em tempo real para mudanças no lucro médio de produtos de revenda
   */
  subscribeToResaleProfitChanges(callback: (newProfit: number) => void): () => void {
    console.log('🔔 [DataManager] Iniciando subscription para lucro médio de produtos de revenda...');

    const subscription = this.supabase
      .channel('resale_profit_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.average_resale_profit'
        },
        (payload) => {
          console.log('🔄 [DataManager] Mudança detectada no lucro médio de produtos de revenda:', payload);

          if (payload.new && typeof payload.new === 'object' && 'value' in payload.new) {
            const newProfit = Number(payload.new.value) || 23.61;
            console.log(`📡 [DataManager] Novo lucro médio de produtos de revenda recebido: R$ ${newProfit.toFixed(2)}`);

            // Chama callback
            callback(newProfit);
          }
        }
      )
      .subscribe();

    // Retorna função para cancelar subscription
    return () => {
      console.log('🔕 [DataManager] Cancelando subscription do lucro médio de produtos de revenda');
      subscription.unsubscribe();
    };
  }

  /**
   * Salva uma configuração genérica do sistema no Supabase
   */
  async saveSystemSetting(key: string, value: any): Promise<boolean> {
    try {
      console.log(`💾 [DataManager] Salvando configuração do sistema: ${key} = ${value}`);

      const { error } = await this.supabase
        .from('system_settings')
        .upsert({
          key: key,
          value: value.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('❌ [DataManager] Erro ao salvar configuração no Supabase:', error);
        return false;
      }

      console.log(`✅ [DataManager] Configuração ${key} salva no Supabase com sucesso`);
      return true;

    } catch (error) {
      console.error(`❌ [DataManager] Erro ao salvar configuração ${key}:`, error);
      return false;
    }
  }

  /**
   * Busca uma configuração genérica do sistema do Supabase
   */
  async loadSystemSetting(key: string, defaultValue: any = null): Promise<any> {
    try {
      console.log(`🔄 [DataManager] Carregando configuração do sistema: ${key}`);

      const { data, error } = await this.supabase
        .from('system_settings')
        .select('value, updated_at')
        .eq('key', key)
        .single();

      if (error || !data) {
        console.warn(`⚠️ [DataManager] Configuração ${key} não encontrada no Supabase, usando valor padrão`);
        return defaultValue;
      }

      // Try to parse as number first, then string
      let value = data.value;
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        value = numValue;
      }

      console.log(`✅ [DataManager] Configuração ${key} carregada do Supabase: ${value}`);
      return value;

    } catch (error) {
      console.error(`❌ [DataManager] Erro ao carregar configuração ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Subscreve às mudanças de uma configuração específica do sistema em tempo real
   */
  subscribeToSystemSettingChanges(key: string, callback: (value: any) => void): () => void {
    console.log(`🔔 [DataManager] Iniciando subscription para configuração: ${key}`);

    const subscription = this.supabase
      .channel(`system_setting_${key}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: `key=eq.${key}`
        },
        (payload) => {
          console.log(`🔄 [DataManager] Mudança detectada na configuração ${key}:`, payload);

          if (payload.new && typeof payload.new === 'object' && 'value' in payload.new) {
            let value = payload.new.value;

            // Try to parse as number first, then string
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              value = numValue;
            }

            console.log(`📡 [DataManager] Novo valor para ${key} recebido: ${value}`);
            callback(value);
          }
        }
      )
      .subscribe();

    // Retorna função para cancelar subscription
    return () => {
      console.log(`🔕 [DataManager] Cancelando subscription da configuração: ${key}`);
      subscription.unsubscribe();
    };
  }

  /**
   * Salva o lucro médio por pneu no Supabase
   */
  async saveAverageTireProfit(profit: number): Promise<boolean> {
    try {
      console.log(`💾 [DataManager] Salvando lucro médio por pneu: R$ ${profit.toFixed(2)}`);

      // Tenta salvar no Supabase
      const { error } = await this.supabase
        .from('system_settings')
        .upsert({
          key: 'average_tire_profit',
          value: profit.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('❌ [DataManager] Erro ao salvar no Supabase (usando localStorage como fallback):', error);
        // Salva no localStorage como fallback
        localStorage.setItem('dashboard_tireProfitValue_unified', JSON.stringify({
          value: profit,
          timestamp: Date.now()
        }));
        return true; // Retorna true porque localStorage funcionou
      }

      // Também salva no localStorage como backup
      localStorage.setItem('dashboard_tireProfitValue_unified', JSON.stringify({
        value: profit,
        timestamp: Date.now()
      }));

      console.log('✅ [DataManager] Lucro médio por pneu salvo no Supabase com sucesso');
      return true;

    } catch (error) {
      console.error('❌ [DataManager] Erro ao salvar lucro médio por pneu:', error);
      // Fallback para localStorage
      try {
        localStorage.setItem('dashboard_tireProfitValue_unified', JSON.stringify({
          value: profit,
          timestamp: Date.now()
        }));
        return true;
      } catch (localError) {
        console.error('❌ [DataManager] Erro também no localStorage:', localError);
        return false;
      }
    }
  }

  /**
   * Busca o lucro médio por pneu do Supabase com fallback para localStorage
   */
  async loadAverageTireProfit(): Promise<number> {
    try {
      console.log('🔄 [DataManager] Carregando lucro médio por pneu do Supabase...');

      // Tenta carregar do Supabase primeiro
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('value, updated_at')
        .eq('key', 'average_tire_profit')
        .single();

      if (!error && data && data.value !== null) {
        const profit = Number(data.value);
        if (!isNaN(profit) && profit > 0) {
          console.log(`✅ [DataManager] Lucro médio por pneu carregado do Supabase: R$ ${profit.toFixed(2)}`);
          return profit;
        }
      }

      console.warn('⚠️ [DataManager] Supabase não retornou valor válido, tentando localStorage...');

      // Fallback para localStorage
      const localData = localStorage.getItem('dashboard_tireProfitValue_unified');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (parsed && typeof parsed.value === 'number' && parsed.value > 0) {
            console.log(`✅ [DataManager] Lucro médio por pneu carregado do localStorage: R$ ${parsed.value.toFixed(2)}`);
            return parsed.value;
          }
        } catch (parseError) {
          console.error('❌ [DataManager] Erro ao parsear dados do localStorage:', parseError);
        }
      }

      console.warn('⚠️ [DataManager] Nenhum valor válido encontrado, usando valor padrão');
      return 78.77; // Valor padrão baseado no exemplo do usuário

    } catch (error) {
      console.error('❌ [DataManager] Erro ao carregar lucro médio por pneu:', error);

      // Fallback final para localStorage
      try {
        const localData = localStorage.getItem('dashboard_tireProfitValue_unified');
        if (localData) {
          const parsed = JSON.parse(localData);
          if (parsed && typeof parsed.value === 'number' && parsed.value > 0) {
            console.log(`✅ [DataManager] Lucro médio por pneu carregado do localStorage (fallback): R$ ${parsed.value.toFixed(2)}`);
            return parsed.value;
          }
        }
      } catch (fallbackError) {
        console.error('❌ [DataManager] Erro também no fallback localStorage:', fallbackError);
      }

      return 78.77; // Valor padrão em caso de erro total
    }
  }

  /**
   * Configura subscription em tempo real para mudanças no lucro médio por pneu
   */
  subscribeToTireProfitChanges(callback: (newProfit: number) => void): () => void {
    console.log('🔔 [DataManager] Iniciando subscription para lucro médio por pneu...');

    const subscription = this.supabase
      .channel('tire_profit_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.average_tire_profit'
        },
        (payload) => {
          console.log('🔄 [DataManager] Mudança detectada no lucro médio por pneu:', payload);

          if (payload.new && typeof payload.new === 'object' && 'value' in payload.new) {
            const newProfit = Number(payload.new.value) || 78.77;
            console.log(`📡 [DataManager] Novo lucro médio por pneu recebido: R$ ${newProfit.toFixed(2)}`);

            // Chama callback
            callback(newProfit);
          }
        }
      )
      .subscribe();

    // Retorna função para cancelar subscription
    return () => {
      console.log('🔕 [DataManager] Cancelando subscription do lucro médio por pneu');
      subscription.unsubscribe();
    };
  }

  /**
   * Salva o saldo de produtos finais apenas no Supabase (sem localStorage)
   */
  async saveFinalProductStockBalance(balance: number): Promise<boolean> {
    try {
      console.log(`📦 [DataManager] Salvando saldo de produtos finais: R$ ${balance.toFixed(2)}`);

      // Salvar no Supabase usando upsert
      const { error } = await this.supabase
        .from('system_settings')
        .upsert({
          key: 'final_product_stock_balance',
          value: balance.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('❌ [DataManager] Erro ao salvar saldo de produtos finais no Supabase:', error);
        return false;
      }

      console.log(`✅ [DataManager] Saldo de produtos finais salvo com sucesso: R$ ${balance.toFixed(2)}`);
      return true;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao salvar saldo de produtos finais:', error);
      return false;
    }
  }

  /**
   * Recalcula o saldo de produtos finais baseado nos stock_items atuais
   */
  async recalculateFinalProductStockBalance(): Promise<void> {
    try {
      console.log('🔄 [DataManager] Recalculando saldo de produtos finais...');

      // Buscar todos os stock_items do tipo 'product'
      const { data: stockItems, error } = await this.supabase
        .from('stock_items')
        .select('total_value')
        .eq('item_type', 'product');

      if (error) {
        console.error('❌ [DataManager] Erro ao buscar stock_items:', error);
        return;
      }

      // Calcular novo saldo
      const newBalance = stockItems?.reduce((total, item) => total + (item.total_value || 0), 0) || 0;
      console.log(`📊 [DataManager] Novo saldo calculado: R$ ${newBalance.toFixed(2)}`);

      // Salvar novo saldo
      await this.saveFinalProductStockBalance(newBalance);
      
      console.log('✅ [DataManager] Saldo de produtos finais recalculado com sucesso');
    } catch (error) {
      console.error('❌ [DataManager] Erro ao recalcular saldo de produtos finais:', error);
    }
  }

  /**
   * Carrega o saldo de produtos finais apenas do Supabase (sem localStorage)
   */
  async loadFinalProductStockBalance(): Promise<number> {
    try {
      console.log('🔍 [DataManager] Carregando saldo de produtos finais do Supabase...');

      const { data, error } = await this.supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'final_product_stock_balance')
        .single();

      if (error) {
        console.warn('⚠️ [DataManager] Erro ao carregar do Supabase:', error.message);
        return 0; // Valor padrão
      }

      const balance = Number(data.value) || 0;
      console.log(`✅ [DataManager] Saldo de produtos finais carregado do Supabase: R$ ${balance.toFixed(2)}`);

      return balance;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao carregar saldo de produtos finais:', error);
      return 0; // Valor padrão em caso de erro
    }
  }

  /**
   * Configura subscription em tempo real para mudanças no saldo de produtos finais
   */
  subscribeToFinalProductStockChanges(callback: (newBalance: number) => void): () => void {
    console.log('🔔 [DataManager] Iniciando subscription para mudanças no saldo de produtos finais...');

    const subscription = this.supabase
      .channel('final_product_stock_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.final_product_stock_balance'
        },
        (payload) => {
          console.log('📡 [DataManager] Mudança detectada no saldo de produtos finais:', payload);

          if (payload.new && payload.new.value) {
            const newBalance = Number(payload.new.value) || 0;

            if (newBalance >= 0) {
              console.log(`💰 [DataManager] Novo saldo de produtos finais: R$ ${newBalance.toFixed(2)}`);
              callback(newBalance);
            }
          }
        }
      )
      .subscribe();

    console.log('✅ [DataManager] Subscription ativa para mudanças no saldo de produtos finais');

    // Retornar função de cleanup
    return () => {
      console.log('🔌 [DataManager] Cancelando subscription do saldo de produtos finais');
      this.supabase.removeChannel(subscription);
    };
  }

  /**
   * Salva o saldo de matéria-prima apenas no Supabase (sem localStorage)
   */
  async saveRawMaterialStockBalance(balance: number): Promise<boolean> {
    try {
      console.log(`💾 [DataManager] Salvando saldo de matéria-prima: R$ ${balance.toFixed(2)}`);

      // Salvar no Supabase usando upsert
      const { error } = await this.supabase
        .from('system_settings')
        .upsert({
          key: 'raw_material_stock_balance',
          value: balance.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('❌ [DataManager] Erro ao salvar saldo de matéria-prima no Supabase:', error);
        return false;
      }

      console.log(`✅ [DataManager] Saldo de matéria-prima salvo com sucesso: R$ ${balance.toFixed(2)}`);
      return true;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao salvar saldo de matéria-prima:', error);
      return false;
    }
  }

  /**
   * Salva o saldo de caixa no Supabase
   */
  async saveCashBalance(balance: number): Promise<boolean> {
    try {
      console.log(`💰 [DataManager] Salvando saldo de caixa: R$ ${balance.toFixed(2)}`);

      // Salvar no Supabase usando upsert
      const { error } = await this.supabase
        .from('system_settings')
        .upsert({
          key: 'cash_balance',
          value: balance.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('❌ [DataManager] Erro ao salvar saldo de caixa no Supabase:', error);
        return false;
      }

      console.log(`✅ [DataManager] Saldo de caixa salvo com sucesso: R$ ${balance.toFixed(2)}`);
      return true;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao salvar saldo de caixa:', error);
      return false;
    }
  }

  /**
   * Carrega o saldo de caixa do Supabase
   */
  async loadCashBalance(): Promise<number> {
    try {
      console.log('🔍 [DataManager] Carregando saldo de caixa do Supabase...');

      const { data, error } = await this.supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'cash_balance')
        .single();

      if (error) {
        console.warn('⚠️ [DataManager] Erro ao carregar saldo de caixa do Supabase:', error.message);
        return 0; // Valor padrão
      }

      const balance = Number(data.value) || 0;
      console.log(`✅ [DataManager] Saldo de caixa carregado do Supabase: R$ ${balance.toFixed(2)}`);

      return balance;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao carregar saldo de caixa:', error);
      return 0; // Valor padrão em caso de erro
    }
  }

  /**
   * Configura subscription em tempo real para mudanças no saldo de caixa
   */
  subscribeToCashBalanceChanges(callback: (newBalance: number) => void): () => void {
    console.log('🔔 [DataManager] Iniciando subscription para mudanças no saldo de caixa...');

    const subscription = this.supabase
      .channel('cash_balance_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.cash_balance'
        },
        (payload) => {
          console.log('📡 [DataManager] Mudança detectada no saldo de caixa:', payload);

          if (payload.new && payload.new.value) {
            const newBalance = Number(payload.new.value) || 0;

            if (newBalance >= 0) {
              console.log(`💰 [DataManager] Novo saldo de caixa: R$ ${newBalance.toFixed(2)}`);
              callback(newBalance);
            }
          }
        }
      )
      .subscribe();

    console.log('✅ [DataManager] Subscription ativa para mudanças no saldo de caixa');

    // Retornar função de cleanup
    return () => {
      console.log('🔌 [DataManager] Cancelando subscription do saldo de caixa');
      this.supabase.removeChannel(subscription);
    };
  }

  /**
   * Carrega o saldo de matéria-prima apenas do Supabase (sem localStorage)
   */
  async loadRawMaterialStockBalance(): Promise<number> {
    try {
      console.log('🔍 [DataManager] Carregando saldo de matéria-prima do Supabase...');

      const { data, error } = await this.supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'raw_material_stock_balance')
        .single();

      if (error) {
        console.warn('⚠️ [DataManager] Erro ao carregar saldo de matéria-prima do Supabase:', error.message);
        return 0; // Valor padrão
      }

      const balance = Number(data.value) || 0;
      console.log(`✅ [DataManager] Saldo de matéria-prima carregado do Supabase: R$ ${balance.toFixed(2)}`);

      return balance;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao carregar saldo de matéria-prima:', error);
      return 0; // Valor padrão em caso de erro
    }
  }

  /**
   * Configura subscription em tempo real para mudanças no saldo de matéria-prima
   */
  subscribeToRawMaterialStockChanges(callback: (newBalance: number) => void): () => void {
    console.log('🔔 [DataManager] Iniciando subscription para mudanças no saldo de matéria-prima...');

    console.log('⚠️ [DataManager] TEMPORÁRIO: Subscription desabilitada (tabela system_settings não existe)');

    // TODO: Implementar Supabase Realtime quando tabela system_settings for criada
    // Por enquanto, retornar função vazia
    return () => {
      console.log('🔌 [DataManager] Cleanup de subscription de matéria-prima (vazia)');
    };
  }

  /**
   * Salva uma configuração do sistema no Supabase
   */
  async saveSystemSetting(key: string, value: string): Promise<boolean> {
    try {
      console.log(`💾 [DataManager] Salvando configuração do sistema: ${key}`);

      const { data: existingData, error: selectError } = await this.supabase
        .from('system_settings')
        .select('id, value')
        .eq('key', key)
        .single();

      // Handle case where the table might not exist yet
      if (selectError && selectError.code === '42P01') { // '42P01' is Undefined_table error code
          console.warn(`⚠️ [DataManager] Tabela 'system_settings' não encontrada. Tentando criar.`);
          // Attempt to create the table (this is a simplified example, actual DDL should be managed separately)
          // In a real app, you'd run migrations. For this example, we'll log a message.
          console.warn(`⚠️ [DataManager] Please ensure the 'system_settings' table exists with 'key' (TEXT, PRIMARY KEY), 'value' (TEXT), and 'updated_at' (TIMESTAMP WITH TIME ZONE) columns.`);
          // Proceed as if trying to insert, it might work if the table is implicitly created by some setups or will error again.
      } else if (selectError) {
          console.error(`❌ [DataManager] Erro ao verificar configuração ${key}:`, selectError);
          return false;
      }

      if (existingData) {
        // Atualizar registro existente
        const { error: updateError } = await this.supabase
          .from('system_settings')
          .update({
            value: value,
            updated_at: new Date().toISOString()
          })
          .eq('key', key);

        if (updateError) {
          console.error(`❌ [DataManager] Erro ao atualizar configuração ${key}:`, updateError);
          return false;
        }
      } else {
        // Inserir novo registro
        const { error: insertError } = await this.supabase
          .from('system_settings')
          .insert({
            key: key,
            value: value,
            description: `Configuração do sistema: ${key}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`❌ [DataManager] Erro ao inserir configuração ${key}:`, insertError);
          return false;
        }
      }

      console.log(`✅ [DataManager] Configuração ${key} salva com sucesso`);
      return true;
    } catch (error) {
      console.error(`❌ [DataManager] Erro ao salvar configuração ${key}:`, error);
      return false;
    }
  }

  /**
   * Carrega uma configuração do sistema do Supabase
   */
  async loadSystemSetting(key: string): Promise<string | null> {
    try {
      console.log(`🔍 [DataManager] Carregando configuração do sistema: ${key}`);

      const { data, error } = await this.supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          console.log(`⚠️ [DataManager] Configuração ${key} não encontrada`);
          return null;
        }
        console.error(`❌ [DataManager] Erro ao carregar configuração ${key}:`, error);
        return null;
      }

      console.log(`✅ [DataManager] Configuração ${key} carregada: ${data.value}`);
      return data.value;
    } catch (error) {
      console.error(`❌ [DataManager] Erro ao carregar configuração ${key}:`, error);
      return null;
    }
  }

  // ===== PRODUCT UNIT COST METHODS =====

  /**
   * Salva o custo unitário de um produto específico no Supabase
   */
  async saveProductUnitCost(productName: string, unitCost: number): Promise<boolean> {
    try {
      const key = `product_unit_cost_${productName.toLowerCase().replace(/\s+/g, '_')}`;
      console.log(`💰 [DataManager] Salvando custo unitário para ${productName}: R$ ${unitCost.toFixed(2)}`);

      const success = await this.saveSystemSetting(key, unitCost.toString());

      if (success) {
        // Salvar também no localStorage para fallback
        const productKey = `tireAnalysis_${productName.toLowerCase().replace(/\s+/g, '_')}`;
        const existingData = localStorage.getItem(productKey);
        let analysisData: any = {};

        if (existingData) {
          try {
            analysisData = JSON.parse(existingData);
          } catch (e) {
            console.warn(`⚠️ [DataManager] Erro ao parsear dados existentes para ${productName}`);
          }
        }

        analysisData.costPerTire = unitCost;
        analysisData.lastUpdated = Date.now();
        analysisData.source = 'DataManager-saveProductUnitCost';

        localStorage.setItem(productKey, JSON.stringify(analysisData));
        console.log(`✅ [DataManager] Custo unitário para ${productName} salvo no Supabase e localStorage`);
      }

      return success;
    } catch (error) {
      console.error(`❌ [DataManager] Erro ao salvar custo unitário para ${productName}:`, error);
      return false;
    }
  }

  /**
   * Carrega o custo unitário de um produto específico do Supabase
   */
  async loadProductUnitCost(productName: string): Promise<number | null> {
    try {
      const key = `product_unit_cost_${productName.toLowerCase().replace(/\s+/g, '_')}`;
      console.log(`🔍 [DataManager] Carregando custo unitário para ${productName}`);

      const costStr = await this.loadSystemSetting(key);

      if (costStr) {
        const cost = Number(costStr) || 0;
        console.log(`✅ [DataManager] Custo unitário para ${productName} carregado do Supabase: R$ ${cost.toFixed(2)}`);
        return cost;
      }

      // Fallback: tentar carregar do localStorage
      const productKey = `tireAnalysis_${productName.toLowerCase().replace(/\s+/g, '_')}`;
      const localData = localStorage.getItem(productKey);

      if (localData) {
        try {
          const analysis = JSON.parse(localData);
          if (analysis.costPerTire && analysis.costPerTire > 0) {
            console.log(`📦 [DataManager] Custo unitário para ${productName} carregado do localStorage: R$ ${analysis.costPerTire.toFixed(2)}`);

            // Sincronizar com Supabase para próximas consultas
            await this.saveProductUnitCost(productName, analysis.costPerTire);

            return analysis.costPerTire;
          }
        } catch (e) {
          console.warn(`⚠️ [DataManager] Erro ao parsear dados do localStorage para ${productName}`);
        }
      }

      console.log(`⚠️ [DataManager] Custo unitário para ${productName} não encontrado`);
      return null;
    } catch (error) {
      console.error(`❌ [DataManager] Erro ao carregar custo unitário para ${productName}:`, error);
      return null;
    }
  }

  /**
   * Carrega todos os custos unitários de produtos do Supabase
   */
  async loadAllProductUnitCosts(): Promise<{ [productName: string]: number }> {
    try {
      console.log('🔍 [DataManager] Carregando todos os custos unitários de produtos...');

      const { data, error } = await this.supabase
        .from('system_settings')
        .select('key, value')
        .like('key', 'product_unit_cost_%');

      if (error) {
        console.error('❌ [DataManager] Erro ao carregar custos unitários:', error);
        return {};
      }

      const costs: { [productName: string]: number } = {};

      if (data) {
        data.forEach(item => {
          const productName = item.key.replace('product_unit_cost_', '').replace(/_/g, ' ');
          const cost = Number(item.value) || 0;
          if (cost > 0) {
            costs[productName] = cost;
          }
        });
      }

      console.log(`✅ [DataManager] ${Object.keys(costs).length} custos unitários carregados do Supabase`);
      return costs;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao carregar custos unitários:', error);
      return {};
    }
  }

  /**
   * Configura subscription em tempo real para mudanças nos custos unitários
   */
  subscribeToProductCostChanges(callback: (productName: string, newCost: number) => void): () => void {
    console.log('🔔 [DataManager] Iniciando subscription para mudanças nos custos unitários...');

    const subscription = this.supabase
      .channel('product_costs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=like.product_unit_cost_%'
        },
        (payload) => {
          console.log('📡 [DataManager] Mudança detectada nos custos unitários:', payload);

          if (payload.new && payload.new.key && payload.new.value) {
            const productName = payload.new.key.replace('product_unit_cost_', '').replace(/_/g, ' ');
            const newCost = Number(payload.new.value) || 0;

            if (newCost > 0) {
              console.log(`💰 [DataManager] Novo custo unitário para ${productName}: R$ ${newCost.toFixed(2)}`);
              callback(productName, newCost);
            }
          }
        }
      )
      .subscribe();

    console.log('✅ [DataManager] Subscription ativa para mudanças nos custos unitários');

    // Retornar função de cleanup
    return () => {
      console.log('🔌 [DataManager] Cancelando subscription dos custos unitários');
      this.supabase.removeChannel(subscription);
    };
  }

  // ===== FINAL PRODUCT TOTAL QUANTITY METHODS =====

  /**
   * Salva a quantidade total de produtos finais apenas no Supabase (sem localStorage)
   */
  async saveFinalProductTotalQuantity(quantity: number): Promise<boolean> {
    try {
      console.log(`📦 [DataManager] Salvando quantidade total de produtos finais: ${quantity}`);

      const { error } = await this.supabase
        .from('system_settings')
        .upsert({
          key: 'final_product_total_quantity',
          value: quantity.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('❌ [DataManager] Erro ao salvar quantidade total de produtos finais no Supabase:', error);
        return false;
      }

      console.log(`✅ [DataManager] Quantidade total de produtos finais salva com sucesso: ${quantity}`);
      return true;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao salvar quantidade total de produtos finais:', error);
      return false;
    }
  }

  /**
   * Carrega a quantidade total de produtos finais apenas do Supabase (sem localStorage)
   */
  async loadFinalProductTotalQuantity(): Promise<number> {
    try {
      console.log('🔍 [DataManager] Carregando quantidade total de produtos finais do Supabase...');

      const { data, error } = await this.supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'final_product_total_quantity')
        .single();

      if (error) {
        console.warn('⚠️ [DataManager] Erro ao carregar quantidade total de produtos finais do Supabase:', error.message);
        return 0; // Valor padrão
      }

      const quantity = Number(data.value) || 0;
      console.log(`✅ [DataManager] Quantidade total de produtos finais carregada do Supabase: ${quantity}`);

      return quantity;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao carregar quantidade total de produtos finais:', error);
      return 0; // Valor padrão em caso de erro
    }
  }

  /**
   * Configura subscription em tempo real para mudanças na quantidade total de produtos finais
   */
  subscribeToFinalProductTotalQuantityChanges(callback: (newQuantity: number) => void): () => void {
    console.log('🔔 [DataManager] Iniciando subscription para mudanças na quantidade total de produtos finais...');

    const subscription = this.supabase
      .channel('final_product_quantity_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.final_product_total_quantity'
        },
        (payload) => {
          console.log('🔄 [DataManager] Mudança detectada na quantidade total de produtos finais:', payload);

          if (payload.new && typeof payload.new === 'object' && 'value' in payload.new) {
            const newQuantity = Number(payload.new.value) || 0;
            console.log(`📦 [DataManager] Nova quantidade total de produtos finais recebida: ${newQuantity}`);

            callback(newQuantity);
          }
        }
      )
      .subscribe();

    console.log('✅ [DataManager] Subscription ativa para mudanças na quantidade total de produtos finais');

    // Retornar função de cleanup
    return () => {
      console.log('🔌 [DataManager] Cancelando subscription da quantidade total de produtos finais');
      this.supabase.removeChannel(subscription);
    };
  }

  /**
   * Salva a quantidade unitária de matéria-prima apenas no Supabase (sem localStorage)
   */
  async saveRawMaterialUnitaryQuantity(quantity: number): Promise<boolean> {
    try {
      console.log(`💾 [DataManager] Salvando quantidade unitária de matéria-prima: ${quantity}`);

      // Salvar no Supabase usando upsert
      const { error } = await this.supabase
        .from('system_settings')
        .upsert({
          key: 'raw_material_unitary_quantity',
          value: quantity.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('❌ [DataManager] Erro ao salvar quantidade unitária de matéria-prima no Supabase:', error);
        return false;
      }

      console.log(`✅ [DataManager] Quantidade unitária de matéria-prima salva com sucesso: ${quantity}`);
      return true;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao salvar quantidade unitária de matéria-prima:', error);
      return false;
    }
  }

  /**
   * Carrega a quantidade unitária de matéria-prima apenas do Supabase (sem localStorage)
   */
  async loadRawMaterialUnitaryQuantity(): Promise<number> {
    try {
      console.log('🔍 [DataManager] Carregando quantidade unitária de matéria-prima do Supabase...');

      const { data, error } = await this.supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'raw_material_unitary_quantity')
        .single();

      if (error) {
        console.warn('⚠️ [DataManager] Erro ao carregar quantidade unitária de matéria-prima do Supabase:', error.message);
        return 0; // Valor padrão
      }

      const quantity = Number(data.value) || 0;
      console.log(`✅ [DataManager] Quantidade unitária de matéria-prima carregada do Supabase: ${quantity}`);

      return quantity;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao carregar quantidade unitária de matéria-prima:', error);
      return 0; // Valor padrão em caso de erro
    }
  }

  /**
   * Configura subscription em tempo real para mudanças na quantidade unitária de matéria-prima
   */
  subscribeToRawMaterialUnitaryQuantityChanges(callback: (newQuantity: number) => void): () => void {
    console.log('🔔 [DataManager] Iniciando subscription para mudanças na quantidade unitária de matéria-prima...');

    const subscription = this.supabase
      .channel('raw_material_unitary_quantity_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.raw_material_unitary_quantity'
        },
        (payload) => {
          console.log('📡 [DataManager] Mudança detectada na quantidade unitária de matéria-prima:', payload);

          if (payload.new && payload.new.value) {
            const newQuantity = Number(payload.new.value) || 0;

            if (newQuantity >= 0) {
              console.log(`📦 [DataManager] Nova quantidade unitária de matéria-prima: ${newQuantity}`);
              callback(newQuantity);
            }
          }
        }
      )
      .subscribe();

    console.log('✅ [DataManager] Subscription ativa para mudanças na quantidade unitária de matéria-prima');

    // Retornar função de cleanup
    return () => {
      console.log('🔌 [DataManager] Cancelando subscription da quantidade unitária de matéria-prima');
      this.supabase.removeChannel(subscription);
    };
  }

  /**
   * Salva a quantidade total de produtos revenda apenas no Supabase (sem localStorage)
   */
  async saveResaleProductTotalQuantity(quantity: number): Promise<boolean> {
    try {
      console.log(`💾 [DataManager] Salvando quantidade total de produtos revenda: ${quantity}`);

      // Salvar no Supabase usando upsert
      const { error } = await this.supabase
        .from('system_settings')
        .upsert({
          key: 'resale_product_total_quantity',
          value: quantity.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('❌ [DataManager] Erro ao salvar quantidade total de produtos revenda no Supabase:', error);
        return false;
      }

      console.log(`✅ [DataManager] Quantidade total de produtos revenda salva com sucesso: ${quantity}`);
      return true;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao salvar quantidade total de produtos revenda:', error);
      return false;
    }
  }

  /**
   * Carrega a quantidade total de produtos revenda apenas do Supabase (sem localStorage)
   */
  async loadResaleProductTotalQuantity(): Promise<number> {
    try {
      console.log('🔍 [DataManager] Carregando quantidade total de produtos revenda do Supabase...');

      const { data, error } = await this.supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'resale_product_total_quantity')
        .single();

      if (error) {
        console.warn('⚠️ [DataManager] Erro ao carregar quantidade total de produtos revenda do Supabase:', error.message);
        return 0; // Valor padrão
      }

      const quantity = Number(data.value) || 0;
      console.log(`✅ [DataManager] Quantidade total de produtos revenda carregada do Supabase: ${quantity}`);

      return quantity;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao carregar quantidade total de produtos revenda:', error);
      return 0; // Valor padrão em caso de erro
    }
  }

  /**
   * Configura subscription em tempo real para mudanças na quantidade total de produtos revenda
   */
  subscribeToResaleProductTotalQuantityChanges(callback: (newQuantity: number) => void): () => void {
    console.log('🔔 [DataManager] Iniciando subscription para mudanças na quantidade total de produtos revenda...');

    const subscription = this.supabase
      .channel('resale_product_total_quantity_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.resale_product_total_quantity'
        },
        (payload) => {
          console.log('📡 [DataManager] Mudança detectada na quantidade total de produtos revenda:', payload);

          if (payload.new && payload.new.value) {
            const newQuantity = Number(payload.new.value) || 0;

            if (newQuantity >= 0) {
              console.log(`🛍️ [DataManager] Nova quantidade total de produtos revenda: ${newQuantity}`);
              callback(newQuantity);
            }
          }
        }
      )
      .subscribe();

    console.log('✅ [DataManager] Subscription ativa para mudanças na quantidade total de produtos revenda');

    // Retornar função de cleanup
    return () => {
      console.log('🔌 [DataManager] Cancelando subscription da quantidade total de produtos revenda');
      this.supabase.removeChannel(subscription);
    };
  }

  // Função para carregar valor empresarial
  async loadBusinessValue(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'business_value')
        .single();

      if (error) {
        console.warn('⚠️ [DataManager] Valor empresarial não encontrado, usando padrão 0');
        return 0;
      }

      const value = parseFloat(data.value) || 0;
      console.log('✅ [DataManager] Valor empresarial carregado:', value);
      return value;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao carregar valor empresarial:', error);
      return 0;
    }
  }

  // Função para salvar valor empresarial
  async saveBusinessValue(value: number): Promise<boolean> {
    try {
      console.log('💾 [DataManager] Tentando salvar valor empresarial:', value);
      
      // Primeiro, tentar atualizar o registro existente
      const { data: updateData, error: updateError } = await supabase
        .from('system_settings')
        .update({
          value: value.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('key', 'business_value')
        .select();

      if (updateError) {
        console.warn('⚠️ [DataManager] Erro ao atualizar valor empresarial, tentando inserir:', updateError);
        
        // Se a atualização falhou, tentar inserir um novo registro
        const { data: insertData, error: insertError } = await supabase
          .from('system_settings')
          .insert({
            key: 'business_value',
            value: value.toString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (insertError) {
          console.error('❌ [DataManager] Erro ao inserir valor empresarial:', insertError);
          return false;
        }

        console.log('✅ [DataManager] Valor empresarial inserido com sucesso:', value);
      } else {
        console.log('✅ [DataManager] Valor empresarial atualizado com sucesso:', value);
      }

      // IMPORTANTE: Recalcular lucro automaticamente se houver baseline
      try {
        const baseline = await this.loadBusinessValueBaseline();
        if (baseline !== null) {
          console.log('🔄 [DataManager] Recalculando lucro empresarial após mudança no valor...');
          await this.calculateBusinessProfit();
        }
      } catch (error) {
        console.warn('⚠️ [DataManager] Erro ao recalcular lucro após salvar valor:', error);
      }

      return true;
    } catch (error) {
      console.error('❌ [DataManager] Erro crítico ao salvar valor empresarial:', error);
      return false;
    }
  }

  // Função para carregar lucro empresarial
  async loadBusinessProfit(): Promise<number> {
    try {
      console.log('📊 [DataManager] Carregando lucro empresarial...');
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'business_profit')
        .single();

      if (error) {
        console.warn('⚠️ [DataManager] Erro ao carregar lucro empresarial, usando valor padrão:', error);
        // Por enquanto, usar o mesmo valor do business_value como fallback
        return await this.loadBusinessValue();
      }

      const profit = parseFloat(data.value) || 0;
      console.log('✅ [DataManager] Lucro empresarial carregado:', profit);
      return profit;
    } catch (error) {
      console.error('❌ [DataManager] Erro crítico ao carregar lucro empresarial:', error);
      // Fallback para o valor empresarial
      return await this.loadBusinessValue();
    }
  }

  // Função para salvar lucro empresarial
  async saveBusinessProfit(profit: number): Promise<boolean> {
    try {
      // Log removido para melhorar performance
      
      // Primeiro, tentar atualizar o registro existente
      const { data: updateData, error: updateError } = await supabase
        .from('system_settings')
        .update({
          value: profit.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('key', 'business_profit')
        .select();

      if (updateError) {
        console.warn('⚠️ [DataManager] Erro ao atualizar lucro empresarial, tentando inserir:', updateError);
        
        // Se a atualização falhou, tentar inserir um novo registro
        const { data: insertData, error: insertError } = await supabase
          .from('system_settings')
          .insert({
            key: 'business_profit',
            value: profit.toString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (insertError) {
          console.error('❌ [DataManager] Erro ao inserir lucro empresarial:', insertError);
          return false;
        }

        // Log removido para melhorar performance
        return true;
      }

      // Log removido para melhorar performance
      return true;
    } catch (error) {
      console.error('❌ [DataManager] Erro crítico ao salvar lucro empresarial:', error);
      return false;
    }
  }

  // Função para subscrever mudanças no valor empresarial em tempo real
  subscribeToBusinessValueChanges(callback: (value: number) => void): () => void {
    console.log('🔔 [DataManager] Configurando subscription para valor empresarial');

    const subscription = supabase
      .channel('business_value_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.business_value'
        },
        (payload) => {
          console.log('🔄 [DataManager] Mudança detectada no valor empresarial:', payload);

          if (payload.new && 'value' in payload.new) {
            const newValue = parseFloat(payload.new.value as string) || 0;
            callback(newValue);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 [DataManager] Removendo subscription do valor empresarial');
      subscription.unsubscribe();
    };
  }

  // Função para subscrever mudanças no lucro empresarial em tempo real
  subscribeToBusinessProfitChanges(callback: (profit: number) => void): () => void {
    console.log('🔔 [DataManager] Configurando subscription para lucro empresarial');

    const subscription = supabase
      .channel('business_profit_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.business_profit'
        },
        (payload) => {
          console.log('🔄 [DataManager] Mudança detectada no lucro empresarial:', payload);

          if (payload.new && typeof payload.new === 'object' && 'value' in payload.new) {
            const newProfit = parseFloat(payload.new.value) || 0;
            console.log(`📡 [DataManager] Novo lucro empresarial recebido: R$ ${newProfit.toFixed(2)}`);
            callback(newProfit);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 [DataManager] Cancelando subscription do lucro empresarial');
      subscription.unsubscribe();
    };
  }

  // Função para subscrever mudanças no lucro de revenda em tempo real
  subscribeToResaleProfitChanges(callback: (profit: number) => void): () => void {
    console.log('🔔 [DataManager] Iniciando subscription para lucro médio de produtos de revenda...');

    const subscription = this.supabase
      .channel('resale_profit_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.average_resale_profit'
        },
        (payload) => {
          console.log('🔄 [DataManager] Mudança detectada no lucro médio de produtos de revenda:', payload);

          if (payload.new && typeof payload.new === 'object' && 'value' in payload.new) {
            const newProfit = Number(payload.new.value) || 23.61;
            console.log(`📡 [DataManager] Novo lucro médio de produtos de revenda recebido: R$ ${newProfit.toFixed(2)}`);

            // Chama callback
            callback(newProfit);
          }
        }
      )
      .subscribe();

    // Retorna função para cancelar subscription
    return () => {
      console.log('🔕 [DataManager] Cancelando subscription do lucro médio de produtos de revenda');
      subscription.unsubscribe();
    };
  }

  // Função para salvar baseline do valor empresarial (para cálculo de lucro)
  async saveBusinessValueBaseline(baselineValue: number): Promise<boolean> {
    try {
      console.log('💾 [DataManager] Salvando baseline do valor empresarial:', baselineValue);
      
      // Usar upsert para inserir ou atualizar automaticamente
      const { data, error } = await this.supabase
        .from('system_settings')
        .upsert({
          key: 'business_value_baseline',
          value: baselineValue.toString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        })
        .select();

      if (error) {
        console.error('❌ [DataManager] Erro ao salvar baseline do valor empresarial:', error);
        return false;
      }

      console.log('✅ [DataManager] Baseline do valor empresarial salvo com sucesso:', baselineValue);
      console.log('📊 [DataManager] Dados salvos:', data);
      return true;
    } catch (error) {
      console.error('❌ [DataManager] Erro crítico ao salvar baseline do valor empresarial:', error);
      return false;
    }
  }

  // Função para carregar baseline do valor empresarial
  async loadBusinessValueBaseline(): Promise<number | null> {
    try {
      console.log('📊 [DataManager] Carregando baseline do valor empresarial...');
      
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'business_value_baseline')
        .maybeSingle();

      if (error) {
        console.error('❌ [DataManager] Erro ao carregar baseline:', error);
        return null;
      }

      if (!data || !data.value || data.value.trim() === '') {
        console.log('📊 [DataManager] Baseline não encontrado ou desativado');
        return null;
      }

      const baseline = parseFloat(data.value) || 0;
      // Log removido para melhorar performance
      return baseline;
    } catch (error) {
      console.error('❌ [DataManager] Erro crítico ao carregar baseline do valor empresarial:', error);
      return null;
    }
  }

  // Função para calcular lucro empresarial baseado na diferença do baseline
  async calculateBusinessProfit(): Promise<number> {
    try {
      console.log('🧮 [DataManager] Calculando lucro empresarial baseado no baseline...');
      
      const currentValue = await this.loadBusinessValue();
      const baseline = await this.loadBusinessValueBaseline();
      
      if (baseline === null) {
        console.log('📊 [DataManager] Sem baseline definido, lucro empresarial = 0');
        return 0;
      }
      
      const profit = currentValue - baseline;
      // Log removido para melhorar performance
      
      // Salvar o lucro calculado
      await this.saveBusinessProfit(profit);
      
      return profit;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao calcular lucro empresarial:', error);
      return 0;
    }
  }

  // Função para confirmar balanço empresarial (criar baseline)
  async confirmBusinessBalance(): Promise<boolean> {
    try {
      console.log('✅ [DataManager] Confirmando balanço empresarial...');
      
      const currentValue = await this.loadBusinessValue();
      const success = await this.saveBusinessValueBaseline(currentValue);
      
      if (success) {
        console.log(`🎯 [DataManager] Balanço confirmado! Baseline definido como: R$ ${currentValue.toFixed(2)}`);
        
        // Salvar no histórico após confirmar
        await this.saveBaselineHistory('confirm');
        
        // Recalcular o lucro (que será 0 após definir o baseline)
        await this.calculateBusinessProfit();
      }
      
      return success;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao confirmar balanço empresarial:', error);
      return false;
    }
  }

  // Função para zerar lucro empresarial (remover baseline)
  async resetBusinessProfit(): Promise<boolean> {
    try {
      console.log('🔄 [DataManager] Zerando lucro empresarial (removendo baseline)...');
      
      // Primeiro, verificar se o baseline existe
      const { data: existingData, error: checkError } = await this.supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'business_value_baseline')
        .maybeSingle();

      if (checkError) {
        console.error('❌ [DataManager] Erro ao verificar baseline existente:', checkError);
        return false;
      }

      if (!existingData) {
        console.log('⚠️ [DataManager] Baseline já não existe no banco de dados');
        return true;
      }

      console.log('🔍 [DataManager] Baseline encontrado, desativando via soft delete...');

      // Usar soft delete como método principal (mais confiável)
      const { data: updateData, error: updateError } = await this.supabase
        .from('system_settings')
        .update({ 
          value: '',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id)
        .select();

      if (updateError) {
        console.error('❌ [DataManager] Erro ao desativar baseline:', updateError);
        return false;
      }

      console.log('✅ [DataManager] Baseline desativado com sucesso (soft delete):', updateData);
      
      // Verificar se foi realmente desativado
      const { data: verifyData, error: verifyError } = await this.supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'business_value_baseline')
        .maybeSingle();

      if (verifyError) {
        console.error('❌ [DataManager] Erro ao verificar desativação:', verifyError);
      } else if (verifyData && verifyData.value && verifyData.value.trim() !== '') {
        console.error('❌ [DataManager] ERRO: Baseline ainda ativo após desativação!', verifyData);
        return false;
      } else {
        console.log('✅ [DataManager] Verificação confirmada: Baseline foi desativado com sucesso!');
      }

      console.log('✅ [DataManager] Sistema de lucro empresarial desativado.');
      
      // Recalcular o lucro (que será 0 sem baseline)
      await this.calculateBusinessProfit();
      
      return true;
    } catch (error) {
      console.error('❌ [DataManager] Erro ao desativar baseline:', error);
      return false;
    }
  }

  // Alias para melhor nomenclatura
  async deactivateBaseline(): Promise<boolean> {
    console.log('🔄 [DataManager] Desativando baseline do sistema de lucro empresarial...');
    
    // Salvar no histórico antes de desativar
    await this.saveBaselineHistory('deactivate');
    
    return this.resetBusinessProfit();
  }

  // Salvar histórico de baseline
  async saveBaselineHistory(action: 'confirm' | 'deactivate' | 'redefine'): Promise<void> {
    try {
      const currentBaseline = await this.loadBusinessValueBaseline();
      const currentBusinessValue = await this.loadBusinessValue();
      const currentProfit = await this.loadBusinessProfit();

      if (currentBaseline !== null) {
        const historyData = {
          baseline_value: currentBaseline,
          business_value: currentBusinessValue,
          profit_value: currentProfit,
          action: action,
          timestamp: new Date().toISOString(),
          description: this.getActionDescription(action, currentBaseline, currentBusinessValue, currentProfit)
        };

        // Usar system_settings para armazenar histórico
        const historyKey = `baseline_history_${Date.now()}`;
        const { error } = await this.supabase
          .from('system_settings')
          .upsert({
            key: historyKey,
            value: JSON.stringify(historyData),
            description: `Histórico: ${action}`,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });

        if (error) {
          console.error('❌ [DataManager] Erro ao salvar histórico:', error);
        } else {
          console.log('✅ [DataManager] Histórico salvo:', historyData);
        }
      }
    } catch (error) {
      console.error('❌ [DataManager] Erro crítico ao salvar histórico:', error);
    }
  }

  // Obter descrição da ação para o histórico
  private getActionDescription(action: string, baseline: number, businessValue: number, profit: number): string {
    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);

    switch (action) {
      case 'confirm':
        return `Baseline confirmado em ${formatCurrency(baseline)} | Valor: ${formatCurrency(businessValue)} | Lucro: ${formatCurrency(profit)}`;
      case 'deactivate':
        return `Baseline desativado | Valor anterior: ${formatCurrency(baseline)} | Lucro anterior: ${formatCurrency(profit)}`;
      case 'redefine':
        return `Baseline redefinido para ${formatCurrency(baseline)} | Valor: ${formatCurrency(businessValue)} | Novo lucro: ${formatCurrency(profit)}`;
      default:
        return `Ação: ${action} | Baseline: ${formatCurrency(baseline)} | Valor: ${formatCurrency(businessValue)} | Lucro: ${formatCurrency(profit)}`;
    }
  }

  // Carregar histórico de baselines
  async loadBaselineHistory(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('*')
        .like('key', 'baseline_history_%')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ [DataManager] Erro ao carregar histórico:', error);
        return [];
      }

      // Parsear dados JSON do histórico
      const historyEntries = (data || []).map(entry => {
        try {
          const parsedValue = JSON.parse(entry.value);
          return {
            id: entry.id,
            key: entry.key,
            ...parsedValue,
            created_at: entry.created_at
          };
        } catch (parseError) {
          console.error('❌ [DataManager] Erro ao parsear entrada do histórico:', parseError);
          return null;
        }
      }).filter(entry => entry !== null);

      return historyEntries;
    } catch (error) {
      console.error('❌ [DataManager] Erro crítico ao carregar histórico:', error);
      return [];
    }
  }

  // Restaurar baseline do histórico
  async restoreBaseline(historyKey: string): Promise<boolean> {
    try {
      // Buscar entrada do histórico
      const { data: historyData, error: historyError } = await this.supabase
        .from('system_settings')
        .select('*')
        .eq('key', historyKey)
        .single();

      if (historyError || !historyData) {
        console.error('❌ [DataManager] Erro ao buscar histórico:', historyError);
        return false;
      }

      // Parsear dados do histórico
      const parsedHistory = JSON.parse(historyData.value);

      // Salvar estado atual no histórico antes de restaurar
      await this.saveBaselineHistory('redefine');

      // Restaurar baseline
      const success = await this.saveBusinessValueBaseline(parsedHistory.baseline_value);
      
      if (success) {
        console.log('✅ [DataManager] Baseline restaurado do histórico:', parsedHistory);
        
        // Recalcular lucro
        await this.calculateBusinessProfit();
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [DataManager] Erro crítico ao restaurar baseline:', error);
      return false;
    }
  }

  // ==========================================
  // FUNCIONALIDADES DE BACKUP E RESTAURAÇÃO
  // ==========================================

  /**
   * Exporta toda a base de dados do sistema para backup
   */
  async exportDatabase(): Promise<string> {
    try {
      console.log('🔄 [DataManager] Iniciando exportação da base de dados...');
      
      const exportData: any = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          system: 'SistemaRec'
        },
        data: {}
      };

      // Mapeamento COMPLETO das tabelas do sistema (backup_name -> actual_table)
      const tableMapping: { [key: string]: string } = {
        // Tabelas principais
        'clients': 'customers',
        'products': 'raw_materials', 
        'services': 'services',
        'transactions': 'cash_flow_entries',
        'tire_inventory': 'stock_items',
        'service_items': 'service_items',
        'system_settings': 'system_settings',
        'cash_flow': 'cash_flow_entries',
        'expenses': 'expenses',
        
        // Tabelas de produção
        'production_recipes': 'production_recipes',
        'production_entries': 'production_entries',
        'daily_production': 'daily_production',
        
        // Tabelas financeiras
        'debts': 'debts',
        'tire_cost_history': 'tire_cost_history',
        'business_value_history': 'business_value_history',
        
        // Tabelas de vendas e garantia
        'defective_tire_sales': 'defective_tire_sales',
        'cost_simulations': 'cost_simulations',
        'warranty_entries': 'warranty_entries',
        
        // Tabelas de configuração
        'custom_units': 'custom_units',
        
        // Tabela de histórico de alterações
        'change_history': 'change_history'
      };

      // Função para exportar uma tabela com tratamento de erros
      const exportTable = async (backupName: string, actualTable: string, isOptional: boolean = false) => {
        try {
          console.log(`📥 Exportando ${actualTable} -> ${backupName}`);
          
          const { data, error } = await this.supabase
            .from(actualTable as any)
            .select('*');

          if (error) {
            if (error.code === '42P01' && isOptional) {
              // Tabela não existe, mas é opcional
              console.log(`⚠️ Tabela opcional ${actualTable} não existe - pulando`);
              return;
            } else {
              console.error(`❌ Erro ao exportar tabela ${actualTable}:`, error);
              exportData.data[backupName] = [];
            }
          } else {
            exportData.data[backupName] = data || [];
            console.log(`✅ Tabela ${actualTable} exportada: ${data?.length || 0} registros`);
          }
        } catch (tableError) {
          if (isOptional) {
            console.log(`⚠️ Erro na tabela opcional ${actualTable} - pulando:`, tableError);
          } else {
            console.error(`❌ Erro crítico na exportação da tabela ${actualTable}:`, tableError);
            exportData.data[backupName] = [];
          }
        }
      };
      
      // Exportar dados de cada tabela com tratamento robusto de erros
      for (const [backupName, actualTable] of Object.entries(tableMapping)) {
        await exportTable(backupName, actualTable, true); // Todas como opcionais para robustez
      }

      console.log('✅ [DataManager] Exportação concluída com sucesso');
      return JSON.stringify(exportData, null, 2);

    } catch (error) {
      console.error('❌ [DataManager] Erro crítico na exportação:', error);
      throw error;
    }
  }

  /**
   * Importa e restaura toda a base de dados do sistema
   */
  async importDatabase(jsonData: string): Promise<boolean> {
    try {
      console.log('🔄 [DataManager] Iniciando importação da base de dados...');
      
      const importData = JSON.parse(jsonData);
      
      // Validação básica da estrutura
      if (!importData.data || !importData.metadata) {
        console.error('❌ Estrutura de backup inválida');
        return false;
      }

      console.log('📊 Backup válido encontrado:', importData.metadata);

      // Mapeamento COMPLETO das tabelas do sistema (backup_name -> actual_table)
      const tableMapping: { [key: string]: string } = {
        // Tabelas principais
        'clients': 'customers',
        'products': 'raw_materials', 
        'services': 'services',
        'transactions': 'cash_flow_entries',
        'tire_inventory': 'stock_items',
        'service_items': 'service_items',
        'system_settings': 'system_settings',
        'cash_flow': 'cash_flow_entries',
        'expenses': 'expenses',
        
        // Tabelas de produção
        'production_recipes': 'production_recipes',
        'production_entries': 'production_entries',
        'daily_production': 'daily_production',
        
        // Tabelas financeiras
        'debts': 'debts',
        'tire_cost_history': 'tire_cost_history',
        'business_value_history': 'business_value_history',
        
        // Tabelas de vendas e garantia
        'defective_tire_sales': 'defective_tire_sales',
        'cost_simulations': 'cost_simulations',
        'warranty_entries': 'warranty_entries',
        
        // Tabelas de configuração
        'custom_units': 'custom_units',
        
        // Tabela de histórico de alterações
        'change_history': 'change_history'
      };

      let successCount = 0;
      let errorCount = 0;

      // Processa cada tabela do backup
      for (const [backupTable, actualTable] of Object.entries(tableMapping)) {
        try {
          const tableData = importData.data[backupTable];
          
          if (!tableData || !Array.isArray(tableData)) {
            console.log(`⚠️ Tabela ${backupTable} não encontrada no backup ou vazia`);
            continue;
          }

          console.log(`📥 Importando ${backupTable} -> ${actualTable} (${tableData.length} registros)`);

          // Para system_settings, usa upsert para não duplicar
          if (actualTable === 'system_settings') {
            const { error: upsertError } = await this.supabase
              .from(actualTable as any)
              .upsert(tableData, { onConflict: 'key' });

            if (upsertError) {
              console.error(`❌ Erro ao fazer upsert na tabela ${actualTable}:`, upsertError);
              errorCount++;
            } else {
              console.log(`✅ Tabela ${actualTable} importada com sucesso`);
              successCount++;
            }
          } else {
            // Para outras tabelas, usa estratégia de upsert com IDs preservados
            console.log(`🔄 Fazendo upsert de ${tableData.length} registros na tabela ${actualTable}`);
            
            // Processa em lotes menores
            const batchSize = 20;
            let batchSuccessCount = 0;
            
            for (let i = 0; i < tableData.length; i += batchSize) {
              const batch = tableData.slice(i, i + batchSize);
              console.log(`📦 Processando lote ${Math.floor(i/batchSize) + 1} (${batch.length} registros)`);

              try {
                const { error: upsertError } = await this.supabase
                  .from(actualTable as any)
                  .upsert(batch, { 
                    onConflict: 'id',
                    ignoreDuplicates: false 
                  });

                if (upsertError) {
                  console.error(`❌ Erro no lote ${Math.floor(i/batchSize) + 1} da tabela ${actualTable}:`, upsertError);
                  
                  // Tenta inserir registros individualmente se o lote falhar
                  for (const record of batch) {
                    try {
                      const { error: singleError } = await this.supabase
                        .from(actualTable as any)
                        .upsert(record, { onConflict: 'id' });
                      
                      if (!singleError) {
                        batchSuccessCount++;
                      }
                    } catch (singleRecordError) {
                      console.error(`❌ Erro no registro individual:`, singleRecordError);
                    }
                  }
                } else {
                  batchSuccessCount += batch.length;
                  console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} inserido com sucesso`);
                }
              } catch (batchError) {
                console.error(`❌ Erro crítico no lote ${Math.floor(i/batchSize) + 1}:`, batchError);
              }
            }
            
            if (batchSuccessCount > 0) {
              console.log(`✅ Tabela ${actualTable}: ${batchSuccessCount}/${tableData.length} registros importados`);
              successCount++;
            } else {
              console.error(`❌ Falha completa na importação da tabela ${actualTable}`);
              errorCount++;
            }
          }

        } catch (tableError) {
          console.error(`❌ Erro crítico na importação da tabela ${backupTable}:`, tableError);
          errorCount++;
        }
      }

      console.log(`📊 Importação finalizada: ${successCount} sucessos, ${errorCount} erros`);
      
      if (successCount > 0) {
        console.log('✅ [DataManager] Importação concluída com sucesso');
        return true;
      } else {
        console.log('❌ [DataManager] Falha na importação');
        return false;
      }

    } catch (error) {
      console.error('❌ [DataManager] Erro crítico na importação:', error);
      return false;
    }
  }

  // Debt methods
  async saveDebt(
    debt: Omit<Debt, "id" | "created_at" | "updated_at">
  ): Promise<Debt | null> {
    console.log("🚀 [DataManager] Iniciando saveDebt...");
    console.log("📝 [DataManager] Dados da dívida:", debt);
    console.log("🗄️ [DataManager] Salvando na tabela: debts");
    
    try {
      const result = await this.saveToDatabase<Debt>("debts", debt as any);
      console.log("📥 [DataManager] Resultado do saveToDatabase:", result);
      return result;
    } catch (error) {
      console.error("❌ [DataManager] Erro em saveDebt:", error);
      throw error;
    }
  }

  async loadDebts(): Promise<Debt[]> {
    try {
      const rawData = await this.loadFromDatabase<any>("debts");
      console.log("🔍 [DataManager] Raw debts data from database:", rawData);
      
      // Convert string values to numbers to ensure proper formatting
      const processedData = rawData.map((debt: any) => {
        const processed = {
          ...debt,
          total_amount: typeof debt.total_amount === 'string' ? parseFloat(debt.total_amount) : debt.total_amount,
          paid_amount: typeof debt.paid_amount === 'string' ? parseFloat(debt.paid_amount) : debt.paid_amount,
          remaining_amount: typeof debt.remaining_amount === 'string' ? parseFloat(debt.remaining_amount) : debt.remaining_amount,
        };
        
        console.log("🔍 [DataManager] Processed debt:", {
          id: processed.id,
          description: processed.description,
          total_amount: processed.total_amount,
          paid_amount: processed.paid_amount,
          remaining_amount: processed.remaining_amount,
          types: {
            total_amount: typeof processed.total_amount,
            paid_amount: typeof processed.paid_amount,
            remaining_amount: typeof processed.remaining_amount,
          }
        });
        
        return processed;
      });
      
      console.log("✅ [DataManager] Processed debts data:", processedData.length);
      return processedData as Debt[];
    } catch (error) {
      console.error("❌ [DataManager] Error loading debts:", error);
      return [];
    }
  }

  async updateDebt(
    id: string,
    updates: Partial<Debt>
  ): Promise<boolean> {
    console.log("🔄 [DataManager] updateDebt iniciado:", {
      id,
      updates,
      updateTypes: Object.keys(updates).reduce((acc, key) => {
        acc[key] = typeof updates[key as keyof Debt];
        return acc;
      }, {} as Record<string, string>)
    });
    
    // Ensure numeric values are properly formatted
    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.paid_amount !== undefined) {
      sanitizedUpdates.paid_amount = Number(sanitizedUpdates.paid_amount) || 0;
    }
    if (sanitizedUpdates.remaining_amount !== undefined) {
      sanitizedUpdates.remaining_amount = Number(sanitizedUpdates.remaining_amount) || 0;
    }
    if (sanitizedUpdates.total_amount !== undefined) {
      sanitizedUpdates.total_amount = Number(sanitizedUpdates.total_amount) || 0;
    }
    
    console.log("🔄 [DataManager] updateDebt valores sanitizados:", {
      id,
      sanitizedUpdates,
      sanitizedTypes: Object.keys(sanitizedUpdates).reduce((acc, key) => {
        acc[key] = typeof sanitizedUpdates[key as keyof Debt];
        return acc;
      }, {} as Record<string, string>)
    });
    
    const result = await this.updateInDatabase("debts", id, sanitizedUpdates);
    
    console.log("🔄 [DataManager] updateDebt resultado:", {
      id,
      result,
      originalUpdates: updates,
      sanitizedUpdates
    });
    
    return result;
  }

  async deleteDebt(id: string): Promise<boolean> {
    return this.deleteFromDatabase("debts", id);
  }

  /**
   * Gera nome do arquivo de backup
   */
  generateBackupFileName(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    return `sistemarec_backup_${dateStr}_${timeStr}.json`;
  }

  // Tire Cost History methods
  async saveTireCostHistory(
    date: string,
    averageCostPerTire: number
  ): Promise<boolean> {
    try {
      console.log("💾 [DataManager] Salvando histórico de custo por pneu:", {
        date,
        averageCostPerTire
      });

      // Check if record for this date already exists
      const { data: existingRecord, error: checkError } = await (this.supabase as any)
        .from("tire_cost_history")
        .select("*")
        .eq("date", date)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error("❌ [DataManager] Erro ao verificar histórico existente:", checkError);
        throw checkError;
      }

      if (existingRecord) {
        // Update existing record
        const { error: updateError } = await (this.supabase as any)
          .from("tire_cost_history")
          .update({
            average_cost_per_tire: averageCostPerTire,
            updated_at: new Date().toISOString()
          })
          .eq("date", date);

        if (updateError) {
          console.error("❌ [DataManager] Erro ao atualizar histórico:", updateError);
          throw updateError;
        }

        console.log("✅ [DataManager] Histórico de custo atualizado para:", date);
      } else {
        // Insert new record
        const { error: insertError } = await (this.supabase as any)
          .from("tire_cost_history")
          .insert([{
            date,
            average_cost_per_tire: averageCostPerTire
          }]);

        if (insertError) {
          console.error("❌ [DataManager] Erro ao inserir histórico:", insertError);
          throw insertError;
        }

        console.log("✅ [DataManager] Novo histórico de custo salvo para:", date);
      }

      return true;
    } catch (error) {
      console.error("❌ [DataManager] Erro em saveTireCostHistory:", error);
      return false;
    }
  }

  async loadTireCostHistory(days: number = 30): Promise<Array<{date: string, cost: number}>> {
    try {
      console.log(`📊 [DataManager] Carregando histórico de custos dos últimos ${days} dias`);

      // Calculate date range with WORKAROUND +1 for end date to include today's record
      const endDate = new Date();
      const endDateWithWorkaround = new Date(endDate);
      endDateWithWorkaround.setDate(endDate.getDate() + 1); // +1 day workaround
      
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDateWithWorkaround.toISOString().split('T')[0];
      
      console.log("📅 [DataManager] WORKAROUND +1: Range de datas para busca:", {
        startDate: startDateStr,
        endDate: endDateStr,
        endDateOriginal: endDate.toISOString().split('T')[0]
      });

      const { data, error } = await (this.supabase as any)
        .from("tire_cost_history")
        .select("date, average_cost_per_tire")
        .gte("date", startDateStr)
        .lte("date", endDateStr)
        .order("date", { ascending: true });

      if (error) {
        console.error("❌ [DataManager] Erro ao carregar histórico:", error);
        throw error;
      }

      const chartData = (data || []).map((record: any) => ({
        date: new Date(record.date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        }),
        cost: parseFloat(record.average_cost_per_tire.toString())
      }));

      console.log("✅ [DataManager] Histórico carregado:", chartData.length, "registros");
      return chartData;
    } catch (error) {
      console.error("❌ [DataManager] Erro em loadTireCostHistory:", error);
      return [];
    }
  }

  async getTodayTireCostRecord(): Promise<{date: string, cost: number} | null> {
    try {
      // WORKAROUND: Add +1 day to compensate Supabase UTC conversion
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const todayLocal = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
      
      console.log("📅 [DataManager] WORKAROUND +1: Buscando registro para data:", todayLocal);
      
      const { data, error } = await (this.supabase as any)
        .from("tire_cost_history")
        .select("date, average_cost_per_tire")
        .eq("date", todayLocal)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("❌ [DataManager] Erro ao buscar registro de hoje:", error);
        throw error;
      }

      if (data) {
        return {
          date: data.date,
          cost: parseFloat(data.average_cost_per_tire.toString())
        };
      }

      return null;
    } catch (error) {
      console.error(" [DataManager] Erro em getTodayTireCostRecord:", error);
      return null;
    }
  }

  // ==================== BUSINESS VALUE HISTORY METHODS ====================

  // Função para salvar histórico diário de valor empresarial
  async saveBusinessValueHistory(businessValue: number, baseline: number | null = null): Promise<boolean> {
    try {
      // WORKAROUND: Add +1 day to compensate Supabase UTC conversion
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const date = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

      // Log removido para melhorar performance

      // Check if record for this date already exists (usando maybeSingle para evitar erro 406)
      const { data: existingRecord, error: checkError } = await (this.supabase as any)
        .from("business_value_history")
        .select("*")
        .eq("date", date)
        .maybeSingle();

      if (checkError) {
        // Se a tabela não existe, silenciosamente retornar false
        if (checkError.code === '42P01') {
          return false;
        }
        // Outros erros: apenas retornar false sem log
        return false;
      }

      const profit = baseline !== null ? businessValue - baseline : 0;

      if (existingRecord) {
        // Update existing record
        const { error: updateError } = await (this.supabase as any)
          .from("business_value_history")
          .update({
            business_value: businessValue,
            baseline_value: baseline,
            profit_value: profit,
            updated_at: new Date().toISOString()
          })
          .eq("date", date);

        if (updateError) {
          console.error(" [DataManager] Erro ao atualizar histórico de valor empresarial:", updateError);
          return false;
        }

        // Log removido para melhorar performance
      } else {
        // Insert new record
        const { error: insertError } = await (this.supabase as any)
          .from("business_value_history")
          .insert([{
            date,
            business_value: businessValue,
            baseline_value: baseline,
            profit_value: profit
          }]);

        if (insertError) {
          console.error(" [DataManager] Erro ao inserir histórico de valor empresarial:", insertError);
          return false;
        }

        // Log removido para melhorar performance
      }

      return true;
    } catch (error) {
      console.error(" [DataManager] Erro crítico em saveBusinessValueHistory:", error);
      return false;
    }
  }

  // Função para carregar histórico de valores empresariais em um período (OTIMIZADA)
  async loadBusinessValueHistory(days: number = 30): Promise<any[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // WORKAROUND: Add +1 day to compensate Supabase UTC conversion
      const endDateWithWorkaround = new Date(endDate);
      endDateWithWorkaround.setDate(endDate.getDate() + 1);

      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      const endDateStr = `${endDateWithWorkaround.getFullYear()}-${String(endDateWithWorkaround.getMonth() + 1).padStart(2, "0")}-${String(endDateWithWorkaround.getDate()).padStart(2, "0")}`;

      // Query otimizada: buscar APENAS os últimos 30 dias e ordenar por data
      const { data, error } = await (this.supabase as any)
        .from("business_value_history")
        .select("date, business_value, baseline_value, profit_value")
        .gte("date", startDateStr)
        .lte("date", endDateStr)
        .order("date", { ascending: true })
        .limit(days); // Limitar ao número de dias solicitados

      if (error) {
        console.error(" [DataManager] Erro ao carregar histórico de valor empresarial:", error);
        return [];
      }

      // Log removido para melhorar performance
      return data || [];
    } catch (error) {
      console.error(" [DataManager] Erro crítico em loadBusinessValueHistory:", error);
      return [];
    }
  }

  // Função para obter registro de valor empresarial de hoje
  async getTodayBusinessValueRecord(): Promise<any | null> {
    try {
      // WORKAROUND: Add +1 day to compensate Supabase UTC conversion
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const todayLocal = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

      console.log(" [DataManager] WORKAROUND +1: Buscando registro de valor empresarial para data:", todayLocal);
      
      const { data, error } = await (this.supabase as any)
        .from("business_value_history")
        .select("date, business_value, baseline_value, profit_value")
        .eq("date", todayLocal)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(" [DataManager] Nenhum registro de valor empresarial encontrado para hoje");
          return null;
        }
        console.error(" [DataManager] Erro ao buscar registro de hoje:", error);
        return null;
      }

      console.log(" [DataManager] Registro de valor empresarial de hoje encontrado:", data);
      return data;
    } catch (error) {
      console.error(" [DataManager] Erro em getTodayBusinessValueRecord:", error);
      return null;
    }
  }
}

// Export singleton instance
export const dataManager = DataManager.getInstance();

// Storage keys constants
export const STORAGE_KEYS = {
  MATERIALS: "tire-factory-materials",
  EMPLOYEES: "tire-factory-employees",
  CUSTOMERS: "tire-factory-customers",
  PRODUCTS: "tire-factory-products",
  SUPPLIERS: "tire-factory-suppliers",
  CUSTOM_UNITS: "tire-factory-custom-units",
  STOCK_ITEMS: "tire-factory-stock-items",
  RECIPES: "tire-factory-recipes",
  PRODUCTION_ENTRIES: "tire-factory-production-entries"

} as const;