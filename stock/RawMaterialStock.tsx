import React, { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Minus,
  Package,
  Search,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { RawMaterial, StockItem } from "@/types/financial";

interface RawMaterialStockProps {
  materials?: RawMaterial[];
  stockItems?: StockItem[];
  onStockUpdate?: (
    itemId: string,
    itemType: "material" | "product",
    quantity: number,
    operation: "add" | "remove",
    unitPrice?: number,
  ) => void;
  onSetMinLevel?: (
    itemId: string,
    itemType: "material" | "product",
    minLevel: number,
  ) => void;
  isLoading?: boolean;
}

const RawMaterialStock = ({
  materials = [],
  stockItems = [],
  onStockUpdate = () => {},
  onSetMinLevel = () => {},
  isLoading = false,
}: RawMaterialStockProps) => {
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLevelsDialogOpen, setIsLevelsDialogOpen] = useState(false);
  const [selectedItemForLevels, setSelectedItemForLevels] =
    useState<string>("");
  const [minLevel, setMinLevel] = useState("");
  
  // Estados para diálogo de confirmação de movimentação
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<{
    operation: "add" | "remove";
    materialId: string;
    materialName: string;
    quantity: number;
    unitPrice?: number;
  } | null>(null);
  const [confirmMaterialType, setConfirmMaterialType] = useState("");
  const [confirmUnitPrice, setConfirmUnitPrice] = useState("");
  
  // Estado para forçar re-render após atualizações
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const activeMaterials = materials.filter((m) => !m.archived);

  // useEffect para listeners de eventos de atualização de estoque com debounce
  useEffect(() => {
    console.log('🎯 [RawMaterialStock] Registrando listeners para eventos de atualização');
    
    let debounceTimer: NodeJS.Timeout;
    
    const handleUpdateWithDebounce = (eventType: string, detail: any) => {
      console.log(`📡 [RawMaterialStock] Evento ${eventType} recebido:`, detail);
      
      // Limpar timer anterior
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Agendar atualização com debounce de 200ms
      debounceTimer = setTimeout(() => {
        console.log(`🔄 [RawMaterialStock] Executando atualização após debounce para evento: ${eventType}`);
        setLastUpdate(Date.now());
      }, 200);
    };
    
    const handleMaterialStockUpdate = (event: CustomEvent) => {
      handleUpdateWithDebounce('materialStockUpdated', event.detail);
    };
    
    const handleStockUpdate = (event: CustomEvent) => {
      handleUpdateWithDebounce('stockUpdated', event.detail);
    };
    
    const handleForceRawMaterialRecalc = (event: CustomEvent) => {
      handleUpdateWithDebounce('forceRawMaterialRecalc', event.detail);
    };

    // Adicionar listeners
    window.addEventListener('materialStockUpdated', handleMaterialStockUpdate as EventListener);
    window.addEventListener('stockUpdated', handleStockUpdate as EventListener);
    window.addEventListener('forceRawMaterialRecalc', handleForceRawMaterialRecalc as EventListener);

    // Cleanup listeners
    return () => {
      console.log('🔕 [RawMaterialStock] Removendo listeners de eventos');
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      window.removeEventListener('materialStockUpdated', handleMaterialStockUpdate as EventListener);
      window.removeEventListener('stockUpdated', handleStockUpdate as EventListener);
      window.removeEventListener('forceRawMaterialRecalc', handleForceRawMaterialRecalc as EventListener);
    };
  }, []);

  const handleStockOperation = (operation: "add" | "remove") => {
    if (selectedMaterial && quantity && parseFloat(quantity) > 0) {
      const selectedMat = activeMaterials.find(m => m.id === selectedMaterial);
      const price = operation === "add" && unitPrice ? parseFloat(unitPrice) : undefined;
      
      // Preparar dados da operação pendente
      setPendingOperation({
        operation,
        materialId: selectedMaterial,
        materialName: selectedMat?.name || "Material não encontrado",
        quantity: parseFloat(quantity),
        unitPrice: price
      });
      
      // Preencher valores atuais para confirmação
      setConfirmMaterialType(selectedMat?.name || "");
      setConfirmUnitPrice(unitPrice || "");
      
      // Abrir diálogo de confirmação
      setIsConfirmDialogOpen(true);
    }
  };
  
  const handleConfirmOperation = () => {
    if (pendingOperation) {
      console.log('✅ [RawMaterialStock] Confirmando operação:', {
        materialId: pendingOperation.materialId,
        materialName: pendingOperation.materialName,
        operation: pendingOperation.operation,
        quantity: pendingOperation.quantity,
        unitPrice: pendingOperation.unitPrice,
        confirmUnitPrice
      });
      
      // Usar valores confirmados ou originais
      const finalUnitPrice = confirmUnitPrice ? parseFloat(confirmUnitPrice) : pendingOperation.unitPrice;
      
      console.log('💰 [RawMaterialStock] Executando onStockUpdate com:', {
        materialId: pendingOperation.materialId,
        itemType: 'material',
        quantity: pendingOperation.quantity,
        operation: pendingOperation.operation,
        finalUnitPrice
      });
      
      onStockUpdate(
        pendingOperation.materialId,
        "material",
        pendingOperation.quantity,
        pendingOperation.operation,
        finalUnitPrice,
      );
      
      console.log('✨ [RawMaterialStock] Operação executada, limpando estados...');
      
      // Limpar estados
      setQuantity("");
      setUnitPrice("");
      setPendingOperation(null);
      setConfirmMaterialType("");
      setConfirmUnitPrice("");
      setIsConfirmDialogOpen(false);
      
      console.log('✅ [RawMaterialStock] Estados limpos, operação concluída');
    }
  };
  
  const handleCancelOperation = () => {
    setPendingOperation(null);
    setConfirmMaterialType("");
    setConfirmUnitPrice("");
    setIsConfirmDialogOpen(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSetLevels = () => {
    if (selectedItemForLevels && minLevel) {
      onSetMinLevel(selectedItemForLevels, "material", parseFloat(minLevel));
      setMinLevel("");
      setSelectedItemForLevels("");
      setIsLevelsDialogOpen(false);
    }
  };

  const getStockForMaterial = (materialId: string) => {
    return stockItems.find((item) => item.item_id === materialId);
  };

  const getStockLevel = (stock: StockItem) => {
    if (!stock.min_level) return "unknown";
    if (stock.quantity <= stock.min_level) return "low";
    return "normal";
  };

  const getStockLevelColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-red-400";
      case "normal":
        return "text-neon-green";
      default:
        return "text-tire-300";
    }
  };

  const filteredMaterials = activeMaterials.filter((material) =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calculate metrics for raw materials usando useMemo para recalcular quando há atualizações
  const metrics = React.useMemo(() => {
    console.log('🔄 [RawMaterialStock] Recalculando métricas (trigger:', { lastUpdate, stockItemsLength: stockItems.length }, ')');
    
    // Get material stock items only
    const materialStockItems = stockItems.filter(
      (item) => item.item_type === "material",
    );

    console.log("🔍 [RawMaterialStock] Calculando métricas de matéria-prima:", {
      totalStockItems: stockItems.length,
      materialStockItems: materialStockItems.length,
      activeMaterials: activeMaterials.length,
      lastUpdate,
      stockItemsDetails: materialStockItems.map((item) => ({
        id: item.id,
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_value: item.total_value,
      })),
    });

    // Calculate total quantity of materials in stock
    const totalQuantity = materialStockItems.reduce((sum, item) => {
      const numericQuantity = Number(item.quantity);
      if (!isNaN(numericQuantity) && numericQuantity >= 0) {
        return sum + numericQuantity;
      }
      return sum;
    }, 0);

    // Calculate total value of materials in stock
    const totalValue = materialStockItems.reduce((sum, item) => {
      const unitCost = Number(item.unit_cost) || 0;
      const quantity = Number(item.quantity) || 0;
      const calculatedValue = unitCost * quantity;
      return sum + calculatedValue;
    }, 0);

    // Count unique material types in stock (materials that have stock > 0)
    const materialTypesInStock = materialStockItems.filter(
      (item) => Number(item.quantity) > 0,
    ).length;

    // Count total registered material types (active materials)
    const totalMaterialTypes = activeMaterials.length;

    console.log("📊 [RawMaterialStock] Métricas calculadas (atualização:", lastUpdate, '):', {
      totalQuantity,
      totalValue: `R$ ${totalValue.toFixed(2)}`,
      materialTypesInStock,
      totalMaterialTypes,
    });

    return {
      totalQuantity,
      totalValue,
      materialTypesInStock,
      totalMaterialTypes,
    };
  }, [stockItems, activeMaterials, lastUpdate]); // Dependências incluem lastUpdate para forçar recálculo

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-3">
          <Package className="h-5 w-5 text-neon-blue" />
          Estoque de Matéria Prima
        </h3>
        <p className="text-tire-300 mt-2">
          Controle de entrada e saída de matérias-primas
        </p>
      </div>

      {/* Material Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Tipos de Material</p>
                <p className="text-2xl font-bold text-neon-blue">
                  {metrics.materialTypesInStock}
                </p>
                <p className="text-xs text-tire-400 mt-1">
                  de {metrics.totalMaterialTypes} cadastrados
                </p>
              </div>
              <div className="text-neon-blue">
                <span className="text-2xl">📋</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Valor Total</p>
                <p className="text-xl font-bold text-neon-cyan">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(metrics.totalValue)}
                </p>
                <p className="text-xs text-tire-400 mt-1">Valor investido</p>
              </div>
              <div className="text-neon-cyan">
                <span className="text-2xl">💎</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Operations */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Movimentação de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-tire-300">Material</Label>
              <Select
                value={selectedMaterial}
                onValueChange={setSelectedMaterial}
              >
                <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                  <SelectValue placeholder="Selecione um material" />
                </SelectTrigger>
                <SelectContent className="bg-factory-800 border-tire-600/30">
                  {activeMaterials.map((material) => (
                    <SelectItem
                      key={material.id}
                      value={material.id}
                      className="text-white hover:bg-tire-700/50"
                    >
                      {material.name} ({material.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-tire-300">Quantidade</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                placeholder="Digite a quantidade"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-tire-300">
                Preço Unitário (R$) - Opcional
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                placeholder="Digite o preço por unidade"
              />
              <p className="text-xs text-tire-400">
                Usado para calcular custo médio quando adicionado
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleStockOperation("add")}
                className="flex-1 bg-gradient-to-r from-neon-green to-tire-500 hover:from-tire-600 hover:to-neon-green text-white"
                disabled={!selectedMaterial || !quantity || isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
              <Button
                onClick={() => handleStockOperation("remove")}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                disabled={!selectedMaterial || !quantity || isLoading}
              >
                <Minus className="h-4 w-4 mr-2" />
                Remover
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stock List */}
        <Card className="lg:col-span-2 bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
              Estoque Atual
              <Dialog
                open={isLevelsDialogOpen}
                onOpenChange={setIsLevelsDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-tire-300 hover:text-white"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-factory-800 border-tire-600/30 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      Configurar Nível Mínimo de Estoque
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-tire-300">Material</Label>
                      <Select
                        value={selectedItemForLevels}
                        onValueChange={setSelectedItemForLevels}
                      >
                        <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                          <SelectValue placeholder="Selecione um material" />
                        </SelectTrigger>
                        <SelectContent className="bg-factory-800 border-tire-600/30">
                          {activeMaterials.map((material) => (
                            <SelectItem
                              key={material.id}
                              value={material.id}
                              className="text-white hover:bg-tire-700/50"
                            >
                              {material.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-tire-300">Nível Mínimo</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={minLevel}
                        onChange={(e) => setMinLevel(e.target.value)}
                        className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                        placeholder="Digite o nível mínimo de estoque"
                      />
                    </div>
                    <Button
                      onClick={handleSetLevels}
                      className="w-full bg-neon-blue hover:bg-neon-blue/80"
                    >
                      Salvar Nível Mínimo
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
              <Input
                placeholder="Buscar materiais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredMaterials.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                  <p className="text-tire-400">
                    {searchTerm
                      ? "Nenhum material encontrado"
                      : "Nenhum material cadastrado"}
                  </p>
                </div>
              ) : (
                filteredMaterials.map((material) => {
                  const stock = getStockForMaterial(material.id);
                  const stockLevel = stock ? getStockLevel(stock) : "unknown";
                  const stockLevelColor = getStockLevelColor(stockLevel);

                  return (
                    <div
                      key={material.id}
                      className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">
                          {material.name}
                        </h4>
                        <div className="flex items-center gap-2">
                          {stockLevel === "low" && (
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                          )}
                          <span
                            className={`text-sm font-medium ${stockLevelColor}`}
                          >
                            {stock
                              ? `${stock.quantity} ${material.unit}`
                              : "0 " + material.unit}
                          </span>
                        </div>
                      </div>
                      <div className="text-tire-400 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Unidade:</span>
                          <span>{material.unit}</span>
                        </div>
                        {stock && stock.unit_cost > 0 && (
                          <>
                            <div className="flex justify-between">
                              <span>Custo Médio:</span>
                              <span className="text-neon-green font-medium">
                                {formatCurrency(stock.unit_cost)}/
                                {material.unit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Valor Total:</span>
                              <span className="text-neon-blue font-medium">
                                {formatCurrency(stock.total_value)}
                              </span>
                            </div>
                          </>
                        )}
                        {stock && stock.min_level && (
                          <>
                            <div className="flex justify-between">
                              <span>Nível Mínimo:</span>
                              <span>
                                {stock.min_level} {material.unit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Status:</span>
                              <span className={stockLevelColor}>
                                {stockLevel === "low" && "Estoque Baixo"}
                                {stockLevel === "normal" && "Estoque Normal"}
                              </span>
                            </div>
                          </>
                        )}
                        {stock && stock.last_updated && (
                          <div className="flex justify-between">
                            <span>Última Atualização:</span>
                            <span>
                              {new Date(stock.last_updated).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Diálogo de Confirmação de Movimentação */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent className="bg-factory-800 border-tire-600/30 text-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              {pendingOperation?.operation === "add" ? (
                <Plus className="h-5 w-5 text-neon-green" />
              ) : (
                <Minus className="h-5 w-5 text-red-400" />
              )}
              Confirmar {pendingOperation?.operation === "add" ? "Adição" : "Remoção"} de Estoque
            </AlertDialogTitle>
            <AlertDialogDescription className="text-tire-300">
              Confirme os detalhes da movimentação de estoque. Você pode ajustar o tipo de material e o valor unitário antes de confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Informações da Operação */}
            <div className="bg-factory-700/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-tire-400">Operação:</span>
                <span className={pendingOperation?.operation === "add" ? "text-neon-green" : "text-red-400"}>
                  {pendingOperation?.operation === "add" ? "Adicionar" : "Remover"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-tire-400">Quantidade:</span>
                <span className="text-white font-medium">
                  {pendingOperation?.quantity} unidades
                </span>
              </div>
            </div>
            
            {/* Campo editável para Tipo de Material */}
            <div className="space-y-2">
              <Label className="text-tire-300">Tipo de Material</Label>
              <Input
                value={confirmMaterialType}
                onChange={(e) => setConfirmMaterialType(e.target.value)}
                className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                placeholder="Nome do material"
              />
              <p className="text-xs text-tire-400">
                Você pode ajustar o nome do material se necessário
              </p>
            </div>
            
            {/* Campo editável para Valor Unitário (apenas para adição) */}
            {pendingOperation?.operation === "add" && (
              <div className="space-y-2">
                <Label className="text-tire-300">Valor Unitário (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={confirmUnitPrice}
                  onChange={(e) => setConfirmUnitPrice(e.target.value)}
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  placeholder="0,00"
                />
                <p className="text-xs text-tire-400">
                  Usado para calcular o custo médio ponderado
                </p>
              </div>
            )}
            
            {/* Valor Total Calculado */}
            {pendingOperation?.operation === "add" && confirmUnitPrice && (
              <div className="bg-neon-blue/10 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-tire-300">Valor Total:</span>
                  <span className="text-neon-blue font-bold text-lg">
                    {formatCurrency((pendingOperation?.quantity || 0) * parseFloat(confirmUnitPrice || "0"))}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancelOperation}
              className="bg-factory-700 hover:bg-factory-600 text-white border-tire-600/30"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmOperation}
              className={`text-white ${
                pendingOperation?.operation === "add" 
                  ? "bg-gradient-to-r from-neon-green to-tire-500 hover:from-tire-600 hover:to-neon-green" 
                  : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              }`}
            >
              {pendingOperation?.operation === "add" ? "Adicionar" : "Remover"} Estoque
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RawMaterialStock;
