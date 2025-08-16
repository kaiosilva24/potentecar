# Sistema de Checkpoint - Persistência de Dados

Este documento explica como funciona o sistema de checkpoint implementado para garantir a persistência e sincronização dos dados financeiros em tempo real.

## 📋 Visão Geral

O sistema de checkpoint foi desenvolvido para:
- **Preservar estado**: Salvar automaticamente métricas financeiras importantes
- **Restaurar dados**: Recuperar o estado anterior após reinicializações
- **Sincronização**: Manter dados consistentes entre localStorage e Supabase
- **Backup automático**: Criar pontos de restauração regulares

## 🏗️ Arquitetura

### Componentes Principais

1. **CheckpointManager** (`src/utils/checkpointManager.ts`)
   - Classe singleton para gerenciar checkpoints
   - Coleta dados de múltiplas fontes
   - Persiste no localStorage e Supabase

2. **CheckpointIntegration** (`src/utils/checkpointIntegration.ts`)
   - Integração com a aplicação React
   - Gerencia ciclo de vida dos checkpoints
   - Configuração de salvamento automático

3. **DataManager** (atualizado)
   - Métodos `saveSystemSetting` e `loadSystemSetting`
   - Suporte para configurações arbitrárias

## 📊 Dados Salvos no Checkpoint

### Métricas Financeiras
- `averageTireCost`: Custo médio por pneu
- `averageTireProfit`: Lucro médio por pneu
- `averageResaleProfit`: Lucro médio de revenda
- `finalProductStockBalance`: Saldo do estoque de produtos finais

### Dados do Dashboard
- `cashBalance`: Saldo em caixa
- `totalRevenue`: Receita total
- `rawMaterialStockBalance`: Saldo de matéria-prima
- `resaleProductStockBalance`: Saldo de produtos para revenda

### Configurações
- `costOptions`: Opções de cálculo de custos
  - `includeLaborCosts`: Incluir custos de mão de obra
  - `includeCashFlowExpenses`: Incluir despesas de fluxo de caixa
  - `includeProductionLosses`: Incluir perdas de produção
  - `includeDefectiveTireSales`: Incluir vendas de pneus defeituosos
  - `includeWarrantyValues`: Incluir valores de garantia
  - `divideByProduction`: Dividir pela produção

## 🚀 Como Usar

### 1. Inicialização Básica

```typescript
import { CheckpointIntegration } from './utils/checkpointIntegration';

// No App.tsx ou componente principal
useEffect(() => {
  const initCheckpoint = async () => {
    const integration = CheckpointIntegration.getInstance();
    await integration.initialize();
  };
  
  initCheckpoint();
}, []);
```

### 2. Hook React

```typescript
import { useCheckpoint } from './utils/checkpointIntegration';

const MyComponent = () => {
  const { createCheckpoint, restoreCheckpoint, getStatus } = useCheckpoint();
  
  const handleSave = async () => {
    await createCheckpoint();
    console.log('Estado salvo!');
  };
  
  return (
    <button onClick={handleSave}>
      Salvar Estado
    </button>
  );
};
```

### 3. Controle Manual

```typescript
import { CheckpointManager } from './utils/checkpointManager';

const manager = CheckpointManager.getInstance();

// Criar checkpoint
await manager.createCheckpoint();

// Restaurar do checkpoint
await manager.restoreFromCheckpoint();

// Verificar status
const info = manager.getCheckpointInfo();
console.log('Checkpoint existe:', info.exists);
console.log('Idade:', info.age);
```

## ⚙️ Configuração Automática

### Salvamento Automático
- **Intervalo**: A cada 5 minutos
- **Eventos**: Após mudanças importantes (custo de pneu, estoque, etc.)
- **Debounce**: 2 segundos após último evento
- **Antes de fechar**: Checkpoint automático no `beforeunload`

### Restauração Automática
- **Na inicialização**: Verifica e restaura checkpoint existente
- **Eventos disparados**: Notifica componentes sobre dados restaurados
- **Fallback**: localStorage como backup se Supabase falhar

