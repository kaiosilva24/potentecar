import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import {
  initializeDefaultTireCosts,
  ensureTireCostExists,
  hasSpecificTireCost,
  clearDefaultTireCosts,
  DEFAULT_TIRE_COSTS,
} from "@/utils/defaultTireCosts";

interface TestResult {
  productName: string;
  hasData: boolean;
  cost: number;
  source: string;
}

const TireCostFixTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastTest, setLastTest] = useState<Date | null>(null);

  // Produtos problemáticos identificados nos testes
  const problematicProducts = [
    "165 70 13", // Principal problema identificado
    "205 55 16",
    "195 55 16",
    "175 70 14",
  ];

  const runTest = async () => {
    setIsLoading(true);
    console.log("🧪 [TireCostFixTest] Iniciando teste de correção...");

    const results: TestResult[] = [];

    for (const productName of problematicProducts) {
      console.log(`🔍 [TireCostFixTest] Testando produto: ${productName}`);

      // SEMPRE forçar inicialização primeiro
      console.log(
        `🔧 [TireCostFixTest] Forçando inicialização para: ${productName}`
      );
      const cost = ensureTireCostExists(productName);

      // Verificar se foi inicializado corretamente
      const productKey = `tireAnalysis_${productName.toLowerCase().replace(/\s+/g, "_")}`;
      const savedData = localStorage.getItem(productKey);
      const data = savedData ? JSON.parse(savedData) : null;

      console.log(`🔍 [TireCostFixTest] Resultado para ${productName}:`, {
        productKey,
        cost,
        savedData: !!savedData,
        parsedData: data,
      });

      results.push({
        productName,
        hasData: cost > 0 && !!savedData,
        cost: cost || data?.costPerTire || 0,
        source: data?.source || (cost > 0 ? "ensureTireCostExists" : "failed"),
      });
    }

    setTestResults(results);
    setLastTest(new Date());
    setIsLoading(false);

    // Log do resultado
    const successCount = results.filter((r) => r.hasData).length;
    console.log(
      `🎯 [TireCostFixTest] Teste concluído: ${successCount}/${results.length} produtos com dados`
    );
  };

  const clearAllData = () => {
    console.log("🧹 [TireCostFixTest] Limpando todos os dados padrão...");
    clearDefaultTireCosts();
    setTestResults([]);
    setLastTest(null);
  };

  const initializeAll = async () => {
    setIsLoading(true);
    console.log("🔧 [TireCostFixTest] Inicializando todos os custos padrão...");

    try {
      // Limpar dados existentes primeiro
      console.log("🧽 [TireCostFixTest] Limpando dados existentes...");
      clearDefaultTireCosts();

      // Aguardar um pouco
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Inicializar novamente
      console.log("🔧 [TireCostFixTest] Inicializando custos padrão...");
      await initializeDefaultTireCosts();

      // Forçar inicialização individual para produtos problemáticos
      console.log("🔧 [TireCostFixTest] Forçando inicialização individual...");
      problematicProducts.forEach((productName) => {
        const cost = ensureTireCostExists(productName);
        console.log(`✅ [TireCostFixTest] ${productName}: R$ ${cost}`);
      });

      console.log("✅ [TireCostFixTest] Inicialização concluída");
      await runTest(); // Re-executar teste após inicialização
    } catch (error) {
      console.error("❌ [TireCostFixTest] Erro na inicialização:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Executar teste inicial
    runTest();
  }, []);

  const getStatusIcon = (result: TestResult) => {
    if (result.hasData && result.cost > 0) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (result.hasData && result.cost === 0) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = (result: TestResult) => {
    if (result.hasData && result.cost > 0) {
      return "OK";
    } else if (result.hasData && result.cost === 0) {
      return "DADOS INVÁLIDOS";
    } else {
      return "SEM DADOS";
    }
  };

  const successCount = testResults.filter(
    (r) => r.hasData && r.cost > 0
  ).length;
  const totalCount = testResults.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Teste de Correção - Custos de Pneus
          {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
        </CardTitle>
        {lastTest && (
          <p className="text-sm text-muted-foreground">
            Último teste: {lastTest.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Geral */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <h3 className="font-semibold">Status Geral</h3>
            <p className="text-sm text-muted-foreground">
              {successCount} de {totalCount} produtos com dados válidos
            </p>
          </div>
          <Badge
            variant={successCount === totalCount ? "default" : "destructive"}
            className="text-lg px-3 py-1"
          >
            {totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0}
            %
          </Badge>
        </div>

        {/* Controles */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={runTest} disabled={isLoading} variant="outline">
            🔄 Re-testar
          </Button>
          <Button
            onClick={initializeAll}
            disabled={isLoading}
            variant="default"
          >
            🔧 Limpar e Reinicializar
          </Button>
          <Button
            onClick={clearAllData}
            disabled={isLoading}
            variant="destructive"
          >
            🧹 Limpar Dados
          </Button>
        </div>

        {/* Resultados dos Testes */}
        <div className="space-y-2">
          <h3 className="font-semibold">Resultados por Produto:</h3>
          {testResults.map((result, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(result)}
                <div>
                  <p className="font-medium">{result.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    Fonte: {result.source}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge
                  variant={
                    result.hasData && result.cost > 0
                      ? "default"
                      : "destructive"
                  }
                >
                  {getStatusText(result)}
                </Badge>
                {result.cost > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    R$ {result.cost.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Informações Adicionais */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100">
            ℹ️ Informações da Correção
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
            <li>
              • Função síncrona <code>ensureTireCostExists()</code> implementada
            </li>
            <li>• Inicialização assíncrona no dashboard principal</li>
            <li>• Fallback automático para custos médios</li>
            <li>• {DEFAULT_TIRE_COSTS.length} produtos padrão disponíveis</li>
            <li>• Teste força inicialização individual para cada produto</li>
            <li>
              • Chave localStorage: <code>tireAnalysis_165_70_13</code>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default TireCostFixTest;
