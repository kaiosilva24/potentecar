import React from 'react';
import { ResponsiveContainer } from 'recharts';

interface ChartContainerProps {
  children: React.ReactNode;
  width?: string | number;
  height?: string | number;
  minWidth?: number;
  minHeight?: number;
  className?: string;
}

/**
 * Wrapper component for charts that ensures proper dimensions
 * and prevents the "width(0) and height(0)" error from Recharts
 */
export const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  width = "100%",
  height = "100%",
  minWidth = 300,
  minHeight = 200,
  className = "",
}) => {
  return (
    <div 
      className={`chart-container ${className}`}
      style={{ 
        width: typeof width === 'string' ? width : `${width}px`,
        height: typeof height === 'string' ? height : `${height}px`,
        minWidth: `${minWidth}px`,
        minHeight: `${minHeight}px`,
        position: 'relative'
      }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={minWidth}
        minHeight={minHeight}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartContainer;
