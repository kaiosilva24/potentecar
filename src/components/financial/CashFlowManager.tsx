import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  Calendar,
  Filter,
  X,
  CalendarDays,
  Trash2,
  ShoppingCart,
} from "lucide-react";
import {
  CashFlowEntry,
  Employee,
  Supplier,
  Customer,
  FixedCost,
  VariableCost,
  Salesperson,
} from "@/types/financial";
import { useTranslation } from "react-i18next";
import { useStockItems, useResaleProducts, useDebts } from "@/hooks/useDataPersistence";

interface CashFlowManagerProps {
  cashFlowEntries?: CashFlowEntry[];
  employees?: Employee[];
  suppliers?: Supplier[];
  customers?: Customer[];
  fixedCosts?: FixedCost[];
  variableCosts?: VariableCost[];
  salespeople?: Salesperson[];
  onSubmit?: (entry: Omit<CashFlowEntry, "id" | "created_at">) => Promise<void>;
  onDelete: (id: string) => Promise<any>;
  isLoading?: boolean;
}

const CashFlowManager = ({
  cashFlowEntries = [],
  employees = [],
  suppliers = [],
  customers = [],
  fixedCosts = [],
  variableCosts = [],
  salespeople = [],
  onSubmit = async () => {},
  onDelete = async () => false,
  isLoading = false,
}: CashFlowManagerProps) => {
  const { t } = useTranslation();
  const { stockItems, updateStockItem } = useStockItems();
  const { resaleProducts } = useResaleProducts();
  const { debts } = useDebts();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all",
  );
  const [filterMonth, setFilterMonth] = useState("");
  const [dateFilterType, setDateFilterType] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [filterCategory, setFilterCategory] = useState("all_categories");

  // Estados para venda multi-produto
  const [isMultiProductMode, setIsMultiProductMode] = useState(false);
  const [productCart, setProductCart] = useState<Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    productType: 'final' | 'resale';
    originalProductId: string;
  }>>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<'final' | 'resale'>('final');
  const [productQuantity, setProductQuantity] = useState("");
  const [productUnitPrice, setProductUnitPrice] = useState("");

  // Obter produtos disponíveis
  const getAvailableProducts = () => {
    const finalProducts = stockItems
      .filter(item => item.item_type === 'product' && item.quantity > 0)
      .map(item => ({
        id: item.item_id,
        name: item.item_name,
        type: 'final' as const,
        availableQuantity: item.quantity,
        suggestedPrice: item.unit_cost * 1.3 // Margem de 30%
      }));

    const resaleProductsAvailable = resaleProducts
      .filter(product => {
        const stockItem = stockItems.find(item => 
          item.item_id === product.id && item.item_type === 'product'
        );
        return stockItem && stockItem.quantity > 0;
      })
      .map(product => {
        const stockItem = stockItems.find(item => 
          item.item_id === product.id && item.item_type === 'product'
        );
        return {
          id: product.id,
          name: product.name,
          type: 'resale' as const,
          availableQuantity: stockItem?.quantity || 0,
          suggestedPrice: (stockItem?.total_value || 0) / (stockItem?.quantity || 1) * 1.2 // Margem de 20%
        };
      });

    return [...finalProducts, ...resaleProductsAvailable];
  };

  // Funções para gerenciar carrinho de produtos
  const addProductToCart = () => {
    if (!selectedProductId || !productQuantity || !productUnitPrice) {
      alert("Por favor, selecione um produto e preencha quantidade e preço.");
      return;
    }

    const quantity = parseFloat(productQuantity);
    const unitPrice = parseFloat(productUnitPrice);
    
    if (quantity <= 0 || unitPrice <= 0) {
      alert("Quantidade e preço unitário devem ser maiores que zero.");
      return;
    }

    // Encontrar produto selecionado
    const availableProducts = getAvailableProducts();
    const selectedProduct = availableProducts.find(p => p.id === selectedProductId);
    
    if (!selectedProduct) {
      alert("Produto não encontrado.");
      return;
    }

    // Verificar estoque disponível
    if (quantity > selectedProduct.availableQuantity) {
      alert(`Estoque insuficiente. Disponível: ${selectedProduct.availableQuantity}`);
      return;
    }

    const totalPrice = quantity * unitPrice;
    const newProduct = {
      id: Date.now().toString(),
      name: selectedProduct.name,
      quantity,
      unitPrice,
      totalPrice,
      productType: selectedProduct.type,
      originalProductId: selectedProduct.id,
    };

    setProductCart([...productCart, newProduct]);
    
    // Limpar campos
    setSelectedProductId("");
    setProductQuantity("");
    setProductUnitPrice("");
  };

  const removeProductFromCart = (productId: string) => {
    setProductCart(productCart.filter(p => p.id !== productId));
  };

  const clearCart = () => {
    setProductCart([]);
  };

  const getTotalCartValue = () => {
    return productCart.reduce((total, product) => total + product.totalPrice, 0);
  };

  const handleMultiProductSale = async () => {
    if (productCart.length === 0) {
      alert("Adicione pelo menos um produto ao carrinho.");
      return;
    }

    if (!referenceName.trim()) {
      alert("Por favor, informe o nome do cliente.");
      return;
    }

    const totalValue = getTotalCartValue();
    const productDetails = productCart.map(p => 
      `${p.name}: ${p.quantity} un. × R$ ${p.unitPrice.toFixed(2)} = R$ ${p.totalPrice.toFixed(2)}`
    ).join(" | ");

    const description = `VENDA MULTI-PRODUTO | Cliente: ${referenceName.trim()} | Produtos: ${productDetails} | Total: R$ ${totalValue.toFixed(2)}`;

    // Corrigir data para compensar conversão UTC
    const selectedDate = new Date(transactionDate + 'T00:00:00');
    selectedDate.setDate(selectedDate.getDate() + 1);
    const fixedTransactionDate = selectedDate.toISOString().split('T')[0];

    await onSubmit({
      type: "income",
      category: "Venda Multi-Produto",
      reference_id: undefined,
      reference_name: referenceName.trim(),
      amount: totalValue,
      description,
      transaction_date: fixedTransactionDate,
    });

    // Limpar formulário e carrinho
    setReferenceName("");
    clearCart();
    setIsMultiProductMode(false);
    
    alert(`Venda registrada com sucesso!\n\nTotal: R$ ${totalValue.toFixed(2)}\nProdutos: ${productCart.length}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For income, category is not required; for expense, it is required
    const categoryRequired = type === "expense";

    if (
      (categoryRequired && !category) ||
      !referenceName.trim() ||
      !amount ||
      parseFloat(amount) <= 0
    )
      return;

    // Get category label in Portuguese for saving
    const categoryToSave =
      type === "expense" ? getCategoryLabel(category) : "Entrada de Caixa";

    // Corrigir data para compensar conversão UTC (mesmo fix do DailyProduction)
    const selectedDate = new Date(transactionDate + 'T00:00:00');
    selectedDate.setDate(selectedDate.getDate() + 1);
    const fixedTransactionDate = selectedDate.toISOString().split('T')[0];

    // Special handling for debt payments
    if (type === "expense" && category === "debts") {
      console.log("💳 [DEBT PAYMENT] Registrando pagamento de dívida:", {
        amount: parseFloat(amount),
        referenceName: referenceName.trim(),
        description: description.trim(),
        date: fixedTransactionDate
      });

      // Add special marker to description to identify debt payments
      const debtDescription = description.trim() 
        ? `PAGAMENTO_DIVIDA: ${description.trim()}` 
        : `PAGAMENTO_DIVIDA: ${referenceName.trim()}`;

      await onSubmit({
        type,
        category: categoryToSave, // Save category name in Portuguese
        reference_id: referenceId || undefined,
        reference_name: `💳 ${referenceName.trim()}`, // Add debt icon to reference name
        amount: parseFloat(amount),
        description: debtDescription,
        transaction_date: fixedTransactionDate,
      });

      // Show success message with debt payment info
      alert(
        `Pagamento de dívida registrado com sucesso!\n\n` +
        `💳 Dívida: ${referenceName.trim()}\n` +
        `💰 Valor: ${formatCurrency(parseFloat(amount))}\n` +
        `📅 Data: ${new Date(fixedTransactionDate).toLocaleDateString("pt-BR")}\n\n` +
        `✅ Este valor será descontado do total de dívidas automaticamente.`
      );
    } else {
      // Regular transaction handling
      await onSubmit({
        type,
        category: categoryToSave, // Save category name in Portuguese
        reference_id: referenceId || undefined,
        reference_name: referenceName.trim(),
        amount: parseFloat(amount),
        description: description.trim() || undefined,
        transaction_date: fixedTransactionDate,
      });
    }

    // Reset form
    setCategory("");
    setReferenceId("");
    setReferenceName("");
    setAmount("");
    setDescription("");
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setReferenceId("");
    setReferenceName("");
  };

  const handleReferenceChange = (value: string) => {
    setReferenceId(value);

    // Find the reference name based on category and ID
    let name = "";
    switch (category) {
      case "employees":
        name = employees.find((e) => e.id === value)?.name || "";
        break;
      case "suppliers":
        name = suppliers.find((s) => s.id === value)?.name || "";
        break;
      case "customers":
        name = customers.find((c) => c.id === value)?.name || "";
        break;
      case "salespeople":
        name = salespeople.find((s) => s.id === value)?.name || "";
        break;
      case "fixed_costs":
        name = fixedCosts.find((f) => f.id === value)?.name || "";
        break;
      case "variable_costs":
        name = variableCosts.find((v) => v.id === value)?.name || "";
        break;
      case "debts":
        const debt = debts.find((d) => d.id === value);
        name = debt ? `${debt.description} (${debt.creditor})` : "";
        break;
    }
    setReferenceName(name);
  };

  const getExpenseCategories = () => [
    { value: "employees", label: "Funcionários", data: employees },
    { value: "suppliers", label: "Fornecedores", data: suppliers },
    { value: "salespeople", label: "Vendedores", data: salespeople },
    { value: "fixed_costs", label: "Custos Fixos", data: fixedCosts },
    { value: "variable_costs", label: "Custos Variáveis", data: variableCosts },
    { value: "debts", label: "Dívidas", data: debts }, // Categoria para pagamento de dívidas com dados reais
  ];

  const getIncomeCategories = () => [
    { value: "customers", label: "Clientes", data: customers },
    { value: "salespeople", label: "Vendedores", data: salespeople },
  ];

  const getCurrentCategoryData = () => {
    const allCategories = [...getExpenseCategories(), ...getIncomeCategories()];
    return allCategories.find((cat) => cat.value === category)?.data || [];
  };

  // Function to get category label in Portuguese
  const getCategoryLabel = (categoryValue: string) => {
    const allCategories = [...getExpenseCategories(), ...getIncomeCategories()];
    return (
      allCategories.find((cat) => cat.value === categoryValue)?.label ||
      categoryValue
    );
  };

  // Get all available categories for filter (same as selection categories)
  const getAllCategories = () => {
    const categories: string[] = [];

    // Add expense categories
    getExpenseCategories().forEach((cat) => {
      categories.push(cat.label);
    });

    // Add income category
    categories.push("Entrada de Caixa");

    // Add sales category for filtering
    categories.push("Venda");

    return categories;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const filteredEntries = cashFlowEntries.filter((entry) => {
    const matchesSearch =
      entry.reference_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.description &&
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === "all" || entry.type === filterType;
    const matchesCategory =
      !filterCategory ||
      filterCategory === "all_categories" ||
      entry.category === filterCategory ||
      (filterCategory === "Venda" &&
        entry.category.toLowerCase().includes("venda"));

    // Advanced date filtering with proper timezone handling
    let matchesDate = true;
    const entryDate = new Date(entry.transaction_date);
    const today = new Date();

    switch (dateFilterType) {
      case "today":
        // Use local date interval instead of string comparison
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        matchesDate = entryDate >= todayStart && entryDate <= todayEnd;
        break;
      case "last7days":
        const last7DaysStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        last7DaysStart.setHours(0, 0, 0, 0);
        matchesDate = entryDate >= last7DaysStart;
        break;
      case "last30days":
        const last30DaysStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        last30DaysStart.setHours(0, 0, 0, 0);
        matchesDate = entryDate >= last30DaysStart;
        break;
      case "thisMonth":
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
        matchesDate = entryDate >= thisMonthStart && entryDate <= thisMonthEnd;
        break;
      case "lastMonth":
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
        matchesDate = entryDate >= lastMonthStart && entryDate <= lastMonthEnd;
        break;

      case "custom":
        if (customStartDate && customEndDate) {
          // WORKAROUND: Compensate for +1 day UTC workaround in transaction saving
          // Since transactions are saved with +1 day, we need to add +1 day to filter dates too
          const startDate = new Date(customStartDate);
          startDate.setDate(startDate.getDate() + 1);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(customEndDate);
          endDate.setDate(endDate.getDate() + 1);
          endDate.setHours(23, 59, 59, 999);
          
          // Debug logs for custom date filtering
          console.log("🗓️ [CUSTOM FILTER DEBUG] Cash Flow Transactions:", {
            selectedStartDate: customStartDate,
            selectedEndDate: customEndDate,
            adjustedStartDate: startDate.toString(),
            adjustedEndDate: endDate.toString(),
            entryDate: entryDate.toString(),
            entryTransactionDate: entry.transaction_date,
            matchesDate: entryDate >= startDate && entryDate <= endDate,
            note: "Added +1 day to compensate UTC workaround"
          });
          
          matchesDate = entryDate >= startDate && entryDate <= endDate;
        } else if (customStartDate) {
          const startDate = new Date(customStartDate);
          startDate.setDate(startDate.getDate() + 1);
          startDate.setHours(0, 0, 0, 0);
          matchesDate = entryDate >= startDate;
        } else if (customEndDate) {
          const endDate = new Date(customEndDate);
          endDate.setDate(endDate.getDate() + 1);
          endDate.setHours(23, 59, 59, 999);
          matchesDate = entryDate <= endDate;
        }
        break;
      case "all":
      default:
        matchesDate = true;
        break;
    }

    return matchesSearch && matchesType && matchesDate && matchesCategory;
  });

  const totalIncome = filteredEntries
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpense = filteredEntries
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const balance = totalIncome - totalExpense;

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterMonth("");
    setDateFilterType("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setFilterCategory("all_categories");
  };

  // Utility function to extract product info from sale description
  const extractProductInfoFromSale = (description: string) => {
    console.log('🔍 [FINANCIAL DELETE] Analisando descrição:', description);
    
    // Try multiple patterns to extract product ID and quantity
    let productIdMatch = description.match(/ID_Produto: ([^|]+)/);
    if (!productIdMatch) {
      productIdMatch = description.match(/PRODUTO_ID: ([^|]+)/);
    }
    
    let quantityMatch = description.match(/Qtd: (\d+)/);
    if (!quantityMatch) {
      quantityMatch = description.match(/QUANTIDADE: (\d+)/);
    }
    
    console.log('🔍 [FINANCIAL DELETE] Matches encontrados:', { 
      productIdMatch: productIdMatch?.[1], 
      quantityMatch: quantityMatch?.[1] 
    });
    
    if (productIdMatch && quantityMatch) {
      const result = {
        productId: productIdMatch[1].trim(),
        quantity: parseInt(quantityMatch[1])
      };
      console.log('✅ [FINANCIAL DELETE] Produto extraído com sucesso:', result);
      return result;
    }
    
    console.log('❌ [FINANCIAL DELETE] Não foi possível extrair informações do produto');
    return null;
  };

  // Handle delete transaction
  const handleDeleteTransaction = async (entry: CashFlowEntry) => {
    console.log('🔥 [FINANCIAL DELETE] Iniciando exclusão:', { entryId: entry.id, referenceName: entry.reference_name });
    
    const confirmMessage = `Tem certeza que deseja excluir esta transação?\n\nTipo: ${entry.type === "income" ? "Entrada" : "Saída"}\nValor: ${formatCurrency(entry.amount)}\nReferência: ${entry.reference_name}\nData: ${new Date(entry.transaction_date).toLocaleDateString("pt-BR")}\n\nSe for uma venda, os produtos serão devolvidos ao estoque.`;

    if (confirm(confirmMessage)) {
      let stockRestored = false;
      
      try {
        console.log('🔥 [FINANCIAL DELETE] Usuário confirmou, iniciando processo...');
        console.log('🔥 [FINANCIAL DELETE] Descrição da transação:', entry.description);
        
        // Check if this is a sale transaction that needs stock restoration
        const isSaleTransaction = entry.category === "venda" || entry.category === "venda_prazo";
        
        if (isSaleTransaction && entry.description) {
          console.log('🔥 [FINANCIAL DELETE] É uma venda, extraindo informações do produto...');
          
          // Extract product info from sale description
          const productInfo = extractProductInfoFromSale(entry.description);
          console.log('🔥 [FINANCIAL DELETE] Info do produto extraída:', productInfo);

          // Check if it's a resale product or final product
          const isResaleProduct = entry.description.includes("TIPO_PRODUTO: revenda");
          const isFinalProduct = entry.description.includes("TIPO_PRODUTO: final");
          
          console.log('🔥 [FINANCIAL DELETE] Tipo de produto:', { isResaleProduct, isFinalProduct });

          if (productInfo) {
            console.log('🔥 [FINANCIAL DELETE] Produto ID para buscar:', productInfo.productId);
            console.log('🔥 [FINANCIAL DELETE] Quantidade para retornar:', productInfo.quantity);
            
            // FIRST: Try to restore stock before deleting the transaction
            try {
              if (isResaleProduct) {
                console.log('🔥 [FINANCIAL DELETE] Processando produto de revenda...');
                // Handle resale product stock restoration in stock_items table
                const stockItem = stockItems.find(
                  (item) => {
                    console.log('🔥 [FINANCIAL DELETE] Comparando item:', { 
                      itemId: item.item_id, 
                      itemType: item.item_type,
                      searchingFor: productInfo.productId 
                    });
                    return item.item_id === productInfo.productId && item.item_type === "product";
                  }
                );

                console.log('🔥 [FINANCIAL DELETE] Item de estoque encontrado (revenda):', stockItem);

                if (stockItem) {
                  // Return quantity to stock_items
                  const newQuantity = stockItem.quantity + productInfo.quantity;
                  const newTotalValue = newQuantity * stockItem.unit_cost;

                  console.log('🔥 [FINANCIAL DELETE] Atualizando estoque revenda:', {
                    stockItemId: stockItem.id,
                    previousQuantity: stockItem.quantity,
                    returnedQuantity: productInfo.quantity,
                    newQuantity: newQuantity,
                    newTotalValue: newTotalValue,
                  });

                  await updateStockItem(stockItem.id, {
                    quantity: newQuantity,
                    total_value: newTotalValue,
                    last_updated: new Date().toISOString(),
                  });

                  console.log('✅ [FINANCIAL DELETE] Estoque de produto de revenda restaurado com sucesso!');
                  stockRestored = true;
                } else {
                  console.error('❌ [FINANCIAL DELETE] Item de estoque não encontrado para produto de revenda:', productInfo.productId);
                  console.log('🔥 [FINANCIAL DELETE] Itens disponíveis no estoque:', stockItems.map(item => ({
                    id: item.item_id,
                    name: item.item_name,
                    type: item.item_type
                  })));
                }
              } else if (isFinalProduct) {
                console.log('🔥 [FINANCIAL DELETE] Processando produto final...');
                // Handle final product stock restoration
                const stockItem = stockItems.find(
                  (item) => {
                    console.log('🔥 [FINANCIAL DELETE] Comparando item final:', { 
                      itemId: item.id, 
                      itemName: item.item_name,
                      searchingFor: productInfo.productId 
                    });
                    return item.id === productInfo.productId;
                  }
                );

                console.log('🔥 [FINANCIAL DELETE] Item de estoque encontrado (final):', stockItem);

                if (stockItem) {
                  // Return quantity to stock
                  const newQuantity = stockItem.quantity + productInfo.quantity;
                  const newTotalValue = newQuantity * stockItem.unit_cost;

                  console.log('🔥 [FINANCIAL DELETE] Atualizando estoque final:', {
                    stockItemId: stockItem.id,
                    previousQuantity: stockItem.quantity,
                    returnedQuantity: productInfo.quantity,
                    newQuantity: newQuantity,
                    newTotalValue: newTotalValue,
                  });

                  await updateStockItem(stockItem.id, {
                    quantity: newQuantity,
                    total_value: newTotalValue,
                    last_updated: new Date().toISOString(),
                  });

                  console.log('✅ [FINANCIAL DELETE] Estoque de produto final restaurado com sucesso!');
                  stockRestored = true;
                } else {
                  console.error('❌ [FINANCIAL DELETE] Produto final não encontrado no estoque:', productInfo.productId);
                  console.log('🔥 [FINANCIAL DELETE] Produtos finais disponíveis:', stockItems.filter(item => item.item_type === 'product').map(item => ({
                    id: item.id,
                    name: item.item_name,
                    quantity: item.quantity
                  })));
                }
              }
            } catch (stockError) {
              console.error('❌ [FINANCIAL DELETE] Erro ao restaurar estoque:', stockError);
              alert(`Erro ao restaurar estoque: ${stockError.message || stockError}\n\nA transação NÃO foi excluída para manter integridade dos dados.`);
              return; // Don't proceed with deletion if stock restoration fails
            }
          } else {
            console.error('❌ [FINANCIAL DELETE] Não foi possível extrair informações do produto da venda');
            console.log('🔥 [FINANCIAL DELETE] Descrição completa:', entry.description);
          }
        } else {
          console.log('🔥 [FINANCIAL DELETE] Não é uma venda ou sem descrição, prosseguindo com exclusão normal');
          stockRestored = true; // Allow deletion for non-sale transactions
        }

        // SECOND: Only delete from cash flow if stock was restored successfully (or not needed)
        console.log('🔥 [FINANCIAL DELETE] Deletando entrada do fluxo de caixa...');
        try {
          const success = await onDelete(entry.id);
          if (!success) {
            console.error('❌ [FINANCIAL DELETE] onDelete retornou false');
            
            // If stock was restored but cash flow deletion failed, we have a problem
            if (stockRestored && isSaleTransaction) {
              alert(`ATENÇÃO: O estoque foi restaurado, mas houve erro ao deletar a transação do fluxo de caixa.\n\nContate o suporte técnico.`);
            } else {
              alert("Erro ao excluir a transação. Tente novamente.");
            }
            return;
          }
          console.log('✅ [FINANCIAL DELETE] Entrada do fluxo de caixa deletada com sucesso!');
        } catch (deleteError) {
          console.error("❌ [FINANCIAL DELETE] Erro específico ao deletar do fluxo de caixa:", deleteError);
          
          // If stock was restored but cash flow deletion failed, we have a problem
          if (stockRestored && isSaleTransaction) {
            alert(`ATENÇÃO: O estoque foi restaurado, mas houve erro ao deletar a transação do fluxo de caixa.\n\nErro: ${deleteError.message || deleteError}\n\nContate o suporte técnico.`);
          } else {
            alert(`Erro ao excluir a transação: ${deleteError.message || deleteError}\n\nNenhuma alteração foi feita.`);
          }
          return;
        }

        // Success message
        if (isSaleTransaction && stockRestored) {
          alert(
            `Transação excluída com sucesso!\n\n` +
              `📦 Os produtos foram devolvidos ao estoque automaticamente.`,
          );
        } else {
          alert('Transação excluída com sucesso!');
        }
        
      } catch (error) {
        console.error("❌ [FINANCIAL DELETE] Erro geral ao excluir transação:", error);
        alert(`Erro ao excluir a transação: ${error.message || error}\n\nVerifique o console para mais detalhes.`);
      }
    }
  };

  // Check if any filter is active
  const hasActiveFilters =
    searchTerm ||
    filterType !== "all" ||
    dateFilterType !== "all" ||
    filterMonth ||
    customStartDate ||
    customEndDate ||
    (filterCategory && filterCategory !== "all_categories");

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-blue to-neon-green flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-white" />
          </div>
          Fluxo de Caixa
        </h2>
        <p className="text-tire-300 mt-2">
          Controle de entradas e saídas de caixa
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Total Entradas</p>
                <p className="text-2xl font-bold text-neon-green">
                  {formatCurrency(totalIncome)}
                </p>
              </div>
              <div className="text-neon-green">
                <ArrowUpCircle className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Total Saídas</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(totalExpense)}
                </p>
              </div>
              <div className="text-red-400">
                <ArrowDownCircle className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tire-300 text-sm">Saldo</p>
                <p
                  className={`text-2xl font-bold ${
                    balance >= 0 ? "text-neon-blue" : "text-red-400"
                  }`}
                >
                  {formatCurrency(balance)}
                </p>
              </div>
              <div className={balance >= 0 ? "text-neon-blue" : "text-red-400"}>
                <DollarSign className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Registrar Transação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-tire-300">Tipo de Transação *</Label>
                <Select
                  value={type}
                  onValueChange={(value: "income" | "expense") => {
                    setType(value);
                    setCategory("");
                    setReferenceId("");
                    setReferenceName("");
                  }}
                >
                  <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-factory-800 border-tire-600/30">
                    <SelectItem
                      value="expense"
                      className="text-white hover:bg-tire-700/50"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-red-400" />
                        Saída de Caixa
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="income"
                      className="text-white hover:bg-tire-700/50"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-neon-green" />
                        Entrada de Caixa
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category selection - only for expenses */}
              {type === "expense" && (
                <div className="space-y-2">
                  <Label className="text-tire-300">Categoria *</Label>
                  <Select value={category} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-factory-800 border-tire-600/30">
                      {getExpenseCategories().map((cat) => (
                        <SelectItem
                          key={cat.value}
                          value={cat.value}
                          className="text-white hover:bg-tire-700/50"
                        >
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Reference selection for expenses (based on category) */}
              {type === "expense" && category && (
                <div className="space-y-2">
                  <Label className="text-tire-300">Pagar para *</Label>
                  <Select
                    value={referenceId}
                    onValueChange={handleReferenceChange}
                  >
                    <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-factory-800 border-tire-600/30">
                      {getCurrentCategoryData()
                        .filter((item: any) => !item.archived)
                        .map((item: any) => {
                          return (
                            <SelectItem
                              key={item.id}
                              value={item.id}
                              className="text-white hover:bg-tire-700/50"
                            >
                              {category === "debts" 
                                ? `${item.description} (${item.creditor}) - R$ ${(parseFloat(item.remaining_amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                                : item.name
                              }
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Direct reference name input for income */}
              {type === "income" && (
                <div className="space-y-2">
                  <Label htmlFor="referenceName" className="text-tire-300">
                    Receber de *
                  </Label>
                  <Input
                    id="referenceName"
                    type="text"
                    value={referenceName}
                    onChange={(e) => setReferenceName(e.target.value)}
                    className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                    placeholder="Nome do cliente, empresa ou pessoa..."
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-tire-300">
                  Valor (R$) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-tire-300">
                  Data da Transação *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="bg-factory-700/50 border-tire-600/30 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-tire-300">
                  Observações (Opcional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  placeholder="Detalhes da transação..."
                  rows={3}
                />
              </div>

              {/* Toggle para modo multi-produto (apenas para entradas) */}
              {type === "income" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-tire-300">Modo de Venda</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsMultiProductMode(!isMultiProductMode);
                        if (!isMultiProductMode) {
                          setAmount("");
                        } else {
                          clearCart();
                        }
                      }}
                      className={`text-xs ${
                        isMultiProductMode 
                          ? "text-neon-green bg-neon-green/10" 
                          : "text-tire-300 hover:text-white"
                      }`}
                    >
                      {isMultiProductMode ? "🛒 Multi-Produto" : "💰 Valor Único"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Interface Multi-Produto */}
              {type === "income" && isMultiProductMode && (
                <div className="space-y-4 p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart className="h-4 w-4 text-neon-green" />
                    <span className="text-tire-200 font-medium">Selecionar Produtos para Venda</span>
                  </div>

                  {/* Formulário para adicionar produto - Layout solicitado */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Seleção de Produto (Esquerda) */}
                    <div className="space-y-2">
                      <Label className="text-tire-300 text-sm font-medium">Produto</Label>
                      <Select 
                        value={selectedProductId} 
                        onValueChange={(value) => {
                          setSelectedProductId(value);
                          // Auto-preencher preço sugerido
                          const product = getAvailableProducts().find(p => p.id === value);
                          if (product) {
                            setProductUnitPrice(product.suggestedPrice.toFixed(2));
                          }
                        }}
                      >
                        <SelectTrigger className="bg-factory-600/50 border-tire-600/30 text-white">
                          <SelectValue placeholder="Selecione um produto..." />
                        </SelectTrigger>
                        <SelectContent className="bg-factory-800 border-tire-600/30 max-h-60">
                          {getAvailableProducts().map((product) => (
                            <SelectItem
                              key={product.id}
                              value={product.id}
                              className="text-white hover:bg-tire-700/50"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{product.name}</span>
                                <span className="text-xs text-tire-400">
                                  {product.type === 'final' ? '🏭' : '🛒'} Estoque: {product.availableQuantity} | Sugerido: R$ {product.suggestedPrice.toFixed(2)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantidade (Meio) */}
                    <div className="space-y-2">
                      <Label className="text-tire-300 text-sm font-medium">Quantidade</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={productQuantity}
                        onChange={(e) => setProductQuantity(e.target.value)}
                        className="bg-factory-600/50 border-tire-600/30 text-white"
                        placeholder="1"
                      />
                      {selectedProductId && (
                        <p className="text-xs text-tire-400">
                          Máx: {getAvailableProducts().find(p => p.id === selectedProductId)?.availableQuantity || 0}
                        </p>
                      )}
                    </div>

                    {/* Valor Unitário (Direita) */}
                    <div className="space-y-2">
                      <Label className="text-tire-300 text-sm font-medium">Valor Unitário (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={productUnitPrice}
                        onChange={(e) => setProductUnitPrice(e.target.value)}
                        className="bg-factory-600/50 border-tire-600/30 text-white"
                        placeholder="0,00"
                      />
                      {selectedProductId && productQuantity && productUnitPrice && (
                        <p className="text-xs text-neon-green font-medium">
                          Total: R$ {(parseFloat(productQuantity) * parseFloat(productUnitPrice)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={addProductToCart}
                    className="w-full bg-gradient-to-r from-neon-green to-neon-blue hover:from-neon-blue hover:to-neon-green text-white"
                    disabled={!selectedProductId || !productQuantity || !productUnitPrice}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar ao Carrinho
                  </Button>

                  {/* Carrinho de Produtos */}
                  {productCart.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-tire-200 font-medium text-sm">Carrinho ({productCart.length} produtos)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearCart}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Limpar
                        </Button>
                      </div>
                      
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {productCart.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-2 bg-factory-600/30 rounded border border-tire-600/20"
                          >
                            <div className="flex-1">
                              <div className="text-white text-sm font-medium">{product.name}</div>
                              <div className="text-tire-400 text-xs">
                                {product.quantity} un. × R$ {product.unitPrice.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-neon-green font-bold text-sm">
                                R$ {product.totalPrice.toFixed(2)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeProductFromCart(product.id)}
                                className="text-red-400 hover:text-red-300 p-1 h-6 w-6"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total do Carrinho */}
                      <div className="flex justify-between items-center pt-2 border-t border-tire-600/30">
                        <span className="text-tire-200 font-medium">Total da Venda:</span>
                        <span className="text-neon-green font-bold text-lg">
                          R$ {getTotalCartValue().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botões de ação */}
              {type === "income" && isMultiProductMode ? (
                <Button
                  type="button"
                  onClick={handleMultiProductSale}
                  className="w-full bg-gradient-to-r from-neon-green to-neon-blue hover:from-neon-blue hover:to-neon-green text-white"
                  disabled={isLoading || !referenceName || productCart.length === 0}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Finalizar Venda Multi-Produto
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-neon-blue to-neon-green hover:from-neon-green hover:to-neon-blue text-white"
                  disabled={
                    isLoading ||
                    (type === "expense" && !category) ||
                    !referenceName ||
                    !amount
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Transação
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="xl:col-span-2 bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-neon-blue" />
                Histórico de Transações
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-tire-300 hover:text-white hover:bg-tire-700/50 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Limpar Filtros
                </Button>
              )}
            </CardTitle>

            {/* Filtros Organizados */}
            <div className="space-y-4">
              {/* Barra de Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                <Input
                  placeholder="Buscar por nome, categoria ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                />
              </div>

              {/* Seção de Filtros */}
              <div className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-neon-blue" />
                  <Label className="text-tire-200 font-medium">
                    Filtros Avançados
                  </Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Tipo de Transação */}
                  <div className="space-y-2">
                    <Label className="text-tire-300 text-sm">Tipo:</Label>
                    <Select
                      value={filterType}
                      onValueChange={(value: "all" | "income" | "expense") =>
                        setFilterType(value)
                      }
                    >
                      <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-factory-800 border-tire-600/30">
                        <SelectItem
                          value="all"
                          className="text-white hover:bg-tire-700/50"
                        >
                          Todas as transações
                        </SelectItem>
                        <SelectItem
                          value="income"
                          className="text-white hover:bg-tire-700/50"
                        >
                          <div className="flex items-center gap-2">
                            <ArrowUpCircle className="h-3 w-3 text-neon-green" />
                            Entradas
                          </div>
                        </SelectItem>
                        <SelectItem
                          value="expense"
                          className="text-white hover:bg-tire-700/50"
                        >
                          <div className="flex items-center gap-2">
                            <ArrowDownCircle className="h-3 w-3 text-red-400" />
                            Saídas
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro de Categoria */}
                  <div className="space-y-2">
                    <Label className="text-tire-300 text-sm">Categoria:</Label>
                    <Select
                      value={filterCategory}
                      onValueChange={setFilterCategory}
                    >
                      <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                        <SelectValue placeholder="Todas as categorias" />
                      </SelectTrigger>
                      <SelectContent className="bg-factory-800 border-tire-600/30">
                        <SelectItem
                          value="all_categories"
                          className="text-white hover:bg-tire-700/50"
                        >
                          Todas as categorias
                        </SelectItem>
                        {getAllCategories().map((category) => (
                          <SelectItem
                            key={category}
                            value={category}
                            className="text-white hover:bg-tire-700/50"
                          >
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Período */}
                  <div className="space-y-2">
                    <Label className="text-tire-300 text-sm">Período:</Label>
                    <Select
                      value={dateFilterType}
                      onValueChange={(value) => {
                        setDateFilterType(value);
                        // Reset custom date filters when changing type
                        if (value !== "custom") {
                          setCustomStartDate("");
                          setCustomEndDate("");
                        }
                      }}
                    >
                      <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-factory-800 border-tire-600/30">
                        <SelectItem
                          value="all"
                          className="text-white hover:bg-tire-700/50"
                        >
                          Todas as datas
                        </SelectItem>
                        <SelectItem
                          value="today"
                          className="text-white hover:bg-tire-700/50"
                        >
                          Hoje
                        </SelectItem>
                        <SelectItem
                          value="last7days"
                          className="text-white hover:bg-tire-700/50"
                        >
                          Últimos 7 dias
                        </SelectItem>
                        <SelectItem
                          value="last30days"
                          className="text-white hover:bg-tire-700/50"
                        >
                          Últimos 30 dias
                        </SelectItem>
                        <SelectItem
                          value="thisMonth"
                          className="text-white hover:bg-tire-700/50"
                        >
                          Este mês
                        </SelectItem>
                        <SelectItem
                          value="lastMonth"
                          className="text-white hover:bg-tire-700/50"
                        >
                          Mês passado
                        </SelectItem>

                        <SelectItem
                          value="custom"
                          className="text-white hover:bg-tire-700/50"
                        >
                          Período personalizado
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>



                  {/* Filtros de Período Personalizado */}
                  {dateFilterType === "custom" && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-tire-300 text-sm">
                          Data Inicial:
                        </Label>
                        <div className="relative">
                          <Input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="bg-factory-700/50 border-tire-600/30 text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-tire-300 text-sm">
                          Data Final:
                        </Label>
                        <div className="relative">
                          <Input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="bg-factory-700/50 border-tire-600/30 text-white"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Indicador de Filtros Ativos */}
                {hasActiveFilters && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {searchTerm && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-neon-blue/20 rounded text-neon-blue text-xs">
                        <Search className="h-3 w-3" />
                        Busca: "{searchTerm}"
                      </div>
                    )}
                    {filterType !== "all" && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-neon-green/20 rounded text-neon-green text-xs">
                        {filterType === "income" ? (
                          <ArrowUpCircle className="h-3 w-3" />
                        ) : (
                          <ArrowDownCircle className="h-3 w-3" />
                        )}
                        {filterType === "income" ? "Entradas" : "Saídas"}
                      </div>
                    )}
                    {dateFilterType !== "all" && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-neon-purple/20 rounded text-neon-purple text-xs">
                        <Calendar className="h-3 w-3" />
                        {dateFilterType === "today" && "Hoje"}
                        {dateFilterType === "last7days" && "Últimos 7 dias"}
                        {dateFilterType === "last30days" && "Últimos 30 dias"}
                        {dateFilterType === "thisMonth" && "Este mês"}
                        {dateFilterType === "lastMonth" && "Mês passado"}
                        {dateFilterType === "month" && `Mês: ${filterMonth}`}
                        {dateFilterType === "custom" && "Período personalizado"}
                      </div>
                    )}
                    {filterCategory && filterCategory !== "all_categories" && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded text-orange-300 text-xs">
                        <Filter className="h-3 w-3" />
                        Categoria: {filterCategory}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                  <p className="text-tire-400">
                    {hasActiveFilters
                      ? "Nenhuma transação encontrada com os filtros aplicados"
                      : "Nenhuma transação registrada"}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="mt-2 text-tire-300 hover:text-white"
                    >
                      Limpar filtros para ver todas as transações
                    </Button>
                  )}
                </div>
              ) : (
                filteredEntries
                  .sort(
                    (a, b) =>
                      new Date(b.transaction_date).getTime() -
                      new Date(a.transaction_date).getTime(),
                  )
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {entry.type === "income" ? (
                            <ArrowUpCircle className="h-5 w-5 text-neon-green" />
                          ) : (
                            <ArrowDownCircle className="h-5 w-5 text-red-400" />
                          )}
                          <div>
                            <h4 className="text-white font-medium">
                              {entry.reference_name}
                            </h4>
                            <p className="text-tire-400 text-sm">
                              {entry.category}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span
                              className={`text-lg font-bold ${
                                entry.type === "income"
                                  ? "text-neon-green"
                                  : "text-red-400"
                              }`}
                            >
                              {entry.type === "income" ? "+" : "-"}
                              {formatCurrency(entry.amount)}
                            </span>
                            <p className="text-tire-400 text-sm">
                              {new Date(
                                entry.transaction_date,
                              ).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTransaction(entry)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-8 w-8"
                            title="Excluir transação"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {entry.description && (
                        <p className="text-tire-400 text-sm mt-2">
                          {entry.description}
                        </p>
                      )}
                    </div>
                  ))
              )}
            </div>
            {filteredEntries.length > 0 && (
              <div className="mt-4 p-3 bg-factory-700/20 rounded border border-tire-600/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-tire-300">Total de transações:</span>
                    <span className="text-white font-medium">
                      {filteredEntries.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-tire-300">Total entradas:</span>
                    <span className="text-neon-green font-bold">
                      {formatCurrency(totalIncome)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-tire-300">Total saídas:</span>
                    <span className="text-red-400 font-bold">
                      {formatCurrency(totalExpense)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-tire-600/30">
                  <span className="text-white font-medium">
                    Saldo do período:
                  </span>
                  <span
                    className={`font-bold text-lg ${
                      balance >= 0 ? "text-neon-blue" : "text-red-400"
                    }`}
                  >
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CashFlowManager;
