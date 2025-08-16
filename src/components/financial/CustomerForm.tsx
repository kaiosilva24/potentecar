import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  UserCheck,
  Search,
  Archive,
  ArchiveRestore,
  Shield,
  Calendar,
  Package,
  User,
} from "lucide-react";
import { Customer, WarrantyEntry } from "@/types/financial";
import { useWarrantyEntries } from "@/hooks/useDataPersistence";

interface CustomerFormProps {
  onSubmit?: (customer: Omit<Customer, "id" | "created_at">) => void;
  customers?: Customer[];
  onArchive?: (customerId: string) => void;
  isLoading?: boolean;
}

interface WarrantyDetailsModalProps {
  customer: Customer;
  warranties: WarrantyEntry[];
  isLoading: boolean;
}

const WarrantyDetailsModal = ({
  customer,
  warranties,
  isLoading,
}: WarrantyDetailsModalProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <DialogContent className="bg-factory-900 border-tire-600/30 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          Garantias de {customer.name}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-purple mx-auto mb-3"></div>
            <p className="text-tire-300">Carregando garantias...</p>
          </div>
        ) : warranties.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-tire-500 mx-auto mb-3" />
            <p className="text-tire-400">Nenhuma garantia encontrada</p>
          </div>
        ) : (
          <>
            <div className="mb-4 p-4 bg-neon-purple/10 rounded-lg border border-neon-purple/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neon-purple font-medium">
                    Total de Garantias
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {warranties.length}
                  </p>
                </div>
                <div className="text-neon-purple">
                  <Shield className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {warranties.map((warranty) => (
                <div
                  key={warranty.id}
                  className="p-4 bg-factory-700/30 rounded-lg border border-tire-600/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1 flex items-center gap-2">
                        <Package className="h-4 w-4 text-neon-blue" />
                        {warranty.product_name}
                      </h4>
                      <div className="flex items-center gap-4 text-tire-400 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(warranty.warranty_date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{warranty.salesperson_name}</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-neon-purple/20 text-neon-purple border-neon-purple/30"
                    >
                      {warranty.quantity} un
                    </Badge>
                  </div>

                  {warranty.description && (
                    <div className="mt-2 p-2 bg-factory-700/20 rounded text-tire-300 text-sm">
                      <p className="font-medium text-tire-200 mb-1">
                        Detalhes:
                      </p>
                      <p>{warranty.description}</p>
                    </div>
                  )}

                  <div className="text-tire-500 text-xs mt-2">
                    Registrado em: {formatDate(warranty.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DialogContent>
  );
};

const CustomerForm = ({
  onSubmit = () => {},
  customers = [],
  onArchive = () => {},
  isLoading = false,
}: CustomerFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    contact: "",
    address: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedCustomerWarranties, setSelectedCustomerWarranties] = useState<
    WarrantyEntry[]
  >([]);
  const [isLoadingWarranties, setIsLoadingWarranties] = useState(false);

  const { loadWarrantyEntriesByCustomer } = useWarrantyEntries();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSubmit({ ...formData, archived: false });
      setFormData({ name: "", document: "", contact: "", address: "" });
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.document && customer.document.includes(searchTerm)) ||
      (customer.contact &&
        customer.contact.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.address &&
        customer.address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesArchiveFilter = showArchived
      ? customer.archived
      : !customer.archived;
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

  const handleWarrantyClick = async (customer: Customer) => {
    setIsLoadingWarranties(true);
    try {
      const warranties = await loadWarrantyEntriesByCustomer(customer.id);
      setSelectedCustomerWarranties(warranties);
    } catch (error) {
      console.error("Erro ao carregar garantias do cliente:", error);
      setSelectedCustomerWarranties([]);
    } finally {
      setIsLoadingWarranties(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-green to-neon-blue flex items-center justify-center">
            <UserCheck className="h-4 w-4 text-white" />
          </div>
          Cadastro de Clientes
        </h2>
        <p className="text-tire-300 mt-2">
          Gerencie os dados dos seus clientes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Novo Cliente
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
                className="w-full bg-gradient-to-r from-neon-green to-tire-500 hover:from-tire-600 hover:to-neon-green text-white"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isLoading ? "Cadastrando..." : "Cadastrar Cliente"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Customers List */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
              Clientes Cadastrados
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
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                  <p className="text-tire-400">
                    {searchTerm
                      ? "Nenhum cliente encontrado"
                      : "Nenhum cliente cadastrado"}
                  </p>
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 bg-factory-700/30 rounded-lg border border-tire-600/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <h4 className="text-white font-medium">
                          {customer.name}
                        </h4>
                        {customer.warranty_count &&
                          customer.warranty_count > 0 && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleWarrantyClick(customer)}
                                  className="p-1 h-6 w-auto text-neon-purple hover:text-white hover:bg-neon-purple/20 transition-all"
                                  title={`${customer.warranty_count} garantia(s) - Clique para ver detalhes`}
                                >
                                  <Shield className="h-4 w-4 mr-1" />
                                  <span className="text-xs font-bold">
                                    {customer.warranty_count}
                                  </span>
                                </Button>
                              </DialogTrigger>
                              <WarrantyDetailsModal
                                customer={customer}
                                warranties={selectedCustomerWarranties}
                                isLoading={isLoadingWarranties}
                              />
                            </Dialog>
                          )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onArchive(customer.id)}
                          className="text-tire-300 hover:text-white"
                        >
                          {customer.archived ? (
                            <ArchiveRestore className="h-4 w-4" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}
                        </Button>
                        <div
                          className={`w-2 h-2 rounded-full ${customer.archived ? "bg-tire-500" : "bg-neon-green"}`}
                        ></div>
                      </div>
                    </div>
                    <div className="text-tire-400 text-sm space-y-1">
                      <p>Documento: {formatDocument(customer.document)}</p>
                      <p>Contato: {customer.contact}</p>
                      {customer.address && (
                        <p className="truncate">Endereço: {customer.address}</p>
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

export default CustomerForm;
