# 🚀 Deploy do Sistema de Gestão na Vercel

Este guia mostra como fazer o deploy do sistema de gestão empresarial na Vercel.

## 📋 Pré-requisitos

1. **Conta na Vercel**: [vercel.com](https://vercel.com)
2. **Projeto Supabase**: Configurado e funcionando
3. **Repositório Git**: Código versionado (GitHub, GitLab, etc.)

## 🔧 Configuração das Variáveis de Ambiente

### 1. No Supabase Dashboard
1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Settings > API**
3. Copie:
   - **Project URL** (VITE_SUPABASE_URL)
   - **anon public key** (VITE_SUPABASE_ANON_KEY)

### 2. Na Vercel
1. Acesse [vercel.com](https://vercel.com) e faça login
2. Importe seu repositório
3. Vá em **Settings > Environment Variables**
4. Adicione as variáveis:
   ```
   VITE_SUPABASE_URL = https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY = sua_chave_anonima_aqui
   ```

## 🚀 Passos para Deploy

### Opção 1: Deploy via Dashboard Vercel
1. Acesse [vercel.com/new](https://vercel.com/new)
2. Conecte sua conta GitHub/GitLab
3. Selecione o repositório do projeto
4. Configure as variáveis de ambiente
5. Clique em **Deploy**

### Opção 2: Deploy via CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy do projeto
vercel

# Configurar variáveis de ambiente
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Redeploy com as variáveis
vercel --prod
```

## ⚙️ Configurações Importantes

### Build Settings
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Domínio Personalizado (Opcional)
1. Na Vercel, vá em **Settings > Domains**
2. Adicione seu domínio personalizado
3. Configure DNS conforme instruções

## 🔒 Segurança em Produção

### Configurações do Supabase
1. **RLS (Row Level Security)**: Ativado em todas as tabelas
2. **Auth Settings**: Configure domínios permitidos
3. **CORS**: Adicione domínio da Vercel

### Variáveis de Ambiente
- ✅ **VITE_SUPABASE_URL**: URL pública do projeto
- ✅ **VITE_SUPABASE_ANON_KEY**: Chave pública (segura para frontend)
- ❌ **Nunca exponha**: Service Role Key ou outras chaves privadas

## 🧪 Teste de Produção

Após o deploy:
1. **Acesse a URL** fornecida pela Vercel
2. **Teste login** com usuário existente
3. **Verifique funcionalidades** principais
4. **Teste criação de usuário** via admin
5. **Confirme sincronização** com Supabase

## 🔧 Troubleshooting

### Problemas Comuns

**❌ Erro de conexão com Supabase**
- Verifique variáveis de ambiente
- Confirme URLs e chaves no Supabase

**❌ Build falha**
- Execute `npm run build` localmente
- Corrija erros de TypeScript
- Verifique dependências

**❌ Roteamento não funciona**
- Arquivo `vercel.json` configurado corretamente
- SPA rewrites habilitados

**❌ Autenticação não funciona**
- Configure domínios permitidos no Supabase
- Verifique configurações de CORS

## 📞 Suporte

Para problemas específicos:
1. **Logs da Vercel**: Functions tab no dashboard
2. **Logs do Supabase**: Dashboard > Logs
3. **Console do navegador**: F12 para debug

## 🎉 Sucesso!

Após seguir estes passos, seu sistema estará rodando em produção na Vercel com:
- ✅ HTTPS automático
- ✅ CDN global
- ✅ Deploy automático via Git
- ✅ Escalabilidade automática
- ✅ Integração completa com Supabase
