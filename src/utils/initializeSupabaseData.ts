import { supabase } from '../../supabase/supabase';

/**
 * Sistema de checkpoint para dados do dashboard
 * Verifica se a tabela system_settings existe e está acessível
 * NÃO insere valores fixos - funciona como checkpoint para salvar/carregar últimos valores calculados
 */

/**
 * Verifica se a tabela system_settings existe e está acessível
 */
export async function checkSystemSettingsTable(): Promise<boolean> {
  try {
    console.log('🔍 [Checkpoint] Verificando tabela system_settings...');

    // Usar any para contornar restrições de TypeScript
    const { data, error } = await (supabase as any)
      .from('system_settings')
      .select('key, value')
      .limit(1);

    if (error) {
      console.warn('⚠️ [Checkpoint] Tabela system_settings não existe ou não acessível:', error.message);
      return false;
    }

    console.log('✅ [Checkpoint] Tabela system_settings está acessível');
    if (data && data.length > 0) {
      console.log(`📊 [Checkpoint] Encontrados ${data.length} registros na tabela`);
    } else {
      console.log('📊 [Checkpoint] Tabela vazia - pronta para receber checkpoints');
    }
    
    return true;

  } catch (error) {
    console.error('❌ [Checkpoint] Erro ao verificar tabela:', error);
    return false;
  }
}

/**
 * Verifica se um checkpoint específico existe
 */
export async function checkCheckpoint(key: string): Promise<{ exists: boolean; value?: number }> {
  try {
    // Usar any para contornar restrições de TypeScript
    const { data, error } = await (supabase as any)
      .from('system_settings')
      .select('key, value')
      .eq('key', key)
      .single();

    if (error || !data) {
      console.log(`📝 [Checkpoint] Checkpoint '${key}' não existe ainda`);
      return { exists: false };
    }

    const value = Number(data.value) || 0;
    console.log(`📊 [Checkpoint] Checkpoint '${key}' encontrado: ${value}`);
    return { exists: true, value };

  } catch (error) {
    console.log(`📝 [Checkpoint] Checkpoint '${key}' não existe ainda`);
    return { exists: false };
  }
}

/**
 * Função principal para garantir que o sistema de checkpoint esteja funcionando
 */
export async function ensureSystemDataExists(): Promise<void> {
  try {
    console.log('🚀 [Checkpoint] Verificando sistema de checkpoint...');
    
    const tableExists = await checkSystemSettingsTable();
    
    if (tableExists) {
      console.log('✅ [Checkpoint] Sistema de checkpoint pronto para uso');
      console.log('💾 [Checkpoint] Os valores serão salvos automaticamente quando calculados');
      console.log('🔄 [Checkpoint] Ao reiniciar, os últimos valores calculados serão carregados');
    } else {
      console.warn('⚠️ [Checkpoint] Sistema de checkpoint não está disponível');
      console.warn('⚠️ [Checkpoint] Execute o SQL create_system_settings_table.sql no Supabase');
    }
    
  } catch (error) {
    console.error('❌ [Checkpoint] Falha na verificação do sistema:', error);
  }
}
