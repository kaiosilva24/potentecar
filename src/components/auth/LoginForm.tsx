import { useState } from "react";
import { useAuth } from "../../../supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import { LogIn } from "lucide-react";
import potentCarLogo from "../../assets/potente-car.png";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ocorreu um erro ao fazer login. Tente novamente.");
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

        {/* Login Card */}
        <div className="bg-factory-800/90 backdrop-blur-md rounded-2xl border border-tire-600/30 p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-neon-blue/20 rounded-full mb-4">
              <LogIn className="h-6 w-6 text-neon-blue" />
            </div>
            <h2 className="text-2xl font-semibold text-white">
              Acesso ao Sistema
            </h2>
            <p className="text-tire-300 mt-2">
              Entre com suas credenciais
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 bg-factory-700/50 border-tire-600/30 text-white placeholder:text-tire-400 focus:border-neon-blue focus:ring-neon-blue/20"
              />
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
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>


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
