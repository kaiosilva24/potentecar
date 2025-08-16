// Exemplo de como integrar o sistema de checkpoint no App.tsx
import React, { useEffect, useState } from 'react';
import { CheckpointIntegration, useCheckpoint } from '../utils/checkpointIntegration';

/**
 * Componente de exemplo mostrando como integrar o sistema de checkpoint
 * na aplicação principal
 */
const AppWithCheckpoint: React.FC = () => {
  const [isCheckpointReady, setIsCheckpointReady] = useState(false);
  const [checkpointStatus, setCheckpointStatus] = useState<any>(null);
  const { createCheckpoint, restoreCheckpoint, getStatus } = useCheckpoint();

  useEffect(() => {
    // Inicializar o sistema de checkpoint quando o app carrega
    const initializeCheckpoint = async () => {
      try {
        const integration = CheckpointIntegration.getInstance();
        await integration.initialize();
        setIsCheckpointReady(true);
        setCheckpointStatus(getStatus());
      } catch (error) {
        console.error('Erro ao inicializar checkpoint:', error);
      }
    };

    initializeCheckpoint();

    // Cleanup quando o componente desmonta
    return () => {
      const integration = CheckpointIntegration.getInstance();
      integration.cleanup();
    };
  }, []);

  // Atualizar status do checkpoint periodicamente
  useEffect(() => {
    if (!isCheckpointReady) return;

    const updateStatus = () => {
      setCheckpointStatus(getStatus());
    };

    const interval = setInterval(updateStatus, 30000); // A cada 30 segundos
    return () => clearInterval(interval);
  }, [isCheckpointReady, getStatus]);

  const handleCreateCheckpoint = async () => {
    try {
      await createCheckpoint();
      setCheckpointStatus(getStatus());
      alert('Checkpoint criado com sucesso!');
    } catch (error) {
      alert('Erro ao criar checkpoint');
    }
  };

  const handleRestoreCheckpoint = async () => {
    try {
      await restoreCheckpoint();
      alert('Estado restaurado com sucesso!');
    } catch (error) {
      alert('Erro ao restaurar checkpoint');
    }
  };

  return (
    <div className="app-with-checkpoint">
      {/* Indicador de status do checkpoint */}
      <div className="checkpoint-status-bar">
        <div className="checkpoint-indicator">
          <span className={`status-dot ${isCheckpointReady ? 'ready' : 'loading'}`}></span>
          <span>Checkpoint: {isCheckpointReady ? 'Ativo' : 'Inicializando...'}</span>
        </div>

        {checkpointStatus?.exists && (
          <div className="checkpoint-info">
            <span>Último checkpoint: {checkpointStatus.age}</span>
          </div>
        )}

        {/* Controles manuais (opcional - para debug/admin) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="checkpoint-controls">
            <button onClick={handleCreateCheckpoint} disabled={!isCheckpointReady}>
              Salvar Estado
            </button>
            <button 
              onClick={handleRestoreCheckpoint} 
              disabled={!isCheckpointReady || !checkpointStatus?.exists}
            >
              Restaurar Estado
            </button>
          </div>
        )}
      </div>

      {/* Resto da aplicação */}
      <main className="app-main">
        {/* Seus componentes principais aqui */}
        <h1>Sistema de Recauchutagem</h1>
        <p>Sistema de checkpoint ativo - seus dados são salvos automaticamente!</p>
        
        {/* Exemplo de componente que se beneficia do checkpoint */}
        <CheckpointAwareComponent />
      </main>

      {/* Estilos inline para o exemplo */}
      <style jsx>{`
        .checkpoint-status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
          font-size: 12px;
          color: #6c757d;
        }

        .checkpoint-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #dc3545;
        }

        .status-dot.ready {
          background: #28a745;
        }

        .checkpoint-controls {
          display: flex;
          gap: 8px;
        }

        .checkpoint-controls button {
          padding: 4px 8px;
          font-size: 11px;
          border: 1px solid #ccc;
          background: white;
          border-radius: 3px;
          cursor: pointer;
        }

        .checkpoint-controls button:hover:not(:disabled) {
          background: #f8f9fa;
        }

        .checkpoint-controls button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .app-main {
          padding: 20px;
        }
      `}</style>
    </div>
  );
};

/**
 * Componente que demonstra como reagir aos eventos de checkpoint
 */
const CheckpointAwareComponent: React.FC = () => {
  const [lastRestoreTime, setLastRestoreTime] = useState<string | null>(null);

  useEffect(() => {
    // Listener para quando dados são restaurados do checkpoint
    const handleCheckpointRestore = (event: CustomEvent) => {
      setLastRestoreTime(new Date().toLocaleTimeString());
      console.log('Dados restaurados do checkpoint:', event.detail);
    };

    // Escutar o evento global de restauração
    window.addEventListener('checkpointRestored' as any, handleCheckpointRestore);

    return () => {
      window.removeEventListener('checkpointRestored' as any, handleCheckpointRestore);
    };
  }, []);

  return (
    <div className="checkpoint-aware-component">
      <h3>Componente Consciente do Checkpoint</h3>
      <p>Este componente reage aos eventos de checkpoint.</p>
      
      {lastRestoreTime && (
        <div className="restore-notification">
          <strong>Estado restaurado às {lastRestoreTime}</strong>
        </div>
      )}

      <style jsx>{`
        .checkpoint-aware-component {
          margin: 20px 0;
          padding: 16px;
          border: 1px solid #e9ecef;
          border-radius: 4px;
        }

        .restore-notification {
          margin-top: 12px;
          padding: 8px;
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default AppWithCheckpoint;
