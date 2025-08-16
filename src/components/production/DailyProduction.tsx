import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Calendar,
  Search,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Filter,
  X,
  CalendarDays,
  AlertCircle,
  Minus,
  BarChart3,
} from "lucide-react";
import {
  ProductionRecipe,
  ProductionEntry,
  StockItem,
} from "@/types/financial";
import ProductionChart from "@/components/stock/ProductionChart";

interface DailyProductionProps {
  recipes?: ProductionRecipe[];
  stockItems?: StockItem[];
  productionEntries?: ProductionEntry[];
  onSubmit?: (
    entry: Omit<ProductionEntry, "id" | "created_at">,
  ) => Promise<void>;
  onDelete?: (entryId: string) => Promise<void>;
  onStockUpdate?: (
    itemId: string,
    itemType: "material" | "product",
    quantity: number,
    operation: "add" | "remove",
    unitPrice?: number,
    itemName?: string,
  ) => Promise<void>;
  isLoading?: boolean;
}

const DailyProduction = ({
  recipes = [],
  stockItems = [],
  productionEntries = [],
  onSubmit = async () => {},
  onDelete = async () => {},
  onStockUpdate = async () => {},
  isLoading = false,
}: DailyProductionProps) => {
  const [selectedRecipe, setSelectedRecipe] = useState("");
  const [quantityProduced, setQuantityProduced] = useState("");
  const [productionLoss, setProductionLoss] = useState("");
  const [materialLossEnabled, setMaterialLossEnabled] = useState(false);
  const [materialLosses, setMaterialLosses] = useState<Record<string, string>>(
    {},
  );
  const [productionDate, setProductionDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dateFilterType, setDateFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [pendingProduction, setPendingProduction] = useState<{
    recipe: ProductionRecipe;
    quantity: number;
    productionLoss: number;
    materialLosses: Array<{
      material_id: string;
      material_name: string;
      quantity_lost: number;
      unit: string;
    }>;
    materialsToConsume: Array<{
      material_id: string;
      material_name: string;
      quantity_consumed: number;
      unit: string;
      available_stock: number;
      sufficient: boolean;
    }>;
    consolidatedMaterialSummary: Array<{
      material_id: string;
      material_name: string;
      unit: string;
      recipe_consumption: number;
      additional_loss: number;
      total_deduction: number;
      available_stock: number;
      sufficient: boolean;
    }>;
  } | null>(null);

  const activeRecipes = recipes.filter((r) => !r.archived);

  const getStockForMaterial = (materialId: string) => {
    return stockItems.find(
      (item) => item.item_id === materialId && item.item_type === "material",
    );
  };

  // Calculate total material needed including losses
  const calculateTotalMaterialNeeded = (material: any) => {
    if (!quantityProduced || parseInt(quantityProduced) <= 0) {
      return material.quantity_needed;
    }

    const baseQuantity = parseInt(quantityProduced);
    const prodLoss = productionLoss ? parseInt(productionLoss) : 0;

    // Base consumption from recipe
    let totalNeeded = material.quantity_needed * baseQuantity;

    // Add extra material needed for production losses
    // If we lose products, we need more raw materials to compensate
    if (prodLoss > 0) {
      totalNeeded += material.quantity_needed * prodLoss;
    }

    // Add specific material losses if enabled
    if (materialLossEnabled && materialLosses[material.material_id]) {
      const additionalLoss =
        parseFloat(materialLosses[material.material_id]) || 0;
      totalNeeded += additionalLoss;
    }

    return totalNeeded;
  };

  const handleQuantityChange = (value: string) => {
    // Only allow positive integers
    const numericValue = value.replace(/[^0-9]/g, "");
    if (
      numericValue === "" ||
      (parseInt(numericValue) > 0 && parseInt(numericValue) <= 999999)
    ) {
      setQuantityProduced(numericValue);
    }
  };

  const handleProductionLossChange = (value: string) => {
    // Only allow positive integers or zero
    const numericValue = value.replace(/[^0-9]/g, "");
    if (
      numericValue === "" ||
      (parseInt(numericValue) >= 0 && parseInt(numericValue) <= 999999)
    ) {
      setProductionLoss(numericValue);
    }
  };

  const handleMaterialLossChange = (materialId: string, value: string) => {
    // Only allow positive numbers (including decimals) or zero
    const numericValue = value.replace(/[^0-9.,]/g, "").replace(",", ".");
    if (
      numericValue === "" ||
      (!isNaN(parseFloat(numericValue)) && parseFloat(numericValue) >= 0)
    ) {
      console.log(`📝 [DailyProduction] Atualizando perda de material:`, {
        materialId,
        originalValue: value,
        numericValue,
        parsedValue: numericValue ? parseFloat(numericValue) : 0,
      });

      setMaterialLosses((prev) => {
        const updated = {
          ...prev,
          [materialId]: numericValue,
        };

        console.log(
          `📋 [DailyProduction] Estado de perdas atualizado:`,
          updated,
        );
        return updated;
      });
    }
  };

  const handlePrepareProduction = () => {
    if (
      !selectedRecipe ||
      !quantityProduced ||
      parseInt(quantityProduced) <= 0
    ) {
      return;
    }

    const recipe = activeRecipes.find((r) => r.id === selectedRecipe);
    if (!recipe) return;

    const quantity = parseInt(quantityProduced);
    const prodLoss = productionLoss ? parseInt(productionLoss) : 0;

    // Validate production loss doesn't exceed production quantity
    if (prodLoss > quantity) {
      alert(
        "A quantidade de perda de produção não pode ser maior que a quantidade produzida!",
      );
      return;
    }

    const materialsToConsume = recipe.materials.map((material) => {
      const stock = getStockForMaterial(material.material_id);
      // Use base recipe consumption for the actual production entry
      const quantityNeeded = material.quantity_needed * quantity;
      const availableStock = stock?.quantity || 0;

      return {
        material_id: material.material_id,
        material_name: material.material_name,
        quantity_consumed: quantityNeeded,
        unit: material.unit,
        available_stock: availableStock,
        sufficient: availableStock >= quantityNeeded,
      };
    });

    // Prepare material losses - ONLY if material loss is enabled
    const matLosses = materialLossEnabled
      ? (recipe.materials
          .map((material) => {
            const lossQuantity = materialLosses[material.material_id]
              ? parseFloat(materialLosses[material.material_id])
              : 0;

            console.log(
              `🔍 [DailyProduction] Verificando perda para ${material.material_name}:`,
              {
                material_id: material.material_id,
                inputValue: materialLosses[material.material_id],
                parsedValue: lossQuantity,
                hasLoss: lossQuantity > 0,
                materialLossEnabled: materialLossEnabled,
              },
            );

            if (lossQuantity > 0) {
              return {
                material_id: material.material_id,
                material_name: material.material_name,
                quantity_lost: lossQuantity,
                unit: material.unit,
              };
            }
            return null;
          })
          .filter(Boolean) as Array<{
          material_id: string;
          material_name: string;
          quantity_lost: number;
          unit: string;
        }>)
      : [];

    console.log(`📋 [DailyProduction] Perdas de matéria-prima preparadas:`, {
      materialLossEnabled: materialLossEnabled,
      totalLosses: matLosses.length,
      losses: matLosses.map(
        (loss) => `${loss.material_name}: ${loss.quantity_lost} ${loss.unit}`,
      ),
      materialLossesState: materialLosses,
    });

    // Create consolidated material summary
    const consolidatedMaterialSummary = recipe.materials.map((material) => {
      const stock = getStockForMaterial(material.material_id);
      const recipeConsumption = material.quantity_needed * quantity;

      // Add compensation for production losses
      const productionLossCompensation =
        prodLoss > 0 ? material.quantity_needed * prodLoss : 0;

      // Add specific material losses
      const additionalLoss =
        matLosses.find((loss) => loss.material_id === material.material_id)
          ?.quantity_lost || 0;

      const totalDeduction =
        recipeConsumption + productionLossCompensation + additionalLoss;
      const availableStock = stock?.quantity || 0;

      return {
        material_id: material.material_id,
        material_name: material.material_name,
        unit: material.unit,
        recipe_consumption: recipeConsumption,
        production_loss_compensation: productionLossCompensation,
        additional_loss: additionalLoss,
        total_deduction: totalDeduction,
        available_stock: availableStock,
        sufficient: availableStock >= totalDeduction,
      };
    });

    console.log(`📊 [DailyProduction] Resumo consolidado de materiais:`, {
      consolidatedMaterialSummary,
      totalMaterials: consolidatedMaterialSummary.length,
      materialsWithLoss: consolidatedMaterialSummary.filter(
        (m) => m.additional_loss > 0,
      ).length,
      insufficientStock: consolidatedMaterialSummary.filter(
        (m) => !m.sufficient,
      ).length,
    });

    setPendingProduction({
      recipe,
      quantity,
      productionLoss: prodLoss,
      materialLosses: matLosses,
      materialsToConsume,
      consolidatedMaterialSummary,
    });
    setShowConfirmDialog(true);
  };

  const handleConfirmProduction = async () => {
    if (!pendingProduction) return;

    const {
      recipe,
      quantity,
      productionLoss,
      materialLosses,
      materialsToConsume,
    } = pendingProduction;

    console.log("🏭 [DailyProduction] Iniciando produção:", {
      product: recipe.product_name,
      quantity,
      materials: materialsToConsume,
      productionDate: productionDate,
    });

    // Check if all materials have sufficient stock
    const hasInsufficientStock = materialsToConsume.some((m) => !m.sufficient);
    if (hasInsufficientStock) {
      alert("Estoque insuficiente para alguns materiais!");
      return;
    }

    try {
      console.log(
        "🚀 [DailyProduction] Iniciando processo de produção completo...",
      );

      // Create production entry FIRST to ensure it's saved
      const productionEntry = {
        recipe_id: recipe.id,
        product_name: recipe.product_name,
        quantity_produced: quantity,
        production_date: productionDate, // Use original date - workaround now applied in dataManager
        materials_consumed: materialsToConsume.map((m) => ({
          material_id: m.material_id,
          material_name: m.material_name,
          quantity_consumed: m.quantity_consumed,
          unit: m.unit,
        })),
        production_loss: productionLoss > 0 ? productionLoss : undefined,
        material_loss: materialLosses.length > 0 ? materialLosses : undefined,
      };

      console.log(
        "📝 [DailyProduction] Criando entrada de produção PRIMEIRO:",
        {
          ...productionEntry,
          production_date_formatted: new Date(
            productionDate,
          ).toLocaleDateString("pt-BR"),
        },
      );

      console.log('🚀 [DailyProduction] ENVIANDO PARA onSubmit:', {
        productionEntry,
        production_date_final: productionEntry.production_date,
        timestamp: new Date().toISOString()
      });

      let savedEntry;
      try {
        savedEntry = await onSubmit(productionEntry);
        console.log(
          "✅ [DailyProduction] Entrada de produção criada com sucesso!",
          {
            savedEntry,
            production_date_recebida: savedEntry?.production_date,
            production_date_enviada: productionEntry.production_date
          }
        );

        // Verify the entry was actually saved
        if (!savedEntry) {
          throw new Error(
            "Entrada de produção não foi retornada após salvamento",
          );
        }
      } catch (entryError) {
        console.error(
          `❌ [DailyProduction] Erro ao criar entrada de produção:`,
          entryError,
        );
        throw new Error(`Falha ao criar entrada de produção: ${entryError}`);
      }

      // Update stock for each material using consolidated summary (remove from stock) - await each operation
      console.log(
        "📦 [DailyProduction] Descontando materiais do estoque (incluindo perdas)...",
      );

      for (
        let i = 0;
        i < pendingProduction.consolidatedMaterialSummary.length;
        i++
      ) {
        const material = pendingProduction.consolidatedMaterialSummary[i];
        console.log(
          `  - [${i + 1}/${pendingProduction.consolidatedMaterialSummary.length}] Descontando TOTAL de ${material.total_deduction.toFixed(2)} ${material.unit} de ${material.material_name}`,
          {
            recipe_consumption: material.recipe_consumption,
            production_loss_compensation:
              material.production_loss_compensation || 0,
            additional_loss: material.additional_loss,
            total_deduction: material.total_deduction,
          },
        );

        try {
          await onStockUpdate(
            material.material_id,
            "material",
            material.total_deduction,
            "remove",
            undefined, // no unit price for removal
            material.material_name, // pass the material name
          );
          console.log(
            `    ✅ Material ${material.material_name} descontado com sucesso (${material.total_deduction.toFixed(2)} ${material.unit})`,
          );
        } catch (materialError) {
          console.error(
            `    ❌ Erro ao descontar material ${material.material_name}:`,
            materialError,
          );
          throw new Error(
            `Falha ao descontar material ${material.material_name}: ${materialError}`,
          );
        }
      }

      console.log(
        "✅ [DailyProduction] Todos os materiais foram descontados com sucesso!",
      );

      console.log(
        "✅ [DailyProduction] Todos os materiais (incluindo perdas) foram descontados com sucesso!",
      );

      // Note: Material losses are now included in the consolidated deduction above
      // No need for separate processing of material losses

      // Add produced tires to stock (TOTAL quantity including losses)
      // As requested by user: "AO LANCAR NO ESTOQUE, QUERO QUE A QUANTIDADE PRODUZIDA, NAO SEJA DESCONTADO PELA PERDA"
      const totalProduction = quantity; // Use total quantity, not reduced by losses

      if (totalProduction > 0) {
        // First, try to find if there's already a product with this name in the stock
        const existingProductStock = stockItems.find(
          (item) =>
            item.item_name === recipe.product_name &&
            item.item_type === "product",
        );

        // Generate a temporary UUID for new products (will be replaced by database)
        const productId =
          existingProductStock?.item_id ||
          `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log("🏭 [DailyProduction] Adicionando produto ao estoque:", {
          productId,
          productName: recipe.product_name,
          totalProduced: quantity,
          productionLoss: productionLoss,
          totalProduction: totalProduction, // Now using total quantity
          existingStock: existingProductStock?.quantity || 0,
          note: "Quantidade total será adicionada ao estoque (incluindo perdas)",
        });

        // Add the TOTAL production quantity to the product stock - await this operation
        try {
          await onStockUpdate(
            productId,
            "product",
            totalProduction, // Changed from effectiveProduction to totalProduction
            "add",
            0, // No cost for produced items initially
            recipe.product_name, // pass the product name
          );
          console.log(
            `✅ [DailyProduction] Produto ${recipe.product_name} adicionado ao estoque com sucesso! (${totalProduction} unidades TOTAIS incluindo perdas)`,
          );
        } catch (productError) {
          console.error(
            `❌ [DailyProduction] Erro ao adicionar produto ao estoque:`,
            productError,
          );
          throw new Error(
            `Falha ao adicionar produto ao estoque: ${productError}`,
          );
        }
      } else {
        console.log(
          "⚠️ [DailyProduction] Nenhum produto será adicionado ao estoque",
        );
      }

      console.log(
        "🎉 [DailyProduction] PRODUÇÃO REGISTRADA COM SUCESSO COMPLETO!",
      );

      // Wait a moment to ensure database operations are complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("🔄 [DailyProduction] Aguardando sincronização completa...");

      // Reset form
      setSelectedRecipe("");
      setQuantityProduced("");
      setProductionLoss("");
      setMaterialLossEnabled(false);
      setMaterialLosses({});
      setPendingProduction(null);
      setShowConfirmDialog(false);

      // Show simplified success message
      let message = `🎉 PRODUÇÃO REGISTRADA COM SUCESSO!\n\n`;
      message += `📊 RESUMO DA PRODUÇÃO:\n`;
      message += `• Produto: ${recipe.product_name}\n`;
      message += `• Quantidade Produzida: ${quantity} unidades\n`;
      message += `• Data: ${new Date(productionDate).toLocaleDateString("pt-BR")}\n`;

      if (productionLoss > 0) {
        message += `\n⚠️ PERDAS DE PRODUÇÃO:\n`;
        message += `• Defeitos/Perdas: ${productionLoss} unidades\n`;
        message += `• Quantidade Adicionada ao Estoque: ${quantity} unidades\n`;
      } else {
        message += `\n✅ Todas as ${quantity} unidades foram adicionadas ao estoque.\n`;
      }

      // Simplified material summary
      message += `\n📦 MATÉRIAS-PRIMAS DESCONTADAS:\n`;
      pendingProduction.consolidatedMaterialSummary.forEach((material) => {
        message += `• ${material.material_name}: -${material.total_deduction.toFixed(2)} ${material.unit}\n`;
      });

      message += `\n🔄 Estoque atualizado automaticamente.\n`;
      message += `📋 Histórico de produção registrado.\n`;

      alert(message);

      console.log(
        "✅ [DailyProduction] Produção registrada com sucesso - mantendo na mesma página",
      );
    } catch (error) {
      console.error(
        "❌ [DailyProduction] ERRO CRÍTICO ao processar produção:",
        error,
      );
      alert(
        `ERRO ao processar a produção:\n\n${error}\n\nVerifique o console para mais detalhes.`,
      );
    }
  };

  const handleDeleteProduction = async (entry: ProductionEntry) => {
    console.log('🔥 [DEBUG] handleDeleteProduction called with:', entry);
    if (
      confirm(
        `Tem certeza que deseja deletar a produção de ${entry.quantity_produced} unidades de ${entry.product_name}?`,
      )
    ) {
      console.log("🗑️ [DailyProduction] Deletando produção:", entry);

      try {
        // Reverse stock changes
        // Add materials back to stock - await each operation
        console.log("📦 [DailyProduction] Devolvendo materiais ao estoque...");
        for (const material of entry.materials_consumed) {
          console.log(
            `  + Devolvendo ${material.quantity_consumed} ${material.unit} de ${material.material_name}`,
          );
          await onStockUpdate(
            material.material_id,
            "material",
            material.quantity_consumed,
            "add",
            undefined, // no unit price
            material.material_name, // pass the material name
          );
        }

        // Remove produced tires from stock
        const existingProductStock = stockItems.find(
          (item) =>
            item.item_name === entry.product_name &&
            item.item_type === "product",
        );

        if (existingProductStock) {
          console.log(
            `📦 [DailyProduction] Removendo ${entry.quantity_produced} unidades TOTAIS de ${entry.product_name} do estoque (incluindo perdas registradas)`,
          );
          await onStockUpdate(
            existingProductStock.item_id,
            "product",
            entry.quantity_produced, // Remove total quantity (as it was added as total)
            "remove",
            undefined, // no unit price
            entry.product_name, // pass the product name
          );
        } else {
          console.warn(
            `⚠️ [DailyProduction] Produto ${entry.product_name} não encontrado no estoque para remoção`,
          );
        }

        // Delete the production entry
        console.log(
          "🗑️ [DailyProduction] Deletando entrada de produção do banco de dados...",
        );
        await onDelete(entry.id);

        console.log("✅ [DailyProduction] Produção deletada com sucesso!");
      } catch (error) {
        console.error("❌ [DailyProduction] Erro ao deletar produção:", error);
        alert(
          "Erro ao deletar a produção. Verifique o console para mais detalhes.",
        );
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Advanced filtering logic
  const filteredEntries = productionEntries.filter((entry) => {
    const matchesSearch = entry.product_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    // Advanced date filtering
    let matchesDate = true;
    const entryDate = new Date(entry.production_date);
    const today = new Date();

    switch (dateFilterType) {
      case "today":
        // Apply +1 day compensation to match the save workaround
        // Save uses +2 days, but filter needs +1 day to match correctly
        const todayDate = new Date();
        const adjustedTodayDate = new Date(todayDate);
        adjustedTodayDate.setDate(todayDate.getDate() + 1);
        const todayWithWorkaround = `${adjustedTodayDate.getFullYear()}-${String(adjustedTodayDate.getMonth() + 1).padStart(2, "0")}-${String(adjustedTodayDate.getDate()).padStart(2, "0")}`;
        matchesDate = entry.production_date === todayWithWorkaround;
        console.log("🗓️ [DailyProduction] Filtro 'hoje' com workaround aplicado:", {
          todayOriginal: `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`,
          todayWithWorkaround,
          entryDate: entry.production_date,
          matches: matchesDate,
          reason: "Compensação +1 dia para filtro (salvamento usa +2 dias)"
        });
        break;
      case "last7days":
        const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = entryDate >= last7Days;
        break;
      case "last30days":
        const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = entryDate >= last30Days;
        break;
      case "thisMonth":
        const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
        matchesDate = entry.production_date.startsWith(thisMonth);
        break;
      case "lastMonth":
        const lastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1,
        );
        const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
        matchesDate = entry.production_date.startsWith(lastMonthStr);
        break;
      case "month":
        matchesDate =
          !filterMonth || entry.production_date.startsWith(filterMonth);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          // Apply +1 day compensation for custom date range to match save workaround
          const startDate = new Date(customStartDate);
          const adjustedStartDate = new Date(startDate);
          adjustedStartDate.setDate(startDate.getDate() + 1);
          
          const endDate = new Date(customEndDate);
          const adjustedEndDate = new Date(endDate);
          adjustedEndDate.setDate(endDate.getDate() + 1);
          
          matchesDate = entryDate >= adjustedStartDate && entryDate <= adjustedEndDate;
        } else if (customStartDate) {
          const startDate = new Date(customStartDate);
          const adjustedStartDate = new Date(startDate);
          adjustedStartDate.setDate(startDate.getDate() + 1);
          matchesDate = entryDate >= adjustedStartDate;
        } else if (customEndDate) {
          const endDate = new Date(customEndDate);
          const adjustedEndDate = new Date(endDate);
          adjustedEndDate.setDate(endDate.getDate() + 1);
          matchesDate = entryDate <= adjustedEndDate;
        }
        break;
      case "all":
      default:
        matchesDate = true;
        break;
    }

    return matchesSearch && matchesDate;
  });

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setDateFilterType("all");
    setFilterMonth("");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  // Check if any filter is active
  const hasActiveFilters =
    searchTerm ||
    dateFilterType !== "all" ||
    filterMonth ||
    customStartDate ||
    customEndDate;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-blue to-neon-green flex items-center justify-center">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          Produção Diária
        </h2>
        <p className="text-tire-300 mt-2">
          Registre a produção diária e desconte automaticamente do estoque
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Form */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Registrar Produção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productionDate" className="text-tire-300">
                Data da Produção
              </Label>
              <Input
                id="productionDate"
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                className="bg-factory-700/50 border-tire-600/30 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-tire-300">Receita de Produção</Label>
              <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
                <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                  <SelectValue placeholder="Selecione uma receita" />
                </SelectTrigger>
                <SelectContent className="bg-factory-800 border-tire-600/30">
                  {activeRecipes.map((recipe) => (
                    <SelectItem
                      key={recipe.id}
                      value={recipe.id}
                      className="text-white hover:bg-tire-700/50"
                    >
                      {recipe.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-tire-300">
                Quantidade Produzida
              </Label>
              <Input
                id="quantity"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantityProduced}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                placeholder="Digite a quantidade (apenas números inteiros)"
                title="Apenas números inteiros são permitidos"
              />
            </div>

            {/* Production Loss Section */}
            <div className="space-y-3 p-4 bg-red-900/10 rounded-lg border border-red-600/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <Label className="text-red-300 font-medium">
                  Controle de Perdas
                </Label>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="productionLoss"
                  className="text-tire-300 text-sm"
                >
                  Perda de Produção (unidades defeituosas/perdidas)
                </Label>
                <Input
                  id="productionLoss"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={productionLoss}
                  onChange={(e) => handleProductionLossChange(e.target.value)}
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  placeholder="0 (opcional)"
                  title="Quantidade de produtos perdidos ou defeituosos"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-tire-300 text-sm">
                    Registrar Perdas de Matéria-Prima
                  </Label>
                  <button
                    type="button"
                    onClick={() => setMaterialLossEnabled(!materialLossEnabled)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      materialLossEnabled
                        ? "bg-red-600/20 text-red-300 border border-red-600/30"
                        : "bg-factory-700/50 text-tire-400 border border-tire-600/30 hover:bg-factory-600/50"
                    }`}
                  >
                    {materialLossEnabled ? "Ativado" : "Desativado"}
                  </button>
                </div>

                {materialLossEnabled && selectedRecipe && (
                  <div className="space-y-2 p-3 bg-factory-700/30 rounded border border-tire-600/20">
                    <p className="text-tire-400 text-xs">
                      Registre perdas adicionais de matéria-prima (além do
                      consumo normal da receita):
                    </p>
                    {activeRecipes
                      .find((r) => r.id === selectedRecipe)
                      ?.materials.map((material) => (
                        <div
                          key={material.material_id}
                          className="flex items-center gap-2"
                        >
                          <span className="text-tire-300 text-sm min-w-0 flex-1">
                            {material.material_name}:
                          </span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={materialLosses[material.material_id] || ""}
                            onChange={(e) =>
                              handleMaterialLossChange(
                                material.material_id,
                                e.target.value,
                              )
                            }
                            className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 w-20 text-sm"
                            placeholder="0"
                            title={`Perda adicional de ${material.material_name} em ${material.unit}`}
                          />
                          <span className="text-tire-400 text-xs">
                            {material.unit}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {selectedRecipe && (
              <div className="space-y-2">
                <Label className="text-tire-300 text-sm">
                  Matérias-primas necessárias:
                </Label>
                <div className="bg-factory-700/30 p-3 rounded-lg border border-tire-600/20 space-y-2">
                  {activeRecipes
                    .find((r) => r.id === selectedRecipe)
                    ?.materials.map((material) => {
                      const stock = getStockForMaterial(material.material_id);
                      const totalNeeded =
                        calculateTotalMaterialNeeded(material);
                      const availableStock = stock?.quantity || 0;
                      const sufficient = availableStock >= totalNeeded;

                      // Calculate breakdown for display
                      const baseQuantity = quantityProduced
                        ? parseInt(quantityProduced)
                        : 1;
                      const prodLoss = productionLoss
                        ? parseInt(productionLoss)
                        : 0;
                      const baseConsumption =
                        material.quantity_needed * baseQuantity;
                      const lossCompensation =
                        prodLoss > 0 ? material.quantity_needed * prodLoss : 0;
                      const additionalLoss =
                        materialLossEnabled &&
                        materialLosses[material.material_id]
                          ? parseFloat(materialLosses[material.material_id]) ||
                            0
                          : 0;

                      return (
                        <div key={material.material_id} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-tire-300 font-medium">
                              {material.material_name}:
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold ${
                                  sufficient
                                    ? "text-neon-green"
                                    : "text-red-400"
                                }`}
                              >
                                {totalNeeded.toFixed(2)} {material.unit}
                              </span>
                              <span className="text-tire-400">
                                (Disponível: {availableStock.toFixed(2)})
                              </span>
                              {!sufficient && (
                                <AlertTriangle className="h-4 w-4 text-red-400" />
                              )}
                            </div>
                          </div>

                          {/* Breakdown of quantities */}
                          {(prodLoss > 0 || additionalLoss > 0) && (
                            <div className="ml-4 space-y-1 text-xs">
                              <div className="flex justify-between text-tire-400">
                                <span>• Receita base:</span>
                                <span>
                                  {baseConsumption.toFixed(2)} {material.unit}
                                </span>
                              </div>
                              {lossCompensation > 0 && (
                                <div className="flex justify-between text-orange-300">
                                  <span>• Compensação perdas produção:</span>
                                  <span>
                                    +{lossCompensation.toFixed(2)}{" "}
                                    {material.unit}
                                  </span>
                                </div>
                              )}
                              {additionalLoss > 0 && (
                                <div className="flex justify-between text-red-300">
                                  <span>
                                    • Perdas adicionais matéria-prima:
                                  </span>
                                  <span>
                                    +{additionalLoss.toFixed(2)} {material.unit}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between text-white font-medium border-t border-tire-600/30 pt-1">
                                <span>TOTAL NECESSÁRIO:</span>
                                <span>
                                  {totalNeeded.toFixed(2)} {material.unit}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <AlertDialog
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
            >
              <AlertDialogTrigger asChild>
                <Button
                  onClick={handlePrepareProduction}
                  className="w-full bg-gradient-to-r from-neon-blue to-tire-500 hover:from-tire-600 hover:to-neon-blue text-white"
                  disabled={
                    isLoading ||
                    !selectedRecipe ||
                    !quantityProduced ||
                    parseInt(quantityProduced) <= 0
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isLoading ? "Processando..." : "Registrar Produção"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-factory-800 border-tire-600/30 text-white max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">
                    Confirmar Produção
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-tire-300">
                    {pendingProduction && (
                      <div className="space-y-4">
                        <p>
                          Você está prestes a registrar a produção de{" "}
                          <strong>{pendingProduction.quantity}</strong> unidades
                          de{" "}
                          <strong>
                            {pendingProduction.recipe.product_name}
                          </strong>
                          .
                        </p>

                        {/* Production Summary - Layout Paisagem */}
                        <div className="p-4 bg-blue-900/20 rounded border border-blue-600/30">
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-4 w-4 text-blue-400" />
                            <span className="font-medium text-blue-300">
                              Resumo da Produção
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div className="text-center">
                              <span className="text-tire-300 block text-xs">
                                Quantidade Total:
                              </span>
                              <p className="text-white font-bold text-lg">
                                {pendingProduction.quantity}
                              </p>
                              <span className="text-tire-400 text-xs">
                                unidades
                              </span>
                            </div>
                            <div className="text-center">
                              <span className="text-tire-300 block text-xs">
                                Defeitos/Perdas:
                              </span>
                              <p
                                className={`font-bold text-lg ${
                                  pendingProduction.productionLoss > 0
                                    ? "text-red-400"
                                    : "text-green-400"
                                }`}
                              >
                                {pendingProduction.productionLoss || 0}
                              </p>
                              <span className="text-tire-400 text-xs">
                                unidades
                              </span>
                            </div>
                            <div className="text-center">
                              <span className="text-tire-300 block text-xs">
                                Adicionadas ao Estoque:
                              </span>
                              <p className="text-green-400 font-bold text-lg">
                                {pendingProduction.quantity}
                              </p>
                              <span className="text-tire-400 text-xs">
                                unidades (TOTAL)
                              </span>
                            </div>
                            <div className="text-center">
                              <span className="text-tire-300 block text-xs">
                                Data:
                              </span>
                              <p className="text-white font-bold text-lg">
                                {(() => {
                                  // Apply +1 day workaround for display to match user's intended date
                                  const displayDate = new Date(productionDate);
                                  displayDate.setDate(displayDate.getDate() + 1);
                                  return displayDate.toLocaleDateString(
                                    "pt-BR",
                                    { day: "2-digit", month: "2-digit" },
                                  );
                                })()}
                              </p>
                              <span className="text-tire-400 text-xs">
                                {(() => {
                                  // Apply +1 day workaround for display to match user's intended date
                                  const displayDate = new Date(productionDate);
                                  displayDate.setDate(displayDate.getDate() + 1);
                                  return displayDate.toLocaleDateString(
                                    "pt-BR",
                                    { year: "numeric" },
                                  );
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Simplified Material Summary */}
                        <div className="p-4 bg-purple-900/20 rounded border border-purple-600/30">
                          <div className="flex items-center gap-2 mb-3">
                            <Minus className="h-4 w-4 text-purple-400" />
                            <span className="font-medium text-purple-300">
                              MATÉRIAS-PRIMAS QUE SERÃO DESCONTADAS
                            </span>
                          </div>

                          {/* Simplified Material List */}
                          <div className="space-y-2">
                            {pendingProduction.consolidatedMaterialSummary.map(
                              (material) => (
                                <div
                                  key={material.material_id}
                                  className={`p-3 rounded border flex items-center justify-between ${
                                    material.sufficient
                                      ? "bg-green-900/20 border-green-600/30"
                                      : "bg-red-900/20 border-red-600/30"
                                  }`}
                                >
                                  <span className="font-medium text-white text-sm">
                                    {material.material_name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`font-bold ${
                                        material.sufficient
                                          ? "text-green-400"
                                          : "text-red-400"
                                      }`}
                                    >
                                      -{material.total_deduction.toFixed(2)}{" "}
                                      {material.unit}
                                    </span>
                                    {material.sufficient ? (
                                      <CheckCircle className="h-4 w-4 text-green-400" />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4 text-red-400" />
                                    )}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>

                        {pendingProduction.consolidatedMaterialSummary.some(
                          (m) => !m.sufficient,
                        ) && (
                          <div className="p-3 bg-red-900/30 rounded border border-red-600/50">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-red-400" />
                              <p className="text-red-300 font-medium">
                                ⚠️ ATENÇÃO: Alguns materiais têm estoque
                                insuficiente!
                              </p>
                            </div>
                            <p className="text-red-200 text-sm mt-1">
                              Verifique o estoque antes de confirmar a produção.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-factory-700 text-white hover:bg-factory-600">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmProduction}
                    className="bg-neon-blue hover:bg-neon-blue/80"
                    disabled={pendingProduction?.consolidatedMaterialSummary.some(
                      (m) => !m.sufficient,
                    )}
                  >
                    Confirmar Produção
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Production History */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-neon-blue" />
                Histórico de Produção
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-tire-300 hover:text-white hover:bg-tire-700/50 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Limpar Filtros
                </Button>
              )}
            </CardTitle>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
              <Input
                placeholder="Buscar produções por nome do produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
              />
            </div>

            {/* Advanced Date Filters */}
            <div className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-neon-blue" />
                <Label className="text-tire-200 font-medium">
                  Filtros de Data
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Date Filter Type */}
                <div className="space-y-2">
                  <Label className="text-tire-300 text-sm">Período:</Label>
                  <Select
                    value={dateFilterType}
                    onValueChange={(value) => {
                      setDateFilterType(value);
                      // Reset other date filters when changing type
                      if (value !== "month") setFilterMonth("");
                      if (value !== "custom") {
                        setCustomStartDate("");
                        setCustomEndDate("");
                      }
                    }}
                  >
                    <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-factory-800 border-tire-600/30">
                      <SelectItem
                        value="all"
                        className="text-white hover:bg-tire-700/50"
                      >
                        Todos os períodos
                      </SelectItem>
                      <SelectItem
                        value="custom"
                        className="text-white hover:bg-tire-700/50"
                      >
                        Período personalizado
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Specific Month Filter */}
                {dateFilterType === "month" && (
                  <div className="space-y-2">
                    <Label className="text-tire-300 text-sm">Mês:</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                      <Input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="pl-9 bg-factory-700/50 border-tire-600/30 text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Custom Date Range */}
                {dateFilterType === "custom" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-tire-300 text-sm">
                        Data Inicial:
                      </Label>
                      <div className="relative">
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="bg-factory-700/50 border-tire-600/30 text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-tire-300 text-sm">
                        Data Final:
                      </Label>
                      <div className="relative">
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="bg-factory-700/50 border-tire-600/30 text-white"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Active Filters Indicators */}
              {hasActiveFilters && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {searchTerm && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-neon-blue/20 rounded text-neon-blue text-xs">
                      <Search className="h-3 w-3" />
                      Busca: "{searchTerm}"
                    </div>
                  )}
                  {dateFilterType !== "all" && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-neon-green/20 rounded text-neon-green text-xs">
                      <Calendar className="h-3 w-3" />
                      {dateFilterType === "today" && "Hoje"}
                      {dateFilterType === "last7days" && "Últimos 7 dias"}
                      {dateFilterType === "last30days" && "Últimos 30 dias"}
                      {dateFilterType === "thisMonth" && "Este mês"}
                      {dateFilterType === "lastMonth" && "Mês passado"}
                      {dateFilterType === "month" && `Mês: ${filterMonth}`}
                      {dateFilterType === "custom" && "Período personalizado"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                  <p className="text-tire-400">
                    {hasActiveFilters
                      ? "Nenhuma produção encontrada com os filtros aplicados"
                      : "Nenhuma produção registrada"}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="mt-2 text-tire-300 hover:text-white"
                    >
                      Limpar filtros para ver todas as produções
                    </Button>
                  )}
                </div>
              ) : (
                filteredEntries
                  .sort(
                    (a, b) =>
                      new Date(b.production_date).getTime() -
                      new Date(a.production_date).getTime(),
                  )
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-medium">
                            {entry.product_name}
                          </h4>
                          {/* Loss indicators */}
                          {entry.production_loss &&
                            entry.production_loss > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-red-900/30 rounded text-red-300 text-xs">
                                <AlertCircle className="h-3 w-3" />
                                Perdas: {entry.production_loss}
                              </div>
                            )}
                          {entry.material_loss &&
                            entry.material_loss.length > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-orange-900/30 rounded text-orange-300 text-xs">
                                <Minus className="h-3 w-3" />
                                Mat. Perdas: {entry.material_loss.length}
                              </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-neon-green font-medium">
                              {entry.quantity_produced} unidades
                            </span>
                            {entry.production_loss &&
                              entry.production_loss > 0 && (
                                <p className="text-orange-400 text-xs">
                                  Perdas: {entry.production_loss} (registradas
                                  no histórico)
                                </p>
                              )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProduction(entry)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-8 w-8"
                            title="Deletar produção"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-tire-400 text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <p>
                            Data da Produção:{" "}
                            <span className="text-neon-blue font-medium">
                              {new Date(
                                entry.production_date,
                              ).toLocaleDateString("pt-BR")}
                            </span>
                          </p>
                          {(entry.production_loss &&
                            entry.production_loss > 0) ||
                          (entry.material_loss &&
                            entry.material_loss.length > 0) ? (
                            <div className="flex items-center gap-1 text-red-300 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              Com Perdas
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-green-400 text-xs">
                              <CheckCircle className="h-3 w-3" />
                              Sem Perdas
                            </div>
                          )}
                        </div>

                        {/* Production Loss Display */}
                        {entry.production_loss && entry.production_loss > 0 && (
                          <div className="mt-2 p-2 bg-red-900/20 rounded border border-red-600/30">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle className="h-3 w-3 text-red-400" />
                              <span className="font-medium text-red-300 text-xs">
                                Perdas de Produção:
                              </span>
                            </div>
                            <p className="text-red-400 text-xs">
                              {entry.production_loss} unidades
                              perdidas/defeituosas
                            </p>
                            <p className="text-green-400 text-xs">
                              {entry.quantity_produced} unidades TOTAIS no
                              estoque (incluindo perdas)
                            </p>
                          </div>
                        )}

                        {/* Material Loss Display */}
                        {entry.material_loss &&
                          entry.material_loss.length > 0 && (
                            <div className="mt-2 p-2 bg-orange-900/20 rounded border border-orange-600/30">
                              <div className="flex items-center gap-2 mb-1">
                                <Minus className="h-3 w-3 text-orange-400" />
                                <span className="font-medium text-orange-300 text-xs">
                                  Perdas de Matéria-Prima:
                                </span>
                              </div>
                              {entry.material_loss.map((loss, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between text-xs"
                                >
                                  <span className="text-tire-300">
                                    {loss.material_name}:
                                  </span>
                                  <span className="text-orange-400">
                                    -{loss.quantity_lost.toFixed(2)} {loss.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                        <div className="mt-2">
                          <p className="font-medium text-tire-300 mb-1">
                            Materiais consumidos (receita):
                          </p>
                          {entry.materials_consumed.map((material, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{material.material_name}:</span>
                              <span className="text-red-400">
                                -{material.quantity_consumed.toFixed(2)}{" "}
                                {material.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
              )}
              {filteredEntries.length > 0 && (
                <div className="mt-4 p-3 bg-factory-700/20 rounded border border-tire-600/20">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-tire-300">
                      Total de produções encontradas:
                    </span>
                    <span className="text-white font-medium">
                      {filteredEntries.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-tire-300">
                      Total de unidades produzidas:
                    </span>
                    <span className="text-neon-green font-bold">
                      {filteredEntries.reduce(
                        (sum, entry) => sum + entry.quantity_produced,
                        0,
                      )}{" "}
                      unidades
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-tire-300">
                      Total de perdas de produção:
                    </span>
                    <span className="text-red-400 font-bold">
                      {filteredEntries.reduce(
                        (sum, entry) => sum + (entry.production_loss || 0),
                        0,
                      )}{" "}
                      unidades
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-tire-300">
                      Unidades TOTAIS adicionadas ao estoque:
                    </span>
                    <span className="text-neon-blue font-bold">
                      {filteredEntries.reduce(
                        (sum, entry) => sum + entry.quantity_produced,
                        0,
                      )}{" "}
                      unidades (incluindo perdas)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Chart Section */}
      <div className="mt-8">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-green via-neon-blue to-neon-purple flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              Análise Gráfica da Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-factory-900/30 rounded-lg p-1">
              <ProductionChart
                productionEntries={productionEntries}
                isLoading={isLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DailyProduction;
