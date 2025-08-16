import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Archive,
  ArchiveRestore,
  TrendingUp,
  Edit,
} from "lucide-react";
import { VariableCost } from "@/types/financial";
import { useTranslation } from "react-i18next";

interface VariableCostsManagerProps {
  variableCosts?: VariableCost[];
  onSubmit?: (
    cost: Omit<VariableCost, "id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  onArchive?: (costId: string) => Promise<void>;
  isLoading?: boolean;
}

const VariableCostsManager = ({
  variableCosts = [],
  onSubmit = async () => {},
  onArchive = async () => {},
  isLoading = false,
}: VariableCostsManagerProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSubmit({
      name: name.trim(),
      amount: 0, // Valor padrão já que não será mais inserido pelo usuário
      description: description.trim() || undefined,
      archived: false,
    });

    // Reset form
    setName("");
    setDescription("");
    setEditingId(null);
  };

  const handleEdit = (cost: VariableCost) => {
    setName(cost.name);
    setDescription(cost.description || "");
    setEditingId(cost.id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const filteredCosts = variableCosts.filter((cost) => {
    const matchesSearch = cost.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesArchived = showArchived ? true : !cost.archived;
    return matchesSearch && matchesArchived;
  });

  const totalVariableCosts = filteredCosts
    .filter((cost) => !cost.archived)
    .reduce((sum, cost) => sum + cost.amount, 0);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          Custos Variáveis
        </h2>
        <p className="text-tire-300 mt-2">
          Gerencie os custos variáveis da produção
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              {editingId ? "Editar Custo Variável" : "Cadastrar Custo Variável"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-tire-300">
                  Nome do Custo *
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  placeholder="Ex: Combustível, Manutenção, Comissões..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-tire-300">
                  Descrição (Opcional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  placeholder="Detalhes sobre este custo variável..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  disabled={isLoading || !name.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {editingId ? "Atualizar" : "Cadastrar"}
                </Button>
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setName("");
                      setDescription("");
                      setEditingId(null);
                    }}
                    className="bg-factory-700/50 border-tire-600/30 text-tire-300 hover:text-white"
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* List */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
              Custos Cadastrados
              <div className="text-sm font-normal">
                <span className="text-orange-400 font-bold">
                  {filteredCosts.filter((c) => !c.archived).length} itens
                </span>
              </div>
            </CardTitle>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                <Input
                  placeholder="Buscar custos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className="bg-factory-700/50 border-tire-600/30 text-tire-300 hover:text-white"
                >
                  {showArchived ? (
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                  ) : (
                    <Archive className="h-4 w-4 mr-2" />
                  )}
                  {showArchived ? "Ocultar Arquivados" : "Mostrar Arquivados"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredCosts.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                  <p className="text-tire-400">
                    {searchTerm
                      ? "Nenhum custo encontrado"
                      : "Nenhum custo variável cadastrado"}
                  </p>
                </div>
              ) : (
                filteredCosts.map((cost) => (
                  <div
                    key={cost.id}
                    className={`p-4 rounded-lg border ${
                      cost.archived
                        ? "bg-factory-700/20 border-tire-600/10 opacity-60"
                        : "bg-factory-700/30 border-tire-600/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4
                        className={`font-medium ${
                          cost.archived ? "text-tire-400" : "text-white"
                        }`}
                      >
                        {cost.name}
                        {cost.archived && (
                          <span className="ml-2 text-xs bg-tire-600/30 px-2 py-1 rounded">
                            Arquivado
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(cost)}
                            className="text-tire-300 hover:text-white p-1 h-8 w-8"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onArchive(cost.id)}
                            className="text-tire-300 hover:text-white p-1 h-8 w-8"
                            title={cost.archived ? "Desarquivar" : "Arquivar"}
                          >
                            {cost.archived ? (
                              <ArchiveRestore className="h-4 w-4" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    {cost.description && (
                      <p className="text-tire-400 text-sm">
                        {cost.description}
                      </p>
                    )}
                    <div className="text-tire-500 text-xs mt-2">
                      Cadastrado em:{" "}
                      {new Date(cost.created_at).toLocaleDateString("pt-BR")}
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

export default VariableCostsManager;
