import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RawMaterialForm from "../financial/RawMaterialForm";
import EmployeeForm from "../financial/EmployeeForm";
import CustomerForm from "../financial/CustomerForm";
import ProductForm from "../financial/ProductForm";
import ResaleProductForm from "../financial/ResaleProductForm";
import SupplierForm from "../financial/SupplierForm";
import SalespersonForm from "./SalespersonForm";
import {
  useMaterials,
  useEmployees,
  useCustomers,
  useProducts,
  useResaleProducts,
  useSuppliers,
  useCustomUnits,
  useSalespeople,
  useStockItems,
} from "@/hooks/useDataPersistence";

interface RegistrationDashboardProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

const RegistrationDashboard = ({
  onRefresh = () => {},
  isLoading = false,
}: RegistrationDashboardProps) => {
  const [activeTab, setActiveTab] = useState("materials");

  // Use database hooks for basic data
  const {
    materials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    isLoading: materialsLoading,
  } = useMaterials();
  const {
    employees,
    addEmployee,
    updateEmployee,
    isLoading: employeesLoading,
  } = useEmployees();
  const {
    customers,
    addCustomer,
    updateCustomer,
    isLoading: customersLoading,
  } = useCustomers();
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    isLoading: productsLoading,
  } = useProducts();
  const {
    resaleProducts,
    addResaleProduct,
    updateResaleProduct,
    isLoading: resaleProductsLoading,
  } = useResaleProducts();
  const {
    suppliers,
    addSupplier,
    updateSupplier,
    isLoading: suppliersLoading,
  } = useSuppliers();
  const {
    customUnits,
    addCustomUnit,
    removeCustomUnit,
    isLoading: unitsLoading,
  } = useCustomUnits();
  const {
    salespeople,
    addSalesperson,
    updateSalesperson,
    isLoading: salespeopleLoading,
  } = useSalespeople();
  const { removeStockItemByItemId } = useStockItems();

  // Archive handlers that update the database
  const handleArchiveMaterial = async (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (material) {
      const isArchiving = !material.archived;

      console.log(
        `📦 [RegistrationDashboard] ${isArchiving ? "Arquivando" : "Desarquivando"} matéria-prima:`,
        {
          id: materialId,
          name: material.name,
          unit: material.unit,
          isArchiving,
        },
      );

      // Update material archive status
      const updatedMaterial = await updateMaterial(materialId, {
        archived: isArchiving,
      });

      if (updatedMaterial && isArchiving) {
        // If archiving the material, remove it from stock
        console.log(
          `🗑️ [RegistrationDashboard] Removendo matéria-prima arquivada do estoque: ${materialId}`,
        );

        const stockRemovalSuccess = await removeStockItemByItemId(materialId);

        if (stockRemovalSuccess) {
          console.log(
            `✅ [RegistrationDashboard] Matéria-prima removida do estoque com sucesso:`,
            {
              material_id: materialId,
              material_name: material.name,
            },
          );
        } else {
          console.warn(
            `⚠️ [RegistrationDashboard] Matéria-prima arquivada mas não foi possível remover do estoque:`,
            {
              material_id: materialId,
              material_name: material.name,
            },
          );
        }
      } else if (updatedMaterial && !isArchiving) {
        console.log(
          `📦 [RegistrationDashboard] Matéria-prima desarquivada - não removendo do estoque:`,
          {
            material_id: materialId,
            material_name: material.name,
          },
        );
      }
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (material) {
      console.log(
        `🗑️ [RegistrationDashboard] DELETANDO PERMANENTEMENTE matéria-prima:`,
        {
          id: materialId,
          name: material.name,
          unit: material.unit,
          archived: material.archived,
        },
      );

      try {
        // Step 1: Remove from stock first
        console.log(
          `🗑️ [RegistrationDashboard] Passo 1: Removendo matéria-prima do estoque: ${materialId}`,
        );
        const stockRemovalSuccess = await removeStockItemByItemId(materialId);

        if (stockRemovalSuccess) {
          console.log(
            `✅ [RegistrationDashboard] Matéria-prima removida do estoque com sucesso`,
          );
        } else {
          console.warn(
            `⚠️ [RegistrationDashboard] Não foi possível remover do estoque (pode não existir)`,
          );
        }

        // Step 2: Delete the material permanently
        console.log(
          `🗑️ [RegistrationDashboard] Passo 2: Deletando matéria-prima permanentemente: ${materialId}`,
        );
        const deleteSuccess = await deleteMaterial(materialId);

        if (deleteSuccess) {
          console.log(
            `✅ [RegistrationDashboard] Matéria-prima deletada permanentemente com sucesso:`,
            {
              material_id: materialId,
              material_name: material.name,
            },
          );
        } else {
          console.error(
            `❌ [RegistrationDashboard] Falha ao deletar matéria-prima permanentemente:`,
            {
              material_id: materialId,
              material_name: material.name,
            },
          );
          throw new Error("Falha ao deletar matéria-prima do banco de dados");
        }
      } catch (error) {
        console.error(
          `❌ [RegistrationDashboard] ERRO ao deletar matéria-prima permanentemente:`,
          {
            error: error instanceof Error ? error.message : error,
            material_id: materialId,
            material_name: material.name,
          },
        );
        throw error;
      }
    }
  };

  const handleArchiveEmployee = async (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    if (employee) {
      await updateEmployee(employeeId, { archived: !employee.archived });
    }
  };

  const handleArchiveCustomer = async (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      await updateCustomer(customerId, { archived: !customer.archived });
    }
  };

  const handleArchiveProduct = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      const isArchiving = !product.archived;

      console.log(
        `📦 [RegistrationDashboard] ${isArchiving ? "Arquivando" : "Desarquivando"} produto:`,
        {
          id: productId,
          name: product.name,
          unit: product.unit,
          isArchiving,
        },
      );

      // Update product archive status
      const updatedProduct = await updateProduct(productId, {
        archived: isArchiving,
      });

      if (updatedProduct && isArchiving) {
        // If archiving the product, remove it from stock
        console.log(
          `🗑️ [RegistrationDashboard] Removendo produto arquivado do estoque: ${productId}`,
        );

        const stockRemovalSuccess = await removeStockItemByItemId(productId);

        if (stockRemovalSuccess) {
          console.log(
            `✅ [RegistrationDashboard] Produto removido do estoque com sucesso:`,
            {
              product_id: productId,
              product_name: product.name,
            },
          );
        } else {
          console.warn(
            `⚠️ [RegistrationDashboard] Produto arquivado mas não foi possível remover do estoque:`,
            {
              product_id: productId,
              product_name: product.name,
            },
          );
        }
      } else if (updatedProduct && !isArchiving) {
        console.log(
          `📦 [RegistrationDashboard] Produto desarquivado - não removendo do estoque:`,
          {
            product_id: productId,
            product_name: product.name,
          },
        );
      }
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      console.log(
        `🗑️ [RegistrationDashboard] DELETANDO PERMANENTEMENTE produto:`,
        {
          id: productId,
          name: product.name,
          unit: product.unit,
          archived: product.archived,
        },
      );

      try {
        // Step 1: Remove from stock first
        console.log(
          `🗑️ [RegistrationDashboard] Passo 1: Removendo produto do estoque: ${productId}`,
        );
        const stockRemovalSuccess = await removeStockItemByItemId(productId);

        if (stockRemovalSuccess) {
          console.log(
            `✅ [RegistrationDashboard] Produto removido do estoque com sucesso`,
          );
        } else {
          console.warn(
            `⚠️ [RegistrationDashboard] Não foi possível remover do estoque (pode não existir)`,
          );
        }

        // Step 2: Delete the product permanently
        console.log(
          `🗑️ [RegistrationDashboard] Passo 2: Deletando produto permanentemente: ${productId}`,
        );
        const deleteSuccess = await deleteProduct(productId);

        if (deleteSuccess) {
          console.log(
            `✅ [RegistrationDashboard] Produto deletado permanentemente com sucesso:`,
            {
              product_id: productId,
              product_name: product.name,
            },
          );
        } else {
          console.error(
            `❌ [RegistrationDashboard] Falha ao deletar produto permanentemente:`,
            {
              product_id: productId,
              product_name: product.name,
            },
          );
          throw new Error("Falha ao deletar produto do banco de dados");
        }
      } catch (error) {
        console.error(
          `❌ [RegistrationDashboard] ERRO ao deletar produto permanentemente:`,
          {
            error: error instanceof Error ? error.message : error,
            product_id: productId,
            product_name: product.name,
          },
        );
        throw error;
      }
    }
  };

  const handleArchiveResaleProduct = async (productId: string) => {
    const product = resaleProducts.find((p) => p.id === productId);
    if (product) {
      await updateResaleProduct(productId, { archived: !product.archived });
    }
  };

  const handleArchiveSupplier = async (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (supplier) {
      await updateSupplier(supplierId, { archived: !supplier.archived });
    }
  };

  const handleArchiveSalesperson = async (salespersonId: string) => {
    const salesperson = salespeople.find((s) => s.id === salespersonId);
    if (salesperson) {
      await updateSalesperson(salespersonId, {
        archived: !salesperson.archived,
      });
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue flex items-center justify-center">
            <span className="text-white font-bold text-lg">📋</span>
          </div>
          Sistema de Cadastros
        </h2>
        <p className="text-tire-300 mt-2">
          Gerencie todos os cadastros básicos do sistema
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 bg-factory-800/50 border border-tire-600/30">
          <TabsTrigger
            value="materials"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-purple/20"
          >
            Matéria Prima
          </TabsTrigger>
          <TabsTrigger
            value="products"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-purple/20"
          >
            Produtos Finais
          </TabsTrigger>
          <TabsTrigger
            value="resale-products"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-purple/20"
          >
            Produtos Revenda
          </TabsTrigger>
          <TabsTrigger
            value="employees"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-purple/20"
          >
            Funcionários
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-purple/20"
          >
            Clientes
          </TabsTrigger>
          <TabsTrigger
            value="suppliers"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-purple/20"
          >
            Fornecedores
          </TabsTrigger>
          <TabsTrigger
            value="salespeople"
            className="text-tire-300 data-[state=active]:text-white data-[state=active]:bg-neon-purple/20"
          >
            Vendedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <RawMaterialForm
            isLoading={materialsLoading || unitsLoading}
            materials={materials}
            customUnits={customUnits}
            onSubmit={addMaterial}
            onArchive={handleArchiveMaterial}
            onDelete={handleDeleteMaterial}
            onAddCustomUnit={addCustomUnit}
            onRemoveCustomUnit={removeCustomUnit}
          />
        </TabsContent>

        <TabsContent value="products">
          <ProductForm
            isLoading={productsLoading || unitsLoading}
            products={products}
            customUnits={customUnits}
            onSubmit={addProduct}
            onArchive={handleArchiveProduct}
            onDelete={handleDeleteProduct}
            onAddCustomUnit={addCustomUnit}
            onRemoveCustomUnit={removeCustomUnit}
          />
        </TabsContent>

        <TabsContent value="resale-products">
          <ResaleProductForm
            isLoading={
              resaleProductsLoading || unitsLoading || suppliersLoading
            }
            resaleProducts={resaleProducts}
            suppliers={suppliers}
            customUnits={customUnits}
            onSubmit={addResaleProduct}
            onArchive={handleArchiveResaleProduct}
            onAddCustomUnit={addCustomUnit}
            onRemoveCustomUnit={removeCustomUnit}
          />
        </TabsContent>

        <TabsContent value="employees">
          <EmployeeForm
            isLoading={employeesLoading}
            employees={employees}
            onSubmit={addEmployee}
            onArchive={handleArchiveEmployee}
          />
        </TabsContent>

        <TabsContent value="customers">
          <CustomerForm
            isLoading={customersLoading}
            customers={customers}
            onSubmit={addCustomer}
            onArchive={handleArchiveCustomer}
          />
        </TabsContent>

        <TabsContent value="suppliers">
          <SupplierForm
            isLoading={suppliersLoading}
            suppliers={suppliers}
            onSubmit={addSupplier}
            onArchive={handleArchiveSupplier}
          />
        </TabsContent>

        <TabsContent value="salespeople">
          <SalespersonForm
            isLoading={salespeopleLoading}
            salespeople={salespeople}
            onSubmit={addSalesperson}
            onArchive={handleArchiveSalesperson}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RegistrationDashboard;
