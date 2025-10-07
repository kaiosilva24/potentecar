import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Configuração do Supabase com fallback para desenvolvimento local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

console.log('🔧 [Supabase] Configuração:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey.length
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "❌ [Supabase] URL ou Chave Anônima está faltando. Verifique suas variáveis de ambiente.",
  );
} else {
  console.log('✅ [Supabase] Configuração carregada com sucesso');
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test connection
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Supabase auth event: ${event}`, session);
});

// Verify connection
export const verifyConnection = async () => {
  try {
    console.log('🔍 [Supabase] Verificando conexão...');
    
    // Tenta conectar com uma tabela que sabemos que existe
    const { data, error } = await supabase
      .from("cash_flow_entries")
      .select("count")
      .limit(1);
      
    if (error) {
      console.error("❌ [Supabase] Erro de conexão:", {
        message: error.message,
        code: error.code,
        details: error.details
      });
      return false;
    }
    
    console.log("✅ [Supabase] Conexão bem-sucedida!", data);
    return true;
  } catch (err) {
    console.error("❌ [Supabase] Falha ao verificar conexão:", {
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined
    });
    return false;
  }
};
