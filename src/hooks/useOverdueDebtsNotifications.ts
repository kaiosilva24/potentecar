import { useState, useEffect } from 'react';
import { dataManager } from '../utils/dataManager';

export interface OverdueDebt {
  id: string;
  description: string;
  remaining_amount: number;
  due_date: string;
  creditor?: string;
  category?: string;
}

export const useOverdueDebtsNotifications = () => {
  const [overdueDebts, setOverdueDebts] = useState<OverdueDebt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const checkOverdueDebts = async () => {
    try {
      setIsLoading(true);
      
      // Load all debts from Supabase
      const debts = await dataManager.loadDebts();
      
      if (!debts || debts.length === 0) {
        setOverdueDebts([]);
        return;
      }

      // Get current date (normalized to start of day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter overdue debts (due_date <= today and remaining_amount > 0)
      const overdue = debts.filter(debt => {
        if (!debt.due_date || debt.remaining_amount <= 0) {
          return false;
        }

        // Parse due date and apply +1 workaround for timezone correction
        const dueDate = new Date(debt.due_date);
        dueDate.setDate(dueDate.getDate() + 1); // Workaround +1 for timezone/Supabase
        dueDate.setHours(0, 0, 0, 0);

        // Check if debt is overdue (due date is today or before)
        return dueDate <= today;
      });

      setOverdueDebts(overdue);
    } catch (error) {
      console.error('Error checking overdue debts:', error);
      setOverdueDebts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkOverdueDebts();

    // Set up interval to check every 30 seconds
    const interval = setInterval(checkOverdueDebts, 30000);

    // Listen for debt updates
    const handleDebtUpdate = () => {
      checkOverdueDebts();
    };

    // Add event listeners for debt changes
    window.addEventListener('debtUpdated', handleDebtUpdate);
    window.addEventListener('debtDeleted', handleDebtUpdate);
    window.addEventListener('debtCreated', handleDebtUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('debtUpdated', handleDebtUpdate);
      window.removeEventListener('debtDeleted', handleDebtUpdate);
      window.removeEventListener('debtCreated', handleDebtUpdate);
    };
  }, []);

  return {
    overdueDebts,
    overdueCount: overdueDebts.length,
    totalOverdueAmount: overdueDebts.reduce((sum, debt) => sum + debt.remaining_amount, 0),
    isLoading
  };
};
