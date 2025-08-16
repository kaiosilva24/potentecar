import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Package,
  Search,
  Archive,
  ArchiveRestore,
  Settings,
  X,
  Trash2,
} from "lucide-react";
import { RawMaterial } from "@/types/financial";

interface RawMaterialFormProps {
  onSubmit?: (
    material: Omit<RawMaterial, "id" | "created_at" | "quantity">,
  ) => void;
  materials?: RawMaterial[];
  customUnits?: string[];
  onArchive?: (materialId: string) => void;
  onDelete?: (materialId: string) => void;
  onAddCustomUnit?: (unit: string) => void;
  onRemoveCustomUnit?: (unit: string) => void;
  isLoading?: boolean;
}

const RawMaterialForm = ({
  onSubmit = () => {},
  materials = [],
  customUnits = [],
  onArchive = () => {},
  onDelete = () => {},
  onAddCustomUnit = () => {},
  onRemoveCustomUnit = () => {},
  isLoading = false,
}: RawMaterialFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    unit: "kg" as RawMaterial["unit"],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [newUnit, setNewUnit] = useState("");
  const [unitSearchTerm, setUnitSearchTerm] = useState("");
  const [isUnitsDialogOpen, setIsUnitsDialogOpen] = useState(false);

  const defaultUnits = ["kg", "L", "un", "m", "g", "ml"];
  const allUnits = [...defaultUnits, ...customUnits];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSubmit({
        name: formData.name,
        unit: formData.unit,
        archived: false,
      });
      setFormData({ name: "", unit: "kg" });
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

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch = material.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesArchiveFilter = showArchived
      ? material.archived
      : !material.archived;
    return matchesSearch && matchesArchiveFilter;
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center">
            <Package className="h-4 w-4 text-white" />
          </div>
          Cadastro de Matéria Prima
        </h2>
        <p className="text-tire-300 mt-2">
          Cadastre os materiais utilizados na produção
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Novo Material
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-tire-300">
                  Nome do Material
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="unit" className="text-tire-300">
                    Unidade de Medida
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
                      unit: value as RawMaterial["unit"],
                    })
                  }
                >
                  <SelectTrigger className="bg-factory-700/50 border-tire-600/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-factory-800 border-tire-600/30 max-h-60">
                    {allUnits.map((unit) => (
                      <SelectItem
                        key={unit}
                        value={unit}
                        className="text-white hover:bg-tire-700/50"
                      >
                        {unit === "kg" && "Quilograma (kg)"}
                        {unit === "L" && "Litro (L)"}
                        {unit === "un" && "Unidade (un)"}
                        {unit === "m" && "Metro (m)"}
                        {unit === "g" && "Grama (g)"}
                        {unit === "ml" && "Mililitro (ml)"}
                        {!defaultUnits.includes(unit) && unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-neon-blue to-tire-500 hover:from-tire-600 hover:to-neon-blue text-white"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isLoading ? "Cadastrando..." : "Cadastrar Material"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Materials List */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
              Materiais Cadastrados
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
                placeholder="Buscar materiais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredMaterials.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                  <p className="text-tire-400">
                    {searchTerm
                      ? "Nenhum material encontrado"
                      : "Nenhum material cadastrado"}
                  </p>
                </div>
              ) : (
                filteredMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-3 bg-factory-700/30 rounded-lg border border-tire-600/20"
                  >
                    <div>
                      <h4 className="text-white font-medium">
                        {material.name}
                      </h4>
                      <p className="text-tire-400 text-sm">
                        Unidade: {material.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onArchive(material.id)}
                        className="text-tire-300 hover:text-white"
                      >
                        {material.archived ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                      {material.archived && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-tire-300 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-factory-800 border-tire-600/30 text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">
                                Excluir Matéria-Prima Permanentemente
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-tire-300">
                                Tem certeza que deseja excluir permanentemente a
                                matéria-prima &quot;{material.name}&quot;? Esta
                                ação não pode ser desfeita e removerá todos os
                                dados relacionados, incluindo histórico de
                                estoque.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-factory-700 border-tire-600/30 text-white hover:bg-factory-600">
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(material.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Excluir Permanentemente
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <div
                        className={`w-2 h-2 rounded-full ${material.archived ? "bg-tire-500" : "bg-neon-green"}`}
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

export default RawMaterialForm;
