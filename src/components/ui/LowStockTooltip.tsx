import React from 'react';
import { createPortal } from 'react-dom';
import { LowStockItem } from '../../hooks/useLowStockNotifications';

interface LowStockTooltipProps {
  lowStockItems: LowStockItem[];
  isVisible: boolean;
  position: { x: number; y: number };
  isPinned?: boolean;
}

export const LowStockTooltip: React.FC<LowStockTooltipProps> = ({
  lowStockItems,
  isVisible,
  position,
  isPinned = false
}) => {
  if (!isVisible) {
    return null;
  }

  const tooltipContent = lowStockItems.length === 0 ? (
    <div
      className="fixed bg-factory-800 rounded-lg shadow-2xl p-4 max-w-sm min-w-[280px]"
      style={{
        left: position.x + 20,
        top: position.y - 10,
        transform: 'translateY(-100%)',
        pointerEvents: isPinned ? 'auto' : 'none',
        zIndex: 2147483647, // Maximum possible z-index value
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
        position: 'fixed',
        isolation: 'isolate'
      }}
    >
      <div className="text-white text-sm">
        <p>✅ Nenhum produto com estoque baixo</p>
      </div>
    </div>
  ) : (
    <div
      className="fixed bg-factory-800 rounded-lg shadow-2xl p-4 max-w-sm min-w-[320px]"
      style={{
        left: position.x + 20,
        top: position.y - 10,
        transform: 'translateY(-100%)',
        pointerEvents: isPinned ? 'auto' : 'none',
        zIndex: 2147483647, // Maximum possible z-index value
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
        position: 'fixed',
        isolation: 'isolate'
      }}
    >
      <div className="mb-3">
        <h4 className="text-white font-semibold text-sm mb-1">
          Produtos com Estoque Baixo
        </h4>
        <p className="text-tire-300 text-xs">
          {lowStockItems.length} {lowStockItems.length === 1 ? 'produto' : 'produtos'} abaixo do limite
        </p>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {lowStockItems.map((item) => (
          <div
            key={`${item.category}-${item.id}`}
            className="bg-factory-900/50 rounded-md p-2 border border-tire-700/30"
          >
            <div className="flex items-start justify-between mb-1">
              <h5 className="text-white text-xs font-medium truncate flex-1 mr-2">
                {item.name}
              </h5>
              <span className="text-xs text-tire-400 whitespace-nowrap">
                {item.categoryLabel}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs font-medium">
                  Atual: {item.currentStock}
                </span>
                <span className="text-tire-400 text-xs">
                  Mín: {item.minStock}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"></div>
                <span className="text-red-400 text-xs font-medium">
                  Crítico
                </span>
              </div>
            </div>
            
            {/* Progress bar showing stock level */}
            <div className="mt-2">
              <div className="w-full bg-tire-700/30 rounded-full h-1">
                <div
                  className="bg-red-400 h-1 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((item.currentStock / item.minStock) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
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
