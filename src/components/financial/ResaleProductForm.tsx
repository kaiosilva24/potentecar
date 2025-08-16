import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  ShoppingCart,
  Search,
  Archive,
  ArchiveRestore,
  Settings,
  X,
  TrendingUp,
  Package,
} from "lucide-react";
import { ResaleProduct, Supplier } from "@/types/financial";

interface ResaleProductFormProps {
  onSubmit?: (
    product: Omit<ResaleProduct, "id" | "created_at" | "updated_at">,
  ) => void;
  resaleProducts?: ResaleProduct[];
  suppliers?: Supplier[];
  customUnits?: string[];
  onArchive?: (productId: string) => void;
  onAddCustomUnit?: (unit: string) => void;
  onRemoveCustomUnit?: (unit: string) => void;
  isLoading?: boolean;
}

const ResaleProductForm = ({
  onSubmit = () => {},
  resaleProducts = [],
  suppliers = [],
  customUnits = [],
  onArchive = () => {},
  onAddCustomUnit = () => {},
  onRemoveCustomUnit = () => {},
  isLoading = false,
}: ResaleProductFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    unit: "un" as ResaleProduct["unit"],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [newUnit, setNewUnit] = useState("");
  const [unitSearchTerm, setUnitSearchTerm] = useState("");
  const [isUnitsDialogOpen, setIsUnitsDialogOpen] = useState(false);

  const defaultUnits = ["un", "kg", "L", "m", "g", "ml"];
  const allUnits = [...defaultUnits, ...customUnits];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSubmit({
        name: formData.name,
        supplier_name: "Fornecedor Padrão", // Valor padrão
        purchase_price: 0, // Valor padrão
        sale_price: 0, // Valor padrão
        profit_margin: 0, // Valor padrão
        unit: formData.unit,
        archived: false,
      });
      setFormData({
        name: "",
        unit: "un",
      });
    }
  };

  const handleAddUnit = () => {
    if (newUnit.trim() && !allUnits.includes(newUnit.trim())) {
      onAddCustomUnit(newUnit.trim());
      setNewUnit("");
    }
  };

  const handleRemoveUnit = (unit: string) => {
    if (!defaultUnits.includes(unit)) {
      onRemoveCustomUnit(unit);
    }
  };

  const filteredUnits = allUnits.filter((unit) =>
    unit.toLowerCase().includes(unitSearchTerm.toLowerCase()),
  );

  const filteredProducts = resaleProducts.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesArchiveFilter = showArchived
      ? product.archived
      : !product.archived;
    return matchesSearch && matchesArchiveFilter;
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-green to-neon-blue flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 text-white" />
          </div>
          Cadastro de Produtos para Revenda
        </h2>
        <p className="text-tire-300 mt-2">
          Cadastre produtos para revenda com controle de preços e margem de
          lucro
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Novo Produto para Revenda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-tire-300">
                  Nome do Produto *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  placeholder="Digite o nome do produto para revenda"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="unit" className="text-tire-300">
                    Unidade de Medida *
                  </Label>
                  <Dialog
                    open={isUnitsDialogOpen}
                    onOpenChange={setIsUnitsDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-tire-300 hover:text-white"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-factory-800 border-tire-600/30 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-white">
                          Gerenciar Unidades de Medida
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nova unidade (ex: ton, cm³)"
                            value={newUnit}
                            onChange={(e) => setNewUnit(e.target.value)}
                            className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                            onKeyPress={(e) =>
                              e.key === "Enter" && handleAddUnit()
                            }
                          />
                          <Button
                            onClick={handleAddUnit}
                            className="bg-neon-blue hover:bg-neon-blue/80"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                          <Input
                            placeholder="Buscar unidades..."
                            value={unitSearchTerm}
                            onChange={(e) => setUnitSearchTerm(e.target.value)}
                            className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {filteredUnits.map((unit) => (
                            <div
                              key={unit}
                              className="flex items-center justify-between p-2 bg-factory-700/30 rounded border border-tire-600/20"
                            >
                              <span className="text-white">{unit}</span>
                              {!defaultUnits.includes(unit) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveUnit(unit)}
                                  className="text-tire-300 hover:text-red-400"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Select
                  value={formData.unit}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      unit: value as ResaleProduct["unit"],
                    })
                  }
                >
                  <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent className="bg-factory-800 border-tire-600/30 max-h-60">
                    {allUnits.map((unit) => (
                      <SelectItem
                        key={unit}
                        value={unit}
                        className="text-white hover:bg-tire-700/50"
                      >
                        {unit === "un" && "Unidade (un)"}
                        {unit === "kg" && "Quilograma (kg)"}
                        {unit === "L" && "Litro (L)"}
                        {unit === "m" && "Metro (m)"}
                        {unit === "g" && "Grama (g)"}
                        {unit === "ml" && "Mililitro (ml)"}
                        {!defaultUnits.includes(unit) && unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-factory-700/30 p-4 rounded-lg border border-tire-600/20">
                <p className="text-tire-300 text-sm">
                  ℹ️ <strong>Informação:</strong> Após cadastrar o produto, você
                  poderá gerenciar seu estoque na aba "Estoque" com quantidades,
                  preços de compra e venda.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-neon-green to-neon-blue hover:from-neon-blue hover:to-neon-green text-white"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isLoading ? "Cadastrando..." : "Cadastrar Produto"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Products List */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
              Produtos para Revenda
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
                  {showArchived ? "Ativos" : "Arquivados"}
                </Button>
              </div>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                  <p className="text-tire-400">
                    {searchTerm
                      ? "Nenhum produto encontrado"
                      : "Nenhum produto cadastrado"}
                  </p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-factory-700/30 rounded-lg border border-tire-600/20"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-medium">
                          {product.name}
                        </h4>
                        {product.sku && (
                          <span className="text-xs bg-tire-600/30 text-tire-300 px-2 py-1 rounded">
                            {product.sku}
                          </span>
                        )}
                      </div>
                      <div className="text-tire-400 text-sm space-y-1">
                        <p>Unidade: {product.unit}</p>
                        <p className="text-neon-cyan">
                          ✓ Produto cadastrado - Configure preços e estoque na
                          aba "Estoque"
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onArchive(product.id)}
                        className="text-tire-300 hover:text-white"
                      >
                        {product.archived ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          product.archived ? "bg-tire-500" : "bg-neon-green"
                        }`}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResaleProductForm;
