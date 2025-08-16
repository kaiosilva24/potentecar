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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Minus,
  Package2,
  Search,
  Settings,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Edit,
} from "lucide-react";
import { useResaleProducts, useStockItems } from "@/hooks/useDataPersistence";
import { ResaleProduct, StockItem } from "@/types/financial";
import { useToast } from "@/components/ui/use-toast";

interface ResaleProductsStockProps {
  isLoading?: boolean;
}

const ResaleProductsStock = ({ isLoading = false }: ResaleProductsStockProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [stockOperation, setStockOperation] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [minLevel, setMinLevel] = useState("");
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showMinLevelDialog, setShowMinLevelDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "low" | "normal">("all");

  const { toast } = useToast();
  const { resaleProducts, isLoading: resaleProductsLoading } = useResaleProducts();
  const { stockItems, updateStockItem, createStockItem, isLoading: stockLoading } = useStockItems();

  // Debug: Log when hooks are loaded
  useEffect(() => {
    console.log("🔍 [ResaleProductsStock] Estado dos hooks:", {
      resaleProductsCount: resaleProducts.length,
      stockItemsCount: stockItems.length,
      isResaleProductsLoading: resaleProductsLoading,
      isStockLoading: stockLoading,
      updateStockItemFunction: typeof updateStockItem,
      createStockItemFunction: typeof createStockItem
    });
  }, [resaleProducts.length, stockItems.length, resaleProductsLoading, stockLoading]);

  // Filter resale product stock items
  const resaleStockItems = stockItems.filter(
    (item) => 
      item.item_type === "product" && 
      resaleProducts.some(rp => rp.id === item.item_id)
  );

  // Get resale products with stock information
  const resaleProductsWithStock = resaleProducts
    .filter(product => !product.archived)
    .map(product => {
      const stockItem = resaleStockItems.find(
        item => item.item_id === product.id
      );

      const quantity = stockItem?.quantity || 0;
      const minLevel = stockItem?.min_level || 0;
      const totalValue = stockItem?.total_value || 0;
      
      // Calcular valor médio sempre como total_value / quantity
      const averageUnitValue = quantity > 0 ? totalValue / quantity : 0;

      let status = "normal";
      if (minLevel > 0 && quantity <= minLevel) status = "low";

      return {
        ...product,
        stockId: stockItem?.id,
        quantity,
        minLevel,
        totalValue,
        averageUnitValue, // Usar valor médio calculado
        status,
      };
    });

  // Apply filters
  const filteredProducts = resaleProductsWithStock.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.supplier_name && product.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = 
      filterStatus === "all" || 
      (filterStatus === "low" && product.status === "low") ||
      (filterStatus === "normal" && product.status === "normal");

    return matchesSearch && matchesStatus;
  });

  const handleStockUpdate = async () => {
    if (!selectedProduct || !quantity) {
      toast({
        title: "Erro",
        description: "Selecione um produto e informe a quantidade.",
        variant: "destructive",
      });
      return;
    }

    const product = resaleProductsWithStock.find(p => p.id === selectedProduct);
    if (!product) {
      toast({
        title: "Erro",
        description: "Produto não encontrado.",
        variant: "destructive",
      });
      return;
    }

    // Validação e conversão de dados
    const quantityValue = parseInt(quantity) || 0;
    const priceValue = parseFloat(unitPrice) || 0;

    if (quantityValue <= 0) {
      toast({
        title: "Erro",
        description: "A quantidade deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (stockOperation === "add" && priceValue < 0) {
      toast({
        title: "Erro",
        description: "O preço não pode ser negativo.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se há estoque suficiente para remoção
    if (stockOperation === "remove") {
      if (!product.stockId || quantityValue > product.quantity) {
        toast({
          title: "Erro",
          description: product.stockId 
            ? `Estoque insuficiente. Disponível: ${product.quantity} ${product.unit}`
            : "Não é possível remover estoque de um produto sem estoque registrado",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      console.log("🔄 Iniciando atualização de estoque:", {
        productId: selectedProduct,
        productName: product.name,
        operation: stockOperation,
        quantity: quantityValue,
        price: priceValue,
        existingStockId: product.stockId
      });

      if (product.stockId) {
        // Update existing stock
        const currentQuantity = product.quantity || 0;
        const currentUnitCost = product.averageUnitValue || 0;

        let newQuantity = currentQuantity;
        let newUnitCost = currentUnitCost;

        if (stockOperation === "add") {
          newQuantity = currentQuantity + quantityValue;

          // Calculate new total value if adding with a price
          if (priceValue > 0) {
            const currentTotalValue = product.totalValue || 0;
            const addedValue = quantityValue * priceValue;
            // O unit_cost será recalculado automaticamente pelo total_value / quantity
            newUnitCost = newQuantity > 0 ? (currentTotalValue + addedValue) / newQuantity : priceValue;
          } else {
            // Se não informou preço, manter o custo médio atual
            newUnitCost = currentUnitCost;
          }
        } else {
          newQuantity = Math.max(0, currentQuantity - quantityValue);
          // Manter o mesmo custo unitário médio na remoção
          newUnitCost = currentUnitCost;
        }

        const updateData = {
          quantity: newQuantity,
          unit_cost: newUnitCost,
          total_value: newQuantity * newUnitCost,
          last_updated: new Date().toISOString(),
        };

        console.log("📝 Atualizando estoque existente:", {
          stockId: product.stockId,
          currentData: { quantity: currentQuantity, unitCost: currentUnitCost },
          updateData
        });

        const result = await updateStockItem(product.stockId, updateData);
        
        if (!result) {
          throw new Error("Falha ao atualizar item no banco de dados");
        }

        console.log("✅ Estoque atualizado com sucesso");
        
        // Disparar evento para sincronização em tempo real com StockCharts
        console.log('📡 [ResaleProductsStock] Disparando evento de sincronização...');
        window.dispatchEvent(new CustomEvent('resaleStockUpdated', {
          detail: { 
            productId: product.id,
            productName: product.name,
            operation: stockOperation,
            newQuantity,
            newUnitCost,
            newTotalValue: newQuantity * newUnitCost,
            timestamp: new Date().toISOString()
          }
        }));

        // Forçar recarregamento dos dados de estoque para sincronização
        console.log('🔄 [ResaleProductsStock] Forçando recarregamento dos dados de estoque...');
        window.dispatchEvent(new CustomEvent('forceStockItemsReload', {
          detail: {
            source: 'ResaleProductsStock',
            timestamp: new Date().toISOString()
          }
        }));

        // Forçar atualização imediata dos gráficos
        setTimeout(() => {
          console.log('⚡ [ResaleProductsStock] Disparando evento de atualização imediata...');
          window.dispatchEvent(new CustomEvent('forceChartsRefresh', {
            detail: {
              source: 'ResaleProductsStock',
              productId: product.id,
              timestamp: new Date().toISOString()
            }
          }));
        }, 200);
      } else {
        // Create new stock entry - só permite adicionar
        if (stockOperation === "remove") {
          throw new Error("Não é possível remover estoque de um produto sem estoque registrado");
        }

        const newUnitCost = priceValue > 0 ? priceValue : (product.purchase_price || 0);
        const newQuantity = quantityValue;

        const newStockData = {
          item_id: product.id,
          item_type: "product" as const,
          item_name: product.name,
          quantity: newQuantity,
          unit_cost: newUnitCost,
          total_value: newQuantity * newUnitCost,
          min_level: 0,
          unit: product.unit || "un",
          last_updated: new Date().toISOString(),
        };

        console.log("🆕 Criando novo registro de estoque:", newStockData);

        const result = await createStockItem(newStockData);
        
        if (!result) {
          throw new Error("Falha ao criar novo item no banco de dados");
        }

        console.log("✅ Novo estoque criado com sucesso");
        
        // Disparar evento para sincronização em tempo real com StockCharts
        console.log('📡 [ResaleProductsStock] Disparando evento de sincronização para novo estoque...');
        window.dispatchEvent(new CustomEvent('resaleStockUpdated', {
          detail: { 
            productId: product.id,
            productName: product.name,
            operation: 'add',
            newQuantity,
            newUnitCost,
            newTotalValue: newQuantity * newUnitCost,
            timestamp: new Date().toISOString()
          }
        }));

        // Forçar recarregamento dos dados de estoque para sincronização
        console.log('🔄 [ResaleProductsStock] Forçando recarregamento dos dados de estoque para novo item...');
        window.dispatchEvent(new CustomEvent('forceStockItemsReload', {
          detail: {
            source: 'ResaleProductsStock',
            timestamp: new Date().toISOString()
          }
        }));

        // Forçar atualização imediata dos gráficos para novo item
        setTimeout(() => {
          console.log('⚡ [ResaleProductsStock] Disparando evento de atualização imediata para novo item...');
          window.dispatchEvent(new CustomEvent('forceChartsRefresh', {
            detail: {
              source: 'ResaleProductsStock',
              productId: product.id,
              timestamp: new Date().toISOString()
            }
          }));
        }, 200);
      }

      toast({
        title: "Sucesso!",
        description: `${stockOperation === "add" ? "Adicionado" : "Removido"} ${quantityValue} ${product.unit} de ${product.name}`,
      });

      // Reset form
      setShowStockDialog(false);
      setSelectedProduct("");
      setQuantity("");
      setUnitPrice("");
      
    } catch (error) {
      console.error("❌ Erro ao atualizar estoque:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        productId: selectedProduct,
        operation: stockOperation,
        quantity: quantityValue,
        price: priceValue
      });
      
      let errorMessage = "Não foi possível atualizar o estoque.";
      
      if (error instanceof Error) {
        console.log("Erro detalhado:", error.message);
        
        if (error.message.includes("duplicate") || error.message.includes("unique")) {
          errorMessage = "Este item já existe no estoque.";
        } else if (error.message.includes("foreign") || error.message.includes("violates")) {
          errorMessage = "Produto não encontrado no sistema.";
        } else if (error.message.includes("permission") || error.message.includes("unauthorized")) {
          errorMessage = "Sem permissão para atualizar estoque.";
        } else if (error.message.includes("network") || error.message.includes("connection")) {
          errorMessage = "Erro de conexão. Verifique sua internet.";
        } else if (error.message.includes("Falha ao")) {
          errorMessage = error.message;
        } else {
          errorMessage = `Erro interno: ${error.message}`;
        }
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSetMinLevel = async () => {
    if (!selectedProduct || !minLevel) {
      toast({
        title: "Erro",
        description: "Selecione um produto e informe o nível mínimo.",
        variant: "destructive",
      });
      return;
    }

    const product = resaleProductsWithStock.find(p => p.id === selectedProduct);
    if (!product) return;

    const minLevelValue = parseInt(minLevel);

    try {
      if (product.stockId) {
        await updateStockItem(product.stockId, {
          min_level: minLevelValue,
          last_updated: new Date().toISOString(),
        });
      } else {
        // Create stock entry with min level
        await createStockItem({
          item_id: product.id,
          item_type: "product",
          item_name: product.name,
          quantity: 0,
          unit_cost: product.purchase_price || 0,
          total_value: 0,
          min_level: minLevelValue,
          unit: product.unit || "un",
          last_updated: new Date().toISOString(),
        });
      }

      toast({
        title: "Nível mínimo definido",
        description: `Nível mínimo de ${minLevel} ${product.unit} definido para ${product.name}`,
      });

      setShowMinLevelDialog(false);
      setSelectedProduct("");
      setMinLevel("");
    } catch (error) {
      console.error("Erro ao definir nível mínimo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível definir o nível mínimo.",
        variant: "destructive",
      });
    }
  };

  // Calculate summary metrics
  const totalProducts = filteredProducts.length;
  const productsInStock = filteredProducts.filter(p => p.quantity > 0).length;
  const lowStockProducts = filteredProducts.filter(p => p.status === "low").length;
  const totalStockValue = filteredProducts.reduce((sum, p) => sum + p.totalValue, 0);
  const totalQuantity = filteredProducts.reduce((sum, p) => sum + p.quantity, 0);

  // Sistema de sincronização automática do valor total e quantidade total com o dashboard
  useEffect(() => {
    // Aguardar um pouco para garantir que os cálculos estejam estabilizados
    const timeoutId = setTimeout(async () => {
      console.log('💰 [ResaleProductsStock] Sincronizando valor total e quantidade total:', {
        totalStockValue: totalStockValue.toFixed(2),
        totalQuantity: totalQuantity,
        totalProducts,
        productsInStock,
        timestamp: new Date().toLocaleString()
      });
      
      // Salvar no localStorage para compatibilidade
      const stockData = {
        value: totalStockValue,
        timestamp: Date.now(),
        source: 'ResaleProductsStock'
      };
      
      try {
        localStorage.setItem('resale_total_stock_value', JSON.stringify(stockData));
        console.log('💾 [ResaleProductsStock] Valor salvo no localStorage:', stockData);
      } catch (error) {
        console.warn('⚠️ [ResaleProductsStock] Erro ao salvar no localStorage:', error);
      }

      // Salvar quantidade total no Supabase
      try {
        const { dataManager } = await import('@/utils/dataManager');
        const success = await dataManager.saveResaleProductTotalQuantity(totalQuantity);
        if (success) {
          console.log(`✅ [ResaleProductsStock] Quantidade total salva no Supabase: ${totalQuantity}`);
          
          // Disparar evento específico para quantidade total
          const quantityUpdateEvent = new CustomEvent('resaleProductTotalQuantityUpdated', {
            detail: {
              quantity: totalQuantity,
              timestamp: Date.now(),
              source: 'ResaleProductsStock'
            }
          });
          window.dispatchEvent(quantityUpdateEvent);
          console.log('📡 [ResaleProductsStock] Evento resaleProductTotalQuantityUpdated disparado:', {
            quantity: totalQuantity,
            source: 'ResaleProductsStock'
          });
        }
      } catch (error) {
        console.warn('⚠️ [ResaleProductsStock] Erro ao salvar quantidade total no Supabase:', error);
      }
      
      // Disparar evento customizado para notificar o dashboard sobre valor total
      const updateEvent = new CustomEvent('resaleTotalStockUpdated', {
        detail: {
          totalValue: totalStockValue,
          totalQuantity: totalQuantity,
          totalProducts,
          productsInStock,
          lowStockProducts,
          timestamp: Date.now(),
          source: 'ResaleProductsStock'
        }
      });
      
      window.dispatchEvent(updateEvent);
      console.log('📡 [ResaleProductsStock] Evento resaleTotalStockUpdated disparado:', {
        totalValue: totalStockValue.toFixed(2),
        totalQuantity: totalQuantity,
        source: 'ResaleProductsStock'
      });
      
    }, 300); // Delay de 300ms para estabilizar cálculos
    
    return () => clearTimeout(timeoutId);
  }, [totalStockValue, totalQuantity, totalProducts, productsInStock, lowStockProducts]); // Monitora mudanças nas métricas

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading || resaleProductsLoading || stockLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-factory-700/50 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-factory-700/50 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-factory-700/50 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center gap-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-neon-cyan" />
                <Package2 className="h-5 w-5 text-neon-orange" />
              </div>
              Estoque de Produtos de Revenda
            </h3>
            <p className="text-tire-300 mt-2">
              Gerencie o estoque dos produtos para revenda
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Total de Produtos</p>
                <p className="text-2xl font-bold text-white">{totalProducts}</p>
                <p className="text-xs text-tire-400 mt-1">cadastrados</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-neon-cyan" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Em Estoque</p>
                <p className="text-2xl font-bold text-neon-orange">{totalQuantity}</p>
                <p className="text-xs text-tire-400 mt-1">quantidade total</p>
              </div>
              <Package2 className="h-8 w-8 text-neon-orange" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Estoque Baixo</p>
                <p className="text-2xl font-bold text-red-400">{lowStockProducts}</p>
                <p className="text-xs text-tire-400 mt-1">alertas</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-neon-green" style={{ backgroundColor: '#173329' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Valor Total</p>
                <p className="text-2xl font-bold text-neon-green">{formatCurrency(totalStockValue)}</p>
                <p className="text-xs text-tire-400 mt-1">em estoque</p>
              </div>
              <DollarSign className="h-8 w-8 text-neon-green" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-factory-800/30 rounded-lg border border-tire-600/20">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-tire-400" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-factory-700/50 border-tire-600/30 text-white"
            />
          </div>
        </div>

        <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as "all" | "low" | "normal")}>
          <SelectTrigger className="w-40 bg-factory-700/50 border-tire-600/30 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-factory-800 border-tire-600/30">
            <SelectItem value="all" className="text-white hover:bg-tire-700/50">
              Todos
            </SelectItem>
            <SelectItem value="low" className="text-white hover:bg-tire-700/50">
              Estoque Baixo
            </SelectItem>
            <SelectItem value="normal" className="text-white hover:bg-tire-700/50">
              Normal
            </SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
          <DialogTrigger asChild>
            <Button style={{ backgroundColor: '#49de80', color: '#1d1e21' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3bc46e'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#49de80'}>
              <Plus className="h-4 w-4 mr-2" />
              Movimentar Estoque
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-factory-800 border-tire-600/30 text-white">
            <DialogHeader>
              <DialogTitle>Movimentar Estoque</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Produto</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent className="bg-factory-800 border-tire-600/30">
                    {resaleProductsWithStock.map((product) => (
                      <SelectItem
                        key={product.id}
                        value={product.id}
                        className="text-white hover:bg-tire-700/50"
                      >
                        {product.name} ({product.quantity} {product.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Operação</Label>
                  <Select value={stockOperation} onValueChange={(value) => setStockOperation(value as "add" | "remove")}>
                    <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-factory-800 border-tire-600/30">
                      <SelectItem value="add" className="text-white hover:bg-tire-700/50">
                        Adicionar
                      </SelectItem>
                      <SelectItem value="remove" className="text-white hover:bg-tire-700/50">
                        Remover
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow positive integers
                      if (value === '' || (/^\d+$/.test(value) && parseInt(value) > 0)) {
                        setQuantity(value);
                      }
                    }}
                    className="bg-factory-700/50 border-tire-600/30 text-white"
                    placeholder="0"
                  />
                </div>
              </div>

              {stockOperation === "add" && (
                <div>
                  <Label>Preço Unitário (opcional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty, decimal numbers >= 0
                      if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 0)) {
                        setUnitPrice(value);
                      }
                    }}
                    className="bg-factory-700/50 border-tire-600/30 text-white"
                    placeholder="0.00"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowStockDialog(false)}
                  className="bg-factory-700/50 border-tire-600/30 text-tire-300"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleStockUpdate}
                  className="bg-neon-green hover:bg-neon-green/80 text-white"
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showMinLevelDialog} onOpenChange={setShowMinLevelDialog}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="bg-factory-700/50 border-tire-600/30 text-tire-300 hover:text-white hover:bg-tire-700/50"
            >
              <Settings className="h-4 w-4 mr-2" />
              Nível Mínimo
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-factory-800 border-tire-600/30 text-white">
            <DialogHeader>
              <DialogTitle>Definir Nível Mínimo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Produto</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent className="bg-factory-800 border-tire-600/30">
                    {resaleProductsWithStock.map((product) => (
                      <SelectItem
                        key={product.id}
                        value={product.id}
                        className="text-white hover:bg-tire-700/50"
                      >
                        {product.name} (Min: {product.minLevel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                  <Label>Nível Mínimo</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={minLevel}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow non-negative integers
                      if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
                        setMinLevel(value);
                      }
                    }}
                    className="bg-factory-700/50 border-tire-600/30 text-white"
                    placeholder="0"
                  />
                </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowMinLevelDialog(false)}
                  className="bg-factory-700/50 border-tire-600/30 text-tire-300"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSetMinLevel}
                  className="bg-neon-blue hover:bg-neon-blue/80 text-white"
                >
                  Definir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Table */}
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 flex items-center gap-2">
            <Package2 className="h-5 w-5 text-neon-cyan" />
            Produtos de Revenda ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-tire-500 mx-auto mb-3" />
              <p className="text-tire-400">
                {searchTerm || filterStatus !== "all"
                  ? "Nenhum produto encontrado com os filtros aplicados"
                  : "Nenhum produto de revenda cadastrado"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-tire-600/30">
                    <TableHead className="text-tire-300">Produto</TableHead>
                    <TableHead className="text-tire-300 text-center">Quantidade</TableHead>
                    <TableHead className="text-tire-300 text-center">Nível Mín.</TableHead>
                    <TableHead className="text-tire-300 text-center">Status</TableHead>
                    <TableHead className="text-tire-300 text-right">Valor Médio</TableHead>
                    <TableHead className="text-tire-300 text-right">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} className="border-tire-600/30 hover:bg-tire-700/20">
                      <TableCell className="text-white">
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.sku && (
                            <div className="text-xs text-tire-400">SKU: {product.sku}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-white font-medium">
                          {product.quantity} {product.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-tire-300">
                          {product.minLevel > 0 ? `${product.minLevel} ${product.unit}` : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {product.status === "low" ? (
                          <Badge variant="destructive" className="bg-red-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Baixo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-neon-green border-neon-green/30">
                            Normal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-tire-300">
                        {product.averageUnitValue > 0 ? formatCurrency(product.averageUnitValue) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-neon-green font-medium">
                          {formatCurrency(product.totalValue)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStockProducts > 0 && (
        <Card className="mt-6 bg-red-900/20 border-red-600/30">
          <CardHeader>
            <CardTitle className="text-red-400 text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Estoque Baixo ({lowStockProducts})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredProducts
                .filter((product) => product.status === "low")
                .map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-red-900/10 rounded border border-red-600/20"
                  >
                    <div>
                      <span className="text-white font-medium">{product.name}</span>
                      <div className="text-sm text-tire-300">
                        Fornecedor: {product.supplier_name || "N/A"}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-red-400 font-medium">
                        {product.quantity} {product.unit}
                      </span>
                      <div className="text-xs text-tire-400">
                        Mín: {product.minLevel} {product.unit}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResaleProductsStock;