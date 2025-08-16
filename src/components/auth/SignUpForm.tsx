import { useState } from "react";
import { useAuth } from "../../../supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { UserPlus } from "lucide-react";
import potentCarLogo from "../../assets/potente-car.png";

export default function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      console.log("Attempting to sign up with:", { email, password, fullName });
      await signUp(email, password, fullName);
      toast({
        title: "Conta criada com sucesso!",
        description: "Verifique seu email para confirmar a conta.",
        duration: 5000,
      });
      navigate("/login");
    } catch (error) {
      console.error("Signup error:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-factory-900 via-factory-800 to-tire-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={potentCarLogo} 
              alt="Potente Car" 
              className="h-20 w-auto object-contain"
            />
          </div>
          <p className="text-tire-300 text-lg">
            Sistema de Gestão
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-factory-800/90 backdrop-blur-md rounded-2xl border border-tire-600/30 p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-neon-blue/20 rounded-full mb-4">
              <UserPlus className="h-6 w-6 text-neon-blue" />
            </div>
            <h2 className="text-2xl font-semibold text-white">
              Criar Nova Conta
            </h2>
            <p className="text-tire-300 mt-2">
              Preencha os dados para cadastro
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="fullName"
                className="text-sm font-medium text-tire-200"
              >
                Nome Completo
              </Label>
              <Input
                id="fullName"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 focus:border-neon-blue focus:ring-neon-blue/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-tire-200"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu-email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 focus:border-neon-blue focus:ring-neon-blue/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-tire-200"
              >
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Crie uma senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 focus:border-neon-blue focus:ring-neon-blue/20"
              />
              <p className="text-xs text-tire-400 mt-1">
                Senha deve ter pelo menos 6 caracteres
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-neon-blue hover:bg-neon-blue/80 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? "Criando conta..." : "Criar Conta"}
            </Button>
          </form>

          {/* Link para login */}
          <div className="text-center mt-6">
            <p className="text-tire-300 text-sm">
              Já tem uma conta?{" "}
              <Link
                to="/login"
                className="text-neon-blue hover:text-neon-blue/80 font-medium transition-colors"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-tire-400 text-sm">
            2025 Potencar - Sistema de Gestão
          </p>
        </div>
      </div>
    </div>
  );
}
