import React, { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  UserCheck,
  Package,
  TrendingUp,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Archive,
  ArchiveRestore,
  ShoppingCart,
  CheckCircle,
  History,
  Trash2,
  Calendar,
  Filter,
  X,
  CalendarDays,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Plus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  useSalespeople,
  useCustomers,
  useStockItems,
  useCashFlow,
  useProductionEntries,
  useWarrantyEntries,
  useRecipes,
  useMaterials,
  useResaleProducts,
} from "@/hooks/useDataPersistence";
import {
  Salesperson,
  Customer,
  StockItem,
  ResaleProduct,
} from "@/types/financial";

interface SalesDashboardProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

const SalesDashboard = ({
  onRefresh = () => {},
  isLoading = false,
}: SalesDashboardProps) => {
  const [activeTab, setActiveTab] = useState("pos");
  const [productsSearch, setProductsSearch] = useState("");
  const [salesHistorySearch, setSalesHistorySearch] = useState("");
  const [salesHistoryDateFilter, setSalesHistoryDateFilter] = useState("");
  const [salesHistoryDateType, setSalesHistoryDateType] = useState("all");
  const [salesHistoryStartDate, setSalesHistoryStartDate] = useState("");
  const [salesHistoryEndDate, setSalesHistoryEndDate] = useState("");

  // Warranty history filter states
  const [warrantyHistorySearch, setWarrantyHistorySearch] = useState("");
  const [warrantyHistoryDateFilter, setWarrantyHistoryDateFilter] =
    useState("");
  const [warrantyHistoryDateType, setWarrantyHistoryDateType] = useState("all");
  const [warrantyHistoryStartDate, setWarrantyHistoryStartDate] = useState("");
  const [warrantyHistoryEndDate, setWarrantyHistoryEndDate] = useState("");

  // Resale sales history filter states
  const [resaleSalesHistorySearch, setResaleSalesHistorySearch] = useState("");
  const [resaleSalesHistoryDateFilter, setResaleSalesHistoryDateFilter] =
    useState("");
  const [resaleSalesHistoryDateType, setResaleSalesHistoryDateType] =
    useState("all");
  const [resaleSalesHistoryStartDate, setResaleSalesHistoryStartDate] =
    useState("");
  const [resaleSalesHistoryEndDate, setResaleSalesHistoryEndDate] =
    useState("");

  // POS form states
  const [selectedSalesperson, setSelectedSalesperson] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [saleValue, setSaleValue] = useState("");
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [productType, setProductType] = useState<
    "final" | "resale" | "warranty"
  >("final");
  const [paymentMethod, setPaymentMethod] = useState<
    "DINHEIRO" | "PIX" | "CARTÃO" | "A PRAZO"
  >("DINHEIRO");

  // Autocomplete states for POS
  const [salespersonSearch, setSalespersonSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [showSalespersonDropdown, setShowSalespersonDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Estados para carrinho multi-produto - PADRÃO ATIVADO
  const [isMultiProductMode, setIsMultiProductMode] = useState(true);
  const [productCart, setProductCart] = useState<Array<{
    id: string;
    name: string;
    type: 'final' | 'resale';
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    originalProductId: string;
  }>>([]);

  // Use database hooks
  const { salespeople, isLoading: salespeopleLoading } = useSalespeople();
  const {
    customers,
    updateCustomer,
    isLoading: customersLoading,
  } = useCustomers();
  const {
    stockItems,
    updateStockItem,
    isLoading: stockLoading,
  } = useStockItems();
  const {
    cashFlowEntries,
    addCashFlowEntry,
    deleteCashFlowEntry,
    updateCashFlowEntry,
    isLoading: cashFlowLoading,
  } = useCashFlow();
  const { addProductionEntry } = useProductionEntries();
  const {
    warrantyEntries,
    addWarrantyEntry,
    deleteWarrantyEntry,
    isLoading: warrantyLoading,
  } = useWarrantyEntries();
  const { recipes, isLoading: recipesLoading } = useRecipes();
  const { materials, isLoading: materialsLoading } = useMaterials();
  const {
    resaleProducts,
    updateResaleProduct,
    isLoading: resaleProductsLoading,
  } = useResaleProducts();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Get resale product IDs to exclude them from final products
  const resaleProductIds = new Set(resaleProducts.map((p) => p.id));

  // Filter functions - Final products only (excluding resale products)
  const filteredProducts = stockItems
    .filter((item) => {
      const isProduct = item.item_type === "product";
      const hasQuantity = item.quantity > 0;
      const isNotResaleProduct = !resaleProductIds.has(item.item_id);

      return isProduct && hasQuantity && isNotResaleProduct;
    })
    .filter((item) =>
      item.item_name.toLowerCase().includes(productsSearch.toLowerCase()),
    );

  // Filter resale products - check stock_items table instead of current_stock field
  const filteredResaleProducts = resaleProducts
    .filter((product) => {
      if (product.archived) return false;

      // Check if product has stock in stock_items table
      const stockItem = stockItems.find(
        (item) => item.item_id === product.id && item.item_type === "product",
      );

      return stockItem && stockItem.quantity > 0;
    })
    .filter((product) =>
      product.name.toLowerCase().includes(productsSearch.toLowerCase()),
    );

  // Filter final product sales history (cash flow entries with category "venda" or "venda_prazo" and product type "final")
  const finalProductSalesHistory = cashFlowEntries
    .filter(
      (entry) =>
        entry.type === "income" &&
        (entry.category === "venda" || entry.category === "venda_prazo") &&
        // Only include entries that:
        // 1. Explicitly have "TIPO_PRODUTO: final" OR
        // 2. Don't have any "TIPO_PRODUTO:" tag at all (for backward compatibility with older entries)
        // 3. Explicitly EXCLUDE entries with "TIPO_PRODUTO: revenda"
        ((entry.description &&
          entry.description.includes("TIPO_PRODUTO: final")) ||
          !entry.description ||
          !entry.description.includes("TIPO_PRODUTO:")) &&
        // Explicitly exclude resale products
        (!entry.description ||
          !entry.description.includes("TIPO_PRODUTO: revenda")),
    )
    .filter((entry) => {
      const matchesSearch =
        entry.reference_name
          .toLowerCase()
          .includes(salesHistorySearch.toLowerCase()) ||
        (entry.description &&
          entry.description
            .toLowerCase()
            .includes(salesHistorySearch.toLowerCase()));

      // Advanced date filtering
      let matchesDate = true;
      const entryDate = new Date(entry.transaction_date);
      const today = new Date();

      switch (salesHistoryDateType) {
        case "today":
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
          if (salesHistoryStartDate && salesHistoryEndDate) {
            // WORKAROUND: Compensate for +1 day UTC workaround in sales saving
            // Since sales are saved with +1 day, we need to add +1 day to filter dates too
            const startDate = new Date(salesHistoryStartDate);
            startDate.setDate(startDate.getDate() + 1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(salesHistoryEndDate);
            endDate.setDate(endDate.getDate() + 1);
            endDate.setHours(23, 59, 59, 999);
            
            // Debug logs for custom date filtering
            console.log("🗓️ [CUSTOM FILTER DEBUG] Final Products:", {
              selectedStartDate: salesHistoryStartDate,
              selectedEndDate: salesHistoryEndDate,
              adjustedStartDate: startDate.toString(),
              adjustedEndDate: endDate.toString(),
              entryDate: entryDate.toString(),
              entryTransactionDate: entry.transaction_date,
              matchesDate: entryDate >= startDate && entryDate <= endDate,
              note: "Added +1 day to compensate UTC workaround"
            });
            
            matchesDate = entryDate >= startDate && entryDate <= endDate;
          } else if (salesHistoryStartDate) {
            const startDate = new Date(salesHistoryStartDate);
            startDate.setHours(0, 0, 0, 0);
            matchesDate = entryDate >= startDate;
          } else if (salesHistoryEndDate) {
            const endDate = new Date(salesHistoryEndDate);
            endDate.setHours(23, 59, 59, 999);
            matchesDate = entryDate <= endDate;
          }
          break;
        case "all":
        default:
          matchesDate = true;
          break;
      }

      return matchesSearch && matchesDate;
    })
    .sort(
      (a, b) =>
        new Date(b.transaction_date).getTime() -
        new Date(a.transaction_date).getTime(),
    );

  // Filter resale product sales history (cash flow entries with category "venda" or "venda_prazo" and product type "resale")
  const resaleProductSalesHistory = cashFlowEntries
    .filter(
      (entry) =>
        entry.type === "income" &&
        (entry.category === "venda" || entry.category === "venda_prazo") &&
        entry.description &&
        entry.description.includes("TIPO_PRODUTO: revenda"),
    )
    .filter((entry) => {
      const matchesSearch =
        entry.reference_name
          .toLowerCase()
          .includes(resaleSalesHistorySearch.toLowerCase()) ||
        (entry.description &&
          entry.description
            .toLowerCase()
            .includes(resaleSalesHistorySearch.toLowerCase()));

      // Advanced date filtering
      let matchesDate = true;
      const entryDate = new Date(entry.transaction_date);
      const today = new Date();

      switch (resaleSalesHistoryDateType) {
        case "today":
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
          if (resaleSalesHistoryStartDate && resaleSalesHistoryEndDate) {
            // WORKAROUND: Compensate for +1 day UTC workaround in sales saving
            // Since sales are saved with +1 day, we need to add +1 day to filter dates too
            const startDate = new Date(resaleSalesHistoryStartDate);
            startDate.setDate(startDate.getDate() + 1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(resaleSalesHistoryEndDate);
            endDate.setDate(endDate.getDate() + 1);
            endDate.setHours(23, 59, 59, 999);
            
            // Debug logs for custom date filtering
            console.log("🗓️ [CUSTOM FILTER DEBUG] Resale Products:", {
              selectedStartDate: resaleSalesHistoryStartDate,
              selectedEndDate: resaleSalesHistoryEndDate,
              adjustedStartDate: startDate.toString(),
              adjustedEndDate: endDate.toString(),
              entryDate: entryDate.toString(),
              entryTransactionDate: entry.transaction_date,
              matchesDate: entryDate >= startDate && entryDate <= endDate,
              note: "Added +1 day to compensate UTC workaround"
            });
            
            matchesDate = entryDate >= startDate && entryDate <= endDate;
          } else if (resaleSalesHistoryStartDate) {
            const startDate = new Date(resaleSalesHistoryStartDate);
            startDate.setHours(0, 0, 0, 0);
            matchesDate = entryDate >= startDate;
          } else if (resaleSalesHistoryEndDate) {
            const endDate = new Date(resaleSalesHistoryEndDate);
            endDate.setHours(23, 59, 59, 999);
            matchesDate = entryDate <= endDate;
          }
          break;
        case "all":
        default:
          matchesDate = true;
          break;
      }

      return matchesSearch && matchesDate;
    })
    .sort(
      (a, b) =>
        new Date(b.transaction_date).getTime() -
        new Date(a.transaction_date).getTime(),
    );

  // Filter warranty history
  const filteredWarrantyEntries = warrantyEntries
    .filter((warranty) => {
      const matchesSearch =
        warranty.customer_name
          .toLowerCase()
          .includes(warrantyHistorySearch.toLowerCase()) ||
        warranty.product_name
          .toLowerCase()
          .includes(warrantyHistorySearch.toLowerCase()) ||
        warranty.salesperson_name
          .toLowerCase()
          .includes(warrantyHistorySearch.toLowerCase()) ||
        (warranty.description &&
          warranty.description
            .toLowerCase()
            .includes(warrantyHistorySearch.toLowerCase()));

      // Advanced date filtering
      let matchesDate = true;
      const warrantyDate = new Date(warranty.warranty_date);
      const today = new Date();

      switch (warrantyHistoryDateType) {
        case "today":
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          matchesDate = warranty.warranty_date === todayStr;
          break;
        case "last7days":
          const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = warrantyDate >= last7Days;
          break;
        case "last30days":
          const last30Days = new Date(
            today.getTime() - 30 * 24 * 60 * 60 * 1000,
          );
          matchesDate = warrantyDate >= last30Days;
          break;
        case "thisMonth":
          const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
          matchesDate = warranty.warranty_date.startsWith(thisMonth);
          break;
        case "lastMonth":
          const lastMonth = new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            1,
          );
          const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
          matchesDate = warranty.warranty_date.startsWith(lastMonthStr);
          break;
        case "month":
          matchesDate =
            !warrantyHistoryDateFilter ||
            warranty.warranty_date.startsWith(warrantyHistoryDateFilter);
          break;
        case "custom":
          if (warrantyHistoryStartDate && warrantyHistoryEndDate) {
            const startDate = new Date(warrantyHistoryStartDate);
            const endDate = new Date(warrantyHistoryEndDate);
            matchesDate = warrantyDate >= startDate && warrantyDate <= endDate;
          } else if (warrantyHistoryStartDate) {
            const startDate = new Date(warrantyHistoryStartDate);
            matchesDate = warrantyDate >= startDate;
          } else if (warrantyHistoryEndDate) {
            const endDate = new Date(warrantyHistoryEndDate);
            matchesDate = warrantyDate <= endDate;
          }
          break;
        case "all":
        default:
          matchesDate = true;
          break;
      }

      return matchesSearch && matchesDate;
    })
    .sort(
      (a, b) =>
        new Date(b.warranty_date).getTime() -
        new Date(a.warranty_date).getTime(),
    );

  // Calculate metrics
  const activeSalespeople = salespeople.filter((s) => !s.archived);
  const activeCustomers = customers.filter((c) => !c.archived);

  // Final products: stock items that are products but NOT in resale_products table
  const availableProducts = stockItems.filter((item) => {
    const isProduct = item.item_type === "product";
    const hasQuantity = item.quantity > 0;
    const isNotResaleProduct = !resaleProductIds.has(item.item_id);

    return isProduct && hasQuantity && isNotResaleProduct;
  });

  // Resale products: from resale_products table with stock > 0 (check stock_items table)
  const availableResaleProducts = resaleProducts.filter((product) => {
    if (product.archived) return false;

    // Check if product has stock in stock_items table
    const stockItem = stockItems.find(
      (item) => item.item_id === product.id && item.item_type === "product",
    );

    return stockItem && stockItem.quantity > 0;
  });

  // Function to extract payment method from transaction description
  const extractPaymentMethodFromSale = (description: string): string => {
    console.log("🔍 [DEBUG] Extracting payment method from:", description);
    
    // Try multiple patterns to catch different formats
    let methodMatch = description.match(/Método:\s*([^|]+)/);
    if (!methodMatch) {
      methodMatch = description.match(/Método:\s*([^\s]+)/);
    }
    if (!methodMatch) {
      methodMatch = description.match(/Método\s*:\s*([A-Z\s]+)/);
    }
    
    const result = methodMatch ? methodMatch[1].trim() : "N/A";
    console.log("🔍 [DEBUG] Extracted payment method:", result);
    return result;
  };

  // Function to get payment method icon
  const getPaymentMethodIcon = (method: string): string => {
    console.log("🔍 [DEBUG] Getting icon for payment method:", method);
    const cleanMethod = method.trim().toUpperCase();
    
    switch (cleanMethod) {
      case "DINHEIRO": return "💵";
      case "PIX": return "📱";
      case "CARTÃO": return "💳";
      case "A PRAZO": return "📅";
      case "N/A": return "❓";
      default: 
        console.log("🔍 [DEBUG] Unknown payment method, using default icon");
        return "💰";
    }
  };

  const averageCommission =
    activeSalespeople.length > 0
      ? activeSalespeople.reduce((sum, s) => sum + s.commission_rate, 0) /
        activeSalespeople.length
      : 0;

  const totalStockValue = availableProducts.reduce(
    (sum, item) => sum + item.total_value,
    0,
  );

  const totalResaleStockValue = availableResaleProducts.reduce(
    (sum, product) => {
      // Get stock quantity from stock_items table
      const stockItem = stockItems.find(
        (item) => item.item_id === product.id && item.item_type === "product",
      );
      const stockQuantity = stockItem?.quantity || 0;
      const stockValue = stockItem?.total_value || 0;

      return sum + stockValue;
    },
    0,
  );

  // Calculate warranty revenue value based on raw material cost from recipes
  const calculateWarrantyRevenueValue = () => {
    console.log(
      "🔍 [calculateWarrantyRevenueValue] Iniciando cálculo do valor de garantia",
    );
    console.log("📊 [calculateWarrantyRevenueValue] Dados disponíveis:", {
      warrantyEntries: filteredWarrantyEntries.length,
      recipes: recipes.length,
      materials: materials.length,
      stockItems: stockItems.length,
    });

    return filteredWarrantyEntries.reduce((total, warranty) => {
      console.log(`🔍 [calculateWarrantyRevenueValue] Processando garantia:`, {
        id: warranty.id,
        product_name: warranty.product_name,
        quantity: warranty.quantity,
      });

      // Find the recipe for this product
      const recipe = recipes.find(
        (r) => r.product_name === warranty.product_name && !r.archived,
      );

      if (recipe) {
        console.log(`✅ [calculateWarrantyRevenueValue] Receita encontrada:`, {
          recipe_id: recipe.id,
          product_name: recipe.product_name,
          materials_count: recipe.materials.length,
        });

        // Calculate total material cost for this recipe
        const recipeMaterialCost = recipe.materials.reduce(
          (materialTotal, recipeMaterial) => {
            console.log(
              `🔍 [calculateWarrantyRevenueValue] Processando material da receita:`,
              {
                material_id: recipeMaterial.material_id,
                material_name: recipeMaterial.material_name,
                quantity_needed: recipeMaterial.quantity_needed,
                unit: recipeMaterial.unit,
              },
            );

            // Find the material cost in stock items (raw materials)
            const materialInStock = stockItems.find(
              (item) =>
                item.item_id === recipeMaterial.material_id &&
                item.item_type === "material",
            );

            if (materialInStock) {
              const materialCost =
                recipeMaterial.quantity_needed * materialInStock.unit_cost;
              console.log(
                `✅ [calculateWarrantyRevenueValue] Custo do material calculado:`,
                {
                  material_name: recipeMaterial.material_name,
                  quantity_needed: recipeMaterial.quantity_needed,
                  unit_cost: materialInStock.unit_cost,
                  total_cost: materialCost,
                },
              );
              return materialTotal + materialCost;
            } else {
              console.warn(
                `⚠️ [calculateWarrantyRevenueValue] Material não encontrado no estoque:`,
                {
                  material_id: recipeMaterial.material_id,
                  material_name: recipeMaterial.material_name,
                },
              );
              return materialTotal;
            }
          },
          0,
        );

        // Calculate warranty value: quantity × recipe material cost
        const warrantyValue = warranty.quantity * recipeMaterialCost;
        console.log(
          `💰 [calculateWarrantyRevenueValue] Valor da garantia calculado:`,
          {
            product_name: warranty.product_name,
            warranty_quantity: warranty.quantity,
            recipe_material_cost: recipeMaterialCost,
            warranty_value: warrantyValue,
          },
        );

        return total + warrantyValue;
      } else {
        console.warn(
          `⚠️ [calculateWarrantyRevenueValue] Receita não encontrada para o produto:`,
          {
            product_name: warranty.product_name,
            available_recipes: recipes.map((r) => r.product_name),
          },
        );
        return total;
      }
    }, 0);
  };

  const totalWarrantyRevenueValue = calculateWarrantyRevenueValue();

  // Calculate individual warranty value based on raw material cost from recipes
  const calculateIndividualWarrantyValue = (warranty: any) => {
    console.log(
      `🔍 [calculateIndividualWarrantyValue] Calculando valor individual da garantia:`,
      {
        id: warranty.id,
        product_name: warranty.product_name,
        quantity: warranty.quantity,
      },
    );

    // Find the recipe for this product
    const recipe = recipes.find(
      (r) => r.product_name === warranty.product_name && !r.archived,
    );

    if (recipe) {
      console.log(`✅ [calculateIndividualWarrantyValue] Receita encontrada:`, {
        recipe_id: recipe.id,
        product_name: recipe.product_name,
        materials_count: recipe.materials.length,
      });

      // Calculate total material cost for this recipe
      const recipeMaterialCost = recipe.materials.reduce(
        (materialTotal, recipeMaterial) => {
          console.log(
            `🔍 [calculateIndividualWarrantyValue] Processando material da receita:`,
            {
              material_id: recipeMaterial.material_id,
              material_name: recipeMaterial.material_name,
              quantity_needed: recipeMaterial.quantity_needed,
              unit: recipeMaterial.unit,
            },
          );

          // Find the material cost in stock items (raw materials)
          const materialInStock = stockItems.find(
            (item) =>
              item.item_id === recipeMaterial.material_id &&
              item.item_type === "material",
          );

          if (materialInStock) {
            const materialCost =
              recipeMaterial.quantity_needed * materialInStock.unit_cost;
            console.log(
              `✅ [calculateIndividualWarrantyValue] Custo do material calculado:`,
              {
                material_name: recipeMaterial.material_name,
                quantity_needed: recipeMaterial.quantity_needed,
                unit_cost: materialInStock.unit_cost,
                total_cost: materialCost,
              },
            );
            return materialTotal + materialCost;
          } else {
            console.warn(
              `⚠️ [calculateIndividualWarrantyValue] Material não encontrado no estoque:`,
              {
                material_id: recipeMaterial.material_id,
                material_name: recipeMaterial.material_name,
              },
            );
            return materialTotal;
          }
        },
        0,
      );

      // Calculate warranty value: quantity × recipe material cost
      const warrantyValue = warranty.quantity * recipeMaterialCost;
      console.log(
        `💰 [calculateIndividualWarrantyValue] Valor individual da garantia calculado:`,
        {
          product_name: warranty.product_name,
          warranty_quantity: warranty.quantity,
          recipe_material_cost: recipeMaterialCost,
          warranty_value: warrantyValue,
        },
      );

      return warrantyValue;
    } else {
      console.warn(
        `⚠️ [calculateIndividualWarrantyValue] Receita não encontrada para o produto:`,
        {
          product_name: warranty.product_name,
          available_recipes: recipes.map((r) => r.product_name),
        },
      );
      return 0;
    }
  };

  // Clear unit price when product is changed (manual input only)
  useEffect(() => {
    if (!selectedProduct) {
      setUnitPrice("");
    }
  }, [selectedProduct]);

  // Reset form when product type changes
  useEffect(() => {
    setSelectedProduct("");
    setProductSearch("");
    setUnitPrice("");
    setQuantity("");
    setSaleValue("");
    setShowProductDropdown(false);
  }, [productType]);

  // Calculate sale value automatically based on unit price and quantity (only for regular sales)
  useEffect(() => {
    if (
      productType !== "warranty" &&
      unitPrice &&
      quantity &&
      parseFloat(unitPrice) > 0 &&
      parseFloat(quantity) > 0
    ) {
      const calculatedValue = parseFloat(unitPrice) * parseFloat(quantity);
      setSaleValue(calculatedValue.toFixed(2));
    } else if (productType === "warranty") {
      setSaleValue(""); // Clear value for warranty
    } else {
      setSaleValue("");
    }
  }, [unitPrice, quantity, productType]);

  // Handle sale/warranty confirmation
  const handleConfirmSale = async () => {
    // Validation for warranty vs regular sale
    if (productType === "warranty") {
      if (
        !selectedSalesperson ||
        !selectedCustomer ||
        !selectedProduct ||
        !quantity ||
        parseFloat(quantity) <= 0
      ) {
        alert(
          "Por favor, preencha todos os campos obrigatórios para a garantia.",
        );
        return;
      }
    } else {
      if (
        !selectedSalesperson ||
        !selectedCustomer ||
        !selectedProduct ||
        !unitPrice ||
        !quantity ||
        !saleValue ||
        parseFloat(unitPrice) <= 0 ||
        parseFloat(quantity) <= 0 ||
        parseFloat(saleValue) <= 0
      ) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
      }
    }

    let product: StockItem | null = null;
    let resaleProduct: ResaleProduct | null = null;

    if (productType === "final" || productType === "warranty") {
      product = availableProducts.find((p) => p.id === selectedProduct) || null;
    } else if (productType === "resale") {
      resaleProduct =
        availableResaleProducts.find((p) => p.id === selectedProduct) || null;
    }

    const customer = activeCustomers.find((c) => c.id === selectedCustomer);
    const salesperson = activeSalespeople.find(
      (s) => s.id === selectedSalesperson,
    );

    if ((!product && !resaleProduct) || !customer || !salesperson) {
      alert("Erro: Dados não encontrados.");
      return;
    }

    // Check stock availability
    if ((productType === "final" || productType === "warranty") && product) {
      if (parseFloat(quantity) > product.quantity) {
        alert(
          `Estoque insuficiente. Disponível: ${product.quantity.toFixed(0)} ${product.unit}`,
        );
        return;
      }
    } else if (productType === "resale" && resaleProduct) {
      // Get stock quantity from stock_items table for resale products
      const stockItem = stockItems.find(
        (item) =>
          item.item_id === resaleProduct.id && item.item_type === "product",
      );
      const availableStock = stockItem?.quantity || 0;

      if (parseFloat(quantity) > availableStock) {
        alert(
          `Estoque insuficiente. Disponível: ${availableStock.toFixed(0)} ${resaleProduct.unit}`,
        );
        return;
      }
    }

    setIsProcessingSale(true);

    try {
      if (productType === "warranty") {
        // Handle warranty process (only for final products)
        if (!product) {
          alert("Erro: Produto não encontrado.");
          return;
        }

        console.log(`🔧 [SalesDashboard] Processando garantia:`, {
          customer: customer.name,
          product: product.item_name,
          quantity: parseFloat(quantity),
          salesperson: salesperson.name,
        });

        // Update stock - subtract warranty quantity
        const newQuantity = product.quantity - parseFloat(quantity);
        const newTotalValue = newQuantity * product.unit_cost;

        await updateStockItem(product.id, {
          quantity: newQuantity,
          total_value: newTotalValue,
          last_updated: new Date().toISOString(),
        });

        // Record warranty loss in production entries
        await addProductionEntry({
          recipe_id: null, // No recipe for warranty loss
          product_name: product.item_name,
          quantity_produced: 0, // No production, just warranty loss
          production_date: new Date().toISOString().split("T")[0],
          materials_consumed: [],
          warranty_loss: parseFloat(quantity), // Record warranty loss
        });

        // Save warranty entry details
        await addWarrantyEntry({
          customer_id: customer.id,
          customer_name: customer.name,
          product_name: product.item_name,
          salesperson_name: salesperson.name,
          quantity: parseFloat(quantity),
          warranty_date: new Date().toISOString().split("T")[0],
          description: `Garantia processada - Produto: ${product.item_name} | Qtd: ${quantity} ${product.unit} | Vendedor: ${salesperson.name}`,
        });

        // Update customer warranty count
        const currentWarrantyCount = customer.warranty_count || 0;
        await updateCustomer(customer.id, {
          warranty_count: currentWarrantyCount + 1,
        });

        console.log(`✅ [SalesDashboard] Garantia processada:`, {
          productId: product.id,
          productName: product.item_name,
          previousQuantity: product.quantity,
          warrantyQuantity: parseFloat(quantity),
          newQuantity: newQuantity,
          customerWarranties: currentWarrantyCount + 1,
        });

        // Reset form
        setSelectedSalesperson("");
        setSelectedCustomer("");
        setSelectedProduct("");
        setUnitPrice("");
        setQuantity("");
        setSaleValue("");
        setProductType("final");
        setPaymentMethod("DINHEIRO");

        alert(
          `Garantia registrada com sucesso!\n\n` +
            `Cliente: ${customer.name}\n` +
            `Produto: ${product.item_name}\n` +
            `Quantidade: ${quantity} ${product.unit}\n` +
            `Vendedor: ${salesperson.name}\n\n` +
            `📦 Estoque atualizado automaticamente:\n` +
            `Quantidade anterior: ${product.quantity.toFixed(0)} ${product.unit}\n` +
            `Nova quantidade: ${newQuantity.toFixed(0)} ${product.unit}\n\n` +
            `📊 Garantia registrada no histórico de perdas\n` +
            `👤 Total de garantias do cliente: ${currentWarrantyCount + 1}`,
        );
        
        // Auto refresh to reload data and prepare for next warranty
        onRefresh();
      } else {
        // Handle regular sale process
        if (productType === "final" && product) {
          // Final product sale - ALWAYS mark with TIPO_PRODUTO: final
          // WORKAROUND: Add +1 day to compensate Supabase UTC conversion
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          const todayLocal = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
          console.log("🗓️ [SALES DEBUG] Registrando venda produto final:", {
            originalDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
            dateUsed: todayLocal,
            note: "WORKAROUND: Adding +1 day to compensate Supabase UTC conversion"
          });
          
          // Only register in cash flow if not a credit sale
          if (paymentMethod !== "A PRAZO") {
            await addCashFlowEntry({
              type: "income",
              category: "venda",
              reference_name: `Venda para ${customer.name} - ${product.item_name}`,
              amount: parseFloat(saleValue),
              description: `TIPO_PRODUTO: final | Vendedor: ${salesperson.name} | Produto: ${product.item_name} | Qtd: ${quantity} ${product.unit} | Preço Unit: ${formatCurrency(parseFloat(unitPrice))} | Método: ${paymentMethod} | ID_Produto: ${product.id}`,
              transaction_date: todayLocal,
            });
          } else {
            // For credit sales, create a pending sale entry that will be added to cash flow when payment is received
            await addCashFlowEntry({
              type: "income",
              category: "venda_prazo",
              reference_name: `[PENDENTE] Venda para ${customer.name} - ${product.item_name}`,
              amount: 0,
              description: `TIPO_PRODUTO: final | Vendedor: ${salesperson.name} | Produto: ${product.item_name} | Qtd: ${quantity} ${product.unit} | Preço Unit: ${formatCurrency(parseFloat(unitPrice))} | Método: A PRAZO | ID_Produto: ${product.id} | Valor_Original: ${saleValue} | Status: PENDENTE`,
              transaction_date: todayLocal,
            });
            
            console.log(`💳 [CREDIT SALE] Venda a prazo registrada como pendente:`, {
              customer: customer.name,
              product: product.item_name,
              value: parseFloat(saleValue),
              paymentMethod: "A PRAZO",
              status: "PENDENTE"
            });
          }

          // Update stock - subtract sold quantity
          const newQuantity = product.quantity - parseFloat(quantity);
          const newTotalValue = newQuantity * product.unit_cost;

          await updateStockItem(product.id, {
            quantity: newQuantity,
            total_value: newTotalValue,
            last_updated: new Date().toISOString(),
          });

          console.log(
            `✅ [SalesDashboard] Estoque de produto final atualizado:`,
            {
              productId: product.id,
              productName: product.item_name,
              previousQuantity: product.quantity,
              soldQuantity: parseFloat(quantity),
              newQuantity: newQuantity,
              newTotalValue: newTotalValue,
            },
          );
        } else if (productType === "resale" && resaleProduct) {
          // Resale product sale - ALWAYS mark with TIPO_PRODUTO: revenda
          // WORKAROUND: Add +1 day to compensate Supabase UTC conversion
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          const todayLocal = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
          console.log("🗓️ [SALES DEBUG] Registrando venda produto revenda:", {
            originalDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
            dateUsed: todayLocal,
            note: "WORKAROUND: Adding +1 day to compensate Supabase UTC conversion"
          });
          
          // Only register in cash flow if not a credit sale
          if (paymentMethod !== "A PRAZO") {
            await addCashFlowEntry({
              type: "income",
              category: "venda",
              reference_name: `Venda para ${customer.name} - ${resaleProduct.name}`,
              amount: parseFloat(saleValue),
              description: `TIPO_PRODUTO: revenda | Vendedor: ${salesperson.name} | Produto: ${resaleProduct.name} | Qtd: ${quantity} ${resaleProduct.unit} | Preço Unit: ${formatCurrency(parseFloat(unitPrice))} | Método: ${paymentMethod} | ID_Produto: ${resaleProduct.id}`,
              transaction_date: todayLocal,
            });
          } else {
            // For credit sales, create a pending sale entry that will be added to cash flow when payment is received
            await addCashFlowEntry({
              type: "income",
              category: "venda_prazo",
              reference_name: `[PENDENTE] Venda para ${customer.name} - ${resaleProduct.name}`,
              amount: 0,
              description: `TIPO_PRODUTO: revenda | Vendedor: ${salesperson.name} | Produto: ${resaleProduct.name} | Qtd: ${quantity} ${resaleProduct.unit} | Preço Unit: ${formatCurrency(parseFloat(unitPrice))} | Método: A PRAZO | ID_Produto: ${resaleProduct.id} | Valor_Original: ${saleValue} | Status: PENDENTE`,
              transaction_date: todayLocal,
            });
            
            console.log(`💳 [CREDIT SALE] Venda a prazo registrada como pendente:`, {
              customer: customer.name,
              product: resaleProduct.name,
              value: parseFloat(saleValue),
              paymentMethod: "A PRAZO",
              status: "PENDENTE"
            });
          }

          // Update resale product stock in stock_items table
          const stockItem = stockItems.find(
            (item) =>
              item.item_id === resaleProduct.id && item.item_type === "product",
          );

          if (stockItem) {
            const newQuantity = stockItem.quantity - parseFloat(quantity);
            const newTotalValue = newQuantity * stockItem.unit_cost;

            await updateStockItem(stockItem.id, {
              quantity: newQuantity,
              total_value: newTotalValue,
              last_updated: new Date().toISOString(),
            });

            console.log(
              `✅ [SalesDashboard] Estoque de produto de revenda atualizado:`,
              {
                productId: resaleProduct.id,
                productName: resaleProduct.name,
                stockItemId: stockItem.id,
                previousQuantity: stockItem.quantity,
                soldQuantity: parseFloat(quantity),
                newQuantity: newQuantity,
                newTotalValue: newTotalValue,
              },
            );
          } else {
            console.warn(
              `⚠️ [SalesDashboard] Item de estoque não encontrado para produto de revenda: ${resaleProduct.id}`,
            );
          }
        }

        // Reset form completely for continuous sales
        resetFormForContinuousSales();

        const productName =
          productType === "final" ? product?.item_name : resaleProduct?.name;
        const productUnit =
          productType === "final" ? product?.unit : resaleProduct?.unit;
        const productTypeLabel =
          productType === "final" ? "Produto Final" : "Produto de Revenda";

        alert(
          `Venda registrada com sucesso!\n\n` +
            `Tipo: ${productTypeLabel}\n` +
            `Cliente: ${customer.name}\n` +
            `Produto: ${productName}\n` +
            `Quantidade: ${quantity} ${productUnit}\n` +
            `Preço Unitário: ${formatCurrency(parseFloat(unitPrice))}\n` +
            `Valor Total: ${formatCurrency(parseFloat(saleValue))}\n` +
            `Vendedor: ${salesperson.name}\n\n` +
            `📦 Estoque atualizado automaticamente`,
        );
        
        // Auto refresh to reload data and prepare for next sale
        onRefresh();
      }
    } catch (error) {
      console.error(
        `Erro ao registrar ${productType === "warranty" ? "garantia" : "venda"}:`,
        error,
      );
      alert(
        `Erro ao registrar ${productType === "warranty" ? "a garantia" : "a venda"}. Tente novamente.`,
      );
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Handle multi-product sale confirmation
  const handleMultiProductSale = async () => {
    // Validation for multi-product sale
    if (!selectedSalesperson || !selectedCustomer || productCart.length === 0) {
      alert("Por favor, preencha todos os campos e adicione produtos ao carrinho.");
      return;
    }

    const customer = activeCustomers.find((c) => c.id === selectedCustomer);
    const salesperson = activeSalespeople.find((s) => s.id === selectedSalesperson);

    if (!customer || !salesperson) {
      alert("Erro: Dados não encontrados.");
      return;
    }

    setIsProcessingSale(true);

    try {
      // Process each product in the cart
      for (const cartItem of productCart) {
        // WORKAROUND: Add +1 day to compensate Supabase UTC conversion
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const todayLocal = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
        
        console.log("🗓️ [MULTI-PRODUCT SALE DEBUG] Registrando venda multi-produto:", {
          originalDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
          dateUsed: todayLocal,
          paymentMethod: paymentMethod,
          cartItem: cartItem.name,
          note: "WORKAROUND: Adding +1 day to compensate Supabase UTC conversion"
        });

        // Record transaction with payment method - apply credit sale logic
        if (paymentMethod !== "A PRAZO") {
          await addCashFlowEntry({
            type: "income",
            category: "venda",
            reference_name: `Venda Multi-Produto para ${customer.name} - ${cartItem.name}`,
            amount: cartItem.totalPrice,
            description: `TIPO_PRODUTO: ${cartItem.type === 'resale' ? 'revenda' : cartItem.type} | Vendedor: ${salesperson.name} | Produto: ${cartItem.name} | Qtd: ${cartItem.quantity} unidades | Preço Unit: ${formatCurrency(cartItem.unitPrice)} | Método: ${paymentMethod} | ID_Produto: ${cartItem.originalProductId}`,
            transaction_date: todayLocal,
          });
        } else {
          // For credit sales, create a pending sale entry that will be added to cash flow when payment is received
          await addCashFlowEntry({
            type: "income",
            category: "venda_prazo",
            reference_name: `[PENDENTE] Venda Multi-Produto para ${customer.name} - ${cartItem.name}`,
            amount: 0,
            description: `TIPO_PRODUTO: ${cartItem.type === 'resale' ? 'revenda' : cartItem.type} | Vendedor: ${salesperson.name} | Produto: ${cartItem.name} | Qtd: ${cartItem.quantity} unidades | Preço Unit: ${formatCurrency(cartItem.unitPrice)} | Método: A PRAZO | ID_Produto: ${cartItem.originalProductId} | Valor_Original: ${cartItem.totalPrice} | Status: PENDENTE`,
            transaction_date: todayLocal,
          });
          
          console.log(`💳 [CREDIT SALE - MULTI] Venda multi-produto a prazo registrada como pendente:`, {
            customer: customer.name,
            product: cartItem.name,
            originalValue: cartItem.totalPrice,
            method: paymentMethod
          });
        }

        // Update stock based on product type
        if (cartItem.type === 'final') {
          const product = availableProducts.find((p) => p.id === cartItem.originalProductId);
          if (product) {
            const newQuantity = product.quantity - cartItem.quantity;
            const newTotalValue = newQuantity * product.unit_cost;

            await updateStockItem(product.id, {
              quantity: newQuantity,
              total_value: newTotalValue,
              last_updated: new Date().toISOString(),
            });
          }
        } else if (cartItem.type === 'resale') {
          const stockItem = stockItems.find(
            (item) => item.item_id === cartItem.originalProductId && item.item_type === "product"
          );
          if (stockItem) {
            const newQuantity = stockItem.quantity - cartItem.quantity;
            const newTotalValue = newQuantity * stockItem.unit_cost;

            await updateStockItem(stockItem.id, {
              quantity: newQuantity,
              total_value: newTotalValue,
              last_updated: new Date().toISOString(),
            });
          }
        }
      }

      // Store values before reset for alert message
      const totalValue = productCart.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalItems = productCart.length;

      // Reset form and cart completely for continuous sales
      resetFormForContinuousSales();

      alert(
        `Venda Multi-Produto registrada com sucesso!\n\n` +
          `Cliente: ${customer.name}\n` +
          `Vendedor: ${salesperson.name}\n` +
          `Método de Pagamento: ${paymentMethod}\n` +
          `Total de Itens: ${totalItems}\n` +
          `Valor Total: ${formatCurrency(totalValue)}\n\n` +
          `📦 Estoque atualizado automaticamente`
      );

      // Auto refresh to reload data
      onRefresh();
    } catch (error) {
      console.error("Erro ao registrar venda multi-produto:", error);
      alert("Erro ao processar venda. Tente novamente.");
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Extract product info from sale description
  const extractProductInfoFromSale = (description: string) => {
    const productIdMatch = description.match(/ID_Produto: ([^|]+)/);
    const quantityMatch = description.match(/Qtd: ([0-9.]+)(?:\s|$)/);
    
    if (productIdMatch && quantityMatch) {
      return {
        productId: productIdMatch[1].trim(),
        quantity: parseFloat(quantityMatch[1]),
      };
    }
    
    return null;
  };

  // Extract original value from credit sale description
  const extractOriginalValueFromSale = (description: string) => {
    const originalValueMatch = description.match(/Valor_Original: ([0-9.]+)/);
    return originalValueMatch ? parseFloat(originalValueMatch[1]) : null;
  };

  // Get display amount for sales history (shows original value for credit sales)
  const getDisplayAmount = (sale: any) => {
    // If it's a credit sale (venda_prazo), show the original value
    if (sale.category === "venda_prazo" && sale.description) {
      const originalValue = extractOriginalValueFromSale(sale.description);
      return originalValue || sale.amount;
    }
    // For regular sales, show the actual amount
    return sale.amount;
  };

  // Check if sale is a credit sale (A PRAZO) and still pending
  const isCreditSale = (description: string) => {
    return description.includes("Método: A PRAZO") && description.includes("Status: PENDENTE");
  };

  // Handle credit sale payment confirmation
  const handleConfirmCreditPayment = async (saleId: string, saleName: string, originalValue: number) => {
    if (confirm(`Confirmar recebimento do pagamento a prazo?\n\nVenda: ${saleName}\nValor: ${formatCurrency(originalValue)}\n\nIsso irá adicionar o valor ao fluxo de caixa.`)) {
      try {
        // Find the sale to update
        const sale = cashFlowEntries.find((entry) => entry.id === saleId);
        
        if (sale) {
          // Update the cash flow entry with the original value and change status
          await updateCashFlowEntry(saleId, {
            amount: originalValue,
            category: "venda", // Change from venda_prazo to venda
            reference_name: sale.reference_name.replace("[PENDENTE] ", ""),
            description: sale.description?.replace("Status: PENDENTE", "Status: PAGO")
          });
          
          alert(`Pagamento confirmado com sucesso!\n\nValor de ${formatCurrency(originalValue)} adicionado ao fluxo de caixa.`);
          onRefresh();
        }
      } catch (error) {
        console.error("Erro ao confirmar pagamento:", error);
        alert("Erro ao confirmar o pagamento. Tente novamente.");
      }
    }
  };

  // Test function to verify onClick works
  const testClick = () => {
    alert('🔥 TEST: Button click works!');
    console.log('🔥 TEST: Button click detected!');
  };

  // Complete form reset for continuous sales flow
  const resetFormForContinuousSales = () => {
    // Reset main form fields
    setSelectedSalesperson("");
    setSelectedCustomer("");
    setSelectedProduct("");
    setUnitPrice("");
    setQuantity("");
    setSaleValue("");
    setProductType("final");
    setPaymentMethod("DINHEIRO");
    
    // Reset autocomplete search fields and dropdowns for smooth continuous flow
    setSalespersonSearch("");
    setCustomerSearch("");
    setProductSearch("");
    setShowSalespersonDropdown(false);
    setShowCustomerDropdown(false);
    setShowProductDropdown(false);
    
    // Reset multi-product cart
    setProductCart([]);
    
    console.log('✅ [CONTINUOUS SALES] Formulário resetado para próxima venda');
  };

  // Handle delete sale
  const handleDeleteSale = async (saleId: string, saleName: string) => {
    console.log('🔥 [DELETE SALE] Iniciando exclusão:', { saleId, saleName });
    
    if (confirm(`Tem certeza que deseja excluir a venda: ${saleName}?\n\nEsta ação irá devolver os produtos ao estoque.`)) {
      let stockRestored = false;
      
      try {
        console.log('🔥 [DELETE SALE] Usuário confirmou, iniciando processo...');
        
        // Find the sale to get product information
        const sale = cashFlowEntries.find((entry) => entry.id === saleId);
        console.log('🔥 [DELETE SALE] Venda encontrada:', sale);

        if (sale && sale.description) {
          console.log('🔥 [DELETE SALE] Descrição da venda:', sale.description);
          
          // Extract product info from sale description
          const productInfo = extractProductInfoFromSale(sale.description);
          console.log('🔥 [DELETE SALE] Info do produto extraída:', productInfo);

          // Check if it's a resale product or final product
          const isResaleProduct = sale.description.includes("TIPO_PRODUTO: revenda");
          const isFinalProduct = sale.description.includes("TIPO_PRODUTO: final");
          
          console.log('🔥 [DELETE SALE] Tipo de produto:', { isResaleProduct, isFinalProduct });

          if (productInfo) {
            console.log('🔥 [DELETE SALE] Produto ID para buscar:', productInfo.productId);
            console.log('🔥 [DELETE SALE] Quantidade para retornar:', productInfo.quantity);
            
            // FIRST: Try to restore stock before deleting the transaction
            try {
              if (isResaleProduct) {
                console.log('🔥 [DELETE SALE] Processando produto de revenda...');
                // Handle resale product stock restoration in stock_items table
                const stockItem = stockItems.find(
                  (item) => {
                    console.log('🔥 [DELETE SALE] Comparando item:', { 
                      itemId: item.item_id, 
                      itemType: item.item_type,
                      searchingFor: productInfo.productId 
                    });
                    return item.item_id === productInfo.productId && item.item_type === "product";
                  }
                );

                console.log('🔥 [DELETE SALE] Item de estoque encontrado (revenda):', stockItem);

                if (stockItem) {
                  // Return quantity to stock_items
                  const newQuantity = stockItem.quantity + productInfo.quantity;
                  const newTotalValue = newQuantity * stockItem.unit_cost;

                  console.log('🔥 [DELETE SALE] Atualizando estoque revenda:', {
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

                  console.log('✅ [DELETE SALE] Estoque de produto de revenda restaurado com sucesso!');
                  stockRestored = true;
                } else {
                  console.error('❌ [DELETE SALE] Item de estoque não encontrado para produto de revenda:', productInfo.productId);
                  console.log('🔥 [DELETE SALE] Itens disponíveis no estoque:', stockItems.map(item => ({
                    id: item.item_id,
                    name: item.item_name,
                    type: item.item_type
                  })));
                }
              } else if (isFinalProduct) {
                console.log('🔥 [DELETE SALE] Processando produto final...');
                // Handle final product stock restoration
                const stockItem = stockItems.find(
                  (item) => {
                    console.log('🔥 [DELETE SALE] Comparando item final:', { 
                      itemId: item.id, 
                      itemName: item.item_name,
                      searchingFor: productInfo.productId 
                    });
                    return item.id === productInfo.productId;
                  }
                );

                console.log('🔥 [DELETE SALE] Item de estoque encontrado (final):', stockItem);

                if (stockItem) {
                  // Return quantity to stock
                  const newQuantity = stockItem.quantity + productInfo.quantity;
                  const newTotalValue = newQuantity * stockItem.unit_cost;

                  console.log('🔥 [DELETE SALE] Atualizando estoque final:', {
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

                  console.log('✅ [DELETE SALE] Estoque de produto final restaurado com sucesso!');
                  stockRestored = true;
                } else {
                  console.error('❌ [DELETE SALE] Produto final não encontrado no estoque:', productInfo.productId);
                  console.log('🔥 [DELETE SALE] Produtos finais disponíveis:', stockItems.filter(item => item.item_type === 'product').map(item => ({
                    id: item.id,
                    name: item.item_name,
                    quantity: item.quantity
                  })));
                }
              }
            } catch (stockError) {
              console.error('❌ [DELETE SALE] Erro ao restaurar estoque:', stockError);
              alert(`Erro ao restaurar estoque: ${stockError.message || stockError}\n\nA venda NÃO foi excluída para manter integridade dos dados.`);
              return; // Don't proceed with deletion if stock restoration fails
            }
          } else {
            console.error('❌ [DELETE SALE] Não foi possível extrair informações do produto da venda');
            console.log('🔥 [DELETE SALE] Descrição completa:', sale.description);
          }
        } else {
          console.error('❌ [DELETE SALE] Venda não encontrada ou sem descrição');
        }

        // SECOND: Only delete from cash flow if stock was restored successfully
        console.log('🔥 [DELETE SALE] Deletando entrada do fluxo de caixa...');
        try {
          await deleteCashFlowEntry(saleId);
          console.log('✅ [DELETE SALE] Entrada do fluxo de caixa deletada com sucesso!');
        } catch (deleteError) {
          console.error("❌ [DELETE SALE] Erro específico ao deletar do fluxo de caixa:", deleteError);
          
          // If stock was restored but cash flow deletion failed, we have a problem
          if (stockRestored) {
            alert(`ATENÇÃO: O estoque foi restaurado, mas houve erro ao deletar a transação do fluxo de caixa.\n\nErro: ${deleteError.message || deleteError}\n\nContate o suporte técnico.`);
          } else {
            alert(`Erro ao deletar a transação: ${deleteError.message || deleteError}\n\nNenhuma alteração foi feita.`);
          }
          return;
        }

        alert(
          `Venda excluída com sucesso!\n\n` +
            `📦 Os produtos foram devolvidos ao estoque automaticamente.`,
        );
        
        // Refresh data to update UI
        onRefresh();
      } catch (error) {
        console.error("❌ [DELETE SALE] Erro geral ao excluir venda:", error);
        alert(`Erro ao excluir a venda: ${error.message || error}\n\nVerifique o console para mais detalhes.`);
      }
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSalesHistorySearch("");
    setSalesHistoryDateFilter("");
    setSalesHistoryDateType("all");
    setSalesHistoryStartDate("");
    setSalesHistoryEndDate("");
  };

  // Clear resale filters
  const handleClearResaleFilters = () => {
    setResaleSalesHistorySearch("");
    setResaleSalesHistoryDateFilter("");
    setResaleSalesHistoryDateType("all");
    setResaleSalesHistoryStartDate("");
    setResaleSalesHistoryEndDate("");
  };

  // Clear warranty filters
  const handleClearWarrantyFilters = () => {
    setWarrantyHistorySearch("");
    setWarrantyHistoryDateFilter("");
    setWarrantyHistoryDateType("all");
    setWarrantyHistoryStartDate("");
    setWarrantyHistoryEndDate("");
  };

  // Check if any filter is active
  const hasActiveFilters =
    salesHistorySearch ||
    salesHistoryDateType !== "all" ||
    salesHistoryDateFilter ||
    salesHistoryStartDate ||
    salesHistoryEndDate;

  // Check if any resale filter is active
  const hasActiveResaleFilters =
    resaleSalesHistorySearch ||
    resaleSalesHistoryDateType !== "all" ||
    resaleSalesHistoryDateFilter ||
    resaleSalesHistoryStartDate ||
    resaleSalesHistoryEndDate;

  // Check if any warranty filter is active
  const hasActiveWarrantyFilters =
    warrantyHistorySearch ||
    warrantyHistoryDateType !== "all" ||
    warrantyHistoryDateFilter ||
    warrantyHistoryStartDate ||
    warrantyHistoryEndDate;

  // Handle delete warranty
  const handleDeleteWarranty = async (
    warrantyId: string,
    warrantyName: string,
  ) => {
    if (
      confirm(
        `Tem certeza que deseja excluir a garantia: ${warrantyName}?\n\nEsta ação irá devolver os produtos ao estoque.`,
      )
    ) {
      try {
        // Find the warranty to get product information
        const warranty = warrantyEntries.find(
          (entry) => entry.id === warrantyId,
        );

        if (warranty) {
          // Find the product in stock by name (since warranty doesn't store product ID)
          const stockItem = stockItems.find(
            (item) =>
              item.item_name === warranty.product_name &&
              item.item_type === "product",
          );

          if (stockItem) {
            // Return quantity to stock
            const newQuantity = stockItem.quantity + warranty.quantity;
            const newTotalValue = newQuantity * stockItem.unit_cost;

            await updateStockItem(stockItem.id, {
              quantity: newQuantity,
              total_value: newTotalValue,
              last_updated: new Date().toISOString(),
            });

            console.log(
              `✅ [SalesDashboard] Estoque restaurado após exclusão de garantia:`,
              {
                productId: stockItem.id,
                productName: stockItem.item_name,
                previousQuantity: stockItem.quantity,
                returnedQuantity: warranty.quantity,
                newQuantity: newQuantity,
                newTotalValue: newTotalValue,
              },
            );
          } else {
            console.warn(
              `⚠️ [SalesDashboard] Produto não encontrado no estoque:`,
              warranty.product_name,
            );
          }

          // Find and update customer warranty count
          const customer = customers.find((c) => c.id === warranty.customer_id);
          if (
            customer &&
            customer.warranty_count &&
            customer.warranty_count > 0
          ) {
            await updateCustomer(customer.id, {
              warranty_count: customer.warranty_count - 1,
            });

            console.log(
              `✅ [SalesDashboard] Contador de garantias do cliente atualizado:`,
              {
                customerId: customer.id,
                customerName: customer.name,
                previousWarrantyCount: customer.warranty_count,
                newWarrantyCount: customer.warranty_count - 1,
              },
            );
          }
        }

        // Delete the warranty entry
        await deleteWarrantyEntry(warrantyId);

        alert(
          `Garantia excluída com sucesso!\n\n` +
            `📦 Os produtos foram devolvidos ao estoque automaticamente.\n` +
            `👤 Contador de garantias do cliente foi atualizado.`,
        );
      } catch (error) {
        console.error("Erro ao excluir garantia:", error);
        alert("Erro ao excluir a garantia. Tente novamente.");
      }
    }
  };

  // Calculate sales data aggregated by product for the chart
  const finalProductSalesChartData = useMemo(() => {
    console.log(
      "🔄 [SalesDashboard] Calculando dados do gráfico de vendas de produtos finais",
    );

    const productSalesMap = new Map();

    // Filter out credit sales that are still pending (not yet recorded in finance)
    const filteredSalesHistory = finalProductSalesHistory.filter((sale) => {
      // Exclude credit sales that are still pending
      if (sale.category === "venda_prazo" && sale.description && isCreditSale(sale.description)) {
        console.log("🚫 [CHART FILTER] Excluindo venda a prazo pendente do gráfico:", {
          saleId: sale.id,
          referenceName: sale.reference_name,
          amount: sale.amount,
          category: sale.category
        });
        return false; // Exclude from chart
      }
      return true; // Include in chart
    });

    console.log("📊 [CHART FILTER] Vendas filtradas para o gráfico:", {
      totalSales: finalProductSalesHistory.length,
      filteredSales: filteredSalesHistory.length,
      excludedCreditSales: finalProductSalesHistory.length - filteredSalesHistory.length
    });

    filteredSalesHistory.forEach((sale) => {
      const productInfo = extractProductInfoFromSale(sale.description || "");

      if (productInfo && productInfo.productId) {
        // Find product name from stock items
        const stockItem = stockItems.find(
          (item) => item.id === productInfo.productId,
        );
        const productName = stockItem
          ? stockItem.item_name
          : `Produto ${productInfo.productId}`;

        if (!productSalesMap.has(productName)) {
          productSalesMap.set(productName, {
            productName,
            totalSales: 0,
            totalQuantity: 0,
            totalValue: 0,
            salesCount: 0,
          });
        }

        const productData = productSalesMap.get(productName);
        productData.totalSales += 1;
        productData.totalQuantity += productInfo.quantity;
        // For credit sales that were paid, use the original value for chart calculation
        const saleValue = sale.category === "venda_prazo" ? getDisplayAmount(sale) : sale.amount;
        productData.totalValue += saleValue;
        productData.salesCount += 1;
      }
    });

    // Convert to array and calculate averages
    const chartData = Array.from(productSalesMap.values())
      .map((product) => ({
        ...product,
        averageValue: product.totalValue / product.salesCount,
        averageValuePerUnit: product.totalValue / product.totalQuantity,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity) // Sort by highest quantity
      .slice(0, 10); // Show top 10 products

    console.log("📊 [SalesDashboard] Dados do gráfico calculados:", chartData);

    return chartData;
  }, [finalProductSalesHistory, stockItems]);

  // Calculate resale product sales data aggregated by product for the chart
  const resaleProductSalesChartData = useMemo(() => {
    console.log(
      "🔄 [SalesDashboard] Calculando dados do gráfico de vendas de produtos de revenda",
    );

    const productSalesMap = new Map();

    // Filter out credit sales that are still pending (not yet recorded in finance)
    const filteredResaleSalesHistory = resaleProductSalesHistory.filter((sale) => {
      // Exclude credit sales that are still pending
      if (sale.category === "venda_prazo" && sale.description && isCreditSale(sale.description)) {
        console.log("🚫 [RESALE CHART FILTER] Excluindo venda a prazo pendente do gráfico:", {
          saleId: sale.id,
          referenceName: sale.reference_name,
          amount: sale.amount,
          category: sale.category
        });
        return false; // Exclude from chart
      }
      return true; // Include in chart
    });

    console.log("📊 [RESALE CHART FILTER] Vendas de revenda filtradas para o gráfico:", {
      totalSales: resaleProductSalesHistory.length,
      filteredSales: filteredResaleSalesHistory.length,
      excludedCreditSales: resaleProductSalesHistory.length - filteredResaleSalesHistory.length
    });

    filteredResaleSalesHistory.forEach((sale) => {
      const productInfo = extractProductInfoFromSale(sale.description || "");

      if (productInfo && productInfo.productId) {
        // Find product name from resale products
        const resaleProduct = resaleProducts.find(
          (product) => product.id === productInfo.productId,
        );
        const productName = resaleProduct
          ? resaleProduct.name
          : `Produto ${productInfo.productId}`;

        if (!productSalesMap.has(productName)) {
          productSalesMap.set(productName, {
            productName,
            totalSales: 0,
            totalQuantity: 0,
            totalValue: 0,
            salesCount: 0,
          });
        }

        const productData = productSalesMap.get(productName);
        productData.totalSales += 1;
        productData.totalQuantity += productInfo.quantity;
        // For credit sales that were paid, use the original value for chart calculation
        const saleValue = sale.category === "venda_prazo" ? getDisplayAmount(sale) : sale.amount;
        productData.totalValue += saleValue;
        productData.salesCount += 1;
      }
    });

    // Convert to array and calculate averages
    const chartData = Array.from(productSalesMap.values())
      .map((product) => ({
        ...product,
        averageValue: product.totalValue / product.salesCount,
        averageValuePerUnit: product.totalValue / product.totalQuantity,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity) // Sort by highest quantity
      .slice(0, 10); // Show top 10 products

    console.log(
      "📊 [SalesDashboard] Dados do gráfico de produtos de revenda calculados:",
      chartData,
    );

    return chartData;
  }, [resaleProductSalesHistory, resaleProducts]);

  // Calculate overall sales metrics
  const finalProductSalesMetrics = useMemo(() => {
    const totalSales = finalProductSalesHistory.length;
    const totalValue = finalProductSalesHistory.reduce(
      (sum, sale) => sum + sale.amount,
      0,
    );
    const totalQuantity = finalProductSalesHistory.reduce((total, sale) => {
      const productInfo = extractProductInfoFromSale(sale.description || "");
      return total + (productInfo?.quantity || 0);
    }, 0);

    return {
      averageValuePerSale: totalSales > 0 ? totalValue / totalSales : 0,
      averageValuePerUnit: totalQuantity > 0 ? totalValue / totalQuantity : 0,
      averageQuantityPerSale: totalSales > 0 ? totalQuantity / totalSales : 0,
    };
  }, [finalProductSalesHistory]);

  // Calculate overall resale product sales metrics
  const resaleProductSalesMetrics = useMemo(() => {
    const totalSales = resaleProductSalesHistory.length;
    const totalValue = resaleProductSalesHistory.reduce(
      (sum, sale) => sum + sale.amount,
      0,
    );
    const totalQuantity = resaleProductSalesHistory.reduce((total, sale) => {
      const productInfo = extractProductInfoFromSale(sale.description || "");
      return total + (productInfo?.quantity || 0);
    }, 0);

    return {
      averageValuePerSale: totalSales > 0 ? totalValue / totalSales : 0,
      averageValuePerUnit: totalQuantity > 0 ? totalValue / totalQuantity : 0,
      averageQuantityPerSale: totalSales > 0 ? totalQuantity / totalSales : 0,
    };
  }, [resaleProductSalesHistory]);

  // Custom tooltip for the chart
  // Filter functions for autocomplete
  const filteredSalespeople = activeSalespeople.filter((person) =>
    person.name.toLowerCase().includes(salespersonSearch.toLowerCase()),
  );

  const filteredCustomers = activeCustomers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (customer.document &&
        customer.document.toLowerCase().includes(customerSearch.toLowerCase())),
  );

  const filteredPOSProducts = (() => {
    if (productType === "final" || productType === "warranty") {
      return availableProducts.filter((product) =>
        product.item_name.toLowerCase().includes(productSearch.toLowerCase()),
      );
    } else {
      return availableResaleProducts.filter((product) =>
        product.name.toLowerCase().includes(productSearch.toLowerCase()),
      );
    }
  })();

  // Handle autocomplete selections
  const handleSalespersonSelect = (salesperson: any) => {
    setSelectedSalesperson(salesperson.id);
    setSalespersonSearch(salesperson.name);
    setShowSalespersonDropdown(false);
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer.id);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product.id);
    if (productType === "final" || productType === "warranty") {
      setProductSearch(product.item_name);
    } else {
      setProductSearch(product.name);
    }
    setShowProductDropdown(false);

    // Se o modo multi-produto estiver ativo e não for garantia, adicionar automaticamente à lista de produtos selecionados
    if (isMultiProductMode && productType !== "warranty") {
      // Criar um item básico para a lista de produtos selecionados
      const productName = productType === "final" ? product.item_name : product.name;
      
      // Verificar se o produto já está na lista
      const existingProduct = productCart.find(item => item.originalProductId === product.id);
      if (!existingProduct) {
        const newSelectedProduct = {
          id: Date.now().toString(),
          name: productName,
          type: productType as 'final' | 'resale',
          quantity: 0, // Será preenchido quando o usuário digitar
          unitPrice: 0, // Será preenchido quando o usuário digitar
          totalPrice: 0,
          originalProductId: product.id,
        };

        setProductCart([...productCart, newSelectedProduct]);
      }
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-factory-800/95 border border-tire-600/30 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-neon-blue">
              <span className="text-tire-300">Quantidade Vendida:</span>{" "}
              <span className="font-bold">
                {data.totalQuantity.toFixed(0)} unidades
              </span>
            </p>
            <p className="text-neon-green">
              <span className="text-tire-300">Total de Vendas:</span>{" "}
              <span className="font-bold">{data.salesCount} vendas</span>
            </p>
            <p className="text-neon-orange">
              <span className="text-tire-300">Valor Total:</span>{" "}
              <span className="font-bold">
                {formatCurrency(data.totalValue)}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Remove product from cart
  const removeProductFromCart = (productId: string) => {
    setProductCart(productCart.filter(item => item.id !== productId));
  };

  // Update product in cart (quantity or unit price)
  const updateProductInCart = (productId: string, field: 'quantity' | 'unitPrice', value: number) => {
    setProductCart(productCart.map(item => {
      if (item.id === productId) {
        const updatedItem = { ...item, [field]: value };
        // Recalculate total price
        updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
        return updatedItem;
      }
      return item;
    }));
  };

  const getTotalCartValue = () => {
    return productCart.reduce((total, product) => total + product.totalPrice, 0);
  };



  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto px-4">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-green to-neon-blue flex items-center justify-center">
            <span className="text-white font-bold text-lg">💼</span>
          </div>
          Dashboard de Vendas
        </h2>
        <p className="text-tire-300 mt-2">
          Gerencie vendedores, clientes e produtos disponíveis para venda
        </p>
      </div>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-6 gap-2 mb-6">

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-tire-300 text-sm font-medium text-center mb-2">
                  Clientes<br />Ativos
                </p>
                <p className="text-2xl font-bold text-neon-blue text-center mt-1">
                  {activeCustomers.length}
                </p>
              </div>
              <div className="text-neon-blue ml-3">
                <Users className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-tire-300 text-sm font-medium text-center mb-2">Produtos Disponíveis</p>
                <p className="text-2xl font-bold text-neon-purple text-center">
                  {availableProducts.length}
                </p>
              </div>
              <div className="text-neon-purple ml-3">
                <Package className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-tire-300 text-sm font-medium text-center mb-2">Qtd. Vendida (Final)</p>
                <p className="text-2xl font-bold text-neon-orange text-center">
                  {finalProductSalesHistory
                    .reduce((total, sale) => {
                      const productInfo = extractProductInfoFromSale(
                        sale.description || "",
                      );
                      return total + (productInfo?.quantity || 0);
                    }, 0)
                    .toFixed(0)}
                </p>
              </div>
              <div className="text-neon-orange ml-3">
                <TrendingUp className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-tire-300 text-sm font-medium text-center mb-2">Qtd. Vendida (Revenda)</p>
                <p className="text-2xl font-bold text-white text-center">
                  {resaleProductSalesHistory
                    .reduce((total, sale) => {
                      const productInfo = extractProductInfoFromSale(
                        sale.description || "",
                      );
                      return total + (productInfo?.quantity || 0);
                    }, 0)
                    .toFixed(0)}
                </p>
              </div>
              <div className="text-white ml-3">
                <TrendingUp className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-factory-800/50 border-tire-600/30" style={{ borderColor: '#00ff88', borderWidth: '1px', borderStyle: 'solid' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-tire-300 text-sm font-medium text-center mb-2">A Receber</p>
                <p className="text-2xl font-bold text-center text-neon-green">
                  {formatCurrency(
                    [...finalProductSalesHistory, ...resaleProductSalesHistory]
                      .filter(sale => sale.category === "venda_prazo" && sale.description && isCreditSale(sale.description))
                      .reduce((total, sale) => {
                        const originalValue = extractOriginalValueFromSale(sale.description || "");
                        return total + (originalValue || 0);
                      }, 0)
                  )}
                </p>
                <p className="text-xs text-tire-400 text-center mt-1">
                  Vendas a Prazo
                </p>
              </div>
              <div className="text-neon-green ml-3">
                <DollarSign className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: '#173329', borderColor: '#00ff88', borderWidth: '1px', borderStyle: 'solid' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-tire-300 text-sm font-medium text-center mb-2">Receita Total</p>
                <p className="text-2xl font-bold text-center" style={{ color: '#00fa85' }}>
                  {formatCurrency(
                    finalProductSalesHistory.reduce((total, sale) => total + sale.amount, 0) +
                    resaleProductSalesHistory.reduce((total, sale) => total + sale.amount, 0)
                  )}
                </p>
                <p className="text-xs text-tire-400 text-center mt-1">
                  Final + Revenda
                </p>
              </div>
              <div className="ml-3" style={{ color: '#00fa85' }}>
                <DollarSign className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-2 rounded-lg bg-factory-800/50 p-1 text-muted-foreground border border-tire-600/30">
          <TabsTrigger
            value="pos"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-green/20"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Caixa
          </TabsTrigger>
          <TabsTrigger
            value="final-sales-history"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-green/20"
          >
            <History className="h-4 w-4 mr-2" />
            Histórico Produtos Finais
          </TabsTrigger>
          <TabsTrigger
            value="resale-sales-history"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-cyan/20"
          >
            <History className="h-4 w-4 mr-2" />
            Histórico Produtos Revenda
          </TabsTrigger>
          <TabsTrigger
            value="warranty-history"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-purple/20"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Histórico de Garantias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pos">
          <Card className="bg-factory-900/80 border-tire-600/30 max-w-7xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tire-200 text-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-green to-neon-blue flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                Sistema de Caixa
              </CardTitle>
              <p className="text-tire-300">
                Registre vendas de forma rápida e simples
              </p>
            </CardHeader>
            <CardContent className="space-y-6 bg-factory-900/60 rounded-lg">


              {/* Step 1: Vendedor */}
              <div className="space-y-2 relative">
                <Label className="text-tire-300 font-medium">
                  1. Digite o nome do Vendedor *
                </Label>
                <div className="relative">
                  <Input
                    value={salespersonSearch}
                    onChange={(e) => {
                      setSalespersonSearch(e.target.value);
                      setShowSalespersonDropdown(e.target.value.length > 0);
                      if (!e.target.value) {
                        setSelectedSalesperson("");
                      }
                    }}
                    className="bg-factory-700/50 border-tire-600/30 text-white h-12 pr-10"
                    placeholder="Digite para buscar vendedor..."
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-tire-400" />
                </div>
                {showSalespersonDropdown && filteredSalespeople.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-factory-800 border border-tire-600/30 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredSalespeople.map((person) => (
                      <div
                        key={person.id}
                        onClick={() => handleSalespersonSelect(person)}
                        className="p-3 hover:bg-tire-700/50 cursor-pointer text-white border-b border-tire-600/20 last:border-b-0"
                      >
                        <div className="font-medium">{person.name}</div>
                        <div className="text-sm text-tire-400">
                          {formatPercentage(person.commission_rate)} comissão
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showSalespersonDropdown &&
                  salespersonSearch &&
                  filteredSalespeople.length === 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-factory-800 border border-tire-600/30 rounded-lg shadow-lg p-3">
                      <div className="text-tire-400 text-sm">
                        Nenhum vendedor encontrado
                      </div>
                    </div>
                  )}
              </div>

              {/* Step 2: Cliente */}
              <div className="space-y-2 relative">
                <Label className="text-tire-300 font-medium">
                  2. Digite o nome do Cliente *
                </Label>
                <div className="relative">
                  <Input
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(e.target.value.length > 0);
                      if (!e.target.value) {
                        setSelectedCustomer("");
                      }
                    }}
                    className="bg-factory-700/50 border-tire-600/30 text-white h-12 pr-10"
                    placeholder="Digite para buscar cliente..."
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-tire-400" />
                </div>
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-factory-800 border border-tire-600/30 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="p-3 hover:bg-tire-700/50 cursor-pointer text-white border-b border-tire-600/20 last:border-b-0"
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-tire-400">
                          {customer.document && `${customer.document}`}
                          {customer.warranty_count &&
                            customer.warranty_count > 0 && (
                              <span className="ml-2 text-purple-400">
                                ({customer.warranty_count} garantias)
                              </span>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showCustomerDropdown &&
                  customerSearch &&
                  filteredCustomers.length === 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-factory-800 border border-tire-600/30 rounded-lg shadow-lg p-3">
                      <div className="text-tire-400 text-sm">
                        Nenhum cliente encontrado
                      </div>
                    </div>
                  )}
              </div>

              {/* Step 2.5: Product Type Selection */}
              {selectedCustomer && (
                <div className="space-y-3">
                  <Label className="text-tire-300 font-medium">
                    2.5. Tipo de Produto
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setProductType("final")}
                      className={`p-3 rounded-lg border transition-all ${
                        productType === "final"
                          ? "bg-neon-blue/20 border-neon-blue text-neon-blue"
                          : "bg-factory-700/30 border-tire-600/30 text-tire-300 hover:bg-factory-600/30"
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-medium">
                          🏭 Produto Final
                        </div>
                        <div className="text-xs mt-1">
                          Venda de produtos fabricados
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductType("resale")}
                      className={`p-3 rounded-lg border transition-all ${
                        productType === "resale"
                          ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan"
                          : "bg-factory-700/30 border-tire-600/30 text-tire-300 hover:bg-factory-600/30"
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-medium">
                          🛒 Produto Revenda
                        </div>
                        <div className="text-xs mt-1">
                          Venda de produtos de revenda
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductType("warranty")}
                      className={`p-3 rounded-lg border transition-all ${
                        productType === "warranty"
                          ? "bg-neon-purple/20 border-neon-purple text-neon-purple"
                          : "bg-factory-700/30 border-tire-600/30 text-tire-300 hover:bg-factory-600/30"
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-medium">🛡️ Garantia</div>
                        <div className="text-xs mt-1">
                          Troca por garantia (sem valor)
                        </div>
                      </div>
                    </button>
                  </div>
                  {productType === "warranty" && (
                    <div className="p-3 bg-neon-purple/10 rounded border border-neon-purple/30">
                      <p className="text-neon-purple text-sm font-medium">
                        🛡️ Modo Garantia Ativado
                      </p>
                      <p className="text-tire-300 text-xs mt-1">
                        • Não será registrado valor monetário
                      </p>
                      <p className="text-tire-300 text-xs">
                        • Produto será descontado do estoque
                      </p>
                      <p className="text-tire-300 text-xs">
                        • Quantidade será registrada no histórico de perdas
                      </p>
                      <p className="text-tire-300 text-xs">
                        • Contador de garantias do cliente será atualizado
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Produto */}
              <div className="space-y-2 relative">
                <Label className="text-tire-300 font-medium">
                  3. Digite o nome do Produto *
                </Label>
                <div className="relative">
                  <Input
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(e.target.value.length > 0);
                      if (!e.target.value) {
                        setSelectedProduct("");
                      }
                    }}
                    className="bg-factory-700/50 border-tire-600/30 text-white h-12 pr-10"
                    placeholder="Digite para buscar produto..."
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-tire-400" />
                </div>
                {showProductDropdown && filteredPOSProducts.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-factory-800 border border-tire-600/30 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredPOSProducts.map((product) => {
                      if (
                        productType === "final" ||
                        productType === "warranty"
                      ) {
                        return (
                          <div
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className="p-3 hover:bg-tire-700/50 cursor-pointer text-white border-b border-tire-600/20 last:border-b-0"
                          >
                            <div className="font-medium">
                              {product.item_name}
                            </div>
                            <div className="text-sm text-tire-400">
                              Estoque: {product.quantity.toFixed(0)}{" "}
                              {product.unit}
                            </div>
                          </div>
                        );
                      } else {
                        const stockItem = stockItems.find(
                          (item) =>
                            item.item_id === product.id &&
                            item.item_type === "product",
                        );
                        const stockQuantity = stockItem?.quantity || 0;
                        return (
                          <div
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className="p-3 hover:bg-tire-700/50 cursor-pointer text-white border-b border-tire-600/20 last:border-b-0"
                          >
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-tire-400">
                              Estoque: {stockQuantity.toFixed(0)} {product.unit}
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
                {showProductDropdown &&
                  productSearch &&
                  filteredPOSProducts.length === 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-factory-800 border border-tire-600/30 rounded-lg shadow-lg p-3">
                      <div className="text-tire-400 text-sm">
                        Nenhum produto encontrado
                      </div>
                    </div>
                  )}
                {selectedProduct && (
                  <div className="mt-2 p-3 bg-factory-700/30 rounded border border-tire-600/20">
                    {(() => {
                      if (productType === "final") {
                        const product = availableProducts.find(
                          (p) => p.id === selectedProduct,
                        );
                        return product ? (
                          <div className="text-center">
                            <p className="text-white font-medium text-lg">
                              🏭 {product.item_name}
                            </p>
                            <p className="text-tire-400 text-sm mt-1">
                              Produto Final - Digite o valor unitário abaixo
                            </p>
                          </div>
                        ) : null;
                      } else if (productType === "resale") {
                        const product = availableResaleProducts.find(
                          (p) => p.id === selectedProduct,
                        );
                        return product ? (
                          <div className="text-center">
                            <p className="text-white font-medium text-lg">
                              🛒 {product.name}
                            </p>
                            <p className="text-tire-400 text-sm mt-1">
                              Produto de Revenda - Digite o valor unitário
                              abaixo
                            </p>
                          </div>
                        ) : null;
                      } else if (productType === "warranty") {
                        const product = availableProducts.find(
                          (p) => p.id === selectedProduct,
                        );
                        return product ? (
                          <div className="text-center">
                            <p className="text-white font-medium text-lg">
                              🛡️ {product.item_name}
                            </p>
                            <p className="text-tire-400 text-sm mt-1">
                              Garantia - Sem valor monetário
                            </p>
                          </div>
                        ) : null;
                      }
                    })()}
                  </div>
                )}
              </div>

              {/* Step 4: Warranty Notice (only for warranty) */}
              {selectedProduct && productType === "warranty" && (
                <div className="space-y-2">
                  <Label className="text-tire-300 font-medium">
                    4. Valor da Operação
                  </Label>
                  <div className="p-4 bg-neon-purple/10 rounded-lg border border-neon-purple/30">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🛡️</span>
                      <div>
                        <p className="text-neon-purple font-medium">
                          Garantia - Sem Valor Monetário
                        </p>
                        <p className="text-tire-300 text-sm">
                          Esta operação não possui valor financeiro
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Quantidade (only for warranty) */}
              {selectedProduct && productType === "warranty" && (
                <div className="space-y-2">
                  <Label
                    htmlFor="quantity"
                    className="text-tire-300 font-medium"
                  >
                    5. Quantidade *
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="1"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="bg-factory-700/50 border-tire-600/30 text-white h-12 text-lg [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    placeholder="Quantidade para garantia"
                  />
                  <p className="text-purple-400 text-sm">
                    🛡️ Quantidade que será descontada do estoque por garantia
                  </p>
                </div>
              )}

              {/* Step 6: Valor Total (Auto-calculated) - Only for regular sales */}
              {selectedProduct &&
                productType !== "warranty" &&
                unitPrice &&
                quantity && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="saleValue"
                      className="text-tire-300 font-medium"
                    >
                      6. Valor Total da Venda (R$) *
                    </Label>
                    <div className="relative">
                      <Input
                        id="saleValue"
                        type="number"
                        step="0.01"
                        min="0"
                        value={saleValue}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="bg-factory-700/50 border-tire-600/30 text-white h-12 text-lg pr-20 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                        placeholder="Valor calculado automaticamente"
                        readOnly
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-neon-blue text-xs font-medium bg-neon-blue/20 px-2 py-1 rounded">
                          AUTO
                        </span>
                      </div>
                    </div>
                    {unitPrice &&
                      quantity &&
                      parseFloat(unitPrice) > 0 &&
                      parseFloat(quantity) > 0 && (
                        <div className="mt-2 p-4 bg-neon-blue/10 rounded border border-neon-blue/30">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-neon-blue font-medium">
                                Cálculo Automático:
                              </p>
                              <p className="text-tire-300 text-sm">
                                {quantity} ×{" "}
                                {formatCurrency(parseFloat(unitPrice))}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-neon-blue font-bold text-xl">
                                {formatCurrency(parseFloat(saleValue))}
                              </p>
                              <p className="text-tire-400 text-xs">
                                Valor Total
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                )}

              {selectedProduct &&
                productType !== "warranty" &&
                (!unitPrice || !quantity) && (
                  <div className="p-3 bg-tire-700/20 rounded border border-tire-600/30">
                    <p className="text-tire-400 text-sm text-center">
                      ⏳ Informe o preço unitário e a quantidade para calcular o
                      total automaticamente
                    </p>
                  </div>
                )}

              {selectedProduct && productType === "warranty" && !quantity && (
                <div className="p-3 bg-purple-700/20 rounded border border-purple-600/30">
                  <p className="text-purple-400 text-sm text-center">
                    🛡️ Informe a quantidade para processar a garantia
                  </p>
                </div>
              )}

              {/* Multi-Product Interface - Table Layout */}
              {isMultiProductMode && productType !== "warranty" && (
                <div className="p-4 bg-factory-800/50 rounded-lg border border-tire-600/30">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-neon-green" />
                      Lista de Produtos Multi-Venda
                    </h4>
                    <div className="flex items-center gap-2">
                      {productCart.length > 0 && (
                        <Button
                          onClick={() => setProductCart([])}
                          variant="outline"
                          className="border-red-600/30 text-red-400 hover:bg-red-600/20"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Limpar Lista
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Table Layout for Products */}
                  {productCart.length > 0 ? (
                    <div className="space-y-3">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-2 p-3 bg-factory-700/50 rounded-lg border border-tire-600/30">
                        <div className="col-span-5 text-tire-300 text-sm font-medium">PRODUTO</div>
                        <div className="col-span-2 text-tire-300 text-sm font-medium text-center">QUANTIDADE</div>
                        <div className="col-span-3 text-tire-300 text-sm font-medium text-center">VALOR UNITÁRIO</div>
                        <div className="col-span-1 text-tire-300 text-sm font-medium text-center">TOTAL</div>
                        <div className="col-span-1 text-tire-300 text-sm font-medium text-center">AÇÃO</div>
                      </div>

                      {/* Table Rows */}
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {productCart.map((item, index) => (
                          <div key={item.id} className="grid grid-cols-12 gap-2 p-3 bg-factory-700/30 rounded-lg border border-tire-600/20 items-center">
                            {/* Product Name */}
                            <div className="col-span-5">
                              <p className="text-white font-medium text-sm">{item.name}</p>
                              <p className="text-tire-400 text-xs">
                                {productType === "final" 
                                  ? availableProducts.find(p => p.id === item.originalProductId)?.unit
                                  : availableResaleProducts.find(p => p.id === item.originalProductId)?.unit}
                              </p>
                            </div>

                            {/* Quantity Input */}
                            <div className="col-span-2">
                              <Input
                                type="number"
                                step="1"
                                min="1"
                                value={item.quantity || ""}
                                onChange={(e) => updateProductInCart(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="bg-factory-600/50 border-neon-blue/30 text-white h-10 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                                placeholder="0"
                              />
                            </div>

                            {/* Unit Price Input */}
                            <div className="col-span-3">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice || ""}
                                onChange={(e) => updateProductInCart(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="bg-factory-600/50 border-neon-green/30 text-white h-10 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                                placeholder="0,00"
                              />
                            </div>

                            {/* Total */}
                            <div className="col-span-1 text-center">
                              <p className="text-neon-green font-bold text-sm">
                                {formatCurrency(item.totalPrice)}
                              </p>
                            </div>

                            {/* Remove Button */}
                            <div className="col-span-1 text-center">
                              <Button
                                onClick={() => removeProductFromCart(item.id)}
                                variant="outline"
                                size="sm"
                                className="border-red-600/30 text-red-400 hover:bg-red-600/20 h-8 w-8 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <ShoppingCart className="h-12 w-12 text-tire-400 mx-auto mb-3" />
                      <p className="text-tire-400 text-sm">
                        Selecione produtos acima para adicionar à lista
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Total da Venda - Fora da Interface Multi-Produto */}
              {isMultiProductMode && productType !== "warranty" && productCart.length > 0 && (
                <div className="p-4 bg-neon-green/10 rounded-lg border border-neon-green/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-neon-green font-medium">Total da Venda Multi-Produto</h4>
                      <p className="text-tire-300 text-sm">
                        {productCart.length} {productCart.length === 1 ? 'produto' : 'produtos'} selecionados
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-neon-green font-bold text-3xl">
                        {formatCurrency(productCart.reduce((sum, item) => sum + item.totalPrice, 0))}
                      </p>
                      <p className="text-tire-300 text-xs">Valor Total</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary for Regular Sale */}
              {productType !== "warranty" &&
                selectedSalesperson &&
                selectedCustomer &&
                selectedProduct &&
                unitPrice &&
                quantity &&
                saleValue && (
                  <div className="p-4 bg-neon-green/10 rounded-lg border border-neon-green/30">
                    <h4 className="text-neon-green font-medium mb-3">
                      Resumo da Venda:
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-tire-300">Vendedor:</span>
                        <span className="text-white">
                          {
                            activeSalespeople.find(
                              (s) => s.id === selectedSalesperson,
                            )?.name
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-tire-300">Cliente:</span>
                        <span className="text-white">
                          {
                            activeCustomers.find(
                              (c) => c.id === selectedCustomer,
                            )?.name
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-tire-300">Produto:</span>
                        <span className="text-white">
                          {productType === "final"
                            ? availableProducts.find(
                                (p) => p.id === selectedProduct,
                              )?.item_name
                            : availableResaleProducts.find(
                                (p) => p.id === selectedProduct,
                              )?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-tire-300">Quantidade:</span>
                        <span className="text-white">
                          {quantity}{" "}
                          {productType === "final"
                            ? availableProducts.find(
                                (p) => p.id === selectedProduct,
                              )?.unit
                            : availableResaleProducts.find(
                                (p) => p.id === selectedProduct,
                              )?.unit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-tire-300">Preço Unitário:</span>
                        <span className="text-white">
                          {formatCurrency(parseFloat(unitPrice))}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-neon-green/30 pt-2">
                        <span className="text-tire-300 font-medium">
                          Valor Total:
                        </span>
                        <span className="text-neon-green font-bold text-lg">
                          {formatCurrency(parseFloat(saleValue))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              {/* Summary for Warranty */}
              {productType === "warranty" &&
                selectedSalesperson &&
                selectedCustomer &&
                selectedProduct &&
                quantity && (
                  <div className="p-4 bg-neon-purple/10 rounded-lg border border-neon-purple/30">
                    <h4 className="text-neon-purple font-medium mb-3 flex items-center gap-2">
                      🛡️ Resumo da Garantia:
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-tire-300">Vendedor:</span>
                        <span className="text-white">
                          {
                            activeSalespeople.find(
                              (s) => s.id === selectedSalesperson,
                            )?.name
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-tire-300">Cliente:</span>
                        <span className="text-white">
                          {
                            activeCustomers.find(
                              (c) => c.id === selectedCustomer,
                            )?.name
                          }
                          {(() => {
                            const customer = activeCustomers.find(
                              (c) => c.id === selectedCustomer,
                            );
                            return customer?.warranty_count ? (
                              <span className="ml-2 text-purple-400 text-xs">
                                ({customer.warranty_count} garantias)
                              </span>
                            ) : null;
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-tire-300">Produto:</span>
                        <span className="text-white">
                          {
                            availableProducts.find(
                              (p) => p.id === selectedProduct,
                            )?.item_name
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-tire-300">Quantidade:</span>
                        <span className="text-white">
                          {quantity}{" "}
                          {
                            availableProducts.find(
                              (p) => p.id === selectedProduct,
                            )?.unit
                          }
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-neon-purple/30 pt-2">
                        <span className="text-tire-300 font-medium">
                          Valor Financeiro:
                        </span>
                        <span className="text-neon-purple font-bold text-lg">
                          R$ 0,00 (Garantia)
                        </span>
                      </div>
                      <div className="mt-3 p-2 bg-purple-900/20 rounded text-xs">
                        <p className="text-purple-300">
                          ✓ Produto será descontado do estoque
                        </p>
                        <p className="text-purple-300">
                          ✓ Registrado no histórico de perdas
                        </p>
                        <p className="text-purple-300">
                          ✓ Contador de garantias do cliente será atualizado
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Payment Method Selection */}
              {productType !== "warranty" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Método de Pagamento *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as "DINHEIRO" | "PIX" | "CARTÃO" | "A PRAZO")}
                    className="w-full px-3 py-2 bg-factory-700/50 border border-tire-600/30 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-neon-blue"
                  >
                    <option value="DINHEIRO">💵 DINHEIRO</option>
                    <option value="PIX">📱 PIX</option>
                    <option value="CARTÃO">💳 CARTÃO</option>
                    <option value="A PRAZO">📅 A PRAZO</option>
                  </select>
                </div>
              )}

              {/* Confirm Button */}
              <Button
                onClick={isMultiProductMode && productType !== "warranty" ? handleMultiProductSale : handleConfirmSale}
                disabled={
                  isProcessingSale ||
                  !selectedSalesperson ||
                  !selectedCustomer ||
                  (isMultiProductMode && productType !== "warranty" 
                    ? productCart.length === 0
                    : (!selectedProduct ||
                       !quantity ||
                       parseFloat(quantity) <= 0 ||
                       (productType !== "warranty" &&
                         (!unitPrice ||
                           !saleValue ||
                           parseFloat(unitPrice) <= 0 ||
                           parseFloat(saleValue) <= 0))))
                }
                className={`w-full h-14 text-lg font-medium text-white ${
                  productType === "warranty"
                    ? "bg-gradient-to-r from-neon-purple to-purple-600 hover:from-purple-600 hover:to-neon-purple"
                    : "bg-gradient-to-r from-neon-green to-neon-blue hover:from-neon-blue hover:to-neon-green"
                }`}
              >
                {isProcessingSale ? (
                  "Processando..."
                ) : (
                  <>
                    {productType === "warranty" ? (
                      <>
                        <span className="mr-2">🛡️</span>
                        Confirmar Garantia
                      </>
                    ) : isMultiProductMode ? (
                      <>
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Confirmar Venda Multi-Produto ({productCart.length} {productCart.length === 1 ? 'item' : 'itens'})
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Confirmar Venda
                      </>
                    )}
                  </>
                )}
              </Button>

              {/* Instructions */}
              <div className="text-center text-tire-400 text-sm">
                {productType === "warranty" ? (
                  <>
                    <p>🛡️ Preencha os campos para processar a garantia</p>
                    <p className="mt-1">
                      Garantias não possuem valor monetário e são registradas no
                      histórico de perdas
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Preencha todos os campos na ordem para registrar a venda
                    </p>
                    <p className="mt-1">
                      Digite manualmente o preço unitário - o total será
                      calculado automaticamente
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="final-sales-history">
          <Card className="bg-factory-900/80 border-tire-600/30 max-w-7xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-neon-blue" />
                  Histórico de Vendas - Produtos Finais
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
                    placeholder="Buscar por cliente, produto ou descrição..."
                    value={salesHistorySearch}
                    onChange={(e) => setSalesHistorySearch(e.target.value)}
                    className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  />
                </div>

                {/* Seção de Filtros de Data */}
                <div className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-neon-blue" />
                    <Label className="text-tire-200 font-medium">
                      Filtros de Data
                    </Label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Tipo de Filtro */}
                    <div className="space-y-2">
                      <Label className="text-tire-300 text-sm">Período:</Label>
                      <Select
                        value={salesHistoryDateType}
                        onValueChange={(value) => {
                          setSalesHistoryDateType(value);
                          // Reset custom date filters when changing type
                          if (value !== "custom") {
                            setSalesHistoryStartDate("");
                            setSalesHistoryEndDate("");
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
                            Todas as vendas
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
                    {salesHistoryDateType === "custom" && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-tire-300 text-sm">
                            Data Inicial:
                          </Label>
                          <div className="relative">
                            <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                            <Input
                              type="date"
                              value={salesHistoryStartDate}
                              onChange={(e) =>
                                setSalesHistoryStartDate(e.target.value)
                              }
                              className="pl-9 bg-factory-700/50 border-tire-600/30 text-white"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-tire-300 text-sm">
                            Data Final:
                          </Label>
                          <div className="relative">
                            <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                            <Input
                              type="date"
                              value={salesHistoryEndDate}
                              onChange={(e) =>
                                setSalesHistoryEndDate(e.target.value)
                              }
                              className="pl-9 bg-factory-700/50 border-tire-600/30 text-white"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Indicador de Filtros Ativos */}
                  {hasActiveFilters && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {salesHistorySearch && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-neon-blue/20 rounded text-neon-blue text-xs">
                          <Search className="h-3 w-3" />
                          Busca: "{salesHistorySearch}"
                        </div>
                      )}
                      {salesHistoryDateType !== "all" && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-neon-green/20 rounded text-neon-green text-xs">
                          <Calendar className="h-3 w-3" />
                          {salesHistoryDateType === "today" && "Hoje"}
                          {salesHistoryDateType === "last7days" &&
                            "Últimos 7 dias"}
                          {salesHistoryDateType === "last30days" &&
                            "Últimos 30 dias"}
                          {salesHistoryDateType === "thisMonth" && "Este mês"}
                          {salesHistoryDateType === "lastMonth" &&
                            "Mês passado"}
                          {salesHistoryDateType === "month" &&
                            `Mês: ${salesHistoryDateFilter}`}
                          {salesHistoryDateType === "custom" &&
                            "Período personalizado"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-factory-900/60 rounded-lg">
              {/* Sales Chart */}
              {finalProductSalesChartData.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-neon-blue" />
                    <h3 className="text-tire-200 font-medium text-lg">
                      Gráfico de Vendas - Quantidade e Valor Médio por Produto
                    </h3>
                  </div>

                  {/* Seção de Valores Médios Destacados */}
                  <div className="mb-4 p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
                    <h4 className="text-tire-200 font-medium text-sm mb-3 flex items-center gap-2">
                      💰 Valores Médios por Produto (Destacados)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {finalProductSalesChartData.map((product, index) => {
                        const averageValuePerUnit =
                          product.totalValue / product.totalQuantity;
                        return (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-factory-800/50 rounded border border-tire-600/30"
                          >
                            <div className="flex-1">
                              <p className="text-white font-medium text-sm truncate">
                                {product.productName}
                              </p>
                              <p className="text-tire-400 text-xs">
                                {product.totalQuantity.toFixed(0)} unidades
                                vendidas
                              </p>
                            </div>
                            <div className="text-right ml-3">
                              <p className="text-neon-green font-bold text-lg">
                                {formatCurrency(averageValuePerUnit)}
                              </p>
                              <p className="text-tire-400 text-xs">
                                por unidade
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-3 bg-factory-800/50 rounded-lg border border-tire-600/30">
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={finalProductSalesChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="productName"
                          stroke="#9CA3AF"
                          fontSize={14}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                          tickFormatter={(value, index) => {
                            const data = finalProductSalesChartData[index];
                            if (data) {
                              // Usar a fórmula correta: Valor Total ÷ Quantidade Total
                              const averageValuePerUnit =
                                data.totalValue / data.totalQuantity;
                              const formattedValue = formatCurrency(
                                averageValuePerUnit,
                              ).replace("R$\u00A0", "R$ ");
                              // Separar o nome do produto do valor médio com quebra de linha e destaque
                              return `${value}\n\n💰 ${formattedValue}`;
                            }
                            return value;
                          }}
                        />
                        <YAxis
                          stroke="#9CA3AF"
                          fontSize={12}
                          tickFormatter={(value) => value.toFixed(0)}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="totalQuantity"
                          fill="url(#quantityGradient)"
                          radius={[4, 4, 0, 0]}
                        />
                        <defs>
                          <linearGradient
                            id="quantityGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#bbe5fc"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="100%"
                              stopColor="#87ceeb"
                              stopOpacity={0.6}
                            />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 text-center">
                      <p className="text-tire-400 text-xs">
                        📊 Mostrando os {finalProductSalesChartData.length}{" "}
                        produtos finais com maior quantidade vendida
                      </p>
                      <p className="text-tire-500 text-xs mt-1">
                        🔵 Azul: Quantidade Vendida | 💰 Valor Médio por Unidade
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {finalProductSalesHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                    <p className="text-tire-400">
                      {salesHistorySearch || salesHistoryDateFilter
                        ? "Nenhuma venda encontrada"
                        : "Nenhuma venda registrada"}
                    </p>
                  </div>
                ) : (
                  finalProductSalesHistory.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1">
                            {sale.reference_name}
                          </h4>
                          <div className="flex items-center gap-4 text-tire-400 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(
                                  sale.transaction_date,
                                ).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span className="text-neon-green font-bold">
                                {formatCurrency(getDisplayAmount(sale))}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs">
                                {getPaymentMethodIcon(extractPaymentMethodFromSale(sale.description || ""))}
                              </span>
                              <span className="text-xs bg-factory-600/50 px-2 py-1 rounded text-white font-medium">
                                {extractPaymentMethodFromSale(sale.description || "")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Botão Lançar Financeiro para vendas a prazo */}
                          {sale.category === "venda_prazo" && sale.description && isCreditSale(sale.description) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const originalValue = extractOriginalValueFromSale(sale.description || "");
                                if (originalValue) {
                                  handleConfirmCreditPayment(sale.id, sale.reference_name, originalValue);
                                }
                              }}
                              className="text-neon-green hover:text-neon-green/80 hover:bg-neon-green/10 px-3 py-1 h-8 text-xs font-medium"
                              title="Lançar no financeiro"
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Lançar Financeiro
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteSale(sale.id, sale.reference_name)
                            }
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 h-8 w-8"
                            title="Excluir venda"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {sale.description && (
                        <div className="mt-2 p-2 bg-factory-700/20 rounded text-tire-300 text-sm">
                          <p className="font-medium text-tire-200 mb-1">
                            Detalhes:
                          </p>
                          <p>{sale.description}</p>
                        </div>
                      )}
                      <div className="text-tire-500 text-xs mt-2">
                        ID: {sale.id}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {finalProductSalesHistory.length > 0 && (
                <div className="mt-4 p-4 bg-factory-800/50 rounded-lg border border-tire-600/30">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                    <div className="text-center">
                      <p className="text-tire-300 text-sm mb-1">
                        Total de Vendas
                      </p>
                      <p className="text-neon-blue font-bold text-lg">
                        {finalProductSalesHistory.length}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-tire-300 text-sm mb-1">
                        Quantidade Vendida
                      </p>
                      <p className="text-neon-green font-bold text-lg">
                        {finalProductSalesHistory
                          .reduce((total, sale) => {
                            // Não contar vendas a prazo pendentes na quantidade
                            if (sale.category === "venda_prazo" && sale.description && isCreditSale(sale.description)) {
                              return total;
                            }
                            const productInfo = extractProductInfoFromSale(
                              sale.description || "",
                            );
                            return total + (productInfo?.quantity || 0);
                          }, 0)
                          .toFixed(0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-tire-300 text-sm mb-1">Valor Total</p>
                      <p className="text-neon-orange font-bold text-lg">
                        {formatCurrency(
                          finalProductSalesHistory.reduce(
                            (sum, sale) => sum + sale.amount,
                            0,
                          ),
                        )}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-tire-300 text-sm mb-1">Valor Médio</p>
                      <p className="text-neon-purple font-bold text-lg">
                        {finalProductSalesHistory.length > 0
                          ? formatCurrency(
                              finalProductSalesHistory.reduce(
                                (sum, sale) => sum + sale.amount,
                                0,
                              ) / finalProductSalesHistory.length,
                            )
                          : formatCurrency(0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resale-sales-history">
          <Card className="bg-factory-900/80 border-tire-600/30 max-w-7xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-neon-cyan" />
                  Histórico de Vendas - Produtos de Revenda
                </div>
                {hasActiveResaleFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearResaleFilters}
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
                    placeholder="Buscar por cliente, produto ou descrição..."
                    value={resaleSalesHistorySearch}
                    onChange={(e) =>
                      setResaleSalesHistorySearch(e.target.value)
                    }
                    className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  />
                </div>

                {/* Seção de Filtros de Data */}
                <div className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-neon-cyan" />
                    <Label className="text-tire-200 font-medium">
                      Filtros de Data
                    </Label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Tipo de Filtro */}
                    <div className="space-y-2">
                      <Label className="text-tire-300 text-sm">Período:</Label>
                      <Select
                        value={resaleSalesHistoryDateType}
                        onValueChange={(value) => {
                          setResaleSalesHistoryDateType(value);
                          // Reset custom date filters when changing type
                          if (value !== "custom") {
                            setResaleSalesHistoryStartDate("");
                            setResaleSalesHistoryEndDate("");
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
                            Todas as vendas
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
                    {resaleSalesHistoryDateType === "custom" && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-tire-300 text-sm">
                            Data Inicial:
                          </Label>
                          <div className="relative">
                            <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                            <Input
                              type="date"
                              value={resaleSalesHistoryStartDate}
                              onChange={(e) =>
                                setResaleSalesHistoryStartDate(e.target.value)
                              }
                              className="pl-9 bg-factory-700/50 border-tire-600/30 text-white"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-tire-300 text-sm">
                            Data Final:
                          </Label>
                          <div className="relative">
                            <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                            <Input
                              type="date"
                              value={resaleSalesHistoryEndDate}
                              onChange={(e) =>
                                setResaleSalesHistoryEndDate(e.target.value)
                              }
                              className="pl-9 bg-factory-700/50 border-tire-600/30 text-white"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Indicador de Filtros Ativos */}
                  {hasActiveResaleFilters && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {resaleSalesHistorySearch && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-neon-cyan/20 rounded text-neon-cyan text-xs">
                          <Search className="h-3 w-3" />
                          Busca: "{resaleSalesHistorySearch}"
                        </div>
                      )}
                      {resaleSalesHistoryDateType !== "all" && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-neon-orange/20 rounded text-neon-orange text-xs">
                          <Calendar className="h-3 w-3" />
                          {resaleSalesHistoryDateType === "today" && "Hoje"}
                          {resaleSalesHistoryDateType === "last7days" &&
                            "Últimos 7 dias"}
                          {resaleSalesHistoryDateType === "last30days" &&
                            "Últimos 30 dias"}
                          {resaleSalesHistoryDateType === "thisMonth" &&
                            "Este mês"}
                          {resaleSalesHistoryDateType === "lastMonth" &&
                            "Mês passado"}
                          {resaleSalesHistoryDateType === "month" &&
                            `Mês: ${resaleSalesHistoryDateFilter}`}
                          {resaleSalesHistoryDateType === "custom" &&
                            "Período personalizado"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-factory-900/60 rounded-lg">
              {/* Sales Chart */}
              {resaleProductSalesChartData.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-neon-cyan" />
                    <h3 className="text-tire-200 font-medium text-lg">
                      Gráfico de Vendas - Quantidade e Valor Médio por Produto
                      de Revenda
                    </h3>
                  </div>

                  {/* Seção de Valores Médios Destacados */}
                  <div className="mb-4 p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
                    <h4 className="text-tire-200 font-medium text-sm mb-3 flex items-center gap-2">
                      💰 Valores Médios por Produto de Revenda (Destacados)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {resaleProductSalesChartData.map((product, index) => {
                        const averageValuePerUnit =
                          product.totalValue / product.totalQuantity;
                        return (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-factory-800/50 rounded border border-tire-600/30"
                          >
                            <div className="flex-1">
                              <p className="text-white font-medium text-sm truncate">
                                {product.productName}
                              </p>
                              <p className="text-tire-400 text-xs">
                                {product.totalQuantity.toFixed(0)} unidades
                                vendidas
                              </p>
                            </div>
                            <div className="text-right ml-3">
                              <p className="font-bold text-lg" style={{ color: "#02f584" }}>
                                {formatCurrency(averageValuePerUnit)}
                              </p>
                              <p className="text-tire-400 text-xs">
                                por unidade
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-3 bg-factory-800/50 rounded-lg border border-tire-600/30">
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={resaleProductSalesChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="productName"
                          stroke="#9CA3AF"
                          fontSize={14}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                          tickFormatter={(value, index) => {
                            const data = resaleProductSalesChartData[index];
                            if (data) {
                              // Usar a fórmula correta: Valor Total ÷ Quantidade Total
                              const averageValuePerUnit =
                                data.totalValue / data.totalQuantity;
                              const formattedValue = formatCurrency(
                                averageValuePerUnit,
                              ).replace("R$\u00A0", "R$ ");
                              // Separar o nome do produto do valor médio com quebra de linha e destaque
                              return `${value}\n\n💰 ${formattedValue}`;
                            }
                            return value;
                          }}
                        />
                        <YAxis
                          stroke="#9CA3AF"
                          fontSize={12}
                          tickFormatter={(value) => value.toFixed(0)}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="totalQuantity"
                          fill="url(#resaleQuantityGradient)"
                          radius={[4, 4, 0, 0]}
                        />
                        <defs>
                          <linearGradient
                            id="resaleQuantityGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#bbe5fc"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="100%"
                              stopColor="#87ceeb"
                              stopOpacity={0.6}
                            />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 text-center">
                      <p className="text-tire-400 text-xs">
                        📊 Mostrando os {resaleProductSalesChartData.length}{" "}
                        produtos de revenda com maior quantidade vendida
                      </p>
                      <p className="text-tire-500 text-xs mt-1">
                        🔵 Ciano: Quantidade Vendida | 💰 Valor Médio por
                        Unidade
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {resaleProductSalesHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                    <p className="text-tire-400">
                      {resaleSalesHistorySearch || resaleSalesHistoryDateFilter
                        ? "Nenhuma venda encontrada"
                        : "Nenhuma venda registrada"}
                    </p>
                  </div>
                ) : (
                  resaleProductSalesHistory.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1 flex items-center gap-2">
                            <span className="text-neon-cyan">🛒</span>
                            {sale.reference_name}
                          </h4>
                          <div className="flex items-center gap-4 text-tire-400 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(
                                  sale.transaction_date,
                                ).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span className="text-neon-cyan font-bold">
                                {formatCurrency(getDisplayAmount(sale))}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs">
                                {getPaymentMethodIcon(extractPaymentMethodFromSale(sale.description || ""))}
                              </span>
                              <span className="text-xs bg-factory-600/50 px-2 py-1 rounded text-white font-medium">
                                {extractPaymentMethodFromSale(sale.description || "")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Botão Lançar Financeiro para vendas a prazo */}
                          {sale.category === "venda_prazo" && sale.description && isCreditSale(sale.description) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const originalValue = extractOriginalValueFromSale(sale.description || "");
                                if (originalValue) {
                                  handleConfirmCreditPayment(sale.id, sale.reference_name, originalValue);
                                }
                              }}
                              className="text-neon-green hover:text-neon-green/80 hover:bg-neon-green/10 px-3 py-1 h-8 text-xs font-medium"
                              title="Lançar no financeiro"
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Lançar Financeiro
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteSale(sale.id, sale.reference_name)
                            }
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 h-8 w-8"
                            title="Excluir venda"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {sale.description && (
                        <div className="mt-2 p-2 bg-factory-700/20 rounded text-tire-300 text-sm">
                          <p className="font-medium text-tire-200 mb-1">
                            Detalhes:
                          </p>
                          <p>{sale.description}</p>
                        </div>
                      )}
                      <div className="text-tire-500 text-xs mt-2">
                        ID: {sale.id}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {resaleProductSalesHistory.length > 0 && (
                <div className="mt-4 p-4 bg-factory-800/50 rounded-lg border border-tire-600/30">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                    <div className="text-center">
                      <p className="text-tire-300 text-sm mb-1">
                        Total de Vendas
                      </p>
                      <p className="text-white font-bold text-lg">
                        {resaleProductSalesHistory.length}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-tire-300 text-sm mb-1">
                        Quantidade Vendida
                      </p>
                      <p className="text-neon-green font-bold text-lg">
                        {resaleProductSalesHistory
                          .reduce((total, sale) => {
                            // Não contar vendas a prazo pendentes na quantidade
                            if (sale.category === "venda_prazo" && sale.description && isCreditSale(sale.description)) {
                              return total;
                            }
                            const productInfo = extractProductInfoFromSale(
                              sale.description || "",
                            );
                            return total + (productInfo?.quantity || 0);
                          }, 0)
                          .toFixed(0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-tire-300 text-sm mb-1">Valor Total</p>
                      <p className="text-neon-orange font-bold text-lg">
                        {formatCurrency(
                          resaleProductSalesHistory.reduce(
                            (sum, sale) => sum + sale.amount,
                            0,
                          ),
                        )}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-tire-300 text-sm mb-1">Valor Médio</p>
                      <p className="text-neon-purple font-bold text-lg">
                        {resaleProductSalesHistory.length > 0
                          ? formatCurrency(
                              resaleProductSalesHistory.reduce(
                                (sum, sale) => sum + sale.amount,
                                0,
                              ) / resaleProductSalesHistory.length,
                            )
                          : formatCurrency(0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warranty-history">
          <Card className="bg-factory-900/80 border-tire-600/30 max-w-7xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-neon-purple" />
                  Histórico de Garantias
                </div>
                {hasActiveWarrantyFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearWarrantyFilters}
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
                    placeholder="Buscar por cliente, produto, vendedor ou descrição..."
                    value={warrantyHistorySearch}
                    onChange={(e) => setWarrantyHistorySearch(e.target.value)}
                    className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  />
                </div>

                {/* Seção de Filtros de Data */}
                <div className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-neon-purple" />
                    <Label className="text-tire-200 font-medium">
                      Filtros de Data
                    </Label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Tipo de Filtro */}
                    <div className="space-y-2">
                      <Label className="text-tire-300 text-sm">Período:</Label>
                      <Select
                        value={warrantyHistoryDateType}
                        onValueChange={(value) => {
                          setWarrantyHistoryDateType(value);
                          // Reset other date filters when changing type
                          if (value !== "month")
                            setWarrantyHistoryDateFilter("");
                          if (value !== "custom") {
                            setWarrantyHistoryStartDate("");
                            setWarrantyHistoryEndDate("");
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
                            Todas as garantias
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

                    {/* Filtro de Mês Específico */}
                    {warrantyHistoryDateType === "month" && (
                      <div className="space-y-2">
                        <Label className="text-tire-300 text-sm">Mês:</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                          <Input
                            type="month"
                            value={warrantyHistoryDateFilter}
                            onChange={(e) =>
                              setWarrantyHistoryDateFilter(e.target.value)
                            }
                            className="pl-9 bg-factory-700/50 border-tire-600/30 text-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Filtros de Período Personalizado */}
                    {warrantyHistoryDateType === "custom" && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-tire-300 text-sm">
                            Data Inicial:
                          </Label>
                          <div className="relative">
                            <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                            <Input
                              type="date"
                              value={warrantyHistoryStartDate}
                              onChange={(e) =>
                                setWarrantyHistoryStartDate(e.target.value)
                              }
                              className="pl-9 bg-factory-700/50 border-tire-600/30 text-white"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-tire-300 text-sm">
                            Data Final:
                          </Label>
                          <div className="relative">
                            <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                            <Input
                              type="date"
                              value={warrantyHistoryEndDate}
                              onChange={(e) =>
                                setWarrantyHistoryEndDate(e.target.value)
                              }
                              className="pl-9 bg-factory-700/50 border-tire-600/30 text-white"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Indicador de Filtros Ativos */}
                  {hasActiveWarrantyFilters && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {warrantyHistorySearch && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-neon-purple/20 rounded text-neon-purple text-xs">
                          <Search className="h-3 w-3" />
                          Busca: "{warrantyHistorySearch}"
                        </div>
                      )}
                      {warrantyHistoryDateType !== "all" && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-neon-orange/20 rounded text-neon-orange text-xs">
                          <Calendar className="h-3 w-3" />
                          {warrantyHistoryDateType === "today" && "Hoje"}
                          {warrantyHistoryDateType === "last7days" &&
                            "Últimos 7 dias"}
                          {warrantyHistoryDateType === "last30days" &&
                            "Últimos 30 dias"}
                          {warrantyHistoryDateType === "thisMonth" &&
                            "Este mês"}
                          {warrantyHistoryDateType === "lastMonth" &&
                            "Mês passado"}
                          {warrantyHistoryDateType === "month" &&
                            `Mês: ${warrantyHistoryDateFilter}`}
                          {warrantyHistoryDateType === "custom" &&
                            "Período personalizado"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-factory-900/60 rounded-lg">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredWarrantyEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                    <p className="text-tire-400">
                      {warrantyHistorySearch || warrantyHistoryDateFilter
                        ? "Nenhuma garantia encontrada"
                        : "Nenhuma garantia registrada"}
                    </p>
                  </div>
                ) : (
                  filteredWarrantyEntries.map((warranty) => (
                    <div
                      key={warranty.id}
                      className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1 flex items-center gap-2">
                            <span className="text-neon-purple">🛡️</span>
                            Garantia - {warranty.product_name}
                          </h4>
                          <div className="flex items-center gap-4 text-tire-400 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(
                                  warranty.warranty_date,
                                ).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span className="text-neon-blue">
                                {warranty.customer_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              <span className="text-neon-green">
                                {warranty.salesperson_name}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-neon-purple font-bold text-lg">
                              {warranty.quantity} unidades
                            </div>
                            <div className="text-tire-400 text-xs">
                              Perda por Garantia
                            </div>
                            {(() => {
                              const warrantyValue =
                                calculateIndividualWarrantyValue(warranty);
                              if (warrantyValue > 0) {
                                return (
                                  <div className="mt-1">
                                    <div className="text-red-400 font-bold text-sm">
                                      {formatCurrency(warrantyValue)}
                                    </div>
                                    <div className="text-tire-500 text-xs">
                                      Valor de Garantia
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <div className="mt-1">
                                  <div className="text-tire-400 font-bold text-sm">
                                    Receita não encontrada
                                  </div>
                                  <div className="text-tire-500 text-xs">
                                    Valor não calculado
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteWarranty(
                                warranty.id,
                                `${warranty.product_name} - ${warranty.customer_name}`,
                              )
                            }
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 h-8 w-8"
                            title="Excluir garantia e devolver ao estoque"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {warranty.description && (
                        <div className="mt-2 p-2 bg-factory-700/20 rounded text-tire-300 text-sm">
                          <p className="font-medium text-tire-200 mb-1">
                            Detalhes:
                          </p>
                          <p>{warranty.description}</p>
                        </div>
                      )}
                      <div className="text-tire-500 text-xs mt-2 flex justify-between">
                        <span>ID: {warranty.id}</span>
                        <span>
                          Registrado em:{" "}
                          {new Date(warranty.created_at).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredWarrantyEntries.length > 0 && (
                <div className="mt-4 p-4 bg-factory-800/50 rounded-lg border border-tire-600/30">
                  <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-7 gap-4">
                    <div className="text-center">
                      <p className="text-tire-300 text-sm mb-1">
                        Total de Garantias
                      </p>
                      <p className="text-neon-purple font-bold text-lg">
                        {filteredWarrantyEntries.length}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-tire-300 text-sm mb-1">
                        Quantidade Total
                      </p>
                      <p className="text-neon-orange font-bold text-lg">
                        {filteredWarrantyEntries
                          .reduce((sum, warranty) => sum + warranty.quantity, 0)
                          .toFixed(0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-tire-300 text-sm mb-1">
                        Valor de Garantia
                      </p>
                      <p className="text-red-400 font-bold text-lg">
                        {formatCurrency(totalWarrantyRevenueValue)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-tire-300 text-sm mb-1">
                        Produtos Diferentes
                      </p>
                      <p className="text-neon-blue font-bold text-lg">
                        {
                          new Set(
                            filteredWarrantyEntries.map((w) => w.product_name),
                          ).size
                        }
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-tire-300 text-sm mb-1">
                        Clientes Diferentes
                      </p>
                      <p className="text-neon-green font-bold text-lg">
                        {
                          new Set(
                            filteredWarrantyEntries.map((w) => w.customer_name),
                          ).size
                        }
                      </p>
                    </div>
                  </div>

                  {/* Top Products and Customers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="p-3 bg-factory-700/20 rounded">
                      <h4 className="text-tire-200 font-medium mb-2 text-sm">
                        Produtos com Mais Garantias:
                      </h4>
                      <div className="space-y-1">
                        {Object.entries(
                          filteredWarrantyEntries.reduce(
                            (acc, warranty) => {
                              const warrantyValue =
                                calculateIndividualWarrantyValue(warranty);
                              if (!acc[warranty.product_name]) {
                                acc[warranty.product_name] = {
                                  quantity: 0,
                                  value: 0,
                                };
                              }
                              acc[warranty.product_name].quantity +=
                                warranty.quantity;
                              acc[warranty.product_name].value += warrantyValue;
                              return acc;
                            },
                            {} as Record<
                              string,
                              { quantity: number; value: number }
                            >,
                          ),
                        )
                          .sort(([, a], [, b]) => b.value - a.value)
                          .slice(0, 3)
                          .map(([product, data]) => (
                            <div
                              key={product}
                              className="flex justify-between text-xs"
                            >
                              <span className="text-tire-300 truncate">
                                {product}
                              </span>
                              <div className="text-right">
                                <div className="text-neon-orange font-bold">
                                  {data.quantity} un.
                                </div>
                                <div className="text-red-400 font-bold text-xs">
                                  {formatCurrency(data.value)}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="p-3 bg-factory-700/20 rounded">
                      <h4 className="text-tire-200 font-medium mb-2 text-sm">
                        Clientes com Mais Garantias:
                      </h4>
                      <div className="space-y-1">
                        {Object.entries(
                          filteredWarrantyEntries.reduce(
                            (acc, warranty) => {
                              const warrantyValue =
                                calculateIndividualWarrantyValue(warranty);
                              if (!acc[warranty.customer_name]) {
                                acc[warranty.customer_name] = {
                                  quantity: 0,
                                  value: 0,
                                };
                              }
                              acc[warranty.customer_name].quantity +=
                                warranty.quantity;
                              acc[warranty.customer_name].value +=
                                warrantyValue;
                              return acc;
                            },
                            {} as Record<
                              string,
                              { quantity: number; value: number }
                            >,
                          ),
                        )
                          .sort(([, a], [, b]) => b.value - a.value)
                          .slice(0, 3)
                          .map(([customer, data]) => (
                            <div
                              key={customer}
                              className="flex justify-between text-xs"
                            >
                              <span className="text-tire-300 truncate">
                                {customer}
                              </span>
                              <div className="text-right">
                                <div className="text-neon-blue font-bold">
                                  {data.quantity} un.
                                </div>
                                <div className="text-red-400 font-bold text-xs">
                                  {formatCurrency(data.value)}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
};

export default SalesDashboard;