/**
 * Componente de debug para monitorar performance da autenticação
 * Usado para verificar se as otimizações estão funcionando
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  AuthPerformanceMonitor,
  quickSessionCheck,
  preloadCriticalData,
  lazyLoadSecondaryData,
  clearSessionCache
} from "@/utils/authOptimizations";
import { 
  Timer, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Zap, 
  Database,
  Trash2,
  Activity,
  TrendingUp,
  TrendingDown
} from "lucide-react";

const AuthPerformanceDebug: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const refreshPerformanceData = () => {
    const report = AuthPerformanceMonitor.getReport();
    const avgSignIn = AuthPerformanceMonitor.getAverageTime('sign_in');
    const avgSessionCheck = AuthPerformanceMonitor.getAverageTime('session_check');
    const signInSuccess = AuthPerformanceMonitor.getSuccessRate('sign_in');
    const sessionSuccess = AuthPerformanceMonitor.getSuccessRate('session_check');

    setPerformanceData({
      report,
      avgSignIn,
      avgSessionCheck,
      signInSuccess,
      sessionSuccess
    });
  };

  const runPerformanceTest = async (testName: string, testFn: () => Promise<any>) => {
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      
      setTestResults(prev => [...prev, {
        name: testName,
        duration,
        success: true,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      console.log(`✅ [AuthDebug] ${testName} concluído em ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      setTestResults(prev => [...prev, {
        name: testName,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      console.error(`❌ [AuthDebug] ${testName} falhou após ${duration}ms:`, error);
    } finally {
      setIsLoading(false);
      refreshPerformanceData();
    }
  };

  const testQuickSessionCheck = () => {
    runPerformanceTest('Verificação Rápida de Sessão', quickSessionCheck);
  };

  const testPreloadCriticalData = () => {
    runPerformanceTest('Pré-carregamento de Dados Críticos', preloadCriticalData);
  };

  const testLazyLoadSecondaryData = () => {
    runPerformanceTest('Carregamento Lazy de Dados Secundários', lazyLoadSecondaryData);
  };

  const clearTestResults = () => {
    setTestResults([]);
    clearSessionCache();
    console.log('🧹 [AuthDebug] Resultados de teste e cache limpos');
  };

  useEffect(() => {
    refreshPerformanceData();
  }, []);

  const getPerformanceColor = (value: number, type: 'time' | 'rate') => {
    if (type === 'time') {
      if (value < 1000) return 'text-green-400';
      if (value < 3000) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      if (value >= 90) return 'text-green-400';
      if (value >= 70) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  const getPerformanceIcon = (value: number, type: 'time' | 'rate') => {
    const color = getPerformanceColor(value, type);
    if (color === 'text-green-400') return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (color === 'text-yellow-400') return <Activity className="h-4 w-4 text-yellow-400" />;
    return <TrendingDown className="h-4 w-4 text-red-400" />;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
            <Timer className="h-5 w-5 text-neon-blue" />
            Debug - Performance de Autenticação
            <Badge className="bg-blue-600">
              <Activity className="h-3 w-3 mr-1" />
              Otimizado
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controles de Teste */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={testQuickSessionCheck}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Zap className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Testar Sessão
            </Button>
            
            <Button
              onClick={testPreloadCriticalData}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Database className="h-4 w-4 mr-2" />
              Testar Pré-carregamento
            </Button>
            
            <Button
              onClick={testLazyLoadSecondaryData}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Testar Lazy Loading
            </Button>
            
            <Button
              onClick={clearTestResults}
              disabled={isLoading}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Testes
            </Button>
          </div>

          {/* Métricas de Performance */}
          {performanceData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 bg-factory-700/30 rounded border border-tire-600/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-tire-300 text-sm">Tempo Login</span>
                  {getPerformanceIcon(performanceData.avgSignIn, 'time')}
                </div>
                <div className={`text-lg font-bold ${getPerformanceColor(performanceData.avgSignIn, 'time')}`}>
                  {performanceData.avgSignIn > 0 ? `${performanceData.avgSignIn}ms` : 'N/A'}
                </div>
              </div>

              <div className="p-3 bg-factory-700/30 rounded border border-tire-600/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-tire-300 text-sm">Tempo Sessão</span>
                  {getPerformanceIcon(performanceData.avgSessionCheck, 'time')}
                </div>
                <div className={`text-lg font-bold ${getPerformanceColor(performanceData.avgSessionCheck, 'time')}`}>
                  {performanceData.avgSessionCheck > 0 ? `${performanceData.avgSessionCheck}ms` : 'N/A'}
                </div>
              </div>

              <div className="p-3 bg-factory-700/30 rounded border border-tire-600/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-tire-300 text-sm">Taxa Login</span>
                  {getPerformanceIcon(performanceData.signInSuccess, 'rate')}
                </div>
                <div className={`text-lg font-bold ${getPerformanceColor(performanceData.signInSuccess, 'rate')}`}>
                  {performanceData.signInSuccess}%
                </div>
              </div>

              <div className="p-3 bg-factory-700/30 rounded border border-tire-600/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-tire-300 text-sm">Taxa Sessão</span>
                  {getPerformanceIcon(performanceData.sessionSuccess, 'rate')}
                </div>
                <div className={`text-lg font-bold ${getPerformanceColor(performanceData.sessionSuccess, 'rate')}`}>
                  {performanceData.sessionSuccess}%
                </div>
              </div>
            </div>
          )}

          {/* Resultados dos Testes */}
          {testResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-tire-200 font-medium">Resultados dos Testes:</h4>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {testResults.slice(-10).map((result, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 bg-factory-700/30 rounded border border-tire-600/20"
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-tire-200 text-sm">{result.name}</span>
                      <span className="text-tire-400 text-xs">{result.timestamp}</span>
                    </div>
                    <div className="text-right text-sm">
                      <div className={result.success ? 'text-green-400' : 'text-red-400'}>
                        {result.duration}ms
                      </div>
                      {result.error && (
                        <div className="text-red-400 text-xs max-w-32 truncate">
                          {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Benchmarks de Performance */}
          <div className="p-3 bg-factory-700/20 rounded border border-tire-600/20">
            <h4 className="text-tire-200 font-medium mb-2">Benchmarks de Performance:</h4>
            <div className="space-y-2 text-sm text-tire-300">
              <div className="flex justify-between">
                <span>Login Rápido:</span>
                <span className="text-green-400">&lt; 1s</span>
              </div>
              <div className="flex justify-between">
                <span>Login Aceitável:</span>
                <span className="text-yellow-400">1-3s</span>
              </div>
              <div className="flex justify-between">
                <span>Login Lento:</span>
                <span className="text-red-400">&gt; 3s</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa de Sucesso Ideal:</span>
                <span className="text-green-400">&gt; 90%</span>
              </div>
            </div>
          </div>

          {/* Otimizações Implementadas */}
          <div className="p-3 bg-factory-700/20 rounded border border-tire-600/20">
            <h4 className="text-tire-200 font-medium mb-2">Otimizações Implementadas:</h4>
            <ul className="text-sm text-tire-300 space-y-1">
              <li>• <strong>Timeout de Login:</strong> 10 segundos (vs. padrão 15 minutos)</li>
              <li>• <strong>Cache de Sessão:</strong> 5 minutos de duração</li>
              <li>• <strong>Verificação Rápida:</strong> 3 segundos de timeout</li>
              <li>• <strong>Pré-carregamento:</strong> Dados críticos em paralelo</li>
              <li>• <strong>Lazy Loading:</strong> Dados secundários em background</li>
              <li>• <strong>Fallback:</strong> localStorage como backup</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPerformanceDebug;
