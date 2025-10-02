import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Undo2,
  Redo2,
  RefreshCw,
  Clock,
  Database,
  AlertCircle,
  CheckCircle,
  Trash2,
  Eye,
  ArrowLeft,
  ArrowRight,
  Activity,
  User,
  Calendar,
  FileText,
  Settings,
} from "lucide-react";
import { changeHistoryManager, ChangeHistoryEntry, HistorySnapshot } from "../../utils/changeHistoryManager";
import { useToast } from "@/components/ui/use-toast";

interface ChangeHistoryTabProps {
  onRefresh?: () => void;
}

const ChangeHistoryTab: React.FC<ChangeHistoryTabProps> = ({ onRefresh }) => {
  const { toast } = useToast();
  
  // Estados principais
  const [historyEntries, setHistoryEntries] = useState<HistorySnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isRedoing, setIsRedoing] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  
  // Estados para estatísticas
  const [historyStats, setHistoryStats] = useState({
    totalEntries: 0,
    currentPosition: 0,
    canUndo: false,
    canRedo: false,
    undoCount: 0,
    redoCount: 0
  });

  // Estados para visualização detalhada
  const [selectedEntry, setSelectedEntry] = useState<ChangeHistoryEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Carregar histórico ao montar o componente
  useEffect(() => {
    loadHistory();
    updateStats();
  }, []);

  // Carregar histórico de alterações
  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const history = await changeHistoryManager.getHistoryForDisplay(50);
      setHistoryEntries(history);
      console.log('✅ [ChangeHistoryTab] Histórico carregado:', history.length, 'entradas');
    } catch (error) {
      console.error('❌ [ChangeHistoryTab] Erro ao carregar histórico:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de alterações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar estatísticas
  const updateStats = () => {
    const stats = changeHistoryManager.getHistoryStats();
    setHistoryStats(stats);
  };

  // Desfazer última alteração
  const handleUndo = async () => {
    if (!historyStats.canUndo) {
      toast({
        title: "Não é possível desfazer",
        description: "Não há alterações para desfazer.",
        variant: "destructive",
      });
      return;
    }

    setIsUndoing(true);
    try {
      const success = await changeHistoryManager.undo();
      
      if (success) {
        toast({
          title: "Alteração desfeita",
          description: "A última alteração foi desfeita com sucesso.",
        });
        
        // Recarregar dados
        await loadHistory();
        updateStats();
        onRefresh?.();
      } else {
        toast({
          title: "Erro ao desfazer",
          description: "Não foi possível desfazer a alteração.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ [ChangeHistoryTab] Erro ao desfazer:', error);
      toast({
        title: "Erro ao desfazer",
        description: "Ocorreu um erro ao desfazer a alteração.",
        variant: "destructive",
      });
    } finally {
      setIsUndoing(false);
    }
  };

  // Refazer próxima alteração
  const handleRedo = async () => {
    if (!historyStats.canRedo) {
      toast({
        title: "Não é possível refazer",
        description: "Não há alterações para refazer.",
        variant: "destructive",
      });
      return;
    }

    setIsRedoing(true);
    try {
      const success = await changeHistoryManager.redo();
      
      if (success) {
        toast({
          title: "Alteração refeita",
          description: "A alteração foi refeita com sucesso.",
        });
        
        // Recarregar dados
        await loadHistory();
        updateStats();
        onRefresh?.();
      } else {
        toast({
          title: "Erro ao refazer",
          description: "Não foi possível refazer a alteração.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ [ChangeHistoryTab] Erro ao refazer:', error);
      toast({
        title: "Erro ao refazer",
        description: "Ocorreu um erro ao refazer a alteração.",
        variant: "destructive",
      });
    } finally {
      setIsRedoing(false);
    }
  };

  // Limpar histórico antigo
  const handleClearOldHistory = async () => {
    const confirmClear = window.confirm(
      'Tem certeza que deseja limpar o histórico antigo?\n\n' +
      'Esta ação irá remover todas as alterações com mais de 30 dias e não pode ser desfeita.'
    );

    if (!confirmClear) return;

    setIsClearingHistory(true);
    try {
      await changeHistoryManager.clearOldHistory(30);
      
      toast({
        title: "Histórico limpo",
        description: "O histórico antigo foi removido com sucesso.",
      });
      
      await loadHistory();
      updateStats();
    } catch (error) {
      console.error('❌ [ChangeHistoryTab] Erro ao limpar histórico:', error);
      toast({
        title: "Erro ao limpar histórico",
        description: "Não foi possível limpar o histórico antigo.",
        variant: "destructive",
      });
    } finally {
      setIsClearingHistory(false);
    }
  };

  // Visualizar detalhes de uma entrada
  const handleViewDetails = (entry: ChangeHistoryEntry) => {
    setSelectedEntry(entry);
    setShowDetails(true);
  };

  // Formatar tipo de operação
  const formatOperationType = (type: string) => {
    switch (type) {
      case 'CREATE': return 'Criação';
      case 'UPDATE': return 'Atualização';
      case 'DELETE': return 'Exclusão';
      default: return type;
    }
  };

  // Obter cor da operação
  const getOperationColor = (type: string) => {
    switch (type) {
      case 'CREATE': return 'bg-green-600';
      case 'UPDATE': return 'bg-blue-600';
      case 'DELETE': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  // Formatar nome da tabela
  const formatTableName = (tableName: string) => {
    const tableNames: { [key: string]: string } = {
      'clients': 'Clientes',
      'products': 'Produtos',
      'services': 'Serviços',
      'transactions': 'Transações',
      'tire_inventory': 'Estoque de Pneus',
      'service_items': 'Itens de Serviço',
      'system_settings': 'Configurações',
      'cash_flow': 'Fluxo de Caixa',
      'expenses': 'Despesas',
      'debts': 'Dívidas',
      'stock_items': 'Estoque',
      'production_entries': 'Produção',
      'raw_materials': 'Matérias-Primas',
    };
    
    return tableNames[tableName] || tableName;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com estatísticas */}
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-neon-blue" />
            Estatísticas do Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-neon-blue">{historyStats.totalEntries}</p>
              <p className="text-tire-400 text-sm">Total de Alterações</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-neon-green">{historyStats.undoCount}</p>
              <p className="text-tire-400 text-sm">Podem ser Desfeitas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-neon-orange">{historyStats.redoCount}</p>
              <p className="text-tire-400 text-sm">Podem ser Refeitas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-tire-200">{historyStats.currentPosition + 1}</p>
              <p className="text-tire-400 text-sm">Posição Atual</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controles principais */}
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 flex items-center">
            <Settings className="h-5 w-5 mr-2 text-neon-green" />
            Controles de Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Botão Desfazer */}
            <Button
              onClick={handleUndo}
              disabled={!historyStats.canUndo || isUndoing}
              className="bg-neon-blue hover:bg-neon-blue/80 text-black"
            >
              {isUndoing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4 mr-2" />
              )}
              Desfazer
            </Button>

            {/* Botão Refazer */}
            <Button
              onClick={handleRedo}
              disabled={!historyStats.canRedo || isRedoing}
              className="bg-neon-green hover:bg-neon-green/80 text-black"
            >
              {isRedoing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Redo2 className="h-4 w-4 mr-2" />
              )}
              Refazer
            </Button>

            {/* Botão Recarregar */}
            <Button
              onClick={loadHistory}
              disabled={isLoading}
              variant="outline"
              className="border-tire-600/30 text-tire-200 hover:bg-factory-700/50"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Recarregar
            </Button>

            {/* Botão Limpar Histórico */}
            <Button
              onClick={handleClearOldHistory}
              disabled={isClearingHistory}
              variant="outline"
              className="border-red-600/30 text-red-400 hover:bg-red-600/10"
            >
              {isClearingHistory ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Limpar Antigo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista do histórico */}
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-tire-200 flex items-center">
            <History className="h-5 w-5 mr-2 text-neon-purple" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-neon-blue mr-2" />
              <span className="text-tire-300">Carregando histórico...</span>
            </div>
          ) : historyEntries.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-tire-400 mx-auto mb-4" />
              <p className="text-tire-300">Nenhuma alteração encontrada</p>
              <p className="text-tire-400 text-sm">
                O histórico será criado automaticamente conforme você usar o sistema.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyEntries.map((snapshot, index) => {
                const entry = snapshot.changes[0]; // Primeira (e única) alteração do snapshot
                return (
                  <Card
                    key={snapshot.id}
                    className={`bg-factory-700/50 border-tire-600/30 hover:bg-factory-700/70 transition-all duration-200 ${
                      snapshot.canUndo ? 'border-l-4 border-l-neon-green' : 'border-l-4 border-l-tire-600'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`text-xs ${getOperationColor(entry.operation_type)}`}>
                              {formatOperationType(entry.operation_type)}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-tire-600/30">
                              {formatTableName(entry.table_name)}
                            </Badge>
                            {snapshot.canUndo && (
                              <Badge className="text-xs bg-neon-green/20 text-neon-green">
                                Pode Desfazer
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-tire-200 text-sm mb-2">{entry.description}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-tire-400">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(snapshot.timestamp).toLocaleString('pt-BR')}
                            </div>
                            <div className="flex items-center">
                              <Database className="h-3 w-3 mr-1" />
                              ID: {entry.record_id}
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <Button
                            onClick={() => handleViewDetails(entry)}
                            size="sm"
                            variant="outline"
                            className="border-neon-blue/30 text-tire-200 hover:bg-neon-blue/10"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalhes */}
      {showDetails && selectedEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-factory-800 border-tire-600/30 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-tire-200 flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-neon-blue" />
                  Detalhes da Alteração
                </div>
                <Button
                  onClick={() => setShowDetails(false)}
                  size="sm"
                  variant="outline"
                  className="border-tire-600/30"
                >
                  ✕
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-tire-400 text-sm">Operação</p>
                  <Badge className={`${getOperationColor(selectedEntry.operation_type)}`}>
                    {formatOperationType(selectedEntry.operation_type)}
                  </Badge>
                </div>
                <div>
                  <p className="text-tire-400 text-sm">Tabela</p>
                  <p className="text-tire-200">{formatTableName(selectedEntry.table_name)}</p>
                </div>
                <div>
                  <p className="text-tire-400 text-sm">ID do Registro</p>
                  <p className="text-tire-200 font-mono text-sm">{selectedEntry.record_id}</p>
                </div>
                <div>
                  <p className="text-tire-400 text-sm">Data/Hora</p>
                  <p className="text-tire-200">{new Date(selectedEntry.timestamp).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div>
                <p className="text-tire-400 text-sm mb-2">Descrição</p>
                <p className="text-tire-200 bg-factory-700/50 p-3 rounded">{selectedEntry.description}</p>
              </div>

              {selectedEntry.old_data && (
                <div>
                  <p className="text-tire-400 text-sm mb-2">Dados Anteriores</p>
                  <pre className="text-tire-200 bg-factory-700/50 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedEntry.old_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntry.new_data && (
                <div>
                  <p className="text-tire-400 text-sm mb-2">Dados Novos</p>
                  <pre className="text-tire-200 bg-factory-700/50 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedEntry.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChangeHistoryTab;