## 🔄 Fluxo de Sincronização

```mermaid
graph TD
    A[Aplicação Inicia] --> B[CheckpointIntegration.initialize()]
    B --> C{Checkpoint Existe?}
    C -->|Sim| D[Restaurar Estado]
    C -->|Não| E[Continuar Normalmente]
    D --> F[Disparar Eventos de Restauração]
    F --> G[Componentes Atualizam]
    G --> H[Configurar Auto-Save]
    E --> H
    H --> I[Monitorar Eventos Importantes]
    I --> J[Criar Checkpoint Automático]
    J --> K[Salvar no localStorage + Supabase]
```

## 📁 Estrutura de Arquivos

```
src/
├── utils/
│   ├── checkpointManager.ts      # Core do sistema de checkpoint
│   ├── checkpointIntegration.ts  # Integração com React
│   └── dataManager.ts            # Métodos de persistência atualizados
├── examples/
│   └── AppWithCheckpoint.tsx     # Exemplo de integração
└── CHECKPOINT_SYSTEM.md          # Esta documentação
```

## 🛠️ Implementação no Projeto

### Passo 1: Integrar no App Principal

Adicione no seu `App.tsx`:

```typescript
import { CheckpointIntegration } from './utils/checkpointIntegration';

function App() {
  useEffect(() => {
    const integration = CheckpointIntegration.getInstance();
    integration.initialize();
    
    return () => integration.cleanup();
  }, []);

  // ... resto do seu App
}
```

### Passo 2: Configurar Componentes

Para componentes que precisam reagir à restauração:

```typescript
useEffect(() => {
  const handleRestore = (event: CustomEvent) => {
    // Atualizar estado local com dados restaurados
    console.log('Dados restaurados:', event.detail);
  };

  window.addEventListener('checkpointRestored', handleRestore);
  return () => window.removeEventListener('checkpointRestored', handleRestore);
}, []);
```

### Passo 3: Verificar Supabase

Certifique-se de que a tabela `system_settings` existe:

```sql
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔍 Monitoramento e Debug

### Logs do Console
O sistema produz logs detalhados:
- `🚀 [CheckpointManager]`: Operações principais
- `💾 [CheckpointManager]`: Salvamento de dados
- `📥 [CheckpointManager]`: Restauração de dados
- `❌ [CheckpointManager]`: Erros

### Status do Checkpoint
```typescript
const status = CheckpointManager.getInstance().getCheckpointInfo();
console.log('Status:', status);
// { exists: true, timestamp: 1234567890, age: "2 minutos atrás" }
```

## 🚨 Tratamento de Erros

O sistema é resiliente a falhas:
- **Supabase indisponível**: Fallback para localStorage
- **Dados corrompidos**: Valores padrão são usados
- **Falha na restauração**: Aplicação continua normalmente
- **Erro no salvamento**: Logs de erro, não interrompe fluxo

## 📈 Benefícios

1. **Experiência do Usuário**: Dados não são perdidos
2. **Confiabilidade**: Múltiplas camadas de backup
3. **Performance**: Carregamento rápido com dados cached
4. **Manutenibilidade**: Sistema modular e extensível
5. **Sincronização**: Dados consistentes em tempo real

## 🔧 Personalização

Para adicionar novos dados ao checkpoint:

1. **Atualizar interface**:
```typescript
export interface SystemCheckpoint {
  // ... dados existentes
  meuNovoDado: number;
}
```

2. **Implementar coleta**:
```typescript
// No createCheckpoint()
const meuNovoDado = await dataManager.loadMeuDado();
```

3. **Implementar restauração**:
```typescript
// No restoreFromCheckpoint()
await dataManager.saveMeuDado(checkpoint.meuNovoDado);
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs do console
2. Confirmar estrutura do Supabase
3. Testar localStorage no DevTools
4. Verificar eventos customizados no Network tab
