import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Database, RefreshCw, TestTube } from "lucide-react";
import { supabase } from "../../../supabase/supabase";
import { dataManager } from "@/utils/dataManager";
import { useDefectiveTireSales } from "@/hooks/useDataPersistence";
import type { DefectiveTireSale } from "@/types/financial";

const DefectiveTireSalesDiagnostic = () => {
  const [diagnosticResults, setDiagnosticResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testTireName, setTestTireName] = useState("Pneu Teste Diagnóstico");
  const [testQuantity, setTestQuantity] = useState("2");
  const [testUnitPrice, setTestUnitPrice] = useState("50.00");
  const [testDescription, setTestDescription] = useState(
    "Teste de diagnóstico do sistema",
  );

  // Use the hook to get current data
  const {
    defectiveTireSales,
    addDefectiveTireSale,
    refreshDefectiveTireSales,
    isLoading: hookLoading,
  } = useDefectiveTireSales();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    const logMessage = `[${timestamp}] ${message}`;
    console.log(`🔍 [Diagnostic] ${logMessage}`);
    setDiagnosticResults((prev) => [...prev, logMessage]);
  };

  const clearLogs = () => {
    setDiagnosticResults([]);
  };

  const runFullDiagnostic = async () => {
    setIsRunning(true);
    clearLogs();

    try {
      addLog(
        "🚀 Iniciando diagnóstico completo do sistema de vendas de pneus defeituosos",
      );

      // 1. Test Supabase connection
      addLog("📡 Testando conexão com Supabase...");
      const { data: connectionTest, error: connectionError } = await supabase
        .from("defective_tire_sales")
        .select("count")
        .limit(1);

      if (connectionError) {
        addLog(`❌ Erro de conexão: ${connectionError.message}`);
        return;
      }
      addLog("✅ Conexão com Supabase OK");

      // 2. Check table structure
      addLog("🏗️ Verificando estrutura da tabela defective_tire_sales...");
      const { data: tableData, error: tableError } = await supabase
        .from("defective_tire_sales")
        .select("*")
        .limit(1);

      if (tableError) {
        addLog(`❌ Erro ao acessar tabela: ${tableError.message}`);
        return;
      }
      addLog("✅ Tabela defective_tire_sales acessível");

      // 3. Count existing records
      const { data: countData, error: countError } = await supabase
        .from("defective_tire_sales")
        .select("id", { count: "exact" });

      if (countError) {
        addLog(`❌ Erro ao contar registros: ${countError.message}`);
      } else {
        addLog(`📊 Total de registros na tabela: ${countData?.length || 0}`);
      }

      // 4. Test hook data loading
      addLog("🔄 Verificando dados carregados pelo hook...");
      addLog(`📋 Hook carregou ${defectiveTireSales.length} vendas`);
      addLog(`⏳ Hook está carregando: ${hookLoading}`);

      // 5. List recent sales
      if (defectiveTireSales.length > 0) {
        addLog("📝 Últimas 3 vendas carregadas pelo hook:");
        defectiveTireSales.slice(0, 3).forEach((sale, index) => {
          addLog(
            `   ${index + 1}. ${sale.tire_name} - Qtd: ${sale.quantity} - Valor: R$ ${sale.sale_value.toFixed(2)} - Data: ${sale.sale_date}`,
          );
        });
      } else {
        addLog("📝 Nenhuma venda carregada pelo hook");
      }

      // 6. Test direct database query
      addLog("🔍 Testando consulta direta ao banco...");
      const { data: directQuery, error: directError } = await supabase
        .from("defective_tire_sales")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (directError) {
        addLog(`❌ Erro na consulta direta: ${directError.message}`);
      } else {
        addLog(
          `📊 Consulta direta retornou ${directQuery?.length || 0} registros`,
        );
        if (directQuery && directQuery.length > 0) {
          addLog("📝 Registros encontrados na consulta direta:");
          directQuery.forEach((sale, index) => {
            addLog(
              `   ${index + 1}. ${sale.tire_name} - Qtd: ${sale.quantity} - Valor: R$ ${sale.sale_value} - Data: ${sale.sale_date}`,
            );
          });
        }
      }

      // 7. Test DataManager methods
      addLog("🔧 Testando métodos do DataManager...");
      try {
        const dmSales = await dataManager.loadDefectiveTireSales();
        addLog(`📊 DataManager carregou ${dmSales.length} vendas`);
        if (dmSales.length > 0) {
          addLog("📝 Primeiras vendas do DataManager:");
          dmSales.slice(0, 2).forEach((sale, index) => {
            addLog(
              `   ${index + 1}. ${sale.tire_name} - Qtd: ${sale.quantity} - Valor: R$ ${sale.sale_value}`,
            );
          });
        }
      } catch (dmError) {
        addLog(`❌ Erro no DataManager: ${dmError}`);
      }

      addLog("🏁 Diagnóstico completo finalizado");
    } catch (error) {
      addLog(`❌ Erro crítico no diagnóstico: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testDataInsertion = async () => {
    setIsRunning(true);
    addLog("🧪 Iniciando teste de inserção de dados...");

    try {
      const testSale = {
        tire_name: testTireName,
        quantity: parseFloat(testQuantity),
        unit_price: parseFloat(testUnitPrice),
        sale_value: parseFloat(testQuantity) * parseFloat(testUnitPrice),
        description: testDescription,
        sale_date: new Date().toISOString().split("T")[0],
      };

      addLog(`📝 Dados do teste: ${JSON.stringify(testSale, null, 2)}`);

      // Test 1: Direct Supabase insertion
      addLog("🔧 Teste 1: Inserção direta no Supabase...");
      const { data: directInsert, error: directInsertError } = await supabase
        .from("defective_tire_sales")
        .insert([testSale])
        .select()
        .single();

      if (directInsertError) {
        addLog(`❌ Erro na inserção direta: ${directInsertError.message}`);
      } else {
        addLog(`✅ Inserção direta bem-sucedida! ID: ${directInsert.id}`);

        // Clean up the test record
        await supabase
          .from("defective_tire_sales")
          .delete()
          .eq("id", directInsert.id);
        addLog(`🧹 Registro de teste removido`);
      }

      // Test 2: DataManager insertion
      addLog("🔧 Teste 2: Inserção via DataManager...");
      try {
        const dmResult = await dataManager.saveDefectiveTireSale(testSale);
        if (dmResult) {
          addLog(`✅ DataManager inserção bem-sucedida! ID: ${dmResult.id}`);

          // Clean up
          await dataManager.deleteDefectiveTireSale(dmResult.id);
          addLog(`🧹 Registro de teste do DataManager removido`);
        } else {
          addLog(`❌ DataManager retornou null`);
        }
      } catch (dmError) {
        addLog(`❌ Erro no DataManager: ${dmError}`);
      }

      // Test 3: Hook insertion
      addLog("🔧 Teste 3: Inserção via Hook...");
      try {
        const hookResult = await addDefectiveTireSale(testSale);
        if (hookResult) {
          addLog(`✅ Hook inserção bem-sucedida! ID: ${hookResult.id}`);
          addLog(
            `📊 Total de vendas após inserção: ${defectiveTireSales.length}`,
          );

          // Refresh to see if it appears
          await refreshDefectiveTireSales();
          addLog(`🔄 Após refresh: ${defectiveTireSales.length} vendas`);
        } else {
          addLog(`❌ Hook retornou null`);
        }
      } catch (hookError) {
        addLog(`❌ Erro no Hook: ${hookError}`);
      }

      addLog("🏁 Teste de inserção finalizado");
    } catch (error) {
      addLog(`❌ Erro crítico no teste: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const forceRefresh = async () => {
    addLog("🔄 Forçando refresh dos dados...");
    try {
      await refreshDefectiveTireSales();
      addLog(
        `✅ Refresh concluído. Total: ${defectiveTireSales.length} vendas`,
      );
    } catch (error) {
      addLog(`❌ Erro no refresh: ${error}`);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
            <TestTube className="h-4 w-4 text-white" />
          </div>
          Diagnóstico - Vendas de Pneus Defeituosos
        </h2>
        <p className="text-tire-300 mt-2">
          Ferramenta para diagnosticar problemas no sistema de vendas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control Panel */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-neon-blue" />
              Painel de Controle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={runFullDiagnostic}
                disabled={isRunning}
                className="bg-gradient-to-r from-neon-blue to-neon-green hover:from-neon-green hover:to-neon-blue text-white"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Diagnóstico Completo
              </Button>

              <Button
                onClick={forceRefresh}
                disabled={isRunning}
                variant="outline"
                className="border-tire-600/30 text-tire-200 hover:bg-tire-700/50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Forçar Refresh
              </Button>

              <Button
                onClick={clearLogs}
                variant="outline"
                className="border-tire-600/30 text-tire-200 hover:bg-tire-700/50"
              >
                Limpar Logs
              </Button>
            </div>

            <div className="border-t border-tire-600/30 pt-4">
              <h4 className="text-tire-200 font-medium mb-3">
                Teste de Inserção
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-tire-300 text-sm">
                      Nome do Pneu
                    </Label>
                    <Input
                      value={testTireName}
                      onChange={(e) => setTestTireName(e.target.value)}
                      className="bg-factory-700/50 border-tire-600/30 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-tire-300 text-sm">Quantidade</Label>
                    <Input
                      type="number"
                      value={testQuantity}
                      onChange={(e) => setTestQuantity(e.target.value)}
                      className="bg-factory-700/50 border-tire-600/30 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-tire-300 text-sm">
                    Preço Unitário
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={testUnitPrice}
                    onChange={(e) => setTestUnitPrice(e.target.value)}
                    className="bg-factory-700/50 border-tire-600/30 text-white"
                  />
                </div>
                <div>
                  <Label className="text-tire-300 text-sm">Descrição</Label>
                  <Textarea
                    value={testDescription}
                    onChange={(e) => setTestDescription(e.target.value)}
                    className="bg-factory-700/50 border-tire-600/30 text-white"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={testDataInsertion}
                  disabled={isRunning}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-red-500 hover:to-orange-500 text-white"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Testar Inserção
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Resultados do Diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-factory-700/30 rounded-lg p-4 max-h-96 overflow-y-auto">
              {diagnosticResults.length === 0 ? (
                <p className="text-tire-400 text-center py-4">
                  Clique em "Diagnóstico Completo" para iniciar
                </p>
              ) : (
                <div className="space-y-1">
                  {diagnosticResults.map((result, index) => (
                    <div
                      key={index}
                      className={`text-sm font-mono ${
                        result.includes("❌")
                          ? "text-red-400"
                          : result.includes("✅")
                            ? "text-neon-green"
                            : result.includes("⚠️")
                              ? "text-orange-400"
                              : result.includes("🔍") || result.includes("📊")
                                ? "text-neon-blue"
                                : "text-tire-300"
                      }`}
                    >
                      {result}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Data Summary */}
      <Card className="mt-6 bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 text-lg">
            Resumo dos Dados Atuais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-factory-700/30 rounded">
              <div className="text-tire-300 text-sm">
                Vendas Carregadas (Hook)
              </div>
              <div className="text-2xl font-bold text-neon-blue">
                {defectiveTireSales.length}
              </div>
            </div>
            <div className="p-3 bg-factory-700/30 rounded">
              <div className="text-tire-300 text-sm">Status do Hook</div>
              <div
                className={`text-lg font-medium ${
                  hookLoading ? "text-orange-400" : "text-neon-green"
                }`}
              >
                {hookLoading ? "Carregando..." : "Pronto"}
              </div>
            </div>
            <div className="p-3 bg-factory-700/30 rounded">
              <div className="text-tire-300 text-sm">Última Atualização</div>
              <div className="text-lg font-medium text-tire-200">
                {new Date().toLocaleTimeString("pt-BR")}
              </div>
            </div>
          </div>

          {defectiveTireSales.length > 0 && (
            <div className="mt-4">
              <h4 className="text-tire-200 font-medium mb-2">
                Últimas Vendas:
              </h4>
              <div className="space-y-2">
                {defectiveTireSales.slice(0, 3).map((sale, index) => (
                  <div
                    key={sale.id}
                    className="p-2 bg-factory-700/20 rounded text-sm"
                  >
                    <span className="text-white font-medium">
                      {sale.tire_name}
                    </span>
                    <span className="text-tire-300 ml-2">
                      Qtd: {sale.quantity} | Valor: R${" "}
                      {sale.sale_value.toFixed(2)} | Data: {sale.sale_date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DefectiveTireSalesDiagnostic;
