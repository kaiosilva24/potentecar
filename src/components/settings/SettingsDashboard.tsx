
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  DollarSign,
  Calculator,
  Save,
  RefreshCw,
  Package,
  Factory,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  History,
  Clock,
  Undo2,
  Download,
  Upload,
  Database,
  FileText,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { dataManager } from "../../utils/dataManager";
import { useAuth } from "../../../supabase/auth";
import { useToast } from "@/components/ui/use-toast";

interface SettingsDashboardProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

const SettingsDashboard = ({
  onRefresh = () => {},
  isLoading = false,
}: SettingsDashboardProps) => {
  // Auth e Toast hooks
  const { signUp } = useAuth();
  const { toast } = useToast();

  // Estados para exportar/importar
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Estados para gerenciamento de usuários
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Estados para histórico de lucro presumido
  const [baselineHistory, setBaselineHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isRestoringBaseline, setIsRestoringBaseline] = useState(false);

  // Estados de loading para cada seção
  const [loadingStates, setLoadingStates] = useState({
    cost: false,
    history: false,
  });

  // Estados de status de salvamento
  const [saveStatus, setSaveStatus] = useState<{
    cost: 'idle' | 'saving' | 'success' | 'error';
    history: 'idle' | 'saving' | 'success' | 'error';
  }>({
    cost: 'idle',
    history: 'idle',
  });

  // Estado para valor empresarial
  const [businessValue, setBusinessValue] = useState<number>(0);
  const [isLoadingBusinessValue, setIsLoadingBusinessValue] = useState(true);
  
  // Estado para lucro empresarial
  const [businessProfit, setBusinessProfit] = useState<number>(0);
  const [isLoadingBusinessProfit, setIsLoadingBusinessProfit] = useState(true);
  
  // Estados para baseline do valor empresarial
  const [businessValueBaseline, setBusinessValueBaseline] = useState<number | null>(null);
  const [isConfirmingBalance, setIsConfirmingBalance] = useState(false);
  const [isDeactivatingBaseline, setIsDeactivatingBaseline] = useState(false);
  const [hasBaseline, setHasBaseline] = useState(false);

  // Estados para configurações de custo e estoque
  const [costConfig, setCostConfig] = useState({
    averageTireCost: 0,
    includeLaborCosts: false,
    laborCostPercentage: 0,
    laborCostPerHour: 0,
    electricityCostPerKwh: 0,
    maintenanceCostPercentage: 0,
    profitMargin: 0,
  });

  const [stockConfig, setStockConfig] = useState({
    minStockLevel: 0,
    maxStockLevel: 0,
    reorderPoint: 0,
    safetyStock: 0,
    autoReorder: false,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Carregar configurações iniciais
  useEffect(() => {
    loadInitialSettings();
    loadBusinessValue();
    loadBusinessProfit();
    loadBusinessValueBaseline();
    loadBaselineHistory(); // Carregar histórico
  }, []);

  // Carregar valor empresarial
  const loadBusinessValue = async () => {
    setIsLoadingBusinessValue(true);
    try {
      const value = await dataManager.loadBusinessValue();
      setBusinessValue(value);
    } catch (error) {
      console.error('❌ [SettingsDashboard] Erro ao carregar valor empresarial:', error);
    } finally {
      setIsLoadingBusinessValue(false);
    }
  };

  // Carregar baseline do valor empresarial
  const loadBusinessValueBaseline = async () => {
    try {
      const baseline = await dataManager.loadBusinessValueBaseline();
      setBusinessValueBaseline(baseline);
      setHasBaseline(baseline !== null);
      console.log('📊 [SettingsDashboard] Baseline carregado:', baseline);
    } catch (error) {
      console.error('❌ [SettingsDashboard] Erro ao carregar baseline:', error);
    }
  };

  // Carregar lucro empresarial (baseado no baseline)
  const loadBusinessProfit = async () => {
    setIsLoadingBusinessProfit(true);
    try {
      // Usar a nova função de cálculo baseada no baseline
      const profit = await dataManager.calculateBusinessProfit();
      setBusinessProfit(profit);
      console.log('💰 [SettingsDashboard] Lucro empresarial calculado:', profit);
    } catch (error) {
      console.error('❌ [SettingsDashboard] Erro ao carregar lucro empresarial:', error);
    } finally {
      setIsLoadingBusinessProfit(false);
    }
  };

  // Função para confirmar balanço empresarial
  const handleConfirmBalance = async () => {
    setIsConfirmingBalance(true);
    try {
      const success = await dataManager.confirmBusinessBalance();
      if (success) {
        console.log('✅ [SettingsDashboard] Balanço confirmado com sucesso!');
        // Recarregar dados após confirmação - IMPORTANTE: aguardar o carregamento
        await loadBusinessValueBaseline();
        await loadBusinessProfit();
        await loadBusinessValue(); // Recarregar valor empresarial também
        // Mostrar feedback visual de sucesso
        alert('Balanço Empresarial confirmado com sucesso!\nO lucro empresarial agora será calculado baseado neste valor.');
      } else {
        alert('Erro ao confirmar balanço empresarial. Tente novamente.');
      }
    } catch (error) {
      console.error('❌ [SettingsDashboard] Erro ao confirmar balanço:', error);
      alert('Erro ao confirmar balanço empresarial. Tente novamente.');
    } finally {
      setIsConfirmingBalance(false);
    }
  };

  // Função para desativar baseline
  const handleDeactivateBaseline = async () => {
    const confirmDeactivation = window.confirm(
      'Tem certeza que deseja desativar o baseline?\n\nEsta ação irá remover o baseline atual e o sistema de lucro empresarial voltará ao estado inicial (R$ 0,00).'
    );

    // Se o usuário cancelar, não fazer nada
    if (!confirmDeactivation) {
      console.log('🚫 [SettingsDashboard] Desativação de baseline cancelada pelo usuário');
      return;
    }

    setIsDeactivatingBaseline(true);
    try {
      const success = await dataManager.deactivateBaseline();
      if (success) {
        // Resetar explicitamente o status do baseline
        setHasBaseline(false);
        setBusinessValueBaseline(null);
        
        // Recarregar dados para garantir sincronização
        await loadBusinessValueBaseline();
        await loadBusinessProfit();
        await loadBusinessValue();
        
        console.log('✅ [SettingsDashboard] Status resetado - hasBaseline:', false);
        alert('Baseline desativado com sucesso! Status voltou para "Não confirmado".');
      } else {
        alert('Erro ao desativar baseline.');
      }
    } finally {
      setIsDeactivatingBaseline(false);
    }
  };

  const loadInitialSettings = async () => {
    setLoadingStates({
      cost: true,
      history: true,
    });

    try {
      // Carregar configurações de custo
      const averageTireCost = await dataManager.loadAverageTireCost();
      setCostConfig(prev => ({
        ...prev,
        averageTireCost: averageTireCost,
      }));

      console.log('✅ [SettingsDashboard] Configurações carregadas:', {
        averageTireCost
      });

    } catch (error) {
      console.error('❌ [SettingsDashboard] Erro ao carregar configurações:', error);
    } finally {
      setLoadingStates({
        cost: false,
        history: false,
      });
    }
  };

  // Effect para sincronização em tempo real do valor empresarial
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeBusinessValueSync = async () => {
      try {
        // Configurar subscription em tempo real
        unsubscribe = dataManager.subscribeToBusinessValueChanges((newValue) => {
          setBusinessValue(newValue);
          console.log('🔄 [SettingsDashboard] Valor empresarial atualizado em tempo real:', newValue);
        });

      } catch (error) {
        console.error('❌ [SettingsDashboard] Erro ao configurar sincronização do valor empresarial:', error);
      }
    };

    initializeBusinessValueSync();

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Effect para sincronização em tempo real do lucro empresarial
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeBusinessProfitSync = async () => {
      try {
        // Configurar subscription em tempo real
        unsubscribe = dataManager.subscribeToBusinessProfitChanges((newProfit) => {
          setBusinessProfit(newProfit);
          console.log('🔄 [SettingsDashboard] Lucro empresarial atualizado em tempo real:', newProfit);
        });

      } catch (error) {
        console.error('❌ [SettingsDashboard] Erro ao configurar sincronização do lucro empresarial:', error);
      }
    };

    initializeBusinessProfitSync();

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Effect para recalcular lucro quando valor empresarial mudar
  useEffect(() => {
    const recalculateProfit = async () => {
      if (hasBaseline && businessValue !== null) {
        console.log('🔄 [SettingsDashboard] Recalculando lucro devido a mudança no valor empresarial...');
        await loadBusinessProfit();
      }
    };

    recalculateProfit();
  }, [businessValue, hasBaseline]);

  // Salvar configurações de custo
  const saveCostConfig = async () => {
    setSaveStatus(prev => ({ ...prev, cost: 'saving' }));

    try {
      // Salvar custo médio por pneu
      await dataManager.saveAverageTireCost(costConfig.averageTireCost);

      // Salvar outras configurações de custo
      const configData = {
        labor_cost_per_hour: costConfig.laborCostPerHour,
        electricity_cost_per_kwh: costConfig.electricityCostPerKwh,
        maintenance_cost_percentage: costConfig.maintenanceCostPercentage,
      };

      for (const [key, value] of Object.entries(configData)) {
        await dataManager.saveSystemSetting(key, value);
      }

      setSaveStatus(prev => ({ ...prev, cost: 'success' }));

      console.log('✅ [SettingsDashboard] Configurações de custo salvas com sucesso');
      
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, cost: 'idle' }));
      }, 3000);

    } catch (error) {
      console.error('❌ [SettingsDashboard] Erro ao salvar configurações de custo:', error);
      setSaveStatus(prev => ({ ...prev, cost: 'error' }));
      
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, cost: 'idle' }));
      }, 5000);
    }
  };

  // Salvar configurações de estoque
  const saveStockConfig = async () => {
    setSaveStatus(prev => ({ ...prev, stock: 'saving' }));

    try {
      const configData = {
        min_stock_level: stockConfig.minStockLevel,
        max_stock_level: stockConfig.maxStockLevel,
        reorder_point: stockConfig.reorderPoint,
        safety_stock: stockConfig.safetyStock,
      };

      for (const [key, value] of Object.entries(configData)) {
        await dataManager.saveSystemSetting(key, value);
      }

      setSaveStatus(prev => ({ ...prev, stock: 'success' }));

      console.log('✅ [SettingsDashboard] Configurações de estoque salvas com sucesso');
      
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, stock: 'idle' }));
      }, 3000);

    } catch (error) {
      console.error('❌ [SettingsDashboard] Erro ao salvar configurações de estoque:', error);
      setSaveStatus(prev => ({ ...prev, stock: 'error' }));
      
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, stock: 'idle' }));
      }, 5000);
    }
  };

  // Função para carregar histórico de baseline
  const loadBaselineHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await dataManager.loadBaselineHistory();
      setBaselineHistory(history);
      console.log('✅ [SettingsDashboard] Histórico carregado:', history);
    } catch (error) {
      console.error('❌ [SettingsDashboard] Erro ao carregar histórico:', error);
      alert('Erro ao carregar histórico.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Função para exportar base de dados
  const handleExportDatabase = async () => {
    setIsExporting(true);
    try {
      console.log('🔄 [SettingsDashboard] Iniciando exportação...');
      const exportData = await dataManager.exportDatabase();
      
      if (exportData) {
        // Cria arquivo para download
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = dataManager.generateBackupFileName();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('✅ Backup exportado com sucesso!');
        console.log('✅ [SettingsDashboard] Exportação concluída');
      } else {
        alert('❌ Erro ao exportar backup.');
      }
    } catch (error) {
      console.error('❌ [SettingsDashboard] Erro na exportação:', error);
      alert('❌ Erro ao exportar backup.');
    } finally {
      setIsExporting(false);
    }
  };

  // Função para importar base de dados
  const handleImportDatabase = async () => {
    if (!importFile) {
      alert('Selecione um arquivo de backup primeiro.');
      return;
    }

    const confirmImport = window.confirm(
      '⚠️ ATENÇÃO: Esta operação irá SUBSTITUIR TODOS os dados atuais do sistema pelos dados do backup.\n\n' +
      'Recomendamos fazer um backup atual antes de continuar.\n\n' +
      'Tem certeza que deseja continuar?'
    );

    if (!confirmImport) {
      console.log('Importação cancelada pelo usuário');
      return;
    }

    setIsImporting(true);
    try {
      console.log('🔄 [SettingsDashboard] Iniciando importação...');
      
      const fileContent = await importFile.text();
      const success = await dataManager.importDatabase(fileContent);
      
      if (success) {
        alert('✅ Backup importado com sucesso! Recarregue a página para ver as mudanças.');
        console.log('✅ [SettingsDashboard] Importação concluída');
        
        // Recarrega dados
        await loadInitialSettings();
        onRefresh();
      } else {
        alert('❌ Erro ao importar backup. Verifique o arquivo e tente novamente.');
      }
    } catch (error) {
      console.error('❌ [SettingsDashboard] Erro na importação:', error);
      alert('❌ Erro ao processar arquivo de backup.');
    } finally {
      setIsImporting(false);
      setImportFile(null);
    }
  };

  // Função para lidar com seleção de arquivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setImportFile(file);
      } else {
        alert('Por favor, selecione um arquivo JSON válido.');
        event.target.value = '';
      }
    }
  };

  // Função para restaurar baseline do histórico
  const handleRestoreBaseline = async (historyKey: string) => {
    const confirmRestore = window.confirm(
      'Tem certeza que deseja restaurar este baseline?\n\nEsta ação irá substituir o baseline atual e recalcular o lucro empresarial.'
    );

    if (!confirmRestore) {
      console.log('🚫 [SettingsDashboard] Restauração de baseline cancelada pelo usuário');
      return;
    }

    setIsRestoringBaseline(true);
    try {
      const success = await dataManager.restoreBaseline(historyKey);
      if (success) {
        // Recarregar dados após restauração
        await loadBusinessValueBaseline();
        await loadBusinessProfit();
        await loadBusinessValue();
        await loadBaselineHistory(); // Recarregar histórico
        
        alert('Baseline restaurado com sucesso!');
      } else {
        alert('Erro ao restaurar baseline.');
      }
    } catch (error) {
      console.error('❌ [SettingsDashboard] Erro ao restaurar baseline:', error);
      alert('Erro ao restaurar baseline.');
    } finally {
      setIsRestoringBaseline(false);
    }
  };

  // Função para criar novo usuário (apenas para administradores)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail || !newUserPassword || !newUserFullName) {
      toast({
        title: "Erro de validação",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingUser(true);
    try {
      await signUp(newUserEmail, newUserPassword, newUserFullName);
      
      toast({
        title: "Usuário criado com sucesso!",
        description: `O usuário ${newUserFullName} foi cadastrado no sistema.`,
        duration: 5000,
      });

      // Limpar formulário
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserFullName("");
      
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      toast({
        title: "Erro ao criar usuário",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Componente de status de salvamento
  const SaveStatus = ({ status }: { status: string }) => {
    switch (status) {
      case 'saving':
        return (
          <Badge variant="secondary" className="ml-2">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Salvando...
          </Badge>
        );
      case 'success':
        return (
          <Badge variant="default" className="ml-2 bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Salvo!
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="ml-2">
            <AlertCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto px-4">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue flex items-center justify-center">
            <Settings className="h-4 w-4 text-white" />
          </div>
          Configurações do Sistema
        </h2>
        <p className="text-tire-300 mt-2">
          Gerencie todas as configurações do sistema de gestão empresarial
        </p>
      </div>

      <Tabs defaultValue="backup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-factory-800/50 border border-tire-600/30">
          <TabsTrigger 
            value="backup" 
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20"
          >
            <Database className="h-4 w-4 mr-2" />
            Exportar/Importar
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20"
          >
            <Users className="h-4 w-4 mr-2" />
            Gerenciar Usuários
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20"
          >
            <History className="h-4 w-4 mr-2" />
            Histórico Lucro Presumido
          </TabsTrigger>
          <TabsTrigger 
            value="business" 
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-blue/20"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Lucro Empresarial
          </TabsTrigger>
        </TabsList>

        {/* Tab de Exportar/Importar */}
        <TabsContent value="backup">
          <Card className="bg-factory-800/50 border-tire-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-tire-200 flex items-center">
                <Database className="h-5 w-5 mr-2 text-neon-blue" />
                Backup e Restauração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="mb-4">
                <p className="text-tire-300 text-sm">
                  Faça backup completo da base de dados ou restaure dados de um backup anterior. 
                  Recomendamos fazer backups regulares antes de atualizações do sistema.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card de Exportação */}
                <Card className="bg-factory-800/50 border-tire-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="text-tire-200 flex items-center text-lg">
                      <Download className="h-5 w-5 mr-2 text-neon-green" />
                      Exportar Dados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-tire-300 text-sm">
                        Baixe um backup completo de todos os dados do sistema:
                      </p>
                      <ul className="text-tire-400 text-xs space-y-1 ml-4">
                        <li>• Clientes e fornecedores</li>
                        <li>• Produtos e matérias-primas</li>
                        <li>• Transações e vendas</li>
                        <li>• Estoque e inventário</li>
                        <li>• Configurações do sistema</li>
                        <li>• Histórico de lucro presumido</li>
                      </ul>
                    </div>
                    
                    <div className="pt-4">
                      <Button
                        onClick={handleExportDatabase}
                        disabled={isExporting}
                        className="w-full bg-neon-green hover:bg-neon-green/80 text-black"
                      >
                        {isExporting ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Exportando...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Exportar Base de Dados
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Card de Importação */}
                <Card className="bg-factory-800/50 border-tire-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="text-tire-200 flex items-center text-lg">
                      <Upload className="h-5 w-5 mr-2 text-neon-orange" />
                      Importar Dados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-tire-300 text-sm">
                        Restaure dados de um backup anterior:
                      </p>
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-red-400" />
                          <p className="text-red-300 text-xs font-medium">
                            ATENÇÃO: Esta operação substitui TODOS os dados atuais!
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-tire-300 text-sm">Selecionar Arquivo de Backup</Label>
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleFileSelect}
                          className="w-full text-sm text-tire-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-neon-blue file:text-white hover:file:bg-neon-blue/80 file:cursor-pointer cursor-pointer"
                        />
                        {importFile && (
                          <p className="text-neon-green text-xs flex items-center">
                            <FileText className="h-3 w-3 mr-1" />
                            Arquivo selecionado: {importFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <Button
                        onClick={handleImportDatabase}
                        disabled={isImporting || !importFile}
                        className="w-full bg-neon-orange hover:bg-neon-orange/80 text-black"
                      >
                        {isImporting ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Importando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Importar Base de Dados
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Informações Adicionais */}
              <Card className="bg-factory-700/30 border-tire-600/20">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <h4 className="text-tire-200 font-medium text-sm">Recomendações de Segurança</h4>
                      <ul className="text-tire-400 text-xs space-y-1">
                        <li>• Faça backups regulares, especialmente antes de atualizações</li>
                        <li>• Guarde os arquivos de backup em local seguro</li>
                        <li>• Teste a restauração em ambiente de desenvolvimento primeiro</li>
                        <li>• Sempre confirme os dados após uma importação</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Gerenciar Usuários */}
        <TabsContent value="users">
          <Card className="bg-factory-800/50 border-tire-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-tire-200 flex items-center">
                <Users className="h-5 w-5 mr-2 text-neon-blue" />
                Gerenciar Usuários do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="mb-4">
                <p className="text-tire-300 text-sm">
                  Esta área é restrita a administradores. Aqui você pode criar novos usuários para acessar o sistema de gestão.
                </p>
              </div>

              {/* Formulário de Criação de Usuário */}
              <Card className="bg-factory-800/50 border-tire-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader>
                  <CardTitle className="text-tire-200 flex items-center text-lg">
                    <UserPlus className="h-5 w-5 mr-2 text-neon-green" />
                    Criar Novo Usuário
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm font-medium text-tire-200">
                          Nome Completo
                        </Label>
                        <Input
                          id="fullName"
                          placeholder="Nome completo do usuário"
                          value={newUserFullName}
                          onChange={(e) => setNewUserFullName(e.target.value)}
                          required
                          disabled={isCreatingUser}
                          className="h-10 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 focus:border-neon-blue focus:ring-neon-blue/20"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-tire-200">
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@empresa.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          required
                          disabled={isCreatingUser}
                          className="h-10 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 focus:border-neon-blue focus:ring-neon-blue/20"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-tire-200">
                        Senha
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Senha do usuário (mínimo 6 caracteres)"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        required
                        disabled={isCreatingUser}
                        className="h-10 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 focus:border-neon-blue focus:ring-neon-blue/20"
                      />
                      <p className="text-xs text-tire-400">
                        A senha deve ter pelo menos 6 caracteres
                      </p>
                    </div>

                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={isCreatingUser}
                        className="w-full bg-neon-green hover:bg-neon-green/80 text-black font-medium"
                      >
                        {isCreatingUser ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Criando usuário...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Criar Usuário
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Informações de Segurança */}
              <Card className="bg-factory-700/30 border-tire-600/20">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-neon-blue mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <h4 className="text-tire-200 font-medium text-sm">Política de Segurança</h4>
                      <ul className="text-tire-400 text-xs space-y-1">
                        <li>• Apenas administradores podem criar novos usuários</li>
                        <li>• Todos os usuários criados terão acesso completo ao sistema</li>
                        <li>• Use emails corporativos válidos para facilitar comunicação</li>
                        <li>• Senhas devem ser seguras e únicas para cada usuário</li>
                        <li>• O usuário receberá confirmação por email após criação</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Histórico Lucro Presumido */}
        <TabsContent value="history">
          <Card className="bg-factory-800/50 border-tire-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-tire-200 flex items-center">
                <History className="h-5 w-5 mr-2 text-neon-green" />
                Histórico Lucro Presumido
                <SaveStatus status={saveStatus.history} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="mb-4">
                <p className="text-tire-300 text-sm">
                  Aqui você pode visualizar o histórico de baselines do lucro empresarial e restaurar estados anteriores caso necessário.
                </p>
              </div>

              {/* Botão para recarregar histórico */}
              <div className="flex justify-between items-center mb-4">
                <Button
                  onClick={loadBaselineHistory}
                  disabled={isLoadingHistory}
                  variant="outline"
                  className="border-tire-600/30 text-black hover:bg-factory-700/50 hover:text-black transition-all duration-200"
                >
                  {isLoadingHistory ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Recarregar Histórico
                </Button>
              </div>

              {/* Lista do histórico */}
              <div className="space-y-4">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-neon-blue mr-2" />
                    <span className="text-tire-300">Carregando histórico...</span>
                  </div>
                ) : baselineHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-tire-400 mx-auto mb-4" />
                    <p className="text-tire-300">Nenhum histórico encontrado</p>
                    <p className="text-tire-400 text-sm">
                      O histórico será criado automaticamente quando você confirmar, desativar ou redefinir baselines.
                    </p>
                  </div>
                ) : (
                  baselineHistory.map((entry, index) => (
                    <Card key={entry.key} className="bg-factory-700/50 border-tire-600/30 hover:bg-factory-700/70 transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge 
                                variant={entry.action === 'confirm' ? 'default' : entry.action === 'deactivate' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {entry.action === 'confirm' ? 'Confirmado' : 
                                 entry.action === 'deactivate' ? 'Desativado' : 
                                 'Redefinido'}
                              </Badge>
                              <span className="text-tire-400 text-xs">
                                {new Date(entry.timestamp || entry.created_at).toLocaleString('pt-BR')}
                              </span>
                            </div>
                            
                            <p className="text-tire-200 text-sm mb-2">{entry.description}</p>
                            
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <span className="text-tire-400">Baseline:</span>
                                <p className="text-neon-blue font-medium">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(entry.baseline_value)}
                                </p>
                              </div>
                              <div>
                                <span className="text-tire-400">Valor Empresarial:</span>
                                <p className="text-tire-200 font-medium">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(entry.business_value)}
                                </p>
                              </div>
                              <div>
                                <span className="text-tire-400">Lucro:</span>
                                <p className={`font-medium ${entry.profit_value >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(entry.profit_value)}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            <Button
                              onClick={() => handleRestoreBaseline(entry.key)}
                              disabled={isRestoringBaseline}
                              size="sm"
                              variant="outline"
                              className="border-neon-blue/30 text-black hover:bg-neon-blue/10 hover:text-black"
                            >
                              {isRestoringBaseline ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Undo2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Lucro Empresarial */}
        <TabsContent value="business">
          <Card className="bg-factory-800/50 border-tire-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-tire-200 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-neon-blue" />
                Valor Empresarial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card Valor Empresarial */}
                <Card className="bg-factory-800/50 border-tire-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-tire-300 text-sm font-medium">Valor Empresarial</p>
                        <p className="text-2xl font-bold text-neon-green">
                          {isLoadingBusinessValue ? (
                            <span className="animate-pulse">Carregando...</span>
                          ) : (
                            formatCurrency(businessValue)
                          )}
                        </p>
                        <p className="text-tire-400 text-xs">
                          Patrimônio total da empresa
                        </p>
                      </div>
                      <div className="p-3 rounded-full bg-neon-green/20">
                        <DollarSign className="h-6 w-6 text-neon-green" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Lucro Empresarial */}
                <Card className="bg-factory-800/50 border-tire-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-tire-300 text-sm font-medium">Lucro Empresarial</p>
                        <p className={`text-2xl font-bold ${businessProfit >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                          {isLoadingBusinessProfit ? (
                            <span className="animate-pulse">Carregando...</span>
                          ) : (
                            formatCurrency(businessProfit)
                          )}
                        </p>
                        <p className="text-tire-400 text-xs">
                          {hasBaseline ? 'Diferença do baseline ativo' : 'Baseline não ativado'}
                        </p>
                      </div>
                      <div className={`p-3 rounded-full ${businessProfit >= 0 ? 'bg-neon-green/20' : 'bg-red-400/20'}`}>
                        <TrendingUp className={`h-6 w-6 ${businessProfit >= 0 ? 'text-neon-green' : 'text-red-400'}`} />
                      </div>
                    </div>
                    
                    {/* Informações do Baseline */}
                    <div className="border-t border-tire-600/30 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-tire-400">
                          <p>Status do Balanço:</p>
                          <p className={`font-medium ${hasBaseline ? 'text-neon-green' : 'text-yellow-400'}`}>
                            {hasBaseline ? '✅ Confirmado' : '⏳ Não confirmado'}
                          </p>
                        </div>
                        {hasBaseline && businessValueBaseline !== null && (
                          <div className="text-xs text-tire-400 text-right">
                            <p>Baseline:</p>
                            <p className="font-medium text-tire-200">
                              {formatCurrency(businessValueBaseline)}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Botões de Ação */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Botão Confirmar Balanço */}
                        <Button
                          onClick={handleConfirmBalance}
                          disabled={isConfirmingBalance || isDeactivatingBaseline}
                          className={`${hasBaseline 
                            ? 'bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border-neon-cyan/30' 
                            : 'bg-neon-green/20 hover:bg-neon-green/30 text-neon-green border-neon-green/30'
                          } border transition-all duration-200`}
                          variant="outline"
                        >
                          {isConfirmingBalance ? (
                            <span className="flex items-center">
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Confirmando...
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {hasBaseline ? 'Redefinir Balanço' : 'Confirmar Balanço'}
                            </span>
                          )}
                        </Button>

                        {/* Botão Desativar Baseline */}
                        <Button
                          onClick={handleDeactivateBaseline}
                          disabled={!hasBaseline || isConfirmingBalance || isDeactivatingBaseline}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 disabled:bg-tire-600 disabled:text-tire-400 disabled:border-tire-600"
                        >
                          {isDeactivatingBaseline ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Desativando...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Desativar Baseline
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center text-tire-400 text-sm">
                <p>Estes valores são sincronizados automaticamente com o dashboard principal.</p>
                <p>Qualquer alteração será refletida em tempo real.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


    </div>
  );
};

export default SettingsDashboard;
