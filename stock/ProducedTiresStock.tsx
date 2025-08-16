import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Package2,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { StockItem, ProductionEntry } from "@/types/financial";

interface ProducedTiresStockProps {
  stockItems?: StockItem[];
  productionEntries?: ProductionEntry[];
  isLoading?: boolean;
}

const ProducedTiresStock = ({
  stockItems = [],
  productionEntries = [],
  isLoading = false,
}: ProducedTiresStockProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter stock items to show only produced tires (products)
  const producedTiresStock = stockItems.filter(
    (item) => item.item_type === "product",
  );

  const filteredStock = producedTiresStock.filter((item) =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Get production history for a specific product
  const getProductionHistory = (productName: string) => {
    return productionEntries
      .filter((entry) => entry.product_name === productName)
      .sort(
        (a, b) =>
          new Date(b.production_date).getTime() -
          new Date(a.production_date).getTime(),
      )
      .slice(0, 5); // Show last 5 productions
  };

  // Calculate total production for a product
  const getTotalProduced = (productName: string) => {
    return productionEntries
      .filter((entry) => entry.product_name === productName)
      .reduce((total, entry) => total + entry.quantity_produced, 0);
  };

  // Get stock level status
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

  const totalStockValue = filteredStock.reduce(
    (sum, item) => sum + item.total_value,
    0,
  );
  const totalQuantity = filteredStock.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const lowStockItems = filteredStock.filter(
    (item) => getStockLevel(item) === "low",
  ).length;

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-factory-700/50 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-factory-700/50 rounded"></div>
            <div className="h-24 bg-factory-700/50 rounded"></div>
            <div className="h-24 bg-factory-700/50 rounded"></div>
          </div>
          <div className="h-96 bg-factory-700/50 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-3">
          <Package2 className="h-5 w-5 text-neon-orange" />
          Estoque de Pneus Produzidos
        </h3>
        <p className="text-tire-300 mt-2">
          Controle automático do estoque de pneus produzidos baseado na produção
          diária
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Total de Pneus</p>
                <p className="text-2xl font-bold text-neon-green">
                  {totalQuantity.toFixed(0)}
                </p>
              </div>
              <div className="text-neon-green">
                <Package2 className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Valor Total</p>
                <p className="text-lg font-bold text-neon-blue">
                  {formatCurrency(totalStockValue)}
                </p>
              </div>
              <div className="text-neon-blue">
                <TrendingUp className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Estoque Baixo</p>
                <p className="text-2xl font-bold text-red-400">
                  {lowStockItems}
                </p>
              </div>
              <div className="text-red-400">
                <AlertTriangle className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-factory-800/50 border-tire-600/30 mb-6">
        <CardHeader>
          <CardTitle className="text-tire-200 text-lg">
            Estoque Atual de Pneus
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
            <Input
              placeholder="Buscar pneus produzidos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredStock.length === 0 ? (
              <div className="text-center py-8">
                <Package2 className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                <p className="text-tire-400">
                  {searchTerm
                    ? "Nenhum pneu encontrado"
                    : "Nenhum pneu produzido ainda"}
                </p>
              </div>
            ) : (
              filteredStock.map((stock) => {
                const stockLevel = getStockLevel(stock);
                const stockLevelColor = getStockLevelColor(stockLevel);
                const totalProduced = getTotalProduced(stock.item_name);
                const productionHistory = getProductionHistory(stock.item_name);

                return (
                  <div
                    key={stock.id}
                    className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium text-lg">
                        {stock.item_name}
                      </h4>
                      <div className="flex items-center gap-2">
                        {stockLevel === "low" && (
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        )}
                        <span
                          className={`text-lg font-bold ${stockLevelColor}`}
                        >
                          {stock.quantity.toFixed(0)} {stock.unit}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Stock Information */}
                      <div className="space-y-2">
                        <h5 className="text-tire-300 font-medium text-sm">
                          Informações do Estoque
                        </h5>
                        <div className="text-tire-400 text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Unidade:</span>
                            <span>{stock.unit}</span>
                          </div>
                          {stock.unit_cost > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span>Custo Médio:</span>
                                <span className="text-neon-green font-medium">
                                  {formatCurrency(stock.unit_cost)}/{stock.unit}
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
                          {stock.min_level && (
                            <>
                              <div className="flex justify-between">
                                <span>Nível Mínimo:</span>
                                <span>
                                  {stock.min_level} {stock.unit}
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
                          <div className="flex justify-between">
                            <span>Total Produzido:</span>
                            <span className="text-neon-purple font-medium">
                              {totalProduced.toFixed(0)} {stock.unit}
                            </span>
                          </div>
                          {stock.last_updated && (
                            <div className="flex justify-between">
                              <span>Última Atualização:</span>
                              <span>
                                {new Date(
                                  stock.last_updated,
                                ).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Production History */}
                      <div className="space-y-2">
                        <h5 className="text-tire-300 font-medium text-sm flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Histórico de Produção (Últimas 5)
                        </h5>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {productionHistory.length === 0 ? (
                            <p className="text-tire-500 text-xs">
                              Nenhuma produção registrada
                            </p>
                          ) : (
                            productionHistory.map((entry, index) => (
                              <div
                                key={entry.id}
                                className="flex justify-between items-center text-xs p-2 bg-factory-600/20 rounded border border-tire-600/10"
                              >
                                <span className="text-tire-400">
                                  {new Date(
                                    entry.production_date,
                                  ).toLocaleDateString("pt-BR")}
                                </span>
                                <span className="text-neon-green font-medium">
                                  +{entry.quantity_produced.toFixed(0)}{" "}
                                  {stock.unit}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stock Alerts */}
      {lowStockItems > 0 && (
        <Card className="bg-red-900/20 border-red-600/30">
          <CardHeader>
            <CardTitle className="text-red-400 text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredStock
                .filter((item) => getStockLevel(item) === "low")
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-red-900/10 rounded border border-red-600/20"
                  >
                    <span className="text-white">{item.item_name}</span>
                    <span className="text-red-400">
                      {item.quantity.toFixed(0)} {item.unit} / Mín:{" "}
                      {item.min_level} {item.unit}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProducedTiresStock;
