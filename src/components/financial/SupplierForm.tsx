import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Truck, Search, Archive, ArchiveRestore } from "lucide-react";
import { Supplier } from "@/types/financial";

interface SupplierFormProps {
  onSubmit?: (supplier: Omit<Supplier, "id" | "created_at">) => void;
  suppliers?: Supplier[];
  onArchive?: (supplierId: string) => void;
  isLoading?: boolean;
}

const SupplierForm = ({
  onSubmit = () => {},
  suppliers = [],
  onArchive = () => {},
  isLoading = false,
}: SupplierFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    contact: "",
    address: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSubmit({ ...formData, archived: false });
      setFormData({ name: "", document: "", contact: "", address: "" });
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.document && supplier.document.includes(searchTerm)) ||
      (supplier.contact &&
        supplier.contact.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supplier.address &&
        supplier.address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesArchiveFilter = showArchived
      ? supplier.archived
      : !supplier.archived;
    return matchesSearch && matchesArchiveFilter;
  });

  const formatDocument = (doc: string) => {
    const numbers = doc.replace(/\D/g, "");
    if (numbers.length <= 11) {
      // CPF format
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else {
      // CNPJ format
      return numbers.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5",
      );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-orange to-neon-blue flex items-center justify-center">
            <Truck className="h-4 w-4 text-white" />
          </div>
          Cadastro de Fornecedores
        </h2>
        <p className="text-tire-300 mt-2">
          Gerencie os dados dos seus fornecedores
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Novo Fornecedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-tire-300">
                  Nome / Razão Social
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document" className="text-tire-300">
                  CPF / CNPJ
                </Label>
                <Input
                  id="document"
                  value={formData.document}
                  onChange={(e) =>
                    setFormData({ ...formData, document: e.target.value })
                  }
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact" className="text-tire-300">
                  Contato
                </Label>
                <Input
                  id="contact"
                  value={formData.contact}
                  onChange={(e) =>
                    setFormData({ ...formData, contact: e.target.value })
                  }
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-tire-300">
                  Endereço
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 min-h-[80px]"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-neon-orange to-tire-500 hover:from-tire-600 hover:to-neon-orange text-white"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isLoading ? "Cadastrando..." : "Cadastrar Fornecedor"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Suppliers List */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
              Fornecedores Cadastrados
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
                placeholder="Buscar fornecedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredSuppliers.length === 0 ? (
                <div className="text-center py-8">
                  <Truck className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                  <p className="text-tire-400">
                    {searchTerm
                      ? "Nenhum fornecedor encontrado"
                      : "Nenhum fornecedor cadastrado"}
                  </p>
                </div>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="p-3 bg-factory-700/30 rounded-lg border border-tire-600/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">
                        {supplier.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onArchive(supplier.id)}
                          className="text-tire-300 hover:text-white"
                        >
                          {supplier.archived ? (
                            <ArchiveRestore className="h-4 w-4" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}
                        </Button>
                        <div
                          className={`w-2 h-2 rounded-full ${supplier.archived ? "bg-tire-500" : "bg-neon-green"}`}
                        ></div>
                      </div>
                    </div>
                    <div className="text-tire-400 text-sm space-y-1">
                      <p>Documento: {formatDocument(supplier.document)}</p>
                      <p>Contato: {supplier.contact}</p>
                      {supplier.address && (
                        <p className="truncate">Endereço: {supplier.address}</p>
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

export default SupplierForm;
