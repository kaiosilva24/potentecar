import React, { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Palette,
  GripVertical,
  RotateCcw,
  Check,
  Package,
  TrendingUp,
  BarChart3,
  Plus,
  DollarSign,
  ShoppingCart,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import RawMaterialStock from "./RawMaterialStock";
import ProductStock from "./ProductStock";
import FinalProductsStock from "./FinalProductsStock";
import ResaleProductsStock from "./ResaleProductsStock";
import StockCharts from "./StockCharts";
import {
  useMaterials,
  useProducts,
  useStockItems,
  useResaleProducts,
  useCostCalculationOptions,
} from "@/hooks/useDataPersistence";
import { useToast } from "@/components/ui/use-toast";
import { dataManager } from "@/utils/dataManager";
import { StockBaselineManager } from "@/utils/stockBaselineManager";

interface StockDashboardProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
  type:
    | "materialTypes"
    | "materialValue"
    | "finalProductQuantity"
    | "finalProductValue";
}

interface SortableCardProps {
  card: MetricCard;
  onColorChange?: (cardId: string, color: string, bgColor: string) => void;
  showColorPicker?: boolean;
}

const SortableCard = ({
  card,
  onColorChange,
  showColorPicker = false,
}: SortableCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition, // Remove transition during drag for smoother experience
    opacity: isDragging ? 0.5 : 1, // More visible during drag
    zIndex: isDragging ? 1000 : 1,
  };

  const colorOptions = [
    { name: "Blue", color: "text-neon-blue", bgColor: "bg-factory-800/50" },
    { name: "Green", color: "text-neon-green", bgColor: "bg-factory-800/50" },
    { name: "Purple", color: "text-neon-purple", bgColor: "bg-factory-800/50" },
    { name: "Orange", color: "text-neon-orange", bgColor: "bg-factory-800/50" },
    { name: "Cyan", color: "text-neon-cyan", bgColor: "bg-factory-800/50" },
    { name: "Yellow", color: "text-yellow-400", bgColor: "bg-factory-800/50" },
    { name: "Red", color: "text-red-400", bgColor: "bg-factory-800/50" },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative transition-all duration-200 ${
        isDragging
          ? "scale-105 shadow-2xl shadow-neon-blue/30"
          : "hover:scale-[1.02] hover:shadow-lg"
      }`}
    >
      {/* Drag handle overlay - covers entire card for easy dragging */}
      <div
        {...attributes}
        {...listeners}
        className={`absolute inset-0 z-20 ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          background: "transparent",
          // Prevent text selection during drag
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
        }}
      />

      <Card
        className={`${card.bgColor} border-tire-600/30 relative group ${
          isDragging
            ? "border-neon-blue/70 shadow-xl shadow-neon-blue/25 bg-factory-700/80"
            : "hover:border-tire-500/50 hover:bg-factory-700/30"
        } transition-all duration-200 overflow-hidden`}
      >
        {/* Drag indicator - more prominent */}
        <div
          className={`absolute top-2 left-2 transition-opacity pointer-events-none z-10 ${
            isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-80"
          }`}
        >
          <div className="bg-tire-700/50 rounded p-1 backdrop-blur-sm">
            <GripVertical className="h-4 w-4 text-tire-300" />
          </div>
        </div>

        {/* Drag state indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-neon-blue/10 border-2 border-neon-blue/30 rounded-lg pointer-events-none z-10" />
        )}

        <CardContent className="p-4 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-tire-300 text-sm">{card.title}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-tire-400 mt-1">{card.subtitle}</p>
            </div>
            <div className={card.color}>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Card component for drag overlay - enhanced visual feedback
const DragOverlayCard = ({ card }: { card: MetricCard }) => {
  return (
    <div className="transform scale-110 animate-pulse">
      <Card
        className={`${card.bgColor} border-neon-blue/70 shadow-2xl shadow-neon-blue/40 bg-factory-700/90 backdrop-blur-sm`}
        style={{
          filter: "brightness(1.1) saturate(1.2)",
        }}
      >
        {/* Glowing border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/20 via-transparent to-neon-purple/20 rounded-lg" />

        {/* Drag indicator in overlay */}
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-neon-blue/30 rounded p-1 backdrop-blur-sm">
            <GripVertical className="h-4 w-4 text-neon-blue" />
          </div>
        </div>

        <CardContent className="p-4 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-tire-200 text-sm font-medium">{card.title}</p>
              <p className={`text-2xl font-bold ${card.color} drop-shadow-sm`}>
                {card.value}
              </p>
              <p className="text-xs text-tire-300 mt-1">{card.subtitle}</p>
            </div>
            <div className={`${card.color} drop-shadow-sm`}>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StockDashboard = ({
  onRefresh = () => {},
  isLoading = false,
}: StockDashboardProps) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCardForColor, setSelectedCardForColor] = useState<string>("");
  const [customColorValue, setCustomColorValue] = useState<string>("#10B981");
  const { toast } = useToast();

  // Estado para forçar re-renderização quando custos são atualizados
  const [lastCostUpdate, setLastCostUpdate] = useState<Date | null>(null);

  // Color options for customization - matching main dashboard
  const colorOptions = [
    {
      name: "Verde Neon",
      color: "text-neon-green",
      bgColor: "bg-factory-800/50",
      hex: "#10B981",
    },
    {
      name: "Azul Neon",
      color: "text-neon-blue",
      bgColor: "bg-factory-800/50",
      hex: "#3B82F6",
    },
    {
      name: "Roxo Neon",
      color: "text-neon-purple",
      bgColor: "bg-factory-800/50",
      hex: "#8B5CF6",
    },
    {
      name: "Laranja Neon",
      color: "text-neon-orange",
      bgColor: "bg-factory-800/50",
      hex: "#F59E0B",
    },
    {
      name: "Rosa Neon",
      color: "text-pink-400",
      bgColor: "bg-factory-800/50",
      hex: "#EC4899",
    },
    {
      name: "Vermelho",
      color: "text-red-400",
      bgColor: "bg-factory-800/50",
      hex: "#EF4444",
    },
    {
      name: "Amarelo",
      color: "text-yellow-400",
      bgColor: "bg-factory-800/50",
      hex: "#EAB308",
    },
    {
      name: "Ciano",
      color: "text-neon-cyan",
      bgColor: "bg-factory-800/50",
      hex: "#06B6D4",
    },
    {
      name: "Azul Claro",
      color: "text-sky-300",
      bgColor: "bg-factory-800/50",
      hex: "#bbe5fc",
    },
    {
      name: "Branco",
      color: "text-white",
      bgColor: "bg-factory-800/50",
      hex: "#FFFFFF",
    },
    {
      name: "Cinza",
      color: "text-gray-400",
      bgColor: "bg-factory-800/50",
      hex: "#6B7280",
    },
  ];

  // Convert hex to Tailwind color class
  const hexToTailwindColor = (hex: string): string => {
    const colorMap: { [key: string]: string } = {
      "#10B981": "text-neon-green",
      "#3B82F6": "text-neon-blue",
      "#8B5CF6": "text-neon-purple",
      "#F59E0B": "text-neon-orange",
      "#EC4899": "text-pink-400",
      "#EF4444": "text-red-400",
      "#EAB308": "text-yellow-400",
      "#bbe5fc": "text-sky-300",
      "#FFFFFF": "text-white",
      "#6B7280": "text-gray-400",
    };
    return colorMap[hex.toUpperCase()] || "text-neon-blue";
  };

  // Handle custom color change
  const handleCustomColorChange = (hex: string) => {
    setCustomColorValue(hex);
    if (selectedCardForColor) {
      const tailwindColor = hexToTailwindColor(hex);
      handleColorChange(
        selectedCardForColor,
        tailwindColor,
        "bg-factory-800/50"
      );
    }
  };

  // Default card order and colors
  const defaultCards: MetricCard[] = [
    {
      id: "materialTypes",
      title: "Tipos de Material",
      value: 0,
      subtitle: "de 0 cadastrados",
      icon: "🧱",
      color: "text-neon-blue",
      bgColor: "bg-factory-800/50",
      type: "materialTypes",
    },
    {
      id: "materialValue",
      title: "Saldo Matéria-Prima",
      value: "R$ 0",
      subtitle: "Valor total investido",
      icon: "💎",
      color: "text-neon-cyan",
      bgColor: "bg-factory-800/50",
      type: "materialValue",
    },
    {
      id: "finalProductQuantity",
      title: "Qtd. Produtos Finais",
      value: 0,
      subtitle: "Produtos fabricados",
      icon: "🏭",
      color: "text-neon-green",
      bgColor: "bg-factory-800/50",
      type: "finalProductQuantity",
    },
    {
      id: "finalProductValue",
      title: "Saldo Produtos Finais",
      value: "R$ 0",
      subtitle: "Valor em produtos finais",
      icon: "🎯",
      color: "text-neon-orange",
      bgColor: "bg-factory-800/50",
      type: "finalProductValue",
    },
  ];

  // Drag and drop sensors with improved activation for better UX
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced distance for more responsive drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // State for card order and customization
  const [cards, setCards] = useState<MetricCard[]>(() => {
    const saved = localStorage.getItem("stockDashboard_cardOrder");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log(
          "🔄 [StockDashboard] Carregando cards salvos do localStorage:",
          {
            savedCards: parsed.length,
            defaultCards: defaultCards.length,
            savedOrder: parsed.map((c: MetricCard) => c.id),
            defaultOrder: defaultCards.map((c) => c.id),
          }
        );

        // Preserve the saved order and merge with default properties
        const restoredCards = parsed.map((savedCard: MetricCard) => {
          const defaultCard = defaultCards.find((dc) => dc.id === savedCard.id);
          if (defaultCard) {
            // Merge saved customizations with default properties
            return {
              ...defaultCard,
              ...savedCard,
              // Ensure we keep the saved order by using the saved card structure
            };
          }
          return savedCard; // Fallback to saved card if no default found
        });

        // Add any new default cards that weren't in the saved data
        const savedIds = parsed.map((c: MetricCard) => c.id);
        const newCards = defaultCards.filter((dc) => !savedIds.includes(dc.id));

        const finalCards = [...restoredCards, ...newCards];

        console.log("✅ [StockDashboard] Cards restaurados com sucesso:", {
          finalOrder: finalCards.map((c) => c.id),
          totalCards: finalCards.length,
        });

        return finalCards;
      } catch (error) {
        console.error(
          "❌ [StockDashboard] Erro ao carregar cards do localStorage:",
          error
        );
        return defaultCards;
      }
    }
    console.log("🔄 [StockDashboard] Usando ordem padrão dos cards");
    return defaultCards;
  });

  // Save to localStorage whenever cards change
  useEffect(() => {
    console.log(
      "💾 [StockDashboard] Salvando ordem dos cards no localStorage:",
      {
        cardOrder: cards.map((c) => c.id),
        totalCards: cards.length,
        timestamp: new Date().toISOString(),
      }
    );
    localStorage.setItem("stockDashboard_cardOrder", JSON.stringify(cards));
  }, [cards]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      console.log("🔄 [StockDashboard] Reordenando cards:", {
        activeId: active.id,
        overId: over.id,
        beforeOrder: cards.map((c) => c.id),
      });

      setCards((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        console.log("✅ [StockDashboard] Nova ordem dos cards:", {
          afterOrder: newOrder.map((c) => c.id),
          movedFrom: oldIndex,
          movedTo: newIndex,
        });

        return newOrder;
      });

      toast({
        title: "Cards reordenados",
        description:
          "A ordem dos cards foi atualizada e salva automaticamente.",
      });
    }
  };

  // Handle color change
  const handleColorChange = (
    cardId: string,
    color: string,
    bgColor: string
  ) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, color, bgColor } : card
      )
    );

    toast({
      title: "Cor atualizada",
      description: "A cor do card foi alterada com sucesso.",
    });
  };

  // Reset to default
  const resetToDefault = () => {
    console.log("🔄 [StockDashboard] Resetando cards para configuração padrão");
    setCards(defaultCards);
    localStorage.removeItem("stockDashboard_cardOrder");
    console.log("✅ [StockDashboard] Cards resetados e localStorage limpo");
    toast({
      title: "Configurações resetadas",
      description: "Os cards foram restaurados para a configuração padrão.",
    });
  };

  // Use database hooks
  const { materials, isLoading: materialsLoading } = useMaterials();
  const { products, isLoading: productsLoading } = useProducts();
  const { resaleProducts, isLoading: resaleProductsLoading } =
    useResaleProducts();
  const {
    stockItems,
    isLoading: stockLoading,
    updateStockItem,
    addStockItem,
  } = useStockItems();

  // Estado para forçar re-renderização quando há mudanças nos produtos de revenda
  const [resaleDataVersion, setResaleDataVersion] = useState(0);

  // Debug: monitorar quando stockItems é atualizado pelo hook
  useEffect(() => {
    console.log(`🔄 [StockDashboard] stockItems atualizado pelo hook:`, {
      length: stockItems.length,
      timestamp: Date.now(),
      loading: stockLoading,
    });
  }, [stockItems, stockLoading]);

  // Listener para eventos de sincronização de produtos de revenda
  useEffect(() => {
    const handleResaleStockUpdate = (event: CustomEvent) => {
      console.log(
        "📡 [StockDashboard] Evento resaleStockUpdated recebido:",
        event.detail
      );

      // Forçar re-renderização incrementando a versão dos dados
      setResaleDataVersion((prev) => {
        const newVersion = prev + 1;
        console.log(
          `🔄 [StockDashboard] Atualizando resaleDataVersion: ${prev} → ${newVersion}`
        );
        return newVersion;
      });

      // Também forçar refresh dos dados se necessário
      if (onRefresh && typeof onRefresh === "function") {
        console.log(
          "🔄 [StockDashboard] Chamando onRefresh para sincronização..."
        );
        onRefresh();
      }
    };

    // Adicionar listener
    window.addEventListener(
      "resaleStockUpdated",
      handleResaleStockUpdate as EventListener
    );
    console.log(
      "🎧 [StockDashboard] Listener para eventos de produtos de revenda configurado"
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        "resaleStockUpdated",
        handleResaleStockUpdate as EventListener
      );
      console.log(
        "🔕 [StockDashboard] Listener de produtos de revenda removido"
      );
    };
  }, [onRefresh]);

  // Sincronização em tempo real dos custos do TireCostManager
  useEffect(() => {
    const handleTireCostUpdate = (event: CustomEvent) => {
      const {
        averageCostPerTire: newAverage,
        specificAnalyses,
        timestamp,
        source,
      } = event.detail || {};
      console.log(
        `💰 [StockDashboard] Evento 'tireCostUpdated' recebido de ${source || "Unknown"}:`
      );
      console.log(
        `  - Timestamp: ${timestamp ? new Date(timestamp).toLocaleString() : "N/A"}`
      );
      console.log(
        `  - Custo médio por pneu: R$ ${newAverage ? newAverage.toFixed(2) : "0.00"}`
      );
      console.log(
        `  - Análises específicas: ${specificAnalyses?.length || 0} produtos`
      );

      // Forçar re-renderização das métricas
      setLastCostUpdate(new Date());
      console.log(
        "🔄 [StockDashboard] Forçando recálculo das métricas com novos custos sincronizados..."
      );
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "dashboard_averageCostPerTire" && event.newValue) {
        console.log(
          "💾 [StockDashboard] localStorage alterado para dashboard_averageCostPerTire:",
          event.newValue
        );
        setLastCostUpdate(new Date());
      }
    };

    // NOVO: Event listener para atualizações do FinalProductsStock
    const handleFinalProductStockUpdate = (event: CustomEvent) => {
      const {
        totalValue,
        totalProducts,
        productsInStock,
        lowStockProducts,
        timestamp,
        source,
      } = event.detail || {};
      console.log(
        `📦 [StockDashboard] Evento 'finalProductStockUpdated' recebido de ${source || "Unknown"}:`
      );
      console.log(
        `  - Timestamp: ${timestamp ? new Date(timestamp).toLocaleString() : "N/A"}`
      );
      console.log(
        `  - Valor total: R$ ${totalValue ? totalValue.toFixed(2) : "0.00"}`
      );
      console.log(`  - Total produtos: ${totalProducts || 0}`);
      console.log(`  - Produtos em estoque: ${productsInStock || 0}`);
      console.log(`  - Produtos com estoque baixo: ${lowStockProducts || 0}`);

      // Forçar recálculo das métricas
      setLastCostUpdate(new Date());
      console.log(
        "🔄 [StockDashboard] Forçando recálculo das métricas por atualização de produtos finais..."
      );
    };

    // NOVO: Event listener para atualizações de estoque geral
    const handleStockItemsUpdate = (event: CustomEvent) => {
      const { itemId, itemType, operation, newQuantity, timestamp } =
        event.detail || {};
      console.log(`📊 [StockDashboard] Evento 'stockItemsUpdated' recebido:`);
      console.log(`  - Item ID: ${itemId}`);
      console.log(`  - Tipo: ${itemType}`);
      console.log(`  - Operação: ${operation}`);
      console.log(`  - Nova quantidade: ${newQuantity}`);
      console.log(
        `  - Timestamp: ${timestamp ? new Date(timestamp).toLocaleString() : "N/A"}`
      );

      // Forçar recálculo das métricas
      setLastCostUpdate(new Date());
      console.log(
        "🔄 [StockDashboard] Forçando recálculo das métricas por atualização de estoque..."
      );
    };

    // Registrar event listeners
    window.addEventListener(
      "tireCostUpdated",
      handleTireCostUpdate as EventListener
    );
    window.addEventListener(
      "finalProductStockUpdated",
      handleFinalProductStockUpdate as EventListener
    );
    window.addEventListener(
      "stockItemsUpdated",
      handleStockItemsUpdate as EventListener
    );
    window.addEventListener("storage", handleStorageChange);

    console.log(
      "🎯 [StockDashboard] Event listeners registrados para sincronização em tempo real"
    );

    // TESTE: Verificar se os listeners estão funcionando
    setTimeout(() => {
      console.log(
        "🧪 [StockDashboard] Testando listeners com evento de teste..."
      );
      const testEvent = new CustomEvent("finalProductStockUpdated", {
        detail: {
          totalValue: 999.99,
          totalProducts: 99,
          productsInStock: 88,
          lowStockProducts: 1,
          timestamp: Date.now(),
          source: "StockDashboard-Test",
          test: true,
        },
      });
      window.dispatchEvent(testEvent);
    }, 2000);

    // Cleanup
    return () => {
      window.removeEventListener(
        "tireCostUpdated",
        handleTireCostUpdate as EventListener
      );
      window.removeEventListener(
        "finalProductStockUpdated",
        handleFinalProductStockUpdate as EventListener
      );
      window.removeEventListener(
        "stockItemsUpdated",
        handleStockItemsUpdate as EventListener
      );
      window.removeEventListener("storage", handleStorageChange);
      console.log("🧹 [StockDashboard] Event listeners removidos");
    };
  }, []);
  const { averageCostPerTire, synchronizedCostData } =
    useCostCalculationOptions();

  const handleStockUpdate = async (
    itemId: string,
    itemType: "material" | "product",
    quantity: number,
    operation: "add" | "remove",
    unitPrice?: number,
    itemNameParam?: string
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
      (item) => item.item_id === itemId && item.item_type === itemType
    );

    if (existingStock) {
      // Update existing stock item
      if (operation === "add") {
        const newQuantity = existingStock.quantity + quantity;
        let newUnitCost = existingStock.unit_cost;
        let newTotalValue = existingStock.total_value;

        // Calculate weighted average cost if adding with a price
        if (unitPrice && unitPrice > 0) {
          // ADICIONAR: Soma ao valor total existente e recalcula média ponderada
          const currentTotalValue = existingStock.total_value;
          const addedTotalValue = quantity * unitPrice;
          newTotalValue = currentTotalValue + addedTotalValue;
          newUnitCost = newTotalValue / newQuantity;

          console.log(`➕ [StockDashboard] ADIÇÃO com preço:`, {
            quantidadeAtual: existingStock.quantity,
            valorTotalAtual: currentTotalValue,
            quantidadeAdicionada: quantity,
            precoUnitario: unitPrice,
            valorAdicionado: addedTotalValue,
            novaQuantidade: newQuantity,
            novoValorTotal: newTotalValue,
            novoCustoMedio: newUnitCost,
          });
        } else {
          // Se não tem preço, mantém o custo unitário e recalcula o total
          newTotalValue = newQuantity * newUnitCost;

          console.log(
            `➕ [StockDashboard] ADIÇÃO sem preço (mantém custo médio):`,
            {
              quantidadeAtual: existingStock.quantity,
              quantidadeAdicionada: quantity,
              novaQuantidade: newQuantity,
              custoUnitarioMantido: newUnitCost,
              novoValorTotal: newTotalValue,
            }
          );
        }

        const updateData = {
          quantity: newQuantity,
          unit_cost: newUnitCost,
          total_value: newTotalValue,
          last_updated: new Date().toISOString(),
        };

        await updateStockItem(existingStock.id, updateData);

        // AJUSTAR BASELINE DO LUCRO EMPRESARIAL
        await StockBaselineManager.adjustBaselineOnAdd(
          quantity,
          unitPrice || existingStock.unit_cost,
          existingStock.item_name
        );

        // Dispatch manual do evento para garantir sincronização
        console.log(
          "📡 [StockDashboard] Disparando evento stockItemsUpdated manualmente..."
        );
        window.dispatchEvent(
          new CustomEvent("stockItemsUpdated", {
            detail: {
              itemId,
              itemType,
              operation: "add",
              newQuantity,
              timestamp: new Date().toISOString(),
            },
          })
        );
      } else {
        // REMOVE operation
        const newQuantity = Math.max(0, existingStock.quantity - quantity);
        let newUnitCost = existingStock.unit_cost;
        let newTotalValue = existingStock.total_value;

        if (unitPrice && unitPrice > 0) {
          // REMOVER COM VALOR: Subtrai o valor informado e recalcula custo médio
          const currentTotalValue = existingStock.total_value;
          const removedTotalValue = quantity * unitPrice;
          newTotalValue = Math.max(0, currentTotalValue - removedTotalValue);

          // Recalcula custo médio com base no novo valor total
          if (newQuantity > 0) {
            newUnitCost = newTotalValue / newQuantity;
          } else {
            newUnitCost = 0;
            newTotalValue = 0;
          }

          console.log(
            `➖ [StockDashboard] REMOÇÃO COM VALOR (recalcula custo médio):`,
            {
              quantidadeAtual: existingStock.quantity,
              valorTotalAtual: currentTotalValue,
              quantidadeRemovida: quantity,
              valorUnitarioInformado: unitPrice,
              valorRemovido: removedTotalValue,
              novaQuantidade: newQuantity,
              novoValorTotal: newTotalValue,
              novoCustoMedio: newUnitCost,
            }
          );
        } else {
          // REMOVER SEM VALOR: Usa custo médio atual
          const currentTotalValue = existingStock.total_value;
          const removedTotalValue = quantity * newUnitCost;
          newTotalValue = Math.max(0, currentTotalValue - removedTotalValue);

          if (newQuantity === 0) {
            newUnitCost = 0;
            newTotalValue = 0;
          }

          console.log(
            `➖ [StockDashboard] REMOÇÃO SEM VALOR (usa custo médio):`,
            {
              quantidadeAtual: existingStock.quantity,
              valorTotalAtual: currentTotalValue,
              custoMedioAtual: existingStock.unit_cost,
              quantidadeRemovida: quantity,
              valorRemovido: removedTotalValue,
              novaQuantidade: newQuantity,
              novoValorTotal: newTotalValue,
              novoCustoMedio: newUnitCost,
            }
          );
        }

        const updateData = {
          quantity: newQuantity,
          unit_cost: newUnitCost,
          total_value: newTotalValue,
          last_updated: new Date().toISOString(),
        };

        await updateStockItem(existingStock.id, updateData);

        // AJUSTAR BASELINE DO LUCRO EMPRESARIAL
        await StockBaselineManager.adjustBaselineOnRemove(
          quantity,
          unitPrice || existingStock.unit_cost,
          existingStock.item_name
        );

        // Dispatch manual do evento para garantir sincronização
        console.log(
          "📡 [StockDashboard] Disparando evento stockItemsUpdated manualmente..."
        );
        window.dispatchEvent(
          new CustomEvent("stockItemsUpdated", {
            detail: {
              itemId,
              itemType,
              operation: "remove",
              newQuantity,
              timestamp: new Date().toISOString(),
            },
          })
        );
      }
    } else {
      // Create new stock item if it doesn't exist
      console.log(
        `🆕 [StockDashboard] Item não existe no estoque, criando novo item:`,
        {
          itemId,
          itemType,
          quantity,
          unitPrice,
        }
      );

      // Find the material/product name
      let itemName = itemNameParam || "Item Desconhecido";
      let unit = "un";

      if (itemType === "material") {
        const material = materials.find((m) => m.id === itemId);
        if (material) {
          itemName = material.name;
          unit = material.unit;
        }
      } else if (itemType === "product") {
        const product = products.find((p) => p.id === itemId);
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

      console.log(
        `🆕 [StockDashboard] Criando novo item de estoque:`,
        newStockItemData
      );

      await addStockItem(newStockItemData);

      // Dispatch manual do evento para garantir sincronização
      console.log(
        "📡 [StockDashboard] Disparando evento stockItemsUpdated para novo item..."
      );
      window.dispatchEvent(
        new CustomEvent("stockItemsUpdated", {
          detail: {
            itemId,
            itemType,
            operation: "create",
            newQuantity: newStockItemData.quantity,
            timestamp: new Date().toISOString(),
          },
        })
      );
    }
  };

  const handleSetMinLevel = async (
    itemId: string,
    itemType: "material" | "product",
    minLevel: number
  ) => {
    const stockItem = stockItems.find(
      (item) => item.item_id === itemId && item.item_type === itemType
    );

    if (stockItem) {
      const updateData = {
        min_level: minLevel,
        last_updated: new Date().toISOString(),
      };

      await updateStockItem(stockItem.id, updateData);

      console.log(
        `🔧 [StockDashboard] Dados enviados para updateStockItem (min):`,
        updateData
      );
    }
  };

  const getMaterialStockItems = () => {
    return stockItems.filter((item) => item.item_type === "material");
  };

  const getProductStockItems = () => {
    return stockItems.filter((item) => item.item_type === "product");
  };

  // Get all products and stock items (no filtering by type here)
  const getAllProducts = () => {
    return products.filter((p) => !p.archived);
  };

  const getAllProductStockItems = () => {
    return stockItems.filter((item) => item.item_type === "product");
  };

  // Calculate separated metrics for dashboard by type
  const calculateMetrics = () => {
    console.log(
      `🚀 [StockDashboard] ===== INICIANDO CÁLCULO DE MÉTRICAS =====`
    );
    console.log(
      `📈 [StockDashboard] Calculando métricas com ${stockItems.length} itens no estoque`
    );
    console.log(`🕰️ [StockDashboard] Timestamp: ${new Date().toISOString()}`);
    console.log(
      `📊 [StockDashboard] averageCostPerTire: R$ ${averageCostPerTire.toFixed(2)}`
    );
    console.log(
      "🔍 [StockDashboard] Calculando métricas separadas do dashboard:",
      {
        totalStockItems: stockItems.length,
        stockItemsDetails: stockItems.map((item) => ({
          id: item.id,
          item_id: item.item_id,
          item_name: item.item_name,
          item_type: item.item_type,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_value: item.total_value,
          min_level: item.min_level,
        })),
      }
    );

    // Separar itens de estoque por tipo (incluindo quantidade zero para debug)
    const materialStockItems = stockItems.filter(
      (item) => item.item_type === "material"
    );
    const productStockItems = stockItems.filter(
      (item) => item.item_type === "product"
    );

    // Calculate material types metrics
    const totalMaterialsRegistered = materials.length;
    const materialTypesInStock = materialStockItems.filter(
      (item) => item.quantity > 0
    ).length;

    console.log(
      `📊 [StockDashboard] Tipos de Material - Total cadastrados: ${totalMaterialsRegistered}, Em estoque: ${materialTypesInStock}`
    );

    console.log(
      `📦 [StockDashboard] Matérias-primas no estoque: ${materialStockItems.length}`,
      materialStockItems.map((item) => ({
        name: item.item_name,
        quantity: item.quantity,
        value: item.total_value,
      }))
    );
    console.log(
      `📦 [StockDashboard] Produtos no estoque: ${productStockItems.length}`,
      productStockItems.map((item) => ({
        name: item.item_name,
        quantity: item.quantity,
        value: item.total_value,
      }))
    );

    // Separar produtos finais
    const finalProductIds = getAllProducts().map((p) => p.id);

    console.log("🔍 [StockDashboard] IDs dos produtos cadastrados:", {
      finalProductIds,
      finalProductNames: getAllProducts().map((p) => ({
        id: p.id,
        name: p.name,
      })),
    });

    const finalProductStockItems = productStockItems.filter((item) =>
      finalProductIds.includes(item.item_id)
    );

    console.log(
      `🏭 [StockDashboard] Produtos finais em estoque: ${finalProductStockItems.length}`,
      finalProductStockItems.map((item) => ({
        name: item.item_name,
        quantity: item.quantity,
        value: item.total_value,
      }))
    );

    // Calcular quantidades totais (incluindo itens com quantidade zero para debug)
    const materialTotalQuantity = materialStockItems.reduce((sum, item) => {
      // Garantir que quantity seja um número válido
      let quantity = 0;

      // Convert to number and validate
      const numericQuantity = Number(item.quantity);
      if (!isNaN(numericQuantity) && numericQuantity >= 0) {
        quantity = numericQuantity;
      }

      console.log(
        `📊 Material ${item.item_name}: ${quantity} (original: ${item.quantity}, type: ${typeof item.quantity})`
      );
      return sum + quantity;
    }, 0);
    const finalProductTotalQuantity = finalProductStockItems.reduce(
      (sum, item) => {
        // Garantir que quantity seja um número válido
        let quantity = 0;

        // Convert to number and validate
        const numericQuantity = Number(item.quantity);
        if (!isNaN(numericQuantity) && numericQuantity >= 0) {
          quantity = numericQuantity;
        }

        console.log(
          `📊 Produto Final ${item.item_name}: ${quantity} (original: ${item.quantity}, type: ${typeof item.quantity})`
        );
        return sum + quantity;
      },
      0
    );

    // Calcular valores totais - SEMPRE baseado em unit_cost × quantity para garantir precisão
    const materialTotalValue = materialStockItems.reduce((sum, item) => {
      // Garantir que unit_cost seja um número válido
      let unitCost = 0;
      const numericUnitCost = Number(item.unit_cost);
      if (!isNaN(numericUnitCost) && numericUnitCost >= 0) {
        unitCost = numericUnitCost;
      }

      // Garantir que quantity seja um número válido
      let quantity = 0;
      const numericQuantity = Number(item.quantity);
      if (!isNaN(numericQuantity) && numericQuantity >= 0) {
        quantity = numericQuantity;
      }

      const calculatedValue = unitCost * quantity;
      console.log(
        `💰 Material ${item.item_name}: ${quantity} × R$ ${unitCost.toFixed(2)} = R$ ${calculatedValue.toFixed(2)} (stored: R$ ${(item.total_value || 0).toFixed(2)})`
      );
      return sum + calculatedValue;
    }, 0);

    // Para produtos finais, usar o custo médio sincronizado se disponível
    console.log(
      `🔍 [StockDashboard] DEBUG - Cálculo do valor dos produtos finais:`,
      {
        averageCostPerTire,
        finalProductTotalQuantity,
        synchronizedCostData,
        willUseSynchronizedCost: averageCostPerTire > 0,
        expectedValue:
          averageCostPerTire > 0
            ? finalProductTotalQuantity * averageCostPerTire
            : "Calculando individualmente...",
      }
    );

    // DEBUG: Verificar dados dos produtos finais
    console.log(
      `🔍 [StockDashboard] PRODUTOS FINAIS - Total de itens: ${finalProductStockItems.length}`
    );
    console.log(
      `🔍 [StockDashboard] PRODUTOS FINAIS - Dados completos:`,
      finalProductStockItems
    );

    // Cálculo dinâmico em tempo real para produtos finais - USAR CUSTOS ESPECÍFICOS POR PRODUTO
    const finalProductTotalValue = finalProductStockItems.reduce(
      (sum, item, index) => {
        const quantity = Number(item.quantity) || 0;

        // BUSCAR CUSTO ESPECÍFICO para cada produto (igual ao FinalProductsStock)
        let unitCost = 0;
        let costSource = "FALLBACK ESTOQUE";

        // Buscar custo específico no localStorage (EXATO método do FinalProductsStock)
        const productKey = `tireAnalysis_${item.item_name.toLowerCase().replace(/\s+/g, "_")}`;
        const specificCostData = localStorage.getItem(productKey);

        console.log(
          `🔍 [${index + 1}/${finalProductStockItems.length}] Buscando custo para "${item.item_name}" com chave: ${productKey}`
        );

        if (specificCostData) {
          try {
            const parsedData = JSON.parse(specificCostData);
            console.log(
              `📊 Dados encontrados para ${item.item_name}:`,
              parsedData
            );

            // USAR MESMA PROPRIEDADE QUE O FinalProductsStock: costPerTire
            if (parsedData && parsedData.costPerTire > 0) {
              unitCost = parsedData.costPerTire;
              costSource = "CUSTO ESPECÍFICO";
              console.log(
                `✨ [${index + 1}/${finalProductStockItems.length}] ${item.item_name} - ${costSource}:`
              );
            } else {
              console.log(
                `⚠️ Dados encontrados mas costPerTire inválido:`,
                parsedData.costPerTire
              );
            }
          } catch (error) {
            console.warn(
              `⚠️ Erro ao buscar custo específico para ${item.item_name}:`,
              error
            );
          }
        } else {
          console.log(
            `❌ Não encontrado custo específico para ${item.item_name} (chave: ${productKey})`
          );
        }

        // Fallbacks se não encontrou custo específico
        if (unitCost === 0) {
          if (
            synchronizedCostData &&
            synchronizedCostData.averageCostPerTire > 0
          ) {
            unitCost = synchronizedCostData.averageCostPerTire;
            costSource = "CUSTO MÉDIO SINCRONIZADO";
          } else if (averageCostPerTire > 0) {
            unitCost = averageCostPerTire;
            costSource = "CUSTO MÉDIO LOCAL";
          } else {
            unitCost = Number(item.unit_cost) || 0;
            costSource = "FALLBACK ESTOQUE";
          }
          console.log(
            `🔄 [${index + 1}/${finalProductStockItems.length}] ${item.item_name} - ${costSource}:`
          );
        }

        const calculatedValue = unitCost * quantity;

        console.log(`   - Quantidade: ${quantity}`);
        console.log(
          `   - Custo usado: R$ ${unitCost.toFixed(2)} (${costSource})`
        );
        console.log(
          `   - Custo estoque: R$ ${(Number(item.unit_cost) || 0).toFixed(2)}`
        );
        console.log(`   - Valor calculado: R$ ${calculatedValue.toFixed(2)}`);
        console.log(
          `   - Soma acumulada: R$ ${(sum + calculatedValue).toFixed(2)}`
        );

        return sum + calculatedValue;
      },
      0
    );

    console.log(
      `✅ [StockDashboard] VALOR FINAL CALCULADO dos produtos finais: R$ ${finalProductTotalValue.toFixed(2)}`,
      {
        method: "Soma individual de todos os produtos",
        calculation:
          "Soma dos valores individuais (quantidade × custo unitário)",
      }
    );

    console.log(`📊 [StockDashboard] TOTAIS CALCULADOS - Quantidades:`, {
      materialTotalQuantity,
      finalProductTotalQuantity,
    });
    console.log(
      `💰 [StockDashboard] TOTAIS CALCULADOS - Valores (RECALCULADOS):`,
      {
        materialTotalValue: `R$ ${materialTotalValue.toFixed(2)}`,
        finalProductTotalValue: `R$ ${finalProductTotalValue.toFixed(2)}`,
        finalProductCalculationMethod:
          averageCostPerTire > 0
            ? "Custo médio sincronizado"
            : "Custo individual dos itens",
        finalProductSyncedCost:
          averageCostPerTire > 0
            ? `${finalProductTotalQuantity} × R$ ${averageCostPerTire.toFixed(2)} = R$ ${finalProductTotalValue.toFixed(2)}`
            : "N/A",
      }
    );

    // Separar produtos de revenda
    const resaleProductIds = resaleProducts.map((p) => p.id);
    const resaleProductStockItems = productStockItems.filter((item) =>
      resaleProductIds.includes(item.item_id)
    );

    console.log(
      `🛒 [StockDashboard] Produtos de revenda em estoque: ${resaleProductStockItems.length}`,
      resaleProductStockItems.map((item) => ({
        name: item.item_name,
        quantity: item.quantity,
        value: item.total_value,
      }))
    );

    // Calcular valor total dos produtos de revenda
    const resaleProductTotalValue = resaleProductStockItems.reduce(
      (sum, item) => {
        const unitCost = Number(item.unit_cost) || 0;
        const quantity = Number(item.quantity) || 0;
        const calculatedValue = unitCost * quantity;
        console.log(
          `💰 Produto Revenda ${item.item_name}: ${quantity} × R$ ${unitCost.toFixed(2)} = R$ ${calculatedValue.toFixed(2)} (stored: R$ ${(item.total_value || 0).toFixed(2)})`
        );
        return sum + calculatedValue;
      },
      0
    );

    console.log(
      `💰 [StockDashboard] TOTAIS CALCULADOS - Valores (RECALCULADOS):`,
      {
        materialTotalValue: `R$ ${materialTotalValue.toFixed(2)}`,
        finalProductTotalValue: `R$ ${finalProductTotalValue.toFixed(2)}`,
        resaleProductTotalValue: `R$ ${resaleProductTotalValue.toFixed(2)}`,
        finalProductCalculationMethod:
          averageCostPerTire > 0
            ? "Custo médio sincronizado"
            : "Custo individual dos itens",
        finalProductSyncedCost:
          averageCostPerTire > 0
            ? `${finalProductTotalQuantity} × R$ ${averageCostPerTire.toFixed(2)} = R$ ${finalProductTotalValue.toFixed(2)}`
            : "N/A",
      }
    );

    // Itens com estoque baixo por categoria
    const materialLowStock = materialStockItems.filter(
      (item) =>
        item.min_level && item.min_level > 0 && item.quantity <= item.min_level
    ).length;
    const finalProductLowStock = finalProductStockItems.filter(
      (item) =>
        item.min_level && item.min_level > 0 && item.quantity <= item.min_level
    ).length;
    const resaleLowStock = resaleProductStockItems.filter(
      (item) =>
        item.min_level && item.min_level > 0 && item.quantity <= item.min_level
    ).length;

    console.log(
      `⚠️ [StockDashboard] Estoque baixo - Matéria-prima: ${materialLowStock}, Finais: ${finalProductLowStock}, Revenda: ${resaleLowStock}`
    );

    // Usar custo médio por pneu sincronizado do TireCostManager, com fallback para cálculo local
    const finalProductAverageCost =
      averageCostPerTire > 0
        ? averageCostPerTire
        : finalProductTotalQuantity > 0
          ? finalProductTotalValue / finalProductTotalQuantity
          : 0;

    console.log(`💰 [StockDashboard] CUSTO MÉDIO POR PNEU - Produtos Finais:`, {
      synchronizedCostData: synchronizedCostData,
      averageCostPerTireFromTireCostManager: averageCostPerTire,
      localCalculatedCost:
        finalProductTotalQuantity > 0
          ? finalProductTotalValue / finalProductTotalQuantity
          : 0,
      finalUsedCost: finalProductAverageCost,
      finalProductTotalValue: `R$ ${finalProductTotalValue.toFixed(2)}`,
      finalProductTotalQuantity,
      finalProductAverageCost: `R$ ${finalProductAverageCost.toFixed(2)}`,
      isUsingSynchronizedData: averageCostPerTire > 0,
      lastSyncUpdate: synchronizedCostData?.lastUpdated || "N/A",
    });

    const result = {
      // Quantidades
      materialTotalQuantity,
      finalProductTotalQuantity,
      // Valores
      materialTotalValue,
      finalProductTotalValue,
      resaleProductTotalValue,
      // Custo médio por pneu dos produtos finais
      finalProductAverageCost,
      // Estoque baixo
      materialLowStock,
      finalProductLowStock,
      resaleLowStock,
      // Totais gerais
      totalLowStock: materialLowStock + finalProductLowStock + resaleLowStock,
      // Material types metrics
      totalMaterialsRegistered,
      materialTypesInStock,
    };

    console.log("✅ [StockDashboard] RESULTADO FINAL das métricas:", result);

    return result;
  };

  // Incluir lastCostUpdate para forçar recálculo quando custos são atualizados
  const metrics = useMemo(() => {
    console.log("🔄 [StockDashboard] Recalculando métricas:", {
      stockItemsLength: stockItems.length,
      averageCostPerTire,
      lastCostUpdate: lastCostUpdate?.toISOString(),
      synchronizedCostData: synchronizedCostData ? "Presente" : "Ausente",
    });
    return calculateMetrics();
  }, [
    stockItems,
    materials,
    products,
    resaleProducts,
    averageCostPerTire,
    synchronizedCostData,
    lastCostUpdate,
  ]);

  // Update card values with current metrics
  const updatedCards = cards.map((card) => {
    switch (card.type) {
      case "materialTypes":
        return {
          ...card,
          value: metrics.materialTypesInStock,
          subtitle: `de ${metrics.totalMaterialsRegistered} cadastrados`,
        };
      case "materialValue":
        return {
          ...card,
          value: new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(metrics.materialTotalValue),
        };
      case "finalProductQuantity":
        return {
          ...card,
          value: metrics.finalProductTotalQuantity.toLocaleString("pt-BR"),
        };
      case "finalProductValue":
        return {
          ...card,
          value: new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(metrics.finalProductTotalValue),
        };
      default:
        return card;
    }
  });

  return (
    <TooltipProvider>
      <div className="w-full space-y-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-blue to-neon-green flex items-center justify-center">
                  <span className="text-white font-bold text-lg">📦</span>
                </div>
                Dashboard de Estoque
              </h2>
              <p className="text-tire-300 mt-2">
                Gerencie o estoque de matérias-primas e produtos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={resetToDefault}
                    className="bg-factory-800/50 border-tire-600/30 text-tire-300 hover:text-white hover:bg-tire-700/50"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-factory-800 text-tire-200 border-tire-600/30">
                  <p>Resetar para padrão</p>
                </TooltipContent>
              </Tooltip>
              <Dialog
                open={customizationOpen}
                onOpenChange={setCustomizationOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-factory-800/50 border-tire-600/30 text-tire-300 hover:text-white hover:bg-tire-700/50"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Personalizar
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-factory-800/95 border-tire-600/30 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      Personalizar Dashboard
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Instructions */}
                    <div className="space-y-2">
                      <p className="text-tire-300 text-sm">
                        <span className="inline-flex items-center gap-2">
                          <Palette className="h-4 w-4 text-neon-purple" />
                          <span>
                            Selecione um card e escolha uma cor para
                            personalizá-lo
                          </span>
                        </span>
                      </p>
                    </div>

                    <Separator className="bg-tire-700/50" />

                    {/* Color Customization Section */}
                    <div className="space-y-4">
                      <h4 className="text-white font-medium flex items-center gap-2">
                        <Palette className="h-4 w-4 text-neon-purple" />
                        Personalizar Cores
                      </h4>

                      {/* Card Selection */}
                      <div className="space-y-2">
                        <Label className="text-tire-300 text-sm">
                          Selecionar Card:
                        </Label>
                        <div className="grid grid-cols-1 gap-2">
                          {updatedCards.map((card) => (
                            <Button
                              key={card.id}
                              variant={
                                selectedCardForColor === card.id
                                  ? "default"
                                  : "outline"
                              }
                              className={`justify-start h-auto p-3 ${
                                selectedCardForColor === card.id
                                  ? "bg-neon-blue/20 border-neon-blue/50 text-white"
                                  : "bg-factory-700/30 border-tire-600/30 text-tire-300 hover:text-white hover:bg-tire-700/50"
                              }`}
                              onClick={() => setSelectedCardForColor(card.id)}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">{card.icon}</span>
                                  <div className="text-left">
                                    <div className="font-medium">
                                      {card.title}
                                    </div>
                                    <div className="text-xs opacity-70">
                                      {card.subtitle}
                                    </div>
                                  </div>
                                </div>
                                {selectedCardForColor === card.id && (
                                  <Check className="h-4 w-4 text-neon-blue" />
                                )}
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Color Selection - Matching Main Dashboard */}
                      {selectedCardForColor && (
                        <div className="space-y-3">
                          <Label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-tire-200 font-medium">
                            {updatedCards.find(
                              (c) => c.id === selectedCardForColor
                            )?.title || "Card Selecionado"}
                          </Label>

                          {/* Color Palette Grid - Exactly like main dashboard */}
                          <div className="grid grid-cols-5 gap-2">
                            {colorOptions.map((option) => {
                              const selectedCard = updatedCards.find(
                                (c) => c.id === selectedCardForColor
                              );
                              const isSelected =
                                selectedCard?.color === option.color;

                              return (
                                <button
                                  key={option.name}
                                  type="button"
                                  className={`w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                                    isSelected
                                      ? "border-white shadow-lg"
                                      : "border-tire-600/50 hover:border-tire-400"
                                  }`}
                                  title={option.name}
                                  style={{ backgroundColor: option.hex }}
                                  onClick={() => {
                                    handleColorChange(
                                      selectedCardForColor,
                                      option.color,
                                      option.bgColor
                                    );
                                    setCustomColorValue(option.hex);
                                  }}
                                />
                              );
                            })}
                          </div>

                          {/* Custom Color Picker and Hex Input - Exactly like main dashboard */}
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              className="flex rounded-md border text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-12 h-8 p-1 bg-factory-700/50 border-tire-600/30"
                              value={customColorValue}
                              onChange={(e) =>
                                handleCustomColorChange(e.target.value)
                              }
                            />
                            <input
                              type="text"
                              className="flex h-9 w-full rounded-md border px-3 py-1 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 bg-factory-700/50 border-tire-600/30 text-white text-sm"
                              placeholder="#FFFFFF"
                              value={customColorValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                                  setCustomColorValue(value);
                                  if (value.length === 7) {
                                    handleCustomColorChange(value);
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-factory-800/50 border-tire-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-tire-300 text-sm">
                    Valor Total do Estoque
                  </p>
                  <p className="text-3xl font-bold text-neon-green">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      metrics.materialTotalValue +
                        metrics.finalProductTotalValue +
                        metrics.resaleProductTotalValue
                    )}
                  </p>
                  <p className="text-xs text-tire-400 mt-1">
                    MP:{" "}
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(metrics.materialTotalValue)}{" "}
                    | Finais:{" "}
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(metrics.finalProductTotalValue)}{" "}
                    | Revenda:{" "}
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(metrics.resaleProductTotalValue)}
                  </p>
                </div>
                <div className="text-neon-green">
                  <span className="text-3xl">💎</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-factory-800/50 border-tire-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-tire-300 text-sm">
                    Alertas de Estoque Baixo
                  </p>
                  <p className="text-3xl font-bold text-red-400">
                    {metrics.totalLowStock}
                  </p>
                  <p className="text-xs text-tire-400 mt-1">
                    MP: {metrics.materialLowStock} | Finais:{" "}
                    {metrics.finalProductLowStock} | Revenda:{" "}
                    {metrics.resaleLowStock}
                  </p>
                </div>
                <div className="text-red-400">
                  <span className="text-3xl">⚠️</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-factory-800/50 border border-tire-600/30">
            <TabsTrigger
              value="dashboard"
              className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="materials"
              className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20"
            >
              Matéria Prima
            </TabsTrigger>
            <TabsTrigger
              value="final-products"
              className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20"
            >
              Produtos Finais
            </TabsTrigger>
            <TabsTrigger
              value="resale-products"
              className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20"
            >
              Produtos Revenda
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <StockCharts
              key={`stock-charts-${resaleDataVersion}-${stockItems.length}`}
              isLoading={
                materialsLoading ||
                productsLoading ||
                resaleProductsLoading ||
                stockLoading
              }
              materials={materials}
              products={getAllProducts()}
              resaleProducts={resaleProducts}
              stockItems={stockItems}
              productType="all"
            />
          </TabsContent>

          <TabsContent value="materials">
            <RawMaterialStock
              isLoading={materialsLoading || stockLoading}
              materials={materials}
              stockItems={stockItems}
              onStockUpdate={handleStockUpdate}
              onSetMinLevel={handleSetMinLevel}
            />
          </TabsContent>

          <TabsContent value="final-products">
            <FinalProductsStock isLoading={productsLoading || stockLoading} />
          </TabsContent>
          <TabsContent value="resale-products">
            <ResaleProductsStock isLoading={productsLoading || stockLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};

export default StockDashboard;
