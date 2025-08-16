import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { dataManager, STORAGE_KEYS } from "@/utils/dataManager";

interface DataDiagnosticProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DataDiagnostic = ({
  isOpen = false,
  onOpenChange = () => {},
}: DataDiagnosticProps) => {
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    available: number;
    keys: string[];
  }>({ used: 0, available: 0, keys: [] });
  const [dataStatus, setDataStatus] = useState<Record<string, any>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = () => {
    setIsRefreshing(true);

    // Get storage info
    const info = dataManager.getStorageInfo();
    setStorageInfo(info);

    // Check each data type
    const status: Record<string, any> = {};
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      try {
        const data = localStorage.getItem(key);
        const backup = localStorage.getItem(`${key}_backup`);
        const timestamp = localStorage.getItem(`${key}_timestamp`);

        if (data) {
          const parsed = JSON.parse(data);
          status[name] = {
            exists: true,
            count: Array.isArray(parsed)
              ? parsed.length
              : Object.keys(parsed).length,
            size: data.length,
            hasBackup: !!backup,
            lastSaved: timestamp,
            isValid: true,
          };
        } else {
          status[name] = {
            exists: false,
            count: 0,
            size: 0,
            hasBackup: !!backup,
            lastSaved: null,
            isValid: false,
          };
        }
      } catch (error) {
        status[name] = {
          exists: true,
          count: 0,
          size: 0,
          hasBackup: false,
          lastSaved: null,
          isValid: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        };
      }
    });

    setDataStatus(status);

    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const exportData = () => {
    try {
      const allData = dataManager.exportAllData();
      const dataStr = JSON.stringify(allData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tire-factory-backup-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      console.log("✅ Dados exportados com sucesso");
    } catch (error) {
      console.error("❌ Erro ao exportar dados:", error);
    }
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        dataManager.importAllData(data);
        refreshData();
        console.log("✅ Dados importados com sucesso");
      } catch (error) {
        console.error("❌ Erro ao importar dados:", error);
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (
      confirm(
        "⚠️ Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita!",
      )
    ) {
      dataManager.clearAllData();
      refreshData();
      console.log("🗑️ Todos os dados foram limpos");
    }
  };

  const getStatusColor = (status: any) => {
    if (!status.exists) return "bg-gray-500";
    if (!status.isValid) return "bg-red-500";
    if (status.count === 0) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusIcon = (status: any) => {
    if (!status.exists) return <Info className="h-4 w-4" />;
    if (!status.isValid) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-factory-700 border-tire-600 text-white hover:bg-factory-600"
        >
          <Database className="h-4 w-4 mr-2" />
          Diagnóstico de Dados
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-factory-800 border-tire-600/30 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5" />
            Diagnóstico de Dados do Sistema
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Storage Overview */}
          <Card className="bg-factory-700/50 border-tire-600/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-tire-200 text-lg">
                Visão Geral do Armazenamento
              </CardTitle>
              <Button
                onClick={refreshData}
                disabled={isRefreshing}
                variant="ghost"
                size="sm"
                className="text-tire-300 hover:text-white"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-neon-blue">
                    {formatBytes(storageInfo.used)}
                  </p>
                  <p className="text-tire-400 text-sm">Usado</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-neon-green">
                    {formatBytes(storageInfo.available)}
                  </p>
                  <p className="text-tire-400 text-sm">Disponível</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-neon-purple">
                    {storageInfo.keys.length}
                  </p>
                  <p className="text-tire-400 text-sm">Chaves</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Status */}
          <Card className="bg-factory-700/50 border-tire-600/30">
            <CardHeader>
              <CardTitle className="text-tire-200 text-lg">
                Status dos Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(dataStatus).map(([name, status]) => (
                  <div
                    key={name}
                    className="p-4 bg-factory-600/30 rounded-lg border border-tire-600/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">
                        {name.replace("_", " ")}
                      </h4>
                      <div className="flex items-center gap-2">
                        {status.hasBackup && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-blue-900/20 text-blue-300 border-blue-600/30"
                          >
                            Backup
                          </Badge>
                        )}
                        <div
                          className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}
                        ></div>
                        {getStatusIcon(status)}
                      </div>
                    </div>
                    <div className="text-tire-400 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Itens:</span>
                        <span className="text-neon-green font-medium">
                          {status.count}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tamanho:</span>
                        <span>{formatBytes(status.size)}</span>
                      </div>
                      {status.lastSaved && (
                        <div className="flex justify-between">
                          <span>Último salvamento:</span>
                          <span className="text-xs">
                            {new Date(status.lastSaved).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      )}
                      {status.error && (
                        <div className="text-red-400 text-xs mt-2">
                          Erro: {status.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="bg-factory-700/50 border-tire-600/30">
            <CardHeader>
              <CardTitle className="text-tire-200 text-lg">Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={exportData}
                  className="bg-neon-blue hover:bg-neon-blue/80"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Dados
                </Button>

                <div className="relative">
                  <Button
                    className="bg-neon-green hover:bg-neon-green/80"
                    onClick={() =>
                      document.getElementById("import-file")?.click()
                    }
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Dados
                  </Button>
                  <input
                    id="import-file"
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                <Button
                  onClick={clearAllData}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Todos os Dados
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Console Logs Info */}
          <Card className="bg-factory-700/50 border-tire-600/30">
            <CardHeader>
              <CardTitle className="text-tire-200 text-lg">
                Informações de Debug
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-tire-300 text-sm space-y-2">
                <p>
                  • Abra o Console do Navegador (F12) para ver logs detalhados
                </p>
                <p>• Logs de salvamento aparecem com ✅</p>
                <p>• Logs de carregamento aparecem com 🔄</p>
                <p>• Erros aparecem com ❌</p>
                <p>
                  • Todos os dados são salvos automaticamente no localStorage
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataDiagnostic;
