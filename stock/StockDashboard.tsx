import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  RefreshCw,
  Plus,
  Minus,
  Settings,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '../../../supabase/supabase';
import { dataManager } from '@/utils/dataManager';
import { useResaleProducts } from '@/hooks/useDataPersistence';
import type { StockItem } from '@/types/financial';

// Removida interface StockItem local - usando a do types/financial

interface StockMetrics {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  materialItems: number;
  materialValue: number;
  finalProductItems: number;
  finalProductValue: number;
  resaleProductItems: number;
  resaleProductValue: number;
}

interface NewStockDashboardProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

const NewStockDashboard: React.FC<NewStockDashboardProps> = ({
  onRefresh = () => {},
  isLoading = false,
}) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [metrics, setMetrics] = useState<StockMetrics>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    materialItems: 0,
    materialValue: 0,
    finalProductItems: 0,
    finalProductValue: 0,
    resaleProductItems: 0,
    resaleProductValue: 0,
  });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  // Hook para produtos de revenda
  const { resaleProducts } = useResaleProducts();

  // Carregar dados iniciais do Supabase
  useEffect(() => {
    loadStockData();
    setupRealtimeSubscription();
  }, []);

  // Recalcular métricas quando stockItems mudar
  useEffect(() => {
    calculateMetrics();
  }, [stockItems]);

  const loadStockData = async () => {
    try {
      setIsLoadingData(true);
      console.log('📦 [NewStockDashboard] Carregando dados de estoque do Supabase...');
      
      const data = await dataManager.loadStockItems();
      console.log(`✅ [NewStockDashboard] ${data.length} itens de estoque carregados`);
      
      setStockItems(data);
      setIsLoadingData(false);
    } catch (error) {
      console.error('❌ [NewStockDashboard] Erro ao carregar dados de estoque:', error);
      toast({
        title: 'Erro ao carregar estoque',
        description: 'Não foi possível carregar os dados de estoque.',
        variant: 'destructive',
      });
      setIsLoadingData(false);
    }
  };

  const setupRealtimeSubscription = () => {
    console.log('🔔 [NewStockDashboard] Configurando subscription em tempo real...');
    
    const channel = supabase
      .channel('stock_realtime_new')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stock_items'
      }, (payload) => {
        console.log('📦 [NewStockDashboard] Mudança detectada em stock_items:', payload);
        
        if (payload.eventType === 'INSERT') {
          const newItem = payload.new as StockItem;
          setStockItems(prev => [...prev, newItem]);
          toast({
            title: 'Item adicionado',
            description: `${newItem.item_name} foi adicionado ao estoque.`,
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedItem = payload.new as StockItem;
          setStockItems(prev => 
            prev.map(item => 
              item.id === updatedItem.id ? updatedItem : item
            )
          );
        } else if (payload.eventType === 'DELETE') {
          const deletedItem = payload.old as StockItem;
          setStockItems(prev => 
            prev.filter(item => item.id !== deletedItem.id)
          );
          toast({
            title: 'Item removido',
            description: `${deletedItem.item_name} foi removido do estoque.`,
          });
        }
      })
      .subscribe();

    return () => {
      console.log('🔕 [NewStockDashboard] Cancelando subscription');
      channel.unsubscribe();
    };
  };

  const calculateMetrics = () => {
    const totalItems = stockItems.length;
    const totalValue = stockItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    const lowStockItems = stockItems.filter(item => item.quantity <= (item.min_level || 0)).length;
    
    // Criar Set com IDs dos produtos de revenda
    const resaleProductIds = new Set(resaleProducts.map(p => p.id));
    
    // Matéria-prima
    const materialItems = stockItems.filter(item => item.item_type === 'material');
    const materialValue = materialItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    
    // Produtos finais: produtos que NÃO estão na lista de produtos de revenda
    const finalProductItems = stockItems.filter(item => {
      return item.item_type === 'product' && !resaleProductIds.has(item.item_id);
    });
    const finalProductValue = finalProductItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    
    // Produtos de revenda: produtos que ESTÃO na lista de produtos de revenda
    const resaleProductItems = stockItems.filter(item => {
      return item.item_type === 'product' && resaleProductIds.has(item.item_id);
    });
    const resaleProductValue = resaleProductItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

    setMetrics({
      totalItems,
      totalValue,
      lowStockItems,
      materialItems: materialItems.length,
      materialValue,
      finalProductItems: finalProductItems.length,
      finalProductValue,
      resaleProductItems: resaleProductItems.length,
      resaleProductValue,
    });
  };

  const updateStockQuantity = async (itemId: string, newQuantity: number) => {
    try {
      setIsUpdating(true);
      console.log(`📦 [NewStockDashboard] Atualizando quantidade do item ${itemId} para ${newQuantity}`);
      
      const { data, error } = await supabase
        .from('stock_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ [NewStockDashboard] Quantidade atualizada com sucesso');
      toast({
        title: 'Estoque atualizado',
        description: 'Quantidade atualizada com sucesso.',
      });
      
      setIsUpdating(false);
    } catch (error) {
      console.error('❌ [NewStockDashboard] Erro ao atualizar estoque:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o estoque.',
        variant: 'destructive',
      });
      setIsUpdating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStockStatus = (item: StockItem) => {
    if (item.quantity === 0) return { status: 'Sem estoque', color: 'bg-red-500' };
    if (item.quantity <= item.min_level) return { status: 'Estoque baixo', color: 'bg-yellow-500' };
    return { status: 'Normal', color: 'bg-green-500' };
  };

  const filterItemsByType = (type: string) => {
    // Criar Set com IDs dos produtos de revenda
    const resaleProductIds = new Set(resaleProducts.map(p => p.id));
    
    switch (type) {
      case 'materials':
        return stockItems.filter(item => item.item_type === 'material');
      case 'final-products':
        return stockItems.filter(item => {
          return item.item_type === 'product' && !resaleProductIds.has(item.item_id);
        });
      case 'resale-products':
        return stockItems.filter(item => {
          return item.item_type === 'product' && resaleProductIds.has(item.item_id);
        });
      default:
        return stockItems;
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-neon-blue" />
          <p className="text-tire-300">Carregando dados de estoque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard de Estoque</h2>
          <p className="text-tire-300">Gerenciamento em tempo real via Supabase</p>
        </div>
        <Button
          onClick={loadStockData}
          disabled={isLoadingData}
          className="bg-neon-blue hover:bg-neon-blue/80"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Total de Itens</p>
                <p className="text-2xl font-bold text-white">{metrics.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-neon-blue" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Valor Total</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(metrics.totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Estoque Baixo</p>
                <p className="text-2xl font-bold text-yellow-400">{metrics.lowStockItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Tipos de Produto</p>
                <p className="text-2xl font-bold text-neon-purple">
                  {[metrics.materialItems, metrics.finalProductItems, metrics.resaleProductItems]
                    .filter(count => count > 0).length}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-neon-purple" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center">
              <Package className="h-5 w-5 mr-2 text-blue-400" />
              Matéria Prima
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-tire-300">Itens:</span>
                <span className="text-white font-medium">{metrics.materialItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tire-300">Valor:</span>
                <span className="text-green-400 font-medium">{formatCurrency(metrics.materialValue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center">
              <Package className="h-5 w-5 mr-2 text-green-400" />
              Produtos Finais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-tire-300">Itens:</span>
                <span className="text-white font-medium">{metrics.finalProductItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tire-300">Valor:</span>
                <span className="text-green-400 font-medium">{formatCurrency(metrics.finalProductValue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center">
              <Package className="h-5 w-5 mr-2 text-purple-400" />
              Produtos Revenda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-tire-300">Itens:</span>
                <span className="text-white font-medium">{metrics.resaleProductItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tire-300">Valor:</span>
                <span className="text-green-400 font-medium">{formatCurrency(metrics.resaleProductValue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Items Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-factory-800/50 border border-tire-600/30">
          <TabsTrigger value="overview" className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="materials" className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20">
            Matéria Prima
          </TabsTrigger>
          <TabsTrigger value="final-products" className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20">
            Produtos Finais
          </TabsTrigger>
          <TabsTrigger value="resale-products" className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20">
            Produtos Revenda
          </TabsTrigger>
        </TabsList>

        {['overview', 'materials', 'final-products', 'resale-products'].map(tabValue => (
          <TabsContent key={tabValue} value={tabValue}>
            <Card className="bg-factory-800/50 border-tire-600/30">
              <CardHeader>
                <CardTitle className="text-white">
                  {tabValue === 'overview' && 'Todos os Itens'}
                  {tabValue === 'materials' && 'Matéria Prima'}
                  {tabValue === 'final-products' && 'Produtos Finais'}
                  {tabValue === 'resale-products' && 'Produtos Revenda'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filterItemsByType(tabValue).length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-tire-400 mb-4" />
                      <p className="text-tire-300">Nenhum item encontrado</p>
                    </div>
                  ) : (
                    filterItemsByType(tabValue).map(item => {
                      const stockStatus = getStockStatus(item);
                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-factory-900/50 rounded-lg border border-tire-600/20">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-medium text-white">{item.item_name}</h3>
                              <Badge 
                                className={`${stockStatus.color} text-white text-xs`}
                              >
                                {stockStatus.status}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-tire-300">
                              <span>Qtd: {item.quantity}</span>
                              <span>Min: {item.min_level}</span>
                              <span>Preço: {formatCurrency(item.unit_cost)}</span>
                              <span>Total: {formatCurrency(item.quantity * item.unit_cost)}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedItem(item)}
                                  className="border-tire-600/30 text-tire-300 hover:text-white"
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-factory-800 border-tire-600/30">
                                <DialogHeader>
                                  <DialogTitle className="text-white">Atualizar Estoque</DialogTitle>
                                </DialogHeader>
                                {selectedItem && (
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="text-tire-300">Item</Label>
                                      <p className="text-white font-medium">{selectedItem.item_name}</p>
                                    </div>
                                    <div>
                                      <Label htmlFor="quantity" className="text-tire-300">Nova Quantidade</Label>
                                      <Input
                                        id="quantity"
                                        type="number"
                                        defaultValue={selectedItem.quantity}
                                        className="bg-factory-900 border-tire-600/30 text-white"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            const newQuantity = parseInt((e.target as HTMLInputElement).value);
                                            if (!isNaN(newQuantity) && newQuantity >= 0) {
                                              updateStockQuantity(selectedItem.id, newQuantity);
                                            }
                                          }
                                        }}
                                      />
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button
                                        onClick={() => {
                                          const input = document.getElementById('quantity') as HTMLInputElement;
                                          const newQuantity = parseInt(input.value);
                                          if (!isNaN(newQuantity) && newQuantity >= 0) {
                                            updateStockQuantity(selectedItem.id, newQuantity);
                                          }
                                        }}
                                        disabled={isUpdating}
                                        className="bg-neon-blue hover:bg-neon-blue/80"
                                      >
                                        {isUpdating ? 'Atualizando...' : 'Atualizar'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default NewStockDashboard;
