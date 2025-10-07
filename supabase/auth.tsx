import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { 
  optimizedSignIn, 
  quickSessionCheck, 
  preloadCriticalData,
  lazyLoadSecondaryData,
  initializeAuthOptimizations,
  AuthPerformanceMonitor 
} from "../src/utils/authOptimizations";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Inicializar otimizações
    initializeAuthOptimizations();
    
    const initializeAuth = async () => {
      const startTime = Date.now();
      
      try {
        // Usar verificação rápida de sessão
        const session = await quickSessionCheck();
        setUser(session?.user ?? null);
        
        // Pré-carregar dados críticos se usuário logado
        if (session?.user) {
          preloadCriticalData();
          // Carregar dados secundários em background
          setTimeout(() => lazyLoadSecondaryData(), 2000);
        }
        
        const duration = Date.now() - startTime;
        AuthPerformanceMonitor.recordOperation('session_check', duration, true);
        
      } catch (error) {
        console.error('Erro na inicialização de auth:', error);
        const duration = Date.now() - startTime;
        AuthPerformanceMonitor.recordOperation('session_check', duration, false);
        
        // Fallback para método original
        try {
          const { data: { session } } = await supabase.auth.getSession();
          setUser(session?.user ?? null);
        } catch (fallbackError) {
          console.error('Erro no fallback de auth:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for changes on auth state (signed in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    console.log("🔄 [AUTH] Iniciando cadastro de usuário:", { email, fullName });
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      console.log("📊 [AUTH] Resposta do Supabase:", { 
        user: data.user ? "Criado" : "Não criado", 
        session: data.session ? "Ativa" : "Inativa",
        error: error?.message || "Nenhum erro"
      });

      if (error) {
        console.error("❌ [AUTH] Erro no cadastro:", error);
        throw error;
      }

      if (!data.user) {
        console.error("❌ [AUTH] Usuário não foi criado pelo Supabase");
        throw new Error("Falha ao criar usuário no Supabase");
      }

      console.log("✅ [AUTH] Usuário criado com sucesso:", {
        id: data.user.id,
        email: data.user.email,
        confirmed: data.user.email_confirmed_at ? "Sim" : "Não"
      });

      // Create user in public.users table
      try {
        const { error: userError } = await supabase.from("users").insert([
          {
            id: data.user.id,
            email: email,
            full_name: fullName,
            token_identifier: data.user.id,
          },
        ]);

        if (userError) {
          console.error("⚠️ [AUTH] Erro ao criar registro na tabela users:", userError);
          // Não fazemos throw aqui pois o usuário de auth foi criado com sucesso
        } else {
          console.log("✅ [AUTH] Registro criado na tabela users");
        }
      } catch (tableError) {
        console.error("⚠️ [AUTH] Erro na operação da tabela users:", tableError);
      }

      console.log("🎉 [AUTH] Processo de cadastro concluído com sucesso!");
    } catch (error) {
      console.error("Signup process error:", error);
      // Provide more user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes("Password should be at least")) {
          throw new Error("A senha deve ter pelo menos 6 caracteres.");
        }
        if (error.message.includes("Invalid email")) {
          throw new Error("Por favor, insira um email válido.");
        }
        if (error.message.includes("User already registered")) {
          throw new Error("Este email já está cadastrado.");
        }
      }
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log("🔄 [AUTH] Tentando login otimizado com:", { email });
    const startTime = Date.now();
    
    try {
      // Usar login otimizado com timeout
      const result = await optimizedSignIn(email, password);
      
      const duration = Date.now() - startTime;
      AuthPerformanceMonitor.recordOperation('sign_in', duration, true);
      
      console.log("✅ [AUTH] Login otimizado bem-sucedido:", { 
        duration: `${duration}ms`,
        user: result?.data?.user ? "Logado" : "Não logado"
      });

      // Verificar erros na resposta otimizada
      if (result && typeof result === 'object' && 'error' in result) {
        const typedResult = result as any;
        if (typedResult.error) {
          throw typedResult.error;
        }
      }

      // Pré-carregar dados críticos após login bem-sucedido
      if (result && typeof result === 'object' && 'data' in result) {
        const typedResult = result as any;
        if (typedResult.data?.user) {
          // Iniciar pré-carregamento em background
          setTimeout(() => {
            preloadCriticalData();
            setTimeout(() => lazyLoadSecondaryData(), 1000);
          }, 100);
        }
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      AuthPerformanceMonitor.recordOperation('sign_in', duration, false);
      
      console.error("❌ [AUTH] Erro no login otimizado:", {
        message: error?.message,
        status: error?.status,
        duration: `${duration}ms`
      });

      // Provide Portuguese error messages based on error details
      if (
        error?.message?.includes("Invalid login credentials") ||
        error?.message?.includes("invalid_grant") ||
        error?.status === 400
      ) {
        throw new Error("Email ou senha inválidos.");
      } else if (error?.message?.includes("Email not confirmed")) {
        throw new Error(
          "Email não confirmado. Verifique sua caixa de entrada.",
        );
      } else if (error?.message?.includes("signup_disabled")) {
        throw new Error("Cadastro desabilitado.");
      } else if (error?.message?.includes("too_many_requests")) {
        throw new Error(
          "Muitas tentativas. Tente novamente em alguns minutos.",
        );
      } else if (error?.message?.includes("timeout")) {
        throw new Error(
          "Login demorou muito para responder. Verifique sua conexão e tente novamente.",
        );
      } else {
        throw new Error(`Erro de autenticação: ${error?.message || 'Erro desconhecido'}`);
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
