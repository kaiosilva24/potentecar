import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

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
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

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
    console.log("Attempting to sign in with:", { email });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("Sign in response:", { data, error });

    if (error) {
      console.error("Sign in error details:", {
        message: error.message,
        status: error.status,
        name: error.name,
      });

      // Provide Portuguese error messages based on error details
      if (
        error.message.includes("Invalid login credentials") ||
        error.message.includes("invalid_grant") ||
        error.status === 400
      ) {
        throw new Error("Email ou senha inválidos.");
      } else if (error.message.includes("Email not confirmed")) {
        throw new Error(
          "Email não confirmado. Verifique sua caixa de entrada.",
        );
      } else if (error.message.includes("signup_disabled")) {
        throw new Error("Cadastro desabilitado.");
      } else if (error.message.includes("too_many_requests")) {
        throw new Error(
          "Muitas tentativas. Tente novamente em alguns minutos.",
        );
      } else {
        throw new Error(`Erro de autenticação: ${error.message}`);
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
