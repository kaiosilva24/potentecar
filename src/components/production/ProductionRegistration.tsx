import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Minus,
  Factory,
  Search,
  Archive,
  ArchiveRestore,
  X,
  Calculator,
  DollarSign,
  Edit,
  Save,
} from "lucide-react";
import { RawMaterial, ProductionRecipe, StockItem } from "@/types/financial";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProductionRegistrationProps {
  materials?: RawMaterial[];
  recipes?: ProductionRecipe[];
  stockItems?: StockItem[];
  onSubmit?: (recipe: Omit<ProductionRecipe, "id" | "created_at">) => void;
  onArchive?: (recipeId: string) => void;
  onUpdate?: (recipeId: string, updates: Partial<ProductionRecipe>) => void;
  isLoading?: boolean;
}

const ProductionRegistration = ({
  materials = [],
  recipes = [],
  stockItems = [],
  onSubmit = () => {},
  onArchive = () => {},
  onUpdate = () => {},
  isLoading = false,
}: ProductionRegistrationProps) => {
  const [productName, setProductName] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<
    Array<{
      material_id: string;
      material_name: string;
      quantity_needed: number;
      unit: string;
    }>
  >([]);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Edit states
  const [editingRecipe, setEditingRecipe] = useState<ProductionRecipe | null>(
    null
  );
  const [editProductName, setEditProductName] = useState("");
  const [editSelectedMaterials, setEditSelectedMaterials] = useState<
    Array<{
      material_id: string;
      material_name: string;
      quantity_needed: number;
      unit: string;
    }>
  >([]);
  const [editSelectedMaterial, setEditSelectedMaterial] = useState("");
  const [editMaterialQuantity, setEditMaterialQuantity] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const activeMaterials = materials.filter((m) => !m.archived);

  // Function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Function to calculate material cost in recipe
  const calculateMaterialCost = (materialId: string, quantity: number) => {
    console.log(`🔍 [ProductionRegistration] Calculando custo do material:`, {
      materialId,
      quantity,
      totalStockItems: stockItems.length,
      stockItemsPreview: stockItems.slice(0, 3).map((item) => ({
        id: item.id,
        item_id: item.item_id,
        item_name: item.item_name,
        item_type: item.item_type,
        unit_cost: item.unit_cost,
      })),
    });

    const stockItem = stockItems.find(
      (item) => item.item_id === materialId && item.item_type === "material"
    );

    console.log(`🔍 [ProductionRegistration] Resultado da busca:`, {
      materialId,
      found: !!stockItem,
      stockItem: stockItem
        ? {
            id: stockItem.id,
            item_id: stockItem.item_id,
            item_name: stockItem.item_name,
            item_type: stockItem.item_type,
            unit_cost: stockItem.unit_cost,
            quantity: stockItem.quantity,
          }
        : null,
    });

    if (stockItem && stockItem.unit_cost > 0) {
      const cost = quantity * stockItem.unit_cost;
      console.log(`💰 [ProductionRegistration] Custo calculado:`, {
        materialId,
        materialName: stockItem.item_name,
        quantity,
        unitCost: stockItem.unit_cost,
        totalCost: cost,
      });
      return cost;
    }

    console.warn(`⚠️ [ProductionRegistration] Material sem custo:`, {
      materialId,
      stockItem: stockItem ? "encontrado mas sem custo" : "não encontrado",
    });
    return 0;
  };

  // Function to calculate total recipe cost
  const calculateRecipeCost = (
    materials: Array<{
      material_id: string;
      quantity_needed: number;
    }>
  ) => {
    return materials.reduce((total, material) => {
      return (
        total +
        calculateMaterialCost(material.material_id, material.quantity_needed)
      );
    }, 0);
  };

  // Calculate cost for selected materials in form
  const selectedMaterialsCost = useMemo(() => {
    return calculateRecipeCost(selectedMaterials);
  }, [selectedMaterials, stockItems]);

  // Calculate cost for edit materials
  const editMaterialsCost = useMemo(() => {
    return calculateRecipeCost(editSelectedMaterials);
  }, [editSelectedMaterials, stockItems]);

  const handleAddMaterial = () => {
    if (
      selectedMaterial &&
      materialQuantity &&
      parseFloat(materialQuantity) > 0
    ) {
      const material = activeMaterials.find((m) => m.id === selectedMaterial);
      if (material) {
        const existingIndex = selectedMaterials.findIndex(
          (m) => m.material_id === selectedMaterial
        );

        if (existingIndex >= 0) {
          // Update existing material quantity
          setSelectedMaterials((prev) =>
            prev.map((item, index) =>
              index === existingIndex
                ? { ...item, quantity_needed: parseFloat(materialQuantity) }
                : item
            )
          );
        } else {
          // Add new material
          setSelectedMaterials((prev) => [
            ...prev,
            {
              material_id: selectedMaterial,
              material_name: material.name,
              quantity_needed: parseFloat(materialQuantity),
              unit: material.unit,
            },
          ]);
        }
        setSelectedMaterial("");
        setMaterialQuantity("");
      }
    }
  };

  const handleRemoveMaterial = (materialId: string) => {
    setSelectedMaterials((prev) =>
      prev.filter((m) => m.material_id !== materialId)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (productName.trim() && selectedMaterials.length > 0) {
      onSubmit({
        product_name: productName,
        materials: selectedMaterials,
        archived: false,
      });
      setProductName("");
      setSelectedMaterials([]);
    }
  };

  // Edit functions
  const handleEditRecipe = (recipe: ProductionRecipe) => {
    setEditingRecipe(recipe);
    setEditProductName(recipe.product_name);
    setEditSelectedMaterials([...recipe.materials]);
    setEditSelectedMaterial("");
    setEditMaterialQuantity("");
    setIsEditDialogOpen(true);
  };

  const handleAddEditMaterial = () => {
    if (
      editSelectedMaterial &&
      editMaterialQuantity &&
      parseFloat(editMaterialQuantity) > 0
    ) {
      const material = activeMaterials.find(
        (m) => m.id === editSelectedMaterial
      );
      if (material) {
        const existingIndex = editSelectedMaterials.findIndex(
          (m) => m.material_id === editSelectedMaterial
        );

        if (existingIndex >= 0) {
          // Update existing material quantity
          setEditSelectedMaterials((prev) =>
            prev.map((item, index) =>
              index === existingIndex
                ? { ...item, quantity_needed: parseFloat(editMaterialQuantity) }
                : item
            )
          );
        } else {
          // Add new material
          setEditSelectedMaterials((prev) => [
            ...prev,
            {
              material_id: editSelectedMaterial,
              material_name: material.name,
              quantity_needed: parseFloat(editMaterialQuantity),
              unit: material.unit,
            },
          ]);
        }
        setEditSelectedMaterial("");
        setEditMaterialQuantity("");
      }
    }
  };

  const handleRemoveEditMaterial = (materialId: string) => {
    setEditSelectedMaterials((prev) =>
      prev.filter((m) => m.material_id !== materialId)
    );
  };

  const handleSaveEdit = () => {
    if (
      editingRecipe &&
      editProductName.trim() &&
      editSelectedMaterials.length > 0
    ) {
      onUpdate(editingRecipe.id, {
        product_name: editProductName,
        materials: editSelectedMaterials,
      });
      handleCancelEdit();
    }
  };

  const handleCancelEdit = () => {
    setEditingRecipe(null);
    setEditProductName("");
    setEditSelectedMaterials([]);
    setEditSelectedMaterial("");
    setEditMaterialQuantity("");
    setIsEditDialogOpen(false);
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.product_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesArchiveFilter = showArchived
      ? recipe.archived
      : !recipe.archived;
    return matchesSearch && matchesArchiveFilter;
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-green to-neon-purple flex items-center justify-center">
            <Factory className="h-4 w-4 text-white" />
          </div>
          Cadastro de Produção
        </h2>
        <p className="text-tire-300 mt-2">
          Configure receitas de produção com matérias-primas necessárias
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Nova Receita de Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productName" className="text-tire-300">
                  Nome do Produto Final
                </Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  placeholder=""
                  required
                />
              </div>

              <div className="space-y-4">
                <Label className="text-tire-300">
                  Matérias-Primas Necessárias
                </Label>

                <div className="flex gap-2 items-end">
                  <Select
                    value={selectedMaterial}
                    onValueChange={setSelectedMaterial}
                  >
                    <SelectTrigger className="flex-1 bg-factory-700/50 border-tire-600/30 text-white">
                      <SelectValue placeholder="Selecione uma matéria-prima" />
                    </SelectTrigger>
                    <SelectContent className="bg-factory-800 border-tire-600/30">
                      {activeMaterials.map((material) => (
                        <SelectItem
                          key={material.id}
                          value={material.id}
                          className="text-white hover:bg-tire-700/50"
                        >
                          {material.name} ({material.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={materialQuantity}
                    onChange={(e) => setMaterialQuantity(e.target.value)}
                    className="w-24 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                    placeholder="Qtd"
                  />

                  <Button
                    type="button"
                    onClick={handleAddMaterial}
                    className="bg-neon-green hover:bg-neon-green/80 px-3 shrink-0"
                    disabled={!selectedMaterial || !materialQuantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {selectedMaterials.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-tire-300 text-sm">
                      Materiais Selecionados:
                    </Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedMaterials.map((material) => (
                        <div
                          key={material.material_id}
                          className="flex items-center justify-between p-3 bg-factory-700/30 rounded border border-tire-600/20"
                        >
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-white text-sm font-medium">
                                {material.material_name}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRemoveMaterial(material.material_id)
                                }
                                className="text-red-400 hover:text-red-300 p-1 h-6 w-6"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-tire-400 text-xs">
                                {material.quantity_needed} {material.unit}
                              </span>
                              <span className="text-neon-green text-xs font-medium">
                                {formatCurrency(
                                  calculateMaterialCost(
                                    material.material_id,
                                    material.quantity_needed
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total Cost Display */}
                    {selectedMaterials.length > 0 && (
                      <div className="mt-3 p-3 bg-neon-green/10 rounded border border-neon-green/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-neon-green" />
                            <span className="text-white font-medium text-sm">
                              Custo Total da Receita:
                            </span>
                          </div>
                          <span className="text-neon-green font-bold">
                            {formatCurrency(selectedMaterialsCost)}
                          </span>
                        </div>
                        {selectedMaterialsCost === 0 && (
                          <p className="text-tire-400 text-xs mt-1">
                            * Alguns materiais não possuem custo cadastrado no
                            estoque
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-neon-green to-tire-500 hover:from-tire-600 hover:to-neon-green text-white"
                disabled={
                  isLoading ||
                  !productName.trim() ||
                  selectedMaterials.length === 0
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                {isLoading ? "Cadastrando..." : "Cadastrar Receita"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recipes List */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
              Receitas Cadastradas
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-tire-300 hover:text-white"
                >
                  {showArchived ? (
                    <ArchiveRestore className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  {showArchived ? "Ativas" : "Arquivadas"}
                </Button>
              </div>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
              <Input
                placeholder="Buscar receitas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredRecipes.length === 0 ? (
                <div className="text-center py-8">
                  <Factory className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                  <p className="text-tire-400">
                    {searchTerm
                      ? "Nenhuma receita encontrada"
                      : "Nenhuma receita cadastrada"}
                  </p>
                </div>
              ) : (
                filteredRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">
                        {recipe.product_name}
                      </h4>
                      <div className="flex items-center gap-2">
                        {!recipe.archived && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRecipe(recipe)}
                            className="text-neon-green hover:text-neon-green/80"
                            title="Editar receita"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onArchive(recipe.id)}
                          className="text-tire-300 hover:text-white"
                        >
                          {recipe.archived ? (
                            <ArchiveRestore className="h-4 w-4" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}
                        </Button>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            recipe.archived ? "bg-tire-500" : "bg-neon-green"
                          }`}
                        ></div>
                      </div>
                    </div>
                    <div className="text-tire-400 text-sm space-y-2">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium text-tire-300">
                          Matérias-primas necessárias:
                        </p>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-neon-green" />
                          <span className="text-neon-green font-bold text-sm">
                            {formatCurrency(
                              calculateRecipeCost(recipe.materials)
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {recipe.materials.map((material, index) => {
                          const materialCost = calculateMaterialCost(
                            material.material_id,
                            material.quantity_needed
                          );
                          const stockItem = stockItems.find(
                            (item) =>
                              item.item_id === material.material_id &&
                              item.item_type === "material"
                          );
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-factory-700/20 rounded"
                            >
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-white text-sm">
                                    {material.material_name}
                                  </span>
                                  <span className="text-tire-400 text-xs">
                                    {material.quantity_needed} {material.unit}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <div className="flex flex-col">
                                    <span className="text-tire-500 text-xs">
                                      {stockItem?.unit_cost &&
                                      stockItem.unit_cost > 0
                                        ? `${formatCurrency(stockItem.unit_cost)}/${material.unit}`
                                        : "Sem custo cadastrado"}
                                    </span>
                                    {stockItem && (
                                      <span className="text-tire-600 text-xs">
                                        Estoque: {stockItem.quantity.toFixed(2)}{" "}
                                        {material.unit}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span
                                      className={`text-xs font-medium ${
                                        materialCost > 0
                                          ? "text-neon-green"
                                          : "text-tire-500"
                                      }`}
                                    >
                                      {materialCost > 0
                                        ? formatCurrency(materialCost)
                                        : "R$ 0,00"}
                                    </span>
                                    {!stockItem && (
                                      <span className="text-red-400 text-xs">
                                        Não encontrado no estoque
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-tire-600/20 mt-3">
                        <p className="text-xs text-tire-500">
                          Criado em:{" "}
                          {new Date(recipe.created_at).toLocaleDateString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Recipe Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-factory-800 border-tire-600/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="h-5 w-5 text-neon-green" />
              Editar Receita: {editingRecipe?.product_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="editProductName" className="text-tire-300">
                Nome do Produto Final
              </Label>
              <Input
                id="editProductName"
                value={editProductName}
                onChange={(e) => setEditProductName(e.target.value)}
                className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                placeholder="Nome do produto"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-tire-300">
                Matérias-Primas Necessárias
              </Label>

              <div className="flex gap-2 items-end">
                <Select
                  value={editSelectedMaterial}
                  onValueChange={setEditSelectedMaterial}
                >
                  <SelectTrigger className="flex-1 bg-factory-700/50 border-tire-600/30 text-white">
                    <SelectValue placeholder="Selecione uma matéria-prima" />
                  </SelectTrigger>
                  <SelectContent className="bg-factory-800 border-tire-600/30">
                    {activeMaterials.map((material) => (
                      <SelectItem
                        key={material.id}
                        value={material.id}
                        className="text-white hover:bg-tire-700/50"
                      >
                        {material.name} ({material.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editMaterialQuantity}
                  onChange={(e) => setEditMaterialQuantity(e.target.value)}
                  className="w-24 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  placeholder="Qtd"
                />

                <Button
                  type="button"
                  onClick={handleAddEditMaterial}
                  className="bg-neon-green hover:bg-neon-green/80 px-3 shrink-0"
                  disabled={!editSelectedMaterial || !editMaterialQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {editSelectedMaterials.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-tire-300 text-sm">
                    Materiais Selecionados:
                  </Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {editSelectedMaterials.map((material) => (
                      <div
                        key={material.material_id}
                        className="flex items-center justify-between p-3 bg-factory-700/30 rounded border border-tire-600/20"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-white text-sm font-medium">
                              {material.material_name}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveEditMaterial(material.material_id)
                              }
                              className="text-red-400 hover:text-red-300 p-1 h-6 w-6"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-tire-400 text-xs">
                              {material.quantity_needed} {material.unit}
                            </span>
                            <span className="text-neon-green text-xs font-medium">
                              {formatCurrency(
                                calculateMaterialCost(
                                  material.material_id,
                                  material.quantity_needed
                                )
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Cost Display for Edit */}
                  {editSelectedMaterials.length > 0 && (
                    <div className="mt-3 p-3 bg-neon-green/10 rounded border border-neon-green/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-neon-green" />
                          <span className="text-white font-medium text-sm">
                            Custo Total da Receita:
                          </span>
                        </div>
                        <span className="text-neon-green font-bold">
                          {formatCurrency(editMaterialsCost)}
                        </span>
                      </div>
                      {editMaterialsCost === 0 && (
                        <p className="text-tire-400 text-xs mt-1">
                          * Alguns materiais não possuem custo cadastrado no
                          estoque
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-tire-600/30">
            <Button
              onClick={handleSaveEdit}
              className="flex-1 bg-neon-green hover:bg-neon-green/80 text-white"
              disabled={
                !editProductName.trim() || editSelectedMaterials.length === 0
              }
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
            <Button
              onClick={handleCancelEdit}
              variant="outline"
              className="flex-1 border-tire-600/30 text-tire-300 hover:text-white hover:bg-tire-700/50"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionRegistration;
