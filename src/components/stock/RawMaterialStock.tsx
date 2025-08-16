import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Plus,
  Minus,
  Package,
  Search,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
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
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });
  const [forceUpdate, setForceUpdate] = useState(0);

  const activeMaterials = materials.filter((m) => !m.archived);

  // Debug: monitorar quando stockItems muda
  useEffect(() => {
    console.log(`🔍 [RawMaterialStock] stockItems prop mudou:`, {
      length: stockItems.length,
      timestamp: Date.now(),
      stockItems: stockItems.map(item => ({
        id: item.id,
        item_name: item.item_name,
        item_type: item.item_type,
        quantity: item.quantity
      }))
    });
  }, [stockItems]);

  const handleStockOperation = (operation: "add" | "remove") => {
    if (selectedMaterial && quantity && parseFloat(quantity) > 0) {
      try {
        const selectedMaterialData = activeMaterials.find(m => m.id === selectedMaterial);
        const price =
          operation === "add" && unitPrice ? parseFloat(unitPrice) : undefined;
        
        console.log(`🔄 [RawMaterialStock] INICIANDO operação de estoque:`, {
          material: selectedMaterialData?.name,
          materialId: selectedMaterial,
          quantity: parseFloat(quantity),
          operation,
          price,
          timestamp: new Date().toISOString()
        });
        
        // Executar a operação de estoque
        console.log(`🚀 [RawMaterialStock] Chamando onStockUpdate...`);
        const result = onStockUpdate(
          selectedMaterial,
          "material",
          parseFloat(quantity),
          operation,
          price,
        );
        
        console.log(`📝 [RawMaterialStock] Resultado do onStockUpdate:`, result);
        
        // Mostrar notificação de confirmação da operação
        const operationText = operation === "add" ? "adicionada" : "removida";
        const materialName = selectedMaterialData?.name || "Material";
        setNotification({
          show: true,
          type: 'success',
          message: `Solicitação enviada: ${parseFloat(quantity)} ${selectedMaterialData?.unit || 'un'} de ${materialName} para ser ${operationText}`
        });
        
        // Limpar campos
        setQuantity("");
        setUnitPrice("");
        
        // Aguardar um pouco e verificar se o evento foi disparado
        setTimeout(() => {
          console.log(`⏰ [RawMaterialStock] Após 3s - Eventos recebidos: ${eventCounterRef.current}`);
          setNotification(prev => ({ ...prev, show: false }));
        }, 3000);
        
      } catch (error) {
        console.error('❌ [RawMaterialStock] Erro na operação de estoque:', error);
        setNotification({
          show: true,
          type: 'error',
          message: 'Erro ao realizar operação de estoque. Tente novamente.'
        });
        
        // Ocultar notificação de erro após 4 segundos
        setTimeout(() => {
          setNotification(prev => ({ ...prev, show: false }));
        }, 4000);
      }
    } else {
      console.warn(`⚠️ [RawMaterialStock] Operação não executada - dados insuficientes:`, {
        selectedMaterial,
        quantity,
        quantityParsed: quantity ? parseFloat(quantity) : null
      });
    }
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

  // Filtrar apenas itens de material
  const materialStockItems = useMemo(() => {
    const filtered = stockItems.filter((item) => item.item_type === "material");
    console.log(`🔄 [RawMaterialStock] materialStockItems atualizado:`, {
      totalStockItems: stockItems.length,
      materialItems: filtered.length,
      timestamp: Date.now()
    });
    return filtered;
  }, [stockItems]);

  // Calculate metrics for raw materials
  const calculateMaterialMetrics = () => {

    // Log apenas se houver mudanças significativas
    const hasItems = materialStockItems.length > 0;
    if (hasItems && Math.random() < 0.1) { // Log apenas 10% das vezes para reduzir spam
      console.log("🔍 [RawMaterialStock] Calculando:", materialStockItems.length, "itens");
    }

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

    // Calculate total quantity of materials with unit "un" (unidade)
    const unitaryMaterialsQuantity = materialStockItems.reduce((sum, item) => {
      // Find the corresponding material to get its unit
      const material = activeMaterials.find(m => m.id === item.item_id);
      const itemUnit = material?.unit || item.unit;
      
      if (itemUnit === "un") {
        const numericQuantity = Number(item.quantity);
        if (!isNaN(numericQuantity) && numericQuantity >= 0) {
          return sum + numericQuantity;
        }
      }
      return sum;
    }, 0);

    // Count unique material types in stock (materials that have stock > 0)
    const materialTypesInStock = materialStockItems.filter(
      (item) => Number(item.quantity) > 0,
    ).length;

    // Count total registered material types (active materials)
    const totalMaterialTypes = activeMaterials.length;

    // Count materials with unit "un" that have stock > 0
    const unitaryMaterialsInStock = materialStockItems.filter((item) => {
      const material = activeMaterials.find(m => m.id === item.item_id);
      const itemUnit = material?.unit || item.unit;
      return itemUnit === "un" && Number(item.quantity) > 0;
    }).length;

    // Log final apenas ocasionalmente
    if (totalQuantity > 0 && Math.random() < 0.1) {
      console.log("📊 Métricas:", totalQuantity, "total,", materialTypesInStock, "tipos");
    }

    return {
      totalQuantity,
      totalValue,
      materialTypesInStock,
      totalMaterialTypes,
      unitaryMaterialsQuantity,
      unitaryMaterialsInStock,
    };
  };

  // Usar apenas useMemo - sem estado separado para evitar loops
  const metrics = useMemo(() => {
    // Log apenas quando realmente recalcular
    const timestamp = Date.now();
    console.log(`🔄 [RawMaterialStock] Recalculando métricas [${timestamp}]`);
    const result = calculateMaterialMetrics();
    console.log(`📊 [RawMaterialStock] Valores para interface:`, {
      totalQuantity: result.totalQuantity,
      totalValue: result.totalValue,
      materialTypes: result.materialTypesInStock,
      unitaryQuantity: result.unitaryMaterialsQuantity
    });
    return result;
  }, [materialStockItems, activeMaterials, forceUpdate]);

  // Ref para acessar activeMaterials sem causar re-renders
  const activeMaterialsRef = useRef(activeMaterials);
  
  // Atualizar ref sempre que activeMaterials mudar
  useEffect(() => {
    activeMaterialsRef.current = activeMaterials;
  }, [activeMaterials]);

  // Contador de eventos para debug
  const eventCounterRef = useRef(0);

  // Listener para eventos de atualização de estoque - registrado apenas uma vez
  useEffect(() => {
    const handleStockItemsUpdate = (event: CustomEvent) => {
      eventCounterRef.current += 1;
      console.log(`📡 [RawMaterialStock] Evento stockItemsUpdated #${eventCounterRef.current} recebido:`, {
        timestamp: new Date().toISOString(),
        eventDetail: event.detail,
        currentActiveMaterials: activeMaterialsRef.current.length
      });
      
      // Forçar recálculo das métricas quando houver atualizações
      console.log(`🔄 [RawMaterialStock] Forçando recalculo de métricas...`);
      setForceUpdate(prev => {
        const newValue = prev + 1;
        console.log(`📊 [RawMaterialStock] forceUpdate: ${prev} -> ${newValue}`);
        return newValue;
      });
      
      // Mostrar notificação adicional se for uma atualização de material
      if (event.detail.item && event.detail.item.item_type === 'material') {
        const item = event.detail.item;
        console.log(`🔍 [RawMaterialStock] Procurando material com ID: ${item.item_id}`);
        const material = activeMaterialsRef.current.find(m => m.id === item.item_id);
        
        if (material) {
          console.log(`✅ [RawMaterialStock] Material encontrado:`, material.name);
          console.log(`🔄 [RawMaterialStock] Atualização: ${material.name} -> ${item.quantity} ${material.unit}`);
          setNotification({
            show: true,
            type: 'success',
            message: `Estoque de ${material.name} atualizado! Nova quantidade: ${item.quantity} ${material.unit}`
          });
          
          // Ocultar notificação após 2 segundos
          setTimeout(() => {
            setNotification(prev => ({ ...prev, show: false }));
          }, 2000);
        } else {
          console.warn(`⚠️ [RawMaterialStock] Material não encontrado com ID: ${item.item_id}`);
          console.log(`📋 [RawMaterialStock] Materiais disponíveis:`, activeMaterialsRef.current.map(m => ({ id: m.id, name: m.name })));
        }
      } else {
        console.log(`🔕 [RawMaterialStock] Evento não é de material ou item não encontrado`);
      }
    };

    console.log('🔔 [RawMaterialStock] Registrando listener para stockItemsUpdated (uma única vez)');
    window.addEventListener('stockItemsUpdated', handleStockItemsUpdate as EventListener);

    return () => {
      console.log('🚫 [RawMaterialStock] Removendo listener para stockItemsUpdated');
      window.removeEventListener('stockItemsUpdated', handleStockItemsUpdate as EventListener);
    };
  }, []); // ✅ Array vazio - registra apenas uma vez

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

      {/* Notification */}
      {notification.show && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-900/30 border-green-500/30 text-green-300'
            : 'bg-red-900/30 border-red-500/30 text-red-300'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-400" />
          ) : (
            <XCircle className="h-5 w-5 text-red-400" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Material Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <p className="text-tire-300 text-sm">Matéria Prima Unitária</p>
                <p className="text-2xl font-bold text-neon-orange">
                  {metrics.unitaryMaterialsQuantity}
                </p>
                <p className="text-xs text-tire-400 mt-1">
                  {metrics.unitaryMaterialsInStock} tipos em estoque
                </p>
              </div>
              <div className="text-neon-orange">
                <span className="text-2xl">📦</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neon-green" style={{ backgroundColor: '#173329' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Valor Total</p>
                <p className="text-xl font-bold text-neon-green">
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
    </div>
  );
};

export default RawMaterialStock;
