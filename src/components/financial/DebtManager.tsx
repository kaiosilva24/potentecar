import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CreditCard, Plus, Trash2, Calendar, DollarSign, Building, AlertTriangle, CheckCircle, Clock, Receipt, XCircle, TrendingDown, ArrowDownCircle, FileText } from 'lucide-react';
import { Debt, CashFlowEntry } from '@/types/financial';
import { useDebts } from '@/hooks/useDataPersistence';

interface DebtManagerProps {
  isLoading?: boolean;
  onRefresh?: () => void;
  cashFlowEntries?: any[]; // Para integração com fluxo de caixa
}

const DebtManager = ({ isLoading = false, onRefresh = () => {}, cashFlowEntries = [] }: DebtManagerProps) => {
  // Supabase integration for debts
  const {
    debts,
    isLoading: debtsLoading,
    addDebt,
    updateDebt,
    deleteDebt,
    refreshDebts
  } = useDebts();

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    total_amount: "",
    due_date: "",
    category: "",
    creditor: "",
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    // Workaround +1: Add one day to avoid timezone issues
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString("pt-BR");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "em_dia":
        return <CheckCircle className="h-4 w-4 text-neon-green" />;
      case "vencida":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "paga":
        return <CheckCircle className="h-4 w-4 text-neon-blue" />;
      default:
        return <Clock className="h-4 w-4 text-tire-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "em_dia":
        return "Em Dia";
      case "vencida":
        return "Vencida";
      case "paga":
        return "Paga";
      default:
        return "Pendente";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "em_dia":
        return "text-neon-green";
      case "vencida":
        return "text-red-400";
      case "paga":
        return "text-neon-blue";
      default:
        return "text-tire-400";
    }
  };

  // Function to detect debt payments in cash flow
  const getDebtPaymentsFromCashFlow = useMemo(() => {
    if (!cashFlowEntries || cashFlowEntries.length === 0) return [];
    
    // Filter cash flow entries that are debt payments
    const debtPayments = cashFlowEntries.filter(entry => 
      entry.type === "expense" && 
      entry.category === "Dívidas" &&
      entry.description && 
      entry.description.includes("PAGAMENTO_DIVIDA:")
    );

    console.log("💳 [DEBT INTEGRATION] Pagamentos de dívida encontrados no fluxo de caixa:", debtPayments);
    
    return debtPayments;
  }, [cashFlowEntries]);

  // Calculate totals including cash flow integration
  const totals = useMemo(() => {
    const totalDebt = debts.reduce((sum, debt) => sum + (typeof debt.total_amount === 'number' ? debt.total_amount : parseFloat(debt.total_amount) || 0), 0);
    const totalPaidFromDebts = debts.reduce((sum, debt) => sum + (typeof debt.paid_amount === 'number' ? debt.paid_amount : parseFloat(debt.paid_amount) || 0), 0);
    
    // Calculate total paid from cash flow debt payments
    const totalPaidFromCashFlow = getDebtPaymentsFromCashFlow.reduce((sum, payment) => sum + payment.amount, 0);
    
    // CORREÇÃO: Total paid é apenas o paid_amount das dívidas (que já inclui os pagamentos do fluxo de caixa)
    // Não somar os dois para evitar duplicação
    const totalPaid = totalPaidFromDebts;
    const totalRemaining = Math.max(0, totalDebt - totalPaid);
    
    const overdueDebts = debts.filter(debt => {
      // Workaround: Compare only dates (without time) to avoid timezone issues
      const dueDate = new Date(debt.due_date);
      const today = new Date();
      
      // Set both dates to start of day for accurate comparison
      dueDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      // A debt is overdue if due date is before today (or equal to today)
      return debt.status !== "paga" && dueDate <= today;
    });

    // Calcular valor vencido usando a mesma lógica de filtro das dívidas vencidas
    const overdueAmount = overdueDebts.reduce((sum, debt) => {
      const remainingAmount = typeof debt.remaining_amount === 'number' 
        ? debt.remaining_amount 
        : parseFloat(debt.remaining_amount) || 0;
      return sum + remainingAmount;
    }, 0);

    console.log("📊 [DEBT TOTALS] Cálculo de totais integrado:", {
      totalDebt,
      totalPaidFromDebts,
      totalPaidFromCashFlow,
      totalPaid,
      totalRemaining,
      overdueDebtsCount: overdueDebts.length,
      overdueAmount,
      debtPaymentsCount: getDebtPaymentsFromCashFlow.length
    });

    console.log("🚨 [DEBT OVERDUE] Detalhamento das dívidas vencidas:", {
      today: new Date().toISOString().split('T')[0],
      overdueDebts: overdueDebts.map(debt => {
        const dueDate = new Date(debt.due_date);
        const today = new Date();
        dueDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        return {
          description: debt.description,
          due_date: debt.due_date,
          due_date_normalized: dueDate.toISOString().split('T')[0],
          today_normalized: today.toISOString().split('T')[0],
          is_overdue: dueDate <= today,
          remaining_amount: debt.remaining_amount,
          status: debt.status
        };
      })
    });

    return {
      totalDebt,
      totalPaid,
      totalRemaining,
      overdueCount: overdueDebts.length,
      overdueAmount,
      cashFlowPayments: totalPaidFromCashFlow,
      cashFlowPaymentsCount: getDebtPaymentsFromCashFlow.length,
    };
  }, [debts, getDebtPaymentsFromCashFlow]);

  // Automatic synchronization of debt payments from cash flow
  useEffect(() => {
    const syncDebtPayments = async () => {
      if (!getDebtPaymentsFromCashFlow.length || !debts.length) return;

      console.log("🔄 [DEBT SYNC] Iniciando sincronização automática de pagamentos...");

      for (const payment of getDebtPaymentsFromCashFlow) {
        // Extract debt ID from payment description (format: "PAGAMENTO_DIVIDA:debt_id")
        const debtIdMatch = payment.description.match(/PAGAMENTO_DIVIDA:(\w+)/);
        if (!debtIdMatch) continue;

        const debtId = debtIdMatch[1];
        const debt = debts.find(d => d.id === debtId);
        
        if (!debt) {
          console.log(`⚠️ [DEBT SYNC] Dívida ${debtId} não encontrada para pagamento de ${payment.amount}`);
          continue;
        }

        // Check if this payment was already processed (to avoid double processing)
        const expectedPaidAmount = debt.paid_amount + payment.amount;
        const expectedRemainingAmount = debt.total_amount - expectedPaidAmount;

        if (expectedRemainingAmount < 0) {
          console.log(`⚠️ [DEBT SYNC] Pagamento de ${payment.amount} excede valor restante da dívida ${debt.description}`);
          continue;
        }

        // Update debt with payment
        const updatedDebt: Partial<Debt> = {
          paid_amount: expectedPaidAmount,
          remaining_amount: expectedRemainingAmount,
          status: expectedRemainingAmount === 0 ? "paga" : debt.status,
        };

        try {
          await updateDebt(debtId, updatedDebt);
          console.log(`✅ [DEBT SYNC] Dívida ${debt.description} atualizada com pagamento de ${payment.amount}`);
        } catch (error) {
          console.error(`❌ [DEBT SYNC] Erro ao sincronizar pagamento para dívida ${debtId}:`, error);
        }
      }
    };

    // Only sync if we have both debts and cash flow entries loaded
    if (debts.length > 0 && !debtsLoading) {
      syncDebtPayments();
    }
  }, [getDebtPaymentsFromCashFlow, debts, debtsLoading, updateDebt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("🔄 [DebtManager] Iniciando cadastro de dívida...");
    console.log("📝 [DebtManager] Dados do formulário:", formData);
    
    if (!formData.description || !formData.total_amount || !formData.due_date || !formData.creditor) {
      console.log("❌ [DebtManager] Campos obrigatórios não preenchidos");
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const newDebt: Omit<Debt, 'id' | 'created_at' | 'updated_at'> = {
      description: formData.description,
      total_amount: parseFloat(formData.total_amount),
      paid_amount: 0,
      remaining_amount: parseFloat(formData.total_amount),
      due_date: formData.due_date,
      status: "em_dia",
      category: formData.category || "Outros",
      creditor: formData.creditor,
    };

    console.log("💾 [DebtManager] Objeto dívida preparado:", newDebt);

    try {
      console.log("📤 [DebtManager] Chamando addDebt...");
      const result = await addDebt(newDebt);
      console.log("✅ [DebtManager] Resultado do addDebt:", result);
      
      setFormData({
        description: "",
        total_amount: "",
        due_date: "",
        category: "",
        creditor: "",
      });
      setShowForm(false);
      console.log("🎉 [DebtManager] Dívida cadastrada com sucesso!");
      alert("Dívida cadastrada com sucesso!");
      onRefresh(); // Trigger refresh in parent component
    } catch (error) {
      console.error('❌ [DebtManager] Erro ao cadastrar dívida:', error);
      console.error('❌ [DebtManager] Detalhes do erro:', JSON.stringify(error, null, 2));
      alert(`Erro ao cadastrar dívida: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleDelete = async (debtId: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (debt && confirm(`Tem certeza que deseja excluir a dívida: ${debt.description}?`)) {
      try {
        await deleteDebt(debtId);
        alert("Dívida excluída com sucesso!");
        onRefresh(); // Trigger refresh in parent component
      } catch (error) {
        console.error('Erro ao excluir dívida:', error);
        alert("Erro ao excluir dívida. Tente novamente.");
      }
    }
  };

  const handlePayment = async (debtId: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const paymentAmount = prompt(`Registrar pagamento para: ${debt.description}\n\nValor restante: ${formatCurrency(debt.remaining_amount)}\n\nDigite o valor do pagamento:`);
    
    if (paymentAmount) {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        alert("Valor inválido!");
        return;
      }

      if (amount > debt.remaining_amount) {
        alert("Valor do pagamento não pode ser maior que o valor restante!");
        return;
      }

      const newPaidAmount = debt.paid_amount + amount;
      const newRemainingAmount = debt.total_amount - newPaidAmount;
      
      const updatedDebt: Partial<Debt> = {
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        status: newRemainingAmount === 0 ? "paga" : debt.status,
      };

      try {
        await updateDebt(debtId, updatedDebt);
        alert(`Pagamento de ${formatCurrency(amount)} registrado com sucesso!`);
        onRefresh(); // Trigger refresh in parent component
      } catch (error) {
        console.error('Erro ao registrar pagamento:', error);
        alert("Erro ao registrar pagamento. Tente novamente.");
      }
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-red-400" />
          Gerenciamento de Dívidas
        </h3>
        <p className="text-tire-300 mt-2">
          Controle e acompanhe todas as dívidas da empresa
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm font-medium">Total de Dívidas</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(totals.totalDebt)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-blue-500/20">
                <CreditCard className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm font-medium">Total Pago</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(totals.totalPaid)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-blue-500/20">
                <CheckCircle className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm font-medium">Saldo Devedor</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(totals.totalRemaining)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-red-500/20">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm font-medium">Dívidas Vencidas</p>
                <p className="text-2xl font-bold text-red-400">
                  {totals.overdueCount}
                </p>
              </div>
              <div className="p-2 rounded-full bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30 hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm font-medium">Valor Vencido</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(totals.overdueAmount)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-red-500/20">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Debt Button */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-neon-green hover:bg-neon-green/80 text-black font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Dívida
        </Button>
      </div>

      {/* Add Debt Form */}
      {showForm && (
        <Card className="bg-factory-800/50 border-tire-600/30 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-neon-green" />
              Cadastrar Nova Dívida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-tire-200">
                    Descrição *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva a dívida..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditor" className="text-tire-200">
                    Credor *
                  </Label>
                  <Input
                    id="creditor"
                    placeholder="Nome do credor..."
                    value={formData.creditor}
                    onChange={(e) =>
                      setFormData({ ...formData, creditor: e.target.value })
                    }
                    className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_amount" className="text-tire-200">
                    Valor Total *
                  </Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.total_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, total_amount: e.target.value })
                    }
                    className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date" className="text-tire-200">
                    Data de Vencimento *
                  </Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                    className="bg-factory-700/50 border-tire-600/30 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-tire-200">
                    Categoria
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-factory-800 border-tire-600/30">
                      <SelectItem value="Financiamento" className="text-white hover:bg-tire-700/50">
                        Financiamento
                      </SelectItem>
                      <SelectItem value="Fornecedor" className="text-white hover:bg-tire-700/50">
                        Fornecedor
                      </SelectItem>
                      <SelectItem value="Empréstimo" className="text-white hover:bg-tire-700/50">
                        Empréstimo
                      </SelectItem>
                      <SelectItem value="Cartão de Crédito" className="text-white hover:bg-tire-700/50">
                        Cartão de Crédito
                      </SelectItem>
                      <SelectItem value="Outros" className="text-white hover:bg-tire-700/50">
                        Outros
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="bg-neon-green hover:bg-neon-green/80 text-black font-medium"
                >
                  Cadastrar Dívida
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  className="text-tire-300 hover:text-white hover:bg-tire-700/50"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Debts List */}
      <Card className="bg-factory-800/50 border-tire-600/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-neon-blue" />
            Lista de Dívidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {debtsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-green mx-auto mb-3"></div>
              <p className="text-tire-400">Carregando dívidas...</p>
            </div>
          ) : debts.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-tire-500 mx-auto mb-3" />
              <p className="text-tire-400">Nenhuma dívida cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {debts.map((debt) => (
                <div
                  key={debt.id}
                  className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1">
                        {debt.description}
                      </h4>
                      <p className="text-tire-300 text-sm mb-2">
                        Credor: {debt.creditor} | Categoria: {debt.category}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-tire-400">Total:</span>
                          <span className="text-red-400 font-bold ml-1">
                            {formatCurrency(typeof debt.total_amount === 'number' ? debt.total_amount : parseFloat(debt.total_amount) || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-tire-400">Pago:</span>
                          <span className="text-neon-green font-bold ml-1">
                            {formatCurrency(typeof debt.paid_amount === 'number' ? debt.paid_amount : parseFloat(debt.paid_amount) || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-tire-400">Restante:</span>
                          <span className="text-red-400 font-bold ml-1">
                            {formatCurrency(typeof debt.remaining_amount === 'number' ? debt.remaining_amount : parseFloat(debt.remaining_amount) || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-tire-400">Vencimento:</span>
                          <span className="text-red-400 font-bold ml-1">
                            {formatDate(debt.due_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div className={`flex items-center gap-1 ${getStatusColor(debt.status)}`}>
                        {getStatusIcon(debt.status)}
                        <span className="text-xs font-medium">
                          {getStatusText(debt.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-tire-600/20">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(debt.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1 h-8 text-xs font-medium"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DebtManager;
