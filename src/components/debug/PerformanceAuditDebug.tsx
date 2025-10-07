/**
 * Componente de debug para auditoria de performance
 * Identifica gargalos e operações lentas em tempo real
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PerformanceAuditor,
  PerformanceMetric,
  QueryAnalysis,
} from "@/utils/performanceAuditor";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Zap,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Play,
  Pause,
  BarChart3,
  Search,
} from "lucide-react";

const PerformanceAuditDebug: React.FC = () => {
  const [auditResults, setAuditResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [liveMetrics, setLiveMetrics] = useState<{
    metrics: PerformanceMetric[];
    queries: QueryAnalysis[];
  }>({ metrics: [], queries: [] });

  const runFullAudit = async () => {
    setIsRunning(true);
    try {
      console.log(
        "🔍 [PerformanceAuditDebug] Executando auditoria completa..."
      );

      // Executar auditoria do dashboard
      await PerformanceAuditor.auditDashboardLoad();

      // Obter resultados da auditoria
      const results = await PerformanceAuditor.runSystemAudit();
      setAuditResults(results);

      console.log("✅ [PerformanceAuditDebug] Auditoria concluída");
    } catch (error) {
      console.error("❌ [PerformanceAuditDebug] Erro na auditoria:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const refreshLiveMetrics = () => {
    const metrics = PerformanceAuditor.getMetrics();
    setLiveMetrics(metrics);
  };

  const toggleAuditor = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    PerformanceAuditor.setEnabled(newState);
  };

  useEffect(() => {
    // Atualizar métricas a cada 5 segundos
    const interval = setInterval(refreshLiveMetrics, 5000);
    refreshLiveMetrics(); // Carregar inicial

    return () => clearInterval(interval);
  }, []);

  const getPerformanceColor = (duration: number) => {
    if (duration < 1000) return "text-green-400";
    if (duration < 3000) return "text-yellow-400";
    return "text-red-400";
  };

  const getPerformanceIcon = (duration: number) => {
    if (duration < 1000)
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    if (duration < 3000) return <Clock className="h-4 w-4 text-yellow-400" />;
    return <AlertTriangle className="h-4 w-4 text-red-400" />;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-neon-green" />
            Auditoria de Performance
            <Badge className={isEnabled ? "bg-green-600" : "bg-red-600"}>
              {isEnabled ? (
                <Play className="h-3 w-3 mr-1" />
              ) : (
                <Pause className="h-3 w-3 mr-1" />
              )}
              {isEnabled ? "Ativo" : "Pausado"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controles */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={runFullAudit}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Search
                className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`}
              />
              Executar Auditoria
            </Button>

            <Button
              onClick={refreshLiveMetrics}
              variant="outline"
              className="border-tire-600 text-tire-200 hover:bg-tire-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Métricas
            </Button>

            <Button
              onClick={toggleAuditor}
              variant={isEnabled ? "destructive" : "default"}
            >
              {isEnabled ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isEnabled ? "Pausar" : "Ativar"}
            </Button>
          </div>

          {/* Métricas em Tempo Real */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-factory-700/30 rounded border border-tire-600/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-tire-300 text-sm">Operações Total</span>
                <Activity className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-lg font-bold text-blue-400">
                {liveMetrics.metrics.length}
              </div>
            </div>

            <div className="p-3 bg-factory-700/30 rounded border border-tire-600/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-tire-300 text-sm">Queries Total</span>
                <Database className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-lg font-bold text-purple-400">
                {liveMetrics.queries.length}
              </div>
            </div>

            <div className="p-3 bg-factory-700/30 rounded border border-tire-600/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-tire-300 text-sm">Operações Lentas</span>
                <TrendingDown className="h-4 w-4 text-red-400" />
              </div>
              <div className="text-lg font-bold text-red-400">
                {
                  liveMetrics.metrics.filter(
                    (m) => m.duration && m.duration > 2000
                  ).length
                }
              </div>
            </div>

            <div className="p-3 bg-factory-700/30 rounded border border-tire-600/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-tire-300 text-sm">Taxa de Sucesso</span>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
              <div className="text-lg font-bold text-green-400">
                {liveMetrics.metrics.length > 0
                  ? `${((liveMetrics.metrics.filter((m) => m.success).length / liveMetrics.metrics.length) * 100).toFixed(1)}%`
                  : "0%"}
              </div>
            </div>
          </div>

          {/* Resultados da Auditoria */}
          {auditResults && (
            <div className="space-y-4">
              <h4 className="text-tire-200 font-medium">
                Resultados da Auditoria:
              </h4>

              {/* Resumo */}
              <div className="p-4 bg-factory-700/20 rounded border border-tire-600/20">
                <h5 className="text-tire-200 font-medium mb-2">Resumo:</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-tire-400">Operações:</span>
                    <div className="text-tire-200 font-medium">
                      {auditResults.summary.totalOperations}
                    </div>
                  </div>
                  <div>
                    <span className="text-tire-400">Queries:</span>
                    <div className="text-tire-200 font-medium">
                      {auditResults.summary.totalQueries}
                    </div>
                  </div>
                  <div>
                    <span className="text-tire-400">Tempo Médio Op:</span>
                    <div className="text-tire-200 font-medium">
                      {formatDuration(
                        auditResults.summary.averageOperationTime
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-tire-400">Tempo Médio Query:</span>
                    <div className="text-tire-200 font-medium">
                      {formatDuration(auditResults.summary.averageQueryTime)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recomendações */}
              {auditResults.recommendations.length > 0 && (
                <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded">
                  <h5 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Recomendações:
                  </h5>
                  <ul className="space-y-1 text-sm text-yellow-300">
                    {auditResults.recommendations.map(
                      (rec: string, index: number) => (
                        <li key={index}>• {rec}</li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {/* Operações Lentas */}
              {auditResults.slowOperations.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-tire-200 font-medium">
                    Operações Lentas (Top 5):
                  </h5>
                  <div className="space-y-1">
                    {auditResults.slowOperations
                      .slice(0, 5)
                      .map((op: PerformanceMetric, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-factory-700/30 rounded border border-tire-600/20"
                        >
                          <div className="flex items-center gap-2">
                            {getPerformanceIcon(op.duration || 0)}
                            <span className="text-tire-200 text-sm">
                              {op.operation}
                            </span>
                          </div>
                          <div
                            className={`text-sm font-medium ${getPerformanceColor(op.duration || 0)}`}
                          >
                            {formatDuration(op.duration || 0)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Queries Lentas */}
              {auditResults.slowQueries.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-tire-200 font-medium">
                    Queries Lentas (Top 5):
                  </h5>
                  <div className="space-y-1">
                    {auditResults.slowQueries
                      .slice(0, 5)
                      .map((query: QueryAnalysis, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-factory-700/30 rounded border border-tire-600/20"
                        >
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-purple-400" />
                            <span className="text-tire-200 text-sm">
                              {query.table}.{query.operation}
                            </span>
                            {query.rowCount && (
                              <Badge
                                variant="outline"
                                className="text-xs border-tire-600 text-tire-400"
                              >
                                {query.rowCount} rows
                              </Badge>
                            )}
                          </div>
                          <div
                            className={`text-sm font-medium ${getPerformanceColor(query.duration)}`}
                          >
                            {formatDuration(query.duration)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instruções */}
          <div className="p-3 bg-factory-700/20 rounded border border-tire-600/20">
            <h4 className="text-tire-200 font-medium mb-2">Como Usar:</h4>
            <ul className="text-sm text-tire-300 space-y-1">
              <li>
                • <strong>Executar Auditoria:</strong> Analisa performance
                completa do sistema
              </li>
              <li>
                • <strong>Métricas em Tempo Real:</strong> Atualizam
                automaticamente a cada 5s
              </li>
              <li>
                • <strong>Pausar/Ativar:</strong> Controla se o auditor está
                coletando dados
              </li>
              <li>
                • <strong>Cores:</strong> Verde (&lt;1s), Amarelo (1-3s),
                Vermelho (&gt;3s)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceAuditDebug;
