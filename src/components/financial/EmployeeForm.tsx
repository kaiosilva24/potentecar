import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Search, Archive, ArchiveRestore } from "lucide-react";
import { Employee } from "@/types/financial";

interface EmployeeFormProps {
  onSubmit?: (employee: Omit<Employee, "id" | "created_at">) => void;
  employees?: Employee[];
  onArchive?: (employeeId: string) => void;
  isLoading?: boolean;
}

const EmployeeForm = ({
  onSubmit = () => {},
  employees = [],
  onArchive = () => {},
  isLoading = false,
}: EmployeeFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    hire_date: "",
    position: "",
    salary: "",
    commission: "",
    workdays_per_week: "5",
    inss_percentage: "7.5",
    fgts_percentage: "8",
    vacation_percentage: "8.33",
    thirteenth_salary_percentage: "8.33",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const calculateLaborCharges = (salary: number) => {
    const inssDeduction = (salary * parseFloat(formData.inss_percentage)) / 100;
    const fgts = (salary * parseFloat(formData.fgts_percentage)) / 100;
    const vacationBase =
      (salary * parseFloat(formData.vacation_percentage)) / 100;
    const vacationBonus = vacationBase / 3; // Um terço adicional das férias
    const vacationWithBonus = vacationBase + vacationBonus;
    const thirteenth =
      (salary * parseFloat(formData.thirteenth_salary_percentage)) / 100;

    // Total dos encargos: FGTS + Férias (com 1/3) + 13º - INSS
    const total = fgts + vacationWithBonus + thirteenth - inssDeduction;

    return {
      inss_percentage: parseFloat(formData.inss_percentage),
      fgts_percentage: parseFloat(formData.fgts_percentage),
      vacation_percentage: parseFloat(formData.vacation_percentage),
      thirteenth_salary_percentage: parseFloat(
        formData.thirteenth_salary_percentage,
      ),
      total_charges: total,
      vacation_with_bonus: vacationWithBonus,
      inss_deduction: inssDeduction,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      formData.name.trim() &&
      formData.hire_date &&
      formData.position.trim() &&
      formData.salary
    ) {
      const salary = parseFloat(formData.salary);
      const laborCharges = calculateLaborCharges(salary);

      onSubmit({
        name: formData.name,
        hire_date: formData.hire_date,
        position: formData.position,
        salary: salary,
        commission: formData.commission
          ? parseFloat(formData.commission)
          : undefined,
        workdays_per_week: parseFloat(formData.workdays_per_week),
        labor_charges: laborCharges,
        archived: false,
      });
      setFormData({
        name: "",
        hire_date: "",
        position: "",
        salary: "",
        commission: "",
        workdays_per_week: "5",
        inss_percentage: "7.5",
        fgts_percentage: "8",
        vacation_percentage: "8.33",
        thirteenth_salary_percentage: "8.33",
      });
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchiveFilter = showArchived
      ? employee.archived
      : !employee.archived;
    return matchesSearch && matchesArchiveFilter;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
          Cadastro de Funcionários
        </h2>
        <p className="text-tire-300 mt-2">Gerencie os dados dos funcionários</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg">
              Novo Funcionário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-tire-300">
                  Nome Completo
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
                <Label htmlFor="hire_date" className="text-tire-300">
                  Data de Contratação
                </Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) =>
                    setFormData({ ...formData, hire_date: e.target.value })
                  }
                  className="bg-factory-700/50 border-tire-600/30 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position" className="text-tire-300">
                  Cargo
                </Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary" className="text-tire-300">
                  Salário (R$)
                </Label>
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData({ ...formData, salary: e.target.value })
                  }
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commission" className="text-tire-300">
                  Comissão (R$) - Opcional
                </Label>
                <Input
                  id="commission"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.commission}
                  onChange={(e) =>
                    setFormData({ ...formData, commission: e.target.value })
                  }
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workdays_per_week" className="text-tire-300">
                  Dias de Trabalho por Semana
                </Label>
                <Input
                  id="workdays_per_week"
                  type="number"
                  min="1"
                  max="7"
                  value={formData.workdays_per_week}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      workdays_per_week: e.target.value,
                    })
                  }
                  className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
                  required
                />
              </div>

              {/* Labor Charges Section */}
              <div className="space-y-4 pt-4 border-t border-tire-600/30">
                <h3 className="text-tire-200 font-medium">
                  Encargos Trabalhistas (%)
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label
                      htmlFor="inss_percentage"
                      className="text-tire-300 text-sm"
                    >
                      INSS (%)
                    </Label>
                    <Input
                      id="inss_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.inss_percentage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          inss_percentage: e.target.value,
                        })
                      }
                      className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="fgts_percentage"
                      className="text-tire-300 text-sm"
                    >
                      FGTS (%)
                    </Label>
                    <Input
                      id="fgts_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.fgts_percentage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fgts_percentage: e.target.value,
                        })
                      }
                      className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="vacation_percentage"
                      className="text-tire-300 text-sm"
                    >
                      Férias (%)
                    </Label>
                    <Input
                      id="vacation_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.vacation_percentage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vacation_percentage: e.target.value,
                        })
                      }
                      className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="thirteenth_salary_percentage"
                      className="text-tire-300 text-sm"
                    >
                      13º Salário (%)
                    </Label>
                    <Input
                      id="thirteenth_salary_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.thirteenth_salary_percentage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          thirteenth_salary_percentage: e.target.value,
                        })
                      }
                      className="bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 h-9"
                    />
                  </div>
                </div>

                {formData.salary && (
                  <div className="bg-factory-700/30 p-3 rounded-lg border border-tire-600/20">
                    <p className="text-tire-300 text-sm mb-2">
                      Previsão de Encargos:
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-tire-400">FGTS:</span>
                        <span className="text-white">
                          {formatCurrency(
                            (parseFloat(formData.salary) *
                              parseFloat(formData.fgts_percentage)) /
                              100,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-tire-400">Férias + 1/3:</span>
                        <span className="text-white">
                          {formatCurrency(
                            calculateLaborCharges(
                              parseFloat(formData.salary) || 0,
                            ).vacation_with_bonus,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-tire-400">13º Salário:</span>
                        <span className="text-white">
                          {formatCurrency(
                            (parseFloat(formData.salary) *
                              parseFloat(
                                formData.thirteenth_salary_percentage,
                              )) /
                              100,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-400">INSS (desconto):</span>
                        <span className="text-red-400">
                          -
                          {formatCurrency(
                            calculateLaborCharges(
                              parseFloat(formData.salary) || 0,
                            ).inss_deduction,
                          )}
                        </span>
                      </div>
                      <div className="border-t border-tire-600/30 pt-1 mt-2">
                        <div className="flex justify-between">
                          <span className="text-tire-300 font-medium">
                            Total:
                          </span>
                          <span className="text-neon-green font-medium">
                            {formatCurrency(
                              calculateLaborCharges(
                                parseFloat(formData.salary) || 0,
                              ).total_charges,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-neon-purple to-tire-500 hover:from-tire-600 hover:to-neon-purple text-white"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isLoading ? "Cadastrando..." : "Cadastrar Funcionário"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Employees List */}
        <Card className="bg-factory-800/50 border-tire-600/30">
          <CardHeader>
            <CardTitle className="text-tire-200 text-lg flex items-center justify-between">
              Funcionários Cadastrados
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
                placeholder="Buscar funcionários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-tire-500 mx-auto mb-3" />
                  <p className="text-tire-400">
                    {searchTerm
                      ? "Nenhum funcionário encontrado"
                      : "Nenhum funcionário cadastrado"}
                  </p>
                </div>
              ) : (
                filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="p-3 bg-factory-700/30 rounded-lg border border-tire-600/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">
                        {employee.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onArchive(employee.id)}
                          className="text-tire-300 hover:text-white"
                        >
                          {employee.archived ? (
                            <ArchiveRestore className="h-4 w-4" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}
                        </Button>
                        <div
                          className={`w-2 h-2 rounded-full ${employee.archived ? "bg-tire-500" : "bg-neon-green"}`}
                        ></div>
                      </div>
                    </div>
                    <div className="text-tire-400 text-sm space-y-1">
                      <p>Cargo: {employee.position}</p>
                      <p>
                        Contratação:{" "}
                        {new Date(employee.hire_date).toLocaleDateString(
                          "pt-BR",
                        )}
                      </p>
                      <p>Salário: {formatCurrency(employee.salary)}</p>
                      {employee.commission && (
                        <p>Comissão: {formatCurrency(employee.commission)}</p>
                      )}
                      {employee.workdays_per_week && (
                        <p>Dias/semana: {employee.workdays_per_week}</p>
                      )}
                      {employee.labor_charges && (
                        <div className="mt-2 pt-2 border-t border-tire-600/20">
                          <p className="text-tire-300 font-medium text-xs mb-1">
                            Encargos Trabalhistas:
                          </p>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <p>
                              INSS: {employee.labor_charges.inss_percentage}%
                            </p>
                            <p>
                              FGTS: {employee.labor_charges.fgts_percentage}%
                            </p>
                            <p>
                              Férias:{" "}
                              {employee.labor_charges.vacation_percentage}%
                            </p>
                            <p>
                              13º:{" "}
                              {
                                employee.labor_charges
                                  .thirteenth_salary_percentage
                              }
                              %
                            </p>
                          </div>
                          {employee.labor_charges.vacation_with_bonus && (
                            <p className="text-tire-300 text-xs mt-1">
                              Férias + 1/3:{" "}
                              {formatCurrency(
                                employee.labor_charges.vacation_with_bonus,
                              )}
                            </p>
                          )}
                          {employee.labor_charges.inss_deduction && (
                            <p className="text-red-400 text-xs">
                              INSS (desconto): -
                              {formatCurrency(
                                employee.labor_charges.inss_deduction,
                              )}
                            </p>
                          )}
                          <p className="text-neon-green font-medium mt-1">
                            Total Encargos:{" "}
                            {formatCurrency(
                              employee.labor_charges.total_charges,
                            )}
                          </p>
                        </div>
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

export default EmployeeForm;
