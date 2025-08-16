import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CashFlowManager from "./CashFlowManager";
import FixedCostsManager from "./FixedCostsManager";
import TireCostManager from "./TireCostManager";
import VariableCostsManager from "./VariableCostsManager";
import DefectiveTireSalesManager from "./DefectiveTireSalesManager";
import PresumedProfitManager from "./PresumedProfitManager";
import ResaleProductProfitManager from "./ResaleProductProfitManager";
import DebtManager from "./DebtManager";

import RawMaterialDashboard from "./RawMaterialDashboard";
import {
  useEmployees,
  useCustomers,
  useSuppliers,
  useFixedCosts,
  useVariableCosts,
  useCashFlow,
  useSalespeople,
  useMaterials,
  useStockItems,
  useProductionEntries,
  useProducts,
  useRecipes,
  useDefectiveTireSales,
  useCostSimulations,
  useWarrantyEntries,
  useResaleProducts,
  useDebts,
} from "@/hooks/useDataPersistence";
import type {
  DefectiveTireSale,
  CashFlowEntry,
  FixedCost,
  VariableCost,
} from "@/types/financial";

interface FinancialDashboardProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

const FinancialDashboard = ({
  onRefresh = () => {},
  isLoading = false,
}: FinancialDashboardProps) => {
  const [activeTab, setActiveTab] = useState("cashflow");

  // Use database hooks for financial data
  const { employees, isLoading: employeesLoading } = useEmployees();
  const { customers, isLoading: customersLoading } = useCustomers();
  const { suppliers, isLoading: suppliersLoading } = useSuppliers();
  const { materials, isLoading: materialsLoading } = useMaterials();
  const { stockItems, isLoading: stockItemsLoading } = useStockItems();
  const { productionEntries, isLoading: productionLoading } =
    useProductionEntries();
  const { products, isLoading: productsLoading } = useProducts();
  const { recipes, isLoading: recipesLoading } = useRecipes();

  // Use financial hooks
  const {
    fixedCosts,
    addFixedCost,
    updateFixedCost,
    isLoading: fixedCostsLoading,
  } = useFixedCosts();
  const {
    variableCosts,
    addVariableCost,
    updateVariableCost,
    isLoading: variableCostsLoading,
  } = useVariableCosts();
  const {
    cashFlowEntries,
    addCashFlowEntry,
    deleteCashFlowEntry,
    isLoading: cashFlowLoading,
  } = useCashFlow();
  const {
    salespeople,
    addSalesperson,
    updateSalesperson,
    isLoading: salespeopleLoading,
  } = useSalespeople();
  const {
    defectiveTireSales,
    addDefectiveTireSale,
    deleteDefectiveTireSale,
    refreshDefectiveTireSales,
    isLoading: defectiveTireSalesLoading,
  } = useDefectiveTireSales();
  const { warrantyEntries, isLoading: warrantyEntriesLoading } =
    useWarrantyEntries();
  const { resaleProducts, isLoading: resaleProductsLoading } =
    useResaleProducts();
  const { debts, updateDebt, refreshDebts } = useDebts();

  // Enhanced wrapper handler for cash flow entries with debt payment integration
  const handleAddCashFlowEntry = async (
    entryData: Omit<CashFlowEntry, "id" | "created_at">,
  ) => {
    console.log("💰 [FinancialDashboard] Processando entrada de fluxo de caixa:", entryData);
    
    // First, add the cash flow entry
    await addCashFlowEntry(entryData);
    
    // Check if this is a debt payment (expense with "Dívidas" category)
    if (entryData.type === "expense" && entryData.category === "Dívidas") {
      console.log("💳 [FinancialDashboard] Detectado pagamento de dívida, processando...");
      
      // Try to find matching debt by name/description
      const debtName = entryData.reference_name?.replace("💳 ", "").trim() || "";
      const paymentAmount = entryData.amount;
      
      console.log("🔍 [FinancialDashboard] Procurando dívida:", {
        debtName,
        paymentAmount,
        availableDebts: debts.map(d => ({ id: d.id, description: d.description, creditor: d.creditor }))
      });
      
      // Find debt by matching name with description or creditor
      const matchingDebt = debts.find(debt => {
        const debtDescription = debt.description.toLowerCase();
        const debtCreditor = debt.creditor.toLowerCase();
        const searchName = debtName.toLowerCase();
        
        return debtDescription.includes(searchName) || 
               debtCreditor.includes(searchName) ||
               searchName.includes(debtDescription) ||
               searchName.includes(debtCreditor);
      });
      
      if (matchingDebt) {
        console.log("✅ [FinancialDashboard] Dívida encontrada:", {
          id: matchingDebt.id,
          description: matchingDebt.description,
          creditor: matchingDebt.creditor,
          currentPaidAmount: matchingDebt.paid_amount,
          currentRemainingAmount: matchingDebt.remaining_amount,
          paymentAmount
        });
        
        // Calculate new amounts with detailed logging
        console.log("🧮 [FinancialDashboard] Cálculo detalhado:", {
          paid_amount_atual: matchingDebt.paid_amount,
          paid_amount_type: typeof matchingDebt.paid_amount,
          remaining_amount_atual: matchingDebt.remaining_amount,
          remaining_amount_type: typeof matchingDebt.remaining_amount,
          payment_amount: paymentAmount,
          payment_amount_type: typeof paymentAmount
        });
        
        // Ensure all values are numbers to prevent calculation errors
        const currentPaidAmount = Number(matchingDebt.paid_amount) || 0;
        const currentRemainingAmount = Number(matchingDebt.remaining_amount) || 0;
        const paymentAmountNum = Number(paymentAmount) || 0;
        
        const newPaidAmount = currentPaidAmount + paymentAmountNum;
        const newRemainingAmount = Math.max(0, currentRemainingAmount - paymentAmountNum);
        const newStatus = newRemainingAmount === 0 ? "paga" : matchingDebt.status;
        
        console.log("🧮 [FinancialDashboard] Valores convertidos e calculados:", {
          currentPaidAmount,
          currentRemainingAmount,
          paymentAmountNum,
          newPaidAmount,
          newRemainingAmount,
          newStatus
        });
        
        console.log("💾 [FinancialDashboard] Atualizando dívida:", {
          newPaidAmount,
          newRemainingAmount,
          newStatus
        });
        
        // Update the debt with detailed logging
        console.log("🔄 [FinancialDashboard] Chamando updateDebt com:", {
          debtId: matchingDebt.id,
          updates: {
            paid_amount: newPaidAmount,
            remaining_amount: newRemainingAmount,
            status: newStatus
          }
        });
        
        const updateResult = await updateDebt(matchingDebt.id, {
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          status: newStatus
        });
        
        console.log("📥 [FinancialDashboard] Resultado do updateDebt:", updateResult);
        
        // Refresh debts to update UI
        console.log("🔄 [FinancialDashboard] Chamando refreshDebts...");
        await refreshDebts();
        console.log("✅ [FinancialDashboard] refreshDebts concluído");
        
        console.log("🎉 [FinancialDashboard] Pagamento de dívida processado com sucesso!");
        
        // Show success message
        alert(
          `✅ Pagamento de dívida processado com sucesso!\n\n` +
          `💳 Dívida: ${matchingDebt.description}\n` +
          `👤 Credor: ${matchingDebt.creditor}\n` +
          `💰 Valor pago: R$ ${paymentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
          `📊 Valor restante: R$ ${newRemainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
          `🏷️ Status: ${newStatus === 'paga' ? 'PAGA' : 'EM ABERTO'}`
        );
      } else {
        console.log("⚠️ [FinancialDashboard] Nenhuma dívida encontrada para:", debtName);
        console.log("📋 [FinancialDashboard] Dívidas disponíveis:", debts.map(d => `"${d.description}" (${d.creditor})`));
        
        // Show warning message
        alert(
          `⚠️ Pagamento registrado, mas nenhuma dívida correspondente foi encontrada.\n\n` +
          `🔍 Nome procurado: "${debtName}"\n\n` +
          `💡 Dica: Certifique-se de que o nome no campo "Para/De" corresponde à descrição ou credor de uma dívida cadastrada.\n\n` +
          `📋 Dívidas disponíveis:\n${debts.map(d => `• ${d.description} (${d.creditor})`).join('\n')}`
        );
      }
    }
  };

  const handleAddFixedCost = async (
    costData: Omit<FixedCost, "id" | "created_at" | "updated_at">,
  ) => {
    await addFixedCost(costData);
  };

  const handleAddVariableCost = async (
    costData: Omit<VariableCost, "id" | "created_at" | "updated_at">,
  ) => {
    await addVariableCost(costData);
  };

  const handleDeleteDefectiveTireSale = async (saleId: string) => {
    await deleteDefectiveTireSale(saleId);
  };

  const handleDeleteCashFlowEntry = async (id: string) => {
    console.log('🔥 [FinancialDashboard] handleDeleteCashFlowEntry chamada para ID:', id);
    try {
      // First, get the transaction details before deleting
      const transactionToDelete = cashFlowEntries.find(entry => entry.id === id);
      
      if (!transactionToDelete) {
        console.error('❌ [FinancialDashboard] Transação não encontrada para ID:', id);
        return false;
      }
      
      console.log('🔍 [FinancialDashboard] Transação encontrada:', {
        id: transactionToDelete.id,
        type: transactionToDelete.type,
        category: transactionToDelete.category,
        reference_name: transactionToDelete.reference_name,
        amount: transactionToDelete.amount
      });
      
      // Check if this is a debt payment that needs to be reversed
      const isDebtPayment = transactionToDelete.type === "expense" && transactionToDelete.category === "Dívidas";
      
      if (isDebtPayment) {
        console.log("💳 [FinancialDashboard] Detectado pagamento de dívida sendo excluído, revertendo...");
        
        // Find the matching debt
        const debtName = transactionToDelete.reference_name?.replace("💳 ", "").trim() || "";
        const paymentAmount = transactionToDelete.amount;
        
        console.log("🔍 [FinancialDashboard] Procurando dívida para reverter:", {
          debtName,
          paymentAmount,
          availableDebts: debts.map(d => ({ id: d.id, description: d.description, creditor: d.creditor }))
        });
        
        // Find debt by matching name with description or creditor
        const matchingDebt = debts.find(debt => {
          const debtDescription = debt.description.toLowerCase();
          const debtCreditor = debt.creditor.toLowerCase();
          const searchName = debtName.toLowerCase();
          
          return debtDescription.includes(searchName) || 
                 debtCreditor.includes(searchName) ||
                 searchName.includes(debtDescription) ||
                 searchName.includes(debtCreditor);
        });
        
        if (matchingDebt) {
          console.log("✅ [FinancialDashboard] Dívida encontrada para reversão:", {
            id: matchingDebt.id,
            description: matchingDebt.description,
            creditor: matchingDebt.creditor,
            currentPaidAmount: matchingDebt.paid_amount,
            currentRemainingAmount: matchingDebt.remaining_amount,
            paymentAmountToReverse: paymentAmount
          });
          
          // Calculate reversed amounts with detailed logging
          console.log("🔄 [FinancialDashboard] Cálculo de reversão detalhado:", {
            paid_amount_atual: matchingDebt.paid_amount,
            paid_amount_type: typeof matchingDebt.paid_amount,
            remaining_amount_atual: matchingDebt.remaining_amount,
            remaining_amount_type: typeof matchingDebt.remaining_amount,
            payment_amount_to_reverse: paymentAmount,
            payment_amount_type: typeof paymentAmount
          });
          
          // Ensure all values are numbers to prevent calculation errors
          const currentPaidAmount = Number(matchingDebt.paid_amount) || 0;
          const currentRemainingAmount = Number(matchingDebt.remaining_amount) || 0;
          const paymentAmountNum = Number(paymentAmount) || 0;
          
          const newPaidAmount = Math.max(0, currentPaidAmount - paymentAmountNum);
          const newRemainingAmount = currentRemainingAmount + paymentAmountNum;
          const newStatus = newRemainingAmount > 0 ? (matchingDebt.status === "paga" ? "em_dia" : matchingDebt.status) : "paga";
          
          console.log("🔄 [FinancialDashboard] Valores de reversão convertidos e calculados:", {
            currentPaidAmount,
            currentRemainingAmount,
            paymentAmountNum,
            newPaidAmount,
            newRemainingAmount,
            newStatus
          });
          
          console.log("💾 [FinancialDashboard] Revertendo dívida:", {
            newPaidAmount,
            newRemainingAmount,
            newStatus
          });
          
          // Update the debt with reversed amounts
          await updateDebt(matchingDebt.id, {
            paid_amount: newPaidAmount,
            remaining_amount: newRemainingAmount,
            status: newStatus,
          });
          
          // Refresh debts to get updated data
          await refreshDebts();
          
          console.log("✅ [FinancialDashboard] Dívida revertida com sucesso!");
          
          // Show success message to user
          alert(`✅ Pagamento excluído com sucesso!\n\n💳 O valor de R$ ${paymentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi devolvido à dívida "${matchingDebt.description}".`);
        } else {
          console.log("⚠️ [FinancialDashboard] Nenhuma dívida correspondente encontrada para reversão");
          alert(`⚠️ Pagamento excluído, mas não foi possível encontrar a dívida correspondente para reverter o valor.\n\nVerifique manualmente a dívida: "${debtName}"`);
        }
      }
      
      // Now delete the cash flow entry
      const success = await deleteCashFlowEntry(id);
      console.log('🔥 [FinancialDashboard] Resultado da exclusão:', success);
      return success;
    } catch (error) {
      console.error('❌ [FinancialDashboard] Erro ao deletar:', error);
      return false;
    }
  };

  // Enhanced defective tire sale handler that ensures immediate UI update
  const handleAddDefectiveTireSale = async (
    saleData: Omit<DefectiveTireSale, "id" | "created_at">,
  ) => {
    console.log(
      "🏭 [FinancialDashboard] INICIANDO registro de venda de pneu defeituoso:",
      {
        ...saleData,
        sale_date_formatted: new Date(saleData.sale_date).toLocaleDateString(
          "pt-BR",
        ),
        timestamp: new Date().toISOString(),
      },
    );

    try {
      console.log("🔄 [FinancialDashboard] Chamando addDefectiveTireSale...");
      const result = await addDefectiveTireSale(saleData);

      if (!result) {
        throw new Error(
          "addDefectiveTireSale retornou null - falha no registro",
        );
      }

      console.log("✅ [FinancialDashboard] Venda registrada com SUCESSO:", {
        id: result.id,
        tire_name: result.tire_name,
        quantity: result.quantity,
        sale_value: result.sale_value,
        sale_date: result.sale_date,
        sale_date_formatted: new Date(result.sale_date).toLocaleDateString(
          "pt-BR",
        ),
        created_at: result.created_at,
      });

      // Refresh data after successful addition
      console.log("🔄 [FinancialDashboard] Atualizando a lista de vendas...");
      await refreshDefectiveTireSales();
      console.log("✨ [FinancialDashboard] Lista de vendas atualizada.");

      // Optional: Trigger a general refresh if provided
      onRefresh();
    } catch (error) {
      console.error(
        "❌ [FinancialDashboard] ERRO CRÍTICO ao registrar venda:",
        {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          saleData,
        },
      );
      throw error;
    }
  };

  // Financial archive handlers
  const handleArchiveFixedCost = async (costId: string) => {
    const cost = fixedCosts.find((c) => c.id === costId);
    if (cost) {
      await updateFixedCost(costId, { archived: !cost.archived });
    }
  };

  const handleArchiveVariableCost = async (costId: string) => {
    const cost = variableCosts.find((c) => c.id === costId);
    if (cost) {
      await updateVariableCost(costId, { archived: !cost.archived });
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-green to-neon-blue flex items-center justify-center">
            <span className="text-white font-bold text-lg">💰</span>
          </div>
          Sistema Financeiro
        </h2>
        <p className="text-tire-300 mt-2">
          Controle completo das finanças da empresa
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-center w-full">
        <TabsList className="inline-flex flex-wrap items-center justify-evenly gap-2 bg-factory-800/50 p-2 border border-tire-600/30 mx-auto h-auto w-full">
          <TabsTrigger
            value="cashflow"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-green/20"
          >
            Fluxo de Caixa
          </TabsTrigger>


          <TabsTrigger
            value="fixed-costs"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-green/20"
          >
            Custos Fixos
          </TabsTrigger>
          <TabsTrigger
            value="variable-costs"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-green/20"
          >
            Custos Variáveis
          </TabsTrigger>
          <TabsTrigger
            value="tire-cost"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-green/20"
          >
            Custo por Pneu
          </TabsTrigger>
          <TabsTrigger
            value="defective-tire-sales"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-green/20"
          >
            Venda Pneus com Defeito
          </TabsTrigger>
          <TabsTrigger
            value="presumed-profit"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-green/20"
          >
            Lucro Produtos Finais
          </TabsTrigger>
          <TabsTrigger
            value="resale-product-profit"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-green/20"
          >
            Lucro Produto Revenda
          </TabsTrigger>
          <TabsTrigger
            value="debts"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-green/20"
          >
            Dívidas
          </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="cashflow">
          <CashFlowManager
            isLoading={
              cashFlowLoading ||
              employeesLoading ||
              suppliersLoading ||
              customersLoading ||
              fixedCostsLoading ||
              variableCostsLoading ||
              salespeopleLoading
            }
            cashFlowEntries={cashFlowEntries}
            employees={employees}
            suppliers={suppliers}
            customers={customers}
            fixedCosts={fixedCosts}
            variableCosts={variableCosts}
            salespeople={salespeople}
            onSubmit={handleAddCashFlowEntry}
            onDelete={handleDeleteCashFlowEntry}
          />
        </TabsContent>





        <TabsContent value="fixed-costs">
          <FixedCostsManager
            isLoading={fixedCostsLoading}
            fixedCosts={fixedCosts}
            onSubmit={handleAddFixedCost}
            onArchive={handleArchiveFixedCost}
          />
        </TabsContent>

        <TabsContent value="variable-costs">
          <VariableCostsManager
            isLoading={variableCostsLoading}
            variableCosts={variableCosts}
            onSubmit={handleAddVariableCost}
            onArchive={handleArchiveVariableCost}
          />
        </TabsContent>

        <TabsContent value="tire-cost">
          <TireCostManager
            isLoading={
              materialsLoading ||
              employeesLoading ||
              fixedCostsLoading ||
              variableCostsLoading ||
              stockItemsLoading ||
              productionLoading ||
              productsLoading ||
              cashFlowLoading ||
              recipesLoading ||
              defectiveTireSalesLoading ||
              warrantyEntriesLoading
            }
            materials={materials}
            employees={employees}
            fixedCosts={fixedCosts}
            variableCosts={variableCosts}
            stockItems={stockItems}
            productionEntries={productionEntries}
            products={products}
            cashFlowEntries={cashFlowEntries}
            recipes={recipes}
            defectiveTireSales={defectiveTireSales}
            warrantyEntries={warrantyEntries}
          />
        </TabsContent>

        <TabsContent value="defective-tire-sales">
          <DefectiveTireSalesManager
            isLoading={defectiveTireSalesLoading}
            defectiveTireSales={defectiveTireSales}
            onSubmit={handleAddDefectiveTireSale}
            onDelete={handleDeleteDefectiveTireSale}
          />
        </TabsContent>

        <TabsContent value="presumed-profit">
          <PresumedProfitManager
            isLoading={
              materialsLoading ||
              employeesLoading ||
              fixedCostsLoading ||
              variableCostsLoading ||
              stockItemsLoading ||
              productionLoading ||
              productsLoading ||
              cashFlowLoading ||
              recipesLoading ||
              defectiveTireSalesLoading ||
              warrantyEntriesLoading
            }
            materials={materials}
            employees={employees}
            fixedCosts={fixedCosts}
            variableCosts={variableCosts}
            stockItems={stockItems}
            productionEntries={productionEntries}
            products={products}
            cashFlowEntries={cashFlowEntries}
            recipes={recipes}
            defectiveTireSales={defectiveTireSales}
            warrantyEntries={warrantyEntries}
          />
        </TabsContent>

        <TabsContent value="resale-product-profit">
          <ResaleProductProfitManager
            isLoading={
              cashFlowLoading || stockItemsLoading || resaleProductsLoading
            }
            cashFlowEntries={cashFlowEntries}
            stockItems={stockItems}
          />
        </TabsContent>

        <TabsContent value="debts">
          <DebtManager
            isLoading={isLoading}
            onRefresh={onRefresh}
            cashFlowEntries={cashFlowEntries}
          />
        </TabsContent>
      </Tabs>

      {/* PresumedProfitManager sempre ativo para cálculos em tempo real */}
      <div className="hidden">
        <PresumedProfitManager
          isLoading={
            materialsLoading ||
            employeesLoading ||
            fixedCostsLoading ||
            variableCostsLoading ||
            stockItemsLoading ||
            productionLoading ||
            productsLoading ||
            cashFlowLoading ||
            recipesLoading ||
            defectiveTireSalesLoading ||
            warrantyEntriesLoading
          }
          materials={materials}
          employees={employees}
          fixedCosts={fixedCosts}
          variableCosts={variableCosts}
          stockItems={stockItems}
          productionEntries={productionEntries}
          products={products}
          cashFlowEntries={cashFlowEntries}
          recipes={recipes}
          defectiveTireSales={defectiveTireSales}
          warrantyEntries={warrantyEntries}
        />
      </div>

      {/* ResaleProductProfitManager sempre ativo para cálculos em tempo real */}
      <div className="hidden">
        <ResaleProductProfitManager
          isLoading={
            cashFlowLoading || stockItemsLoading || resaleProductsLoading
          }
          cashFlowEntries={cashFlowEntries}
          stockItems={stockItems}
        />
      </div>
    </div>
  );
};

export default FinancialDashboard;
