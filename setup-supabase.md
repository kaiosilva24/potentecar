# Configuração do Supabase

## Problema Identificado
O erro `ERR_ADDRESS_INVALID` indica que o Supabase não está configurado corretamente.

## Soluções Possíveis

### Opção 1: Usar Supabase Local (Recomendado para desenvolvimento)

1. **Instalar Supabase CLI:**
   ```bash
   npm install -g @supabase/cli
   ```

2. **Iniciar Supabase local:**
   ```bash
   npx supabase start
   ```

3. **Verificar status:**
   ```bash
   npx supabase status
   ```

### Opção 2: Usar Supabase Cloud (Produção)

1. **Criar projeto no Supabase.com**
2. **Obter as credenciais do projeto**
3. **Criar arquivo .env:**
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anonima
   ```

### Opção 3: Configuração Temporária (Atual)

O sistema foi configurado com valores padrão para desenvolvimento local:
- URL: `http://localhost:54321`
- Chave: Chave padrão do Supabase local

## Status Atual

✅ **Configuração aplicada:** Fallback para desenvolvimento local
✅ **Logs melhorados:** Diagnóstico detalhado de conexão
✅ **Arquivo .env.example:** Criado com configurações de exemplo

## Próximos Passos

1. Execute `npm run dev` para testar
2. Verifique o console do navegador para logs de conexão
3. Se necessário, configure o Supabase local ou cloud conforme as opções acima
