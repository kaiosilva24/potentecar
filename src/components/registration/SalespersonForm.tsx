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
  UserCheck,
  Edit,
} from "lucide-react";
import { Salesperson } from "@/types/financial";
import { useTranslation } from "react-i18next";

interface SalespersonFormProps {
  salespeople?: Salesperson[];
  onSubmit?: (
    salesperson: Omit<Salesperson, "id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  onArchive?: (salespersonId: string) => Promise<void>;
  isLoading?: boolean;
}

const SalespersonForm = ({
  salespeople = [],
  onSubmit = async () => {},
  onArchive = async () => {},
  isLoading = false,
}: SalespersonFormProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [contact, setContact] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !commissionRate || parseFloat(commissionRate) < 0)
      return;

    await onSubmit({
      name: name.trim(),
      commission_rate: parseFloat(commissionRate),
      contact: contact.trim() || undefined,
      archived: false,
    });

    // Reset form
    setName("");
    setCommissionRate("");
    setContact("");
    setEditingId(null);
  };

  const handleEdit = (salesperson: Salesperson) => {
    setName(salesperson.name);
    setCommissionRate(salesperson.commission_rate.toString());
    setContact(salesperson.contact || "");
    setEditingId(salesperson.id);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const filteredSalespeople = salespeople.filter((salesperson) => {
    const matchesSearch = salesperson.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesArchived = showArchived ? true : !salesperson.archived;
    return matchesSearch && matchesArchived;
  });

  const activeSalespeople = filteredSalespeople.filter((s) => !s.archived);
  const averageCommission =
    activeSalespeople.length > 0
      ? activeSalespeople.reduce((sum, s) => sum + s.commission_rate, 0) /
        activeSalespeople.length
      : 0;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue flex items-center justify-center">
            <UserCheck className="h-4 w-4 text-white" />
          </div>
          Vendedores
        </h2>
        <p className="text-tire-300 mt-2">
          Gerencie os vendedores e suas comissões
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              {editingId ? "Editar Vendedor" : "Cadastrar Vendedor"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-tire-300">
                  Nome do Vendedor *
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  placeholder="Ex: João Silva, Maria Santos..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commissionRate" className="text-tire-300">
                  Taxa de Comissão (%) *
                </Label>
                <Input
                  id="commissionRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  placeholder="Ex: 5.00, 10.50..."
                  required
                />
                <p className="text-xs text-tire-400">
                  Percentual de comissão sobre as vendas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact" className="text-tire-300">
                  Contato (Opcional)
                </Label>
                <Input
                  id="contact"
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  placeholder="Telefone, email ou outras informações..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-neon-purple to-neon-blue hover:from-neon-blue hover:to-neon-purple text-white"
                  disabled={isLoading || !name.trim() || !commissionRate}
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
                      setCommissionRate("");
                      setContact("");
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
              Vendedores Cadastrados
              <div className="text-sm font-normal space-y-1">
                <div className="text-neon-purple font-bold">
                  {activeSalespeople.length} vendedores ativos
                </div>
                <div className="text-tire-400 text-xs">
                  Comissão média: {formatPercentage(averageCommission)}
                </div>
              </div>
            </CardTitle>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-tire-400" />
                <Input
                  placeholder="Buscar vendedores..."
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
              {filteredSalespeople.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                  <p className="text-tire-400">
                    {searchTerm
                      ? "Nenhum vendedor encontrado"
                      : "Nenhum vendedor cadastrado"}
                  </p>
                </div>
              ) : (
                filteredSalespeople.map((salesperson) => (
                  <div
                    key={salesperson.id}
                    className={`p-4 rounded-lg border ${
                      salesperson.archived
                        ? "bg-factory-700/20 border-tire-600/10 opacity-60"
                        : "bg-factory-700/30 border-tire-600/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4
                        className={`font-medium ${
                          salesperson.archived ? "text-tire-400" : "text-white"
                        }`}
                      >
                        {salesperson.name}
                        {salesperson.archived && (
                          <span className="ml-2 text-xs bg-tire-600/30 px-2 py-1 rounded">
                            Arquivado
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-neon-purple font-bold">
                          {formatPercentage(salesperson.commission_rate)}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(salesperson)}
                            className="text-tire-300 hover:text-white p-1 h-8 w-8"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onArchive(salesperson.id)}
                            className="text-tire-300 hover:text-white p-1 h-8 w-8"
                            title={
                              salesperson.archived ? "Desarquivar" : "Arquivar"
                            }
                          >
                            {salesperson.archived ? (
                              <ArchiveRestore className="h-4 w-4" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    {salesperson.contact && (
                      <p className="text-tire-400 text-sm mb-2">
                        Contato: {salesperson.contact}
                      </p>
                    )}
                    <div className="text-tire-500 text-xs">
                      Cadastrado em:{" "}
                      {new Date(salesperson.created_at).toLocaleDateString(
                        "pt-BR",
                      )}
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

export default SalespersonForm;
