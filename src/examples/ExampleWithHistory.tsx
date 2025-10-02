// Exemplo de como integrar o sistema de histórico em um componente
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { dataManagerWithHistory } from "../utils/dataManagerWithHistory";
import FloatingHistoryControls from "../components/common/FloatingHistoryControls";
import useChangeHistory from "../hooks/useChangeHistory";

// Exemplo: Componente de gerenciamento de clientes com histórico
const ClientManagerWithHistory: React.FC = () => {
  const { toast } = useToast();
  const { loadHistory } = useChangeHistory();
  
  const [clients, setClients] = useState<any[]>([]);
  const [newClientName, setNewClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Carregar clientes
  const loadClients = async () => {
    try {
      const clientsData = await dataManagerWithHistory.loadClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  // Adicionar cliente COM histórico
  const handleAddClient = async () => {
    if (!newClientName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do cliente.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const newClient = {
        name: newClientName.trim(),
        created_at: new Date().toISOString(),
      };

      // Usar o dataManagerWithHistory que registra automaticamente no histórico
      const savedClient = await dataManagerWithHistory.saveClient(
        newClient,
        `Cliente adicionado: ${newClientName}` // Descrição personalizada
      );

      if (savedClient) {
        toast({
          title: "Cliente adicionado",
          description: `${newClientName} foi adicionado com sucesso.`,
        });

        setNewClientName('');
        await loadClients(); // Recarregar lista
      }
    } catch (error) {
      console.error('Erro ao adicionar cliente:', error);
      toast({
        title: "Erro ao adicionar cliente",
        description: "Não foi possível adicionar o cliente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Excluir cliente COM histórico
  const handleDeleteClient = async (client: any) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir o cliente "${client.name}"?`
    );

    if (!confirmDelete) return;

    try {
      const success = await dataManagerWithHistory.deleteClient(
        client.id,
        `Cliente excluído: ${client.name}` // Descrição personalizada
      );

      if (success) {
        toast({
          title: "Cliente excluído",
          description: `${client.name} foi excluído com sucesso.`,
        });

        await loadClients(); // Recarregar lista
      }
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast({
        title: "Erro ao excluir cliente",
        description: "Não foi possível excluir o cliente.",
        variant: "destructive",
      });
    }
  };

  // Atualizar cliente COM histórico
  const handleUpdateClient = async (client: any, newName: string) => {
    if (!newName.trim()) return;

    try {
      const updatedClient = {
        ...client,
        name: newName.trim(),
        updated_at: new Date().toISOString(),
      };

      const savedClient = await dataManagerWithHistory.saveClient(
        updatedClient,
        `Cliente atualizado: ${client.name} → ${newName}` // Descrição personalizada
      );

      if (savedClient) {
        toast({
          title: "Cliente atualizado",
          description: `Nome alterado para ${newName}.`,
        });

        await loadClients(); // Recarregar lista
      }
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast({
        title: "Erro ao atualizar cliente",
        description: "Não foi possível atualizar o cliente.",
        variant: "destructive",
      });
    }
  };

  // Função para refresh após desfazer/refazer
  const handleHistoryRefresh = async () => {
    await loadClients();
    await loadHistory();
    
    toast({
      title: "Dados atualizados",
      description: "Os dados foram sincronizados após a operação de histórico.",
    });
  };

  // Carregar dados iniciais
  React.useEffect(() => {
    loadClients();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Clientes (com Histórico)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulário para adicionar cliente */}
          <div className="flex space-x-2">
            <Input
              placeholder="Nome do cliente"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddClient()}
            />
            <Button 
              onClick={handleAddClient}
              disabled={isLoading}
            >
              {isLoading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>

          {/* Lista de clientes */}
          <div className="space-y-2">
            {clients.map((client) => (
              <div key={client.id} className="flex items-center justify-between p-3 border rounded">
                <span>{client.name}</span>
                <div className="space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newName = prompt('Novo nome:', client.name);
                      if (newName && newName !== client.name) {
                        handleUpdateClient(client, newName);
                      }
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteClient(client)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {clients.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              Nenhum cliente cadastrado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Controles flutuantes de histórico */}
      <FloatingHistoryControls 
        onRefresh={handleHistoryRefresh}
        position="bottom-right"
      />
    </div>
  );
};

export default ClientManagerWithHistory;

/*
INSTRUÇÕES PARA INTEGRAR O SISTEMA DE HISTÓRICO EM OUTROS COMPONENTES:

1. IMPORTAR AS DEPENDÊNCIAS:
   ```typescript
   import { dataManagerWithHistory } from "../utils/dataManagerWithHistory";
   import FloatingHistoryControls from "../components/common/FloatingHistoryControls";
   import useChangeHistory from "../hooks/useChangeHistory";
   ```

2. SUBSTITUIR dataManager POR dataManagerWithHistory:
   ```typescript
   // Antes:
   await dataManager.saveToDatabase('clients', clientData);
   
   // Depois:
   await dataManagerWithHistory.saveClient(clientData, 'Descrição da alteração');
   ```

3. ADICIONAR CONTROLES FLUTUANTES (OPCIONAL):
   ```jsx
   <FloatingHistoryControls 
     onRefresh={handleRefreshAfterHistoryOperation}
     position="bottom-right"
   />
   ```

4. CRIAR FUNÇÃO DE REFRESH PARA SINCRONIZAR APÓS DESFAZER/REFAZER:
   ```typescript
   const handleHistoryRefresh = async () => {
     await loadData(); // Recarregar seus dados
     toast({
       title: "Dados sincronizados",
       description: "Os dados foram atualizados após operação de histórico.",
     });
   };
   ```

5. USAR DESCRIÇÕES PERSONALIZADAS NAS OPERAÇÕES:
   ```typescript
   // CREATE
   await dataManagerWithHistory.saveClient(newClient, `Cliente criado: ${client.name}`);
   
   // UPDATE
   await dataManagerWithHistory.saveClient(updatedClient, `Cliente atualizado: ${oldName} → ${newName}`);
   
   // DELETE
   await dataManagerWithHistory.deleteClient(clientId, `Cliente excluído: ${client.name}`);
   ```

BENEFÍCIOS:
- ✅ Histórico automático de todas as operações
- ✅ Capacidade de desfazer/refazer alterações
- ✅ Interface visual para gerenciar histórico
- ✅ Controles flutuantes para acesso rápido
- ✅ Descrições personalizadas para melhor rastreamento
- ✅ Integração transparente com código existente
*/
