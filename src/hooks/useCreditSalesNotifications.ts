import { useState, useEffect } from 'react';
import { useCashFlow } from './useDataPersistence';

interface CreditSale {
  id: string;
  description: string;
  originalValue: number;
  date: string;
  type: 'final_product' | 'resale_product';
}

export const useCreditSalesNotifications = () => {
  const { cashFlowEntries, isLoading } = useCashFlow();
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [totalCreditValue, setTotalCreditValue] = useState<number>(0);
  const [creditCount, setCreditCount] = useState<number>(0);

  // Função para extrair valor original das vendas a prazo
  const extractOriginalValueFromSale = (description: string): number => {
    const match = description.match(/Valor_Original:\s*R?\$?\s*([\d.,]+)/);
    if (match) {
      const valueStr = match[1].replace(/\./g, '').replace(',', '.');
      return parseFloat(valueStr) || 0;
    }
    return 0;
  };

  // Função para verificar se é venda a prazo
  const isCreditSale = (entry: any): boolean => {
    return (
      entry.type === 'income' &&
      entry.amount === 0 &&
      entry.description &&
      (entry.description.includes('A PRAZO') || entry.description.includes('Valor_Original:')) &&
      !entry.description.includes('| PAGO')
    );
  };

  // Função para determinar o tipo de produto
  const getProductType = (description: string): 'final_product' | 'resale_product' => {
    if (description.includes('Produto Final') || description.includes('Final:')) {
      return 'final_product';
    }
    return 'resale_product';
  };

  useEffect(() => {
    if (!cashFlowEntries || isLoading) {
      return;
    }

    console.log('🔄 [useCreditSalesNotifications] Processando vendas a prazo...');

    // Filtrar vendas a prazo não pagas
    const creditSalesData = cashFlowEntries
      .filter(isCreditSale)
      .map(entry => {
        const originalValue = extractOriginalValueFromSale(entry.description);
        return {
          id: entry.id,
          description: entry.description,
          originalValue,
          date: entry.transaction_date,
          type: getProductType(entry.description)
        };
      })
      .filter(sale => sale.originalValue > 0);

    // Calcular total
    const total = creditSalesData.reduce((sum, sale) => sum + sale.originalValue, 0);

    console.log('💰 [useCreditSalesNotifications] Vendas a prazo encontradas:', {
      count: creditSalesData.length,
      total: total,
      sales: creditSalesData
    });

    setCreditSales(creditSalesData);
    setTotalCreditValue(total);
    setCreditCount(creditSalesData.length);

  }, [cashFlowEntries, isLoading]);

  // Listener para atualizações em tempo real
  useEffect(() => {
    const handleCashFlowUpdate = () => {
      console.log('🔄 [useCreditSalesNotifications] Evento de atualização do fluxo de caixa recebido');
      // O useEffect acima será executado automaticamente quando cashFlowEntries mudar
    };

    window.addEventListener('cashFlowUpdated', handleCashFlowUpdate);
    window.addEventListener('creditSaleUpdated', handleCashFlowUpdate);

    return () => {
      window.removeEventListener('cashFlowUpdated', handleCashFlowUpdate);
      window.removeEventListener('creditSaleUpdated', handleCashFlowUpdate);
    };
  }, []);

  return {
    creditSales,
    totalCreditValue,
    creditCount,
    isLoading
  };
};
