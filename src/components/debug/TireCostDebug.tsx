/**
 * Componente de debug para testar a inicialização de custos de pneus
 * Usado para verificar se os avisos do StockCharts foram resolvidos
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  initializeDefaultTireCosts,
  clearDefaultTireCosts,
  hasDefaultTireCosts,
  DEFAULT_TIRE_COSTS,
} from "@/utils/defaultTireCosts";
import {
  Settings,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Eye,
} from "lucide-react";

const TireCostDebug: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(hasDefaultTireCosts());
  const [debugInfo, setDebugInfo] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInitialize = () => {
    setIsLoading(true);
    console.log("🔧 [TireCostDebug] Inicializando custos padrão...");

    try {
      initializeDefaultTireCosts();
      setIsInitialized(hasDefaultTireCosts());
      console.log(
        "✅ [TireCostDebug] Custos padrão inicializados com sucesso!"
      );
    } catch (error) {
      console.error("❌ [TireCostDebug] Erro ao inicializar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setIsLoading(true);
    console.log("🧹 [TireCostDebug] Limpando custos padrão...");

    try {
      clearDefaultTireCosts();
      setIsInitialized(hasDefaultTireCosts());
      setDebugInfo([]);
      console.log("✅ [TireCostDebug] Custos padrão limpos com sucesso!");
    } catch (error) {
      console.error("❌ [TireCostDebug] Erro ao limpar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspect = () => {
    console.log("🔍 [TireCostDebug] Inspecionando dados salvos...");

    const info = DEFAULT_TIRE_COSTS.map((defaultCost) => {
      const productKey = `tireAnalysis_${defaultCost.productName.toLowerCase().replace(/\s+/g, "_")}`;
      const savedData = localStorage.getItem(productKey);

      return {
        productName: defaultCost.productName,
        productKey,
        hasData: !!savedData,
        isDefault: savedData ? JSON.parse(savedData).isDefault : false,
        costPerTire: savedData ? JSON.parse(savedData).costPerTire : 0,
        source: savedData ? JSON.parse(savedData).source : "N/A",
      };
    });

    setDebugInfo(info);
    console.log("📊 [TireCostDebug] Informações coletadas:", info);
  };

  const getStatusColor = (hasData: boolean, isDefault: boolean) => {
    if (!hasData) return "bg-red-600";
    if (isDefault) return "bg-blue-600";
    return "bg-green-600";
  };

  const getStatusText = (hasData: boolean, isDefault: boolean) => {
    if (!hasData) return "Sem dados";
    if (isDefault) return "Padrão";
    return "Personalizado";
  };

  return (
    <Card className="bg-factory-800/50 border-tire-600/30">
      <CardHeader>
        <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
          <Settings className="h-5 w-5 text-neon-blue" />
          Debug - Custos de Pneus
          {isInitialized ? (
            <Badge className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Inicializado
            </Badge>
          ) : (
            <Badge className="bg-red-600">
              <XCircle className="h-3 w-3 mr-1" />
              Não Inicializado
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controles */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleInitialize}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Inicializar Custos
          </Button>

          <Button
            onClick={handleClear}
            disabled={isLoading}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Custos
          </Button>

          <Button
            onClick={handleInspect}
            disabled={isLoading}
            variant="outline"
            className="border-tire-600 text-tire-200 hover:bg-tire-700"
          >
            <Eye className="h-4 w-4 mr-2" />
            Inspecionar
          </Button>
        </div>

        {/* Informações */}
        <div className="text-sm text-tire-300">
          <p>
            <strong>Total de tamanhos:</strong> {DEFAULT_TIRE_COSTS.length}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {isInitialized
              ? "Dados padrão disponíveis"
              : "Dados padrão não encontrados"}
          </p>
        </div>

        {/* Debug Info */}
        {debugInfo.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-tire-200 font-medium">Detalhes dos Dados:</h4>
            <div className="max-h-96 overflow-y-auto space-y-1">
              {debugInfo.map((info, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-factory-700/30 rounded border border-tire-600/20"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      className={getStatusColor(info.hasData, info.isDefault)}
                    >
                      {getStatusText(info.hasData, info.isDefault)}
                    </Badge>
                    <span className="text-tire-200 text-sm">
                      {info.productName}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    {info.hasData ? (
                      <>
                        <div className="text-green-400">
                          R$ {info.costPerTire}
                        </div>
                        <div className="text-tire-400 text-xs">
                          {info.source}
                        </div>
                      </>
                    ) : (
                      <div className="text-red-400">Sem dados</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="p-3 bg-factory-700/20 rounded border border-tire-600/20">
          <h4 className="text-tire-200 font-medium mb-2">Como usar:</h4>
          <ul className="text-sm text-tire-300 space-y-1">
            <li>
              • <strong>Inicializar:</strong> Cria dados padrão para todos os
              tamanhos de pneus
            </li>
            <li>
              • <strong>Limpar:</strong> Remove apenas os dados padrão (preserva
              dados personalizados)
            </li>
            <li>
              • <strong>Inspecionar:</strong> Mostra o status atual de cada
              tamanho de pneu
            </li>
          </ul>
        </div>

        {/* Tamanhos disponíveis */}
        <div className="p-3 bg-factory-700/20 rounded border border-tire-600/20">
          <h4 className="text-tire-200 font-medium mb-2">Tamanhos Padrão:</h4>
          <div className="flex flex-wrap gap-1">
            {DEFAULT_TIRE_COSTS.map((tire, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs border-tire-600 text-tire-300"
              >
                {tire.productName}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TireCostDebug;
