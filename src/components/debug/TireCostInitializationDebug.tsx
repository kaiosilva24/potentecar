import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  initializeDefaultTireCosts, 
  clearDefaultTireCosts, 
  hasDefaultTireCosts,
  DEFAULT_TIRE_COSTS 
} from '../../utils/defaultTireCosts';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  AlertTriangle,
  Search,
  Database
} from 'lucide-react';

const TireCostInitializationDebug: React.FC = () => {
  const [initializationStatus, setInitializationStatus] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>('');

  // Verificar status de inicialização
  const checkInitializationStatus = () => {
    console.log('🔍 [TireCostInitializationDebug] Verificando status de inicialização...');
    
    const status: Record<string, any> = {};
    const allTireAnalysisKeys = Object.keys(localStorage).filter(key => key.includes('tireAnalysis'));
    
    // Verificar cada tamanho padrão
    DEFAULT_TIRE_COSTS.forEach(defaultCost => {
      const productKey = `tireAnalysis_${defaultCost.productName.toLowerCase().replace(/\s+/g, "_")}`;
      const existingData = localStorage.getItem(productKey);
      
      status[defaultCost.productName] = {
        productKey,
        initialized: !!existingData,
        isDefault: false,
        data: null,
        costPerTire: 0
      };
      
      if (existingData) {
        try {
          const data = JSON.parse(existingData);
          status[defaultCost.productName].isDefault = data.isDefault === true;
          status[defaultCost.productName].data = data;
          status[defaultCost.productName].costPerTire = data.costPerTire || 0;
        } catch (error) {
          console.error(`Erro ao parsear dados para ${defaultCost.productName}:`, error);
        }
      }
    });
    
    // Verificar custo médio
    const avgCostData = localStorage.getItem("dashboard_averageCostPerTire");
    status['_averageCost'] = {
      productKey: 'dashboard_averageCostPerTire',
      initialized: !!avgCostData,
      isDefault: false,
      data: null,
      value: 0
    };
    
    if (avgCostData) {
      try {
        const data = JSON.parse(avgCostData);
        status['_averageCost'].isDefault = data.isDefault === true;
        status['_averageCost'].data = data;
        status['_averageCost'].value = data.value || 0;
      } catch (error) {
        console.error('Erro ao parsear custo médio:', error);
      }
    }
    
    // Adicionar informações gerais
    status['_summary'] = {
      totalDefaultCosts: DEFAULT_TIRE_COSTS.length,
      initializedCount: Object.values(status).filter((s: any) => s.initialized && s.productKey !== '_summary').length - 1, // -1 para excluir _averageCost
      hasGlobalDefaults: hasDefaultTireCosts(),
      allTireAnalysisKeys: allTireAnalysisKeys.length,
      allKeys: allTireAnalysisKeys
    };
    
    setInitializationStatus(status);
    setLastCheck(new Date().toLocaleTimeString());
    
    console.log('📊 [TireCostInitializationDebug] Status atualizado:', status);
  };

  // Forçar inicialização
  const handleForceInitialization = async () => {
    setIsLoading(true);
    console.log('🔧 [TireCostInitializationDebug] Forçando inicialização...');
    
    try {
      initializeDefaultTireCosts();
      
      // Aguardar um pouco e verificar novamente
      setTimeout(() => {
        checkInitializationStatus();
        setIsLoading(false);
      }, 500);
      
    } catch (error) {
      console.error('Erro ao forçar inicialização:', error);
      setIsLoading(false);
    }
  };

  // Limpar dados padrão
  const handleClearDefaults = async () => {
    setIsLoading(true);
    console.log('🧹 [TireCostInitializationDebug] Limpando dados padrão...');
    
    try {
      clearDefaultTireCosts();
      
      // Aguardar um pouco e verificar novamente
      setTimeout(() => {
        checkInitializationStatus();
        setIsLoading(false);
      }, 500);
      
    } catch (error) {
      console.error('Erro ao limpar dados padrão:', error);
      setIsLoading(false);
    }
  };

  // Verificar status na montagem do componente
  useEffect(() => {
    checkInitializationStatus();
  }, []);

  const summary = initializationStatus['_summary'] || {};
  const problematicSize = "165 70 13";
  const problematicStatus = initializationStatus[problematicSize];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Debug: Inicialização de Custos de Pneus
          {problematicStatus?.initialized ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              165 70 13 OK
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              165 70 13 FALTANDO
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Resumo Geral */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.totalDefaultCosts || 0}</div>
            <div className="text-sm text-gray-600">Tamanhos Padrão</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.initializedCount || 0}</div>
            <div className="text-sm text-gray-600">Inicializados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{summary.allTireAnalysisKeys || 0}</div>
            <div className="text-sm text-gray-600">Total no Storage</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${summary.hasGlobalDefaults ? 'text-green-600' : 'text-red-600'}`}>
              {summary.hasGlobalDefaults ? 'SIM' : 'NÃO'}
            </div>
            <div className="text-sm text-gray-600">Tem Padrões</div>
          </div>
        </div>

        {/* Status do Tamanho Problemático */}
        {problematicStatus && (
          <div className={`p-4 rounded-lg border-2 ${
            problematicStatus.initialized ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'
          }`}>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              {problematicStatus.initialized ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              Status: {problematicSize}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Chave:</strong> {problematicStatus.productKey}
              </div>
              <div>
                <strong>Inicializado:</strong> {problematicStatus.initialized ? 'Sim' : 'Não'}
              </div>
              <div>
                <strong>É Padrão:</strong> {problematicStatus.isDefault ? 'Sim' : 'Não'}
              </div>
              <div>
                <strong>Custo:</strong> R$ {problematicStatus.costPerTire.toFixed(2)}
              </div>
            </div>
            {problematicStatus.data && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium">Ver dados completos</summary>
                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto">
                  {JSON.stringify(problematicStatus.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Controles */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={checkInitializationStatus}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <Search className="h-4 w-4 mr-2" />
            Verificar Status
          </Button>
          
          <Button 
            onClick={handleForceInitialization}
            variant="default"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Forçar Inicialização
          </Button>
          
          <Button 
            onClick={handleClearDefaults}
            variant="destructive"
            size="sm"
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Padrões
          </Button>
        </div>

        {lastCheck && (
          <div className="text-xs text-gray-500">
            Última verificação: {lastCheck}
          </div>
        )}

        {/* Lista de Todos os Tamanhos */}
        <details className="mt-4">
          <summary className="cursor-pointer font-medium">Ver todos os tamanhos ({Object.keys(initializationStatus).filter(k => !k.startsWith('_')).length})</summary>
          <div className="mt-2 space-y-2 max-h-60 overflow-auto">
            {Object.entries(initializationStatus)
              .filter(([key]) => !key.startsWith('_'))
              .map(([productName, status]: [string, any]) => (
                <div key={productName} className={`p-2 rounded border ${
                  status.initialized ? 'border-green-200 bg-green-50 dark:bg-green-900/10' : 'border-red-200 bg-red-50 dark:bg-red-900/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{productName}</span>
                    <div className="flex items-center gap-2">
                      {status.isDefault && (
                        <Badge variant="secondary" className="text-xs">Padrão</Badge>
                      )}
                      {status.initialized ? (
                        <Badge variant="default" className="bg-green-600 text-xs">
                          R$ {status.costPerTire.toFixed(2)}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Não inicializado</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
};

export default TireCostInitializationDebug;
