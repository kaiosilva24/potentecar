export interface RawMaterial {
  id: string;
  name: string;
  unit: "kg" | "L" | "un" | "m" | "g" | "ml";
  quantity: number;
  archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Employee {
  id: string;
  name: string;
  hire_date: string;
  position: string;
  salary: number;
  commission?: number;
  workdays_per_week?: number;
  labor_charges?: {
    inss_percentage: number;
    fgts_percentage: number;
    vacation_percentage: number;
    thirteenth_salary_percentage: number;
    total_charges: number;
    vacation_with_bonus: number;
    inss_deduction: number;
  };
  archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  document: string; // CPF or CNPJ
  contact: string;
  address: string;
  archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FixedCost {
  id: string;
  name: string;
  amount: number;
  description?: string;
  archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface VariableCost {
  id: string;
  name: string;
  amount: number;
  description?: string;
  archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CashFlowEntry {
  id: string;
  type: "income" | "expense";
  category: string;
  reference_id?: string;
  reference_name: string;
  amount: number;
  description?: string;
  transaction_date: string;
  created_at: string;
}

export interface Salesperson {
  id: string;
  name: string;
  commission_rate: number;
  contact?: string;
  archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DefectiveTireSale {
  id: string;
  tire_name: string;
  quantity: number;
  unit_price: number;
  sale_value: number; // quantity * unit_price
  description?: string;
  sale_date: string;
  created_at: string;
}

export interface WarrantyEntry {
  id: string;
  customer_id: string;
  customer_name: string;
  product_name: string;
  salesperson_name: string;
  quantity: number;
  warranty_date: string;
  description?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  document: string; // CPF or CNPJ
  contact: string;
  address: string;
  warranty_count?: number; // Track number of warranties for this customer
  archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface RawMaterialStock {
  id: string;
  material_id: string;
  quantity: number;
  min_level: number;
  max_level: number;
  current_level: "low" | "medium" | "high";
  created_at: string;
  updated_at?: string;
}

export interface FinishedProductStock {
  id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
  updated_at?: string;
}

export interface PurchaseSaleStock {
  id: string;
  product_name: string;
  quantity: number;
  purchase_price: number;
  sale_price: number;
  created_at: string;
  updated_at?: string;
}

export interface ProductionLoss {
  id: string;
  description: string;
  quantity: number;
  cost_impact: number;
  date: string;
  created_at: string;
}

export interface CashFlow {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  date: string;
  category: string;
  created_at: string;
}

export interface TireCost {
  id: string;
  tire_type: string;
  material_consumption: Array<{
    material_id: string;
    quantity: number;
    cost: number;
  }>;
  total_cost: number;
  created_at: string;
}

export interface ProductionBatch {
  id: string;
  quantity_produced: number;
  fixed_costs: number;
  variable_costs: number;
  average_cost_per_tire: number;
  date: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  unit: "un" | "kg" | "L" | "m" | "g" | "ml";
  archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DashboardMetrics {
  cash_balance: number;
  raw_materials_count: number;
  low_stock_items: number;
  finished_tires_count: number;
  purchase_sale_items: number;
  production_losses: number;
}

export interface StockItem {
  id: string;
  item_id: string;
  item_name: string;
  item_type: "material" | "product";
  unit: string;
  quantity: number;
  unit_cost: number; // Custo médio por unidade
  total_value: number; // Valor total do estoque (quantidade * custo médio)
  min_level?: number;
  max_level?: number;
  last_updated?: string; // Make optional since it might not always be present
  created_at?: string; // Make optional since it might not always be present
}

export interface ProductionRecipe {
  id: string;
  product_name: string;
  materials: Array<{
    material_id: string;
    material_name: string;
    quantity_needed: number;
    unit: string;
  }>;
  archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ProductionEntry {
  id: string;
  recipe_id: string;
  product_name: string;
  quantity_produced: number;
  production_date: string;
  materials_consumed: Array<{
    material_id: string;
    material_name: string;
    quantity_consumed: number;
    unit: string;
  }>;
  production_loss?: number; // Quantidade de produtos perdidos/defeituosos
  material_loss?: Array<{
    material_id: string;
    material_name: string;
    quantity_lost: number;
    unit: string;
  }>; // Perdas de matéria-prima
  warranty_loss?: number; // Quantidade de produtos em garantia
  created_at: string;
}

export interface CostSimulation {
  id: string;
  name: string;
  description?: string;
  simulation_type: "single" | "multiple";
  cost_options: {
    includeLaborCosts: boolean;
    includeCashFlowExpenses: boolean;
    includeProductionLosses: boolean;
    includeDefectiveTireSales: boolean;
    divideByProduction: boolean;
  };
  simulation_data: {
    // For single recipe simulation
    recipe_id?: string;
    quantity?: number;
    // For multiple recipes simulation
    selected_recipes?: Array<{
      id: string;
      name: string;
      quantity: number;
    }>;
    // Manual cost inputs
    manual_fixed_costs?: number;
    manual_labor_costs?: number;
    manual_cash_flow_expenses?: number;
    manual_production_losses?: number;
  };
  results?: {
    total_cost?: number;
    cost_per_tire?: number;
    total_quantity?: number;
    cost_breakdown?: {
      materialCost: number;
      fixedCost: number;
      laborCost: number;
      cashFlowCost: number;
      productionLossCost: number;
      total: number;
    };
  };
  created_at: string;
  updated_at?: string;
}

export interface ResaleProduct {
  id: string;
  name: string;
  sku?: string; // Código do produto
  barcode?: string; // Código de barras
  supplier_id?: string;
  supplier_name: string;
  purchase_price: number; // Preço de compra
  sale_price: number; // Preço de venda
  profit_margin: number; // Margem de lucro calculada
  unit: "un" | "kg" | "L" | "m" | "g" | "ml";
  category?: string;
  description?: string;
  min_stock_level?: number;
  max_stock_level?: number;
  current_stock?: number;
  archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PendingSale {
  id: string;
  customer_id: string;
  customer_name: string;
  salesperson_id: string;
  salesperson_name: string;
  product_id: string;
  product_name: string;
  product_type: "final" | "resale";
  quantity: number;
  unit_price: number;
  total_value: number;
  unit: string;
  sale_date: string;
  description: string;
  created_at: string;
  updated_at?: string;
}

export interface Debt {
  id: string;
  description: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: "em_dia" | "vencida" | "paga";
  category: string;
  creditor: string;
  created_at: string;
  updated_at: string;
}
