import React from 'react';
import { createPortal } from 'react-dom';
import { OverdueDebt } from '../../hooks/useOverdueDebtsNotifications';

interface OverdueDebtsTooltipProps {
  overdueDebts: OverdueDebt[];
  isVisible: boolean;
  position: { x: number; y: number };
}

export const OverdueDebtsTooltip: React.FC<OverdueDebtsTooltipProps> = ({
  overdueDebts,
  isVisible,
  position
}) => {
  if (!isVisible) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1); // Workaround +1 for timezone/Supabase
    return date.toLocaleDateString('pt-BR');
  };

  const totalOverdueAmount = overdueDebts.reduce((sum, debt) => sum + debt.remaining_amount, 0);

  const tooltipContent = overdueDebts.length === 0 ? (
    <div
      className="fixed bg-factory-800 rounded-lg shadow-2xl p-4 max-w-sm min-w-[280px]"
      style={{
        left: position.x + 20,
        top: position.y - 10,
        transform: 'translateY(-100%)',
        pointerEvents: 'auto',
        zIndex: 2147483647, // Maximum possible z-index value
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
        position: 'fixed',
        isolation: 'isolate'
      }}
    >
      <div className="text-white text-sm">
        <p>✅ Nenhuma dívida vencida</p>
      </div>
    </div>
  ) : (
    <div
      className="fixed bg-factory-800 rounded-lg shadow-2xl p-4 max-w-sm min-w-[320px]"
      style={{
        left: position.x + 20,
        top: position.y - 10,
        transform: 'translateY(-100%)',
        pointerEvents: 'auto',
        zIndex: 2147483647, // Maximum possible z-index value
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
        position: 'fixed',
        isolation: 'isolate'
      }}
    >
      <div className="mb-3">
        <h4 className="text-white font-semibold text-sm mb-1">
          🚨 Dívidas Vencidas
        </h4>
        <p className="text-tire-300 text-xs">
          {overdueDebts.length} {overdueDebts.length === 1 ? 'dívida' : 'dívidas'} vencida{overdueDebts.length === 1 ? '' : 's'}
        </p>
        <div className="mt-2 bg-red-900/20 border border-red-500/30 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <span className="text-red-300 text-xs font-medium">VALOR TOTAL:</span>
            <span className="text-red-400 font-bold text-sm">
              {formatCurrency(totalOverdueAmount)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {overdueDebts.map((debt) => (
          <div
            key={debt.id}
            className="bg-factory-900/50 rounded-md p-2 border border-tire-700/30"
          >
            <div className="flex items-start justify-between mb-1">
              <h5 className="text-white text-xs font-medium truncate flex-1 mr-2">
                {debt.description}
              </h5>
              <span className="text-red-400 text-xs font-medium whitespace-nowrap">
                {formatCurrency(debt.remaining_amount)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs font-medium">
                  📅 {formatDate(debt.due_date)}
                </span>
                {debt.creditor && (
                  <span className="text-tire-400 text-xs truncate max-w-[80px]">
                    {debt.creditor}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"></div>
                <span className="text-red-400 text-xs font-medium">
                  Vencida
                </span>
              </div>
            </div>
            
            {/* Category */}
            {debt.category && (
              <div className="mt-1 flex items-center gap-1">
                <span className="text-tire-400 text-xs">🏷️</span>
                <span className="text-tire-400 text-xs">{debt.category}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-2 border-t border-tire-700/30">
        <p className="text-tire-400 text-xs text-center">
          Atualizado automaticamente a cada 30s
        </p>
      </div>
    </div>
  );

  // Use portal to render tooltip outside of sidebar container
  return createPortal(tooltipContent, document.body);
};
