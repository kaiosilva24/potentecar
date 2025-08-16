# 🏭 Sistema de Gestão Empresarial

Um sistema completo de gestão empresarial desenvolvido em React + TypeScript com sincronização em tempo real via Supabase.

## ✨ Funcionalidades Principais

### 📊 Dashboard Principal
- **Métricas em tempo real** com sincronização automática
- **Cards interativos** com dados atualizados instantaneamente
- **Gráficos dinâmicos** usando Recharts
- **Sistema de checkpoint** para backup e restauração
- **Cores personalizáveis** salvas no Supabase

### 💰 Gestão Financeira
- **Fluxo de caixa** completo com receitas e despesas
- **Controle de lucros** por produto e categoria
- **Análise de custos** com TireCostManager
- **Relatórios financeiros** detalhados
- **Sincronização em tempo real** via Supabase Realtime

### 📦 Gestão de Estoque
- **Controle completo** de matérias-primas, produtos finais e revenda
- **Alertas de estoque baixo** configuráveis
- **Histórico de movimentações** detalhado
- **Cálculo automático** de valores e custos
- **Drag & Drop** para reordenação de cards

### 🏭 Sistema de Produção
- **Controle de produção** de pneus e produtos
- **Análise de custos** por produto
- **Gráficos de produtividade** interativos
- **Gestão de materiais** utilizados

### 🛒 Gestão de Vendas
- **Registro de vendas** completo
- **Controle de clientes** e histórico
- **Análise de performance** de vendas
- **Relatórios de lucro** por período

### ⚙️ Sistema de Checkpoint
- **Backup automático** de todos os dados
- **Restauração completa** do sistema
- **Versionamento** de configurações
- **Sincronização** entre dispositivos

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 18** - Framework principal
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Styling
- **Recharts** - Gráficos interativos
- **Lucide React** - Ícones
- **React Query** - Gerenciamento de estado

### Backend & Database
- **Supabase** - Backend as a Service
- **PostgreSQL** - Banco de dados
- **Supabase Realtime** - Sincronização em tempo real
- **Row Level Security (RLS)** - Segurança

### Ferramentas
- **Git** - Controle de versão
- **ESLint** - Linting
- **Prettier** - Formatação de código
- **PostCSS** - Processamento CSS
- **Jest** - Testes unitários
- **Testing Library** - Testes de componentes
- **Husky** - Git hooks
- **lint-staged** - Linting em arquivos staged

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/sistema-gestao.git
cd sistema-gestao
```

### Ou após criar seu próprio repositório:
```bash
# Inicialize um novo repositório Git
git init

# Adicione o repositório remoto
git remote add origin https://github.com/seu-usuario/seu-repositorio.git

# Adicione todos os arquivos
git add .

# Faça o commit inicial
git commit -m "Commit inicial"

# Envie para o GitHub
git push -u origin main
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Crie um arquivo `.env` baseado no `.env.example`:
```bash
cp .env.example .env
```

Preencha as variáveis:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
VITE_SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

### 4. Configure o banco de dados
Execute os scripts SQL no Supabase:
```bash
# Criar tabelas principais
psql -f create_system_settings_table.sql

# Criar funções do banco
psql -f database-functions.sql

# Corrigir coluna de configurações (se necessário)
psql -f fix_system_settings_value_column.sql
```

### 5. Execute o projeto
```bash
npm run dev
```

O sistema estará disponível em `http://localhost:5000`

## 📁 Estrutura do Projeto

```
src/
├── components/           # Componentes React
│   ├── dashboard/       # Componentes do dashboard
│   ├── financial/       # Componentes financeiros
│   ├── stock/          # Componentes de estoque
│   ├── production/     # Componentes de produção
│   ├── sales/          # Componentes de vendas
│   └── ui/             # Componentes de UI
├── hooks/              # Custom hooks
├── services/           # Serviços e APIs
├── types/              # Definições de tipos
├── utils/              # Utilitários
└── providers/          # Providers React
```

## 🔧 Funcionalidades Avançadas

### Sincronização em Tempo Real
- **Supabase Realtime**: Atualizações instantâneas
- **Eventos customizados**: Comunicação entre componentes
- **Estado global**: Gerenciamento via React Query
- **Fallbacks robustos**: localStorage como backup

### Sistema de Checkpoint
- **Backup completo**: Todos os dados e configurações
- **Restauração seletiva**: Por módulo ou completa
- **Versionamento**: Controle de versões dos backups
- **Sincronização**: Entre diferentes dispositivos

### Personalização
- **Cores dos gráficos**: Personalizáveis e sincronizadas
- **Layout drag & drop**: Reordenação de componentes
- **Configurações por usuário**: Preferências individuais
- **Temas**: Suporte a tema escuro/claro

## 📊 Métricas e Analytics

### Cards do Dashboard
- **Saldo de Caixa**: Valor atual em caixa
- **Saldo Produtos Finais**: Valor do estoque de produtos
- **Saldo Matéria-Prima**: Valor do estoque de materiais
- **Saldo Produtos Revenda**: Valor dos produtos para revenda
- **Lucro Médio**: Análise de rentabilidade
- **Custo Médio por Pneu**: Controle de custos

### Gráficos Interativos
- **Gráficos de estoque**: Barras com cores dinâmicas
- **Gráficos de produção**: Timeline de produtividade
- **Gráficos financeiros**: Análise de fluxo de caixa
- **Tooltips detalhados**: Informações completas ao hover

## 🔐 Segurança

- **Row Level Security (RLS)**: Controle de acesso por linha
- **Autenticação Supabase**: Sistema seguro de login
- **Validação de dados**: Client-side e server-side
- **Sanitização**: Prevenção de XSS e SQL injection

## 🚀 Deploy

### Netlify (Recomendado)
```bash
# Build do projeto
npm run build

# Deploy via Netlify CLI
netlify deploy --prod --dir=dist
```

### Vercel
```bash
# Deploy via Vercel CLI
vercel --prod
```

### Manual
```bash
# Build do projeto
npm run build

# Servir arquivos estáticos
cp -r dist/* /var/www/html/
```

## 🧪 Testes

O projeto utiliza Jest e Testing Library para testes unitários e de componentes.

### Executando testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

Para mais informações sobre testes, consulte o arquivo [README-TESTS.md](README-TESTS.md).

## 🔍 Linting e Formatação

O projeto utiliza ESLint e Prettier para garantir a qualidade do código.

```bash
# Verificar problemas de linting
npm run lint

# Formatar código com Prettier
npx prettier --write .
```

Os hooks do Git (via Husky) garantem que o código seja verificado antes de cada commit.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

Para mais detalhes, consulte o arquivo [CONTRIBUTING.md](CONTRIBUTING.md).

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Verifique a [documentação](docs/)
2. Procure em [Issues existentes](https://github.com/seu-usuario/sistema-gestao/issues)
3. Crie uma [nova issue](https://github.com/seu-usuario/sistema-gestao/issues/new)

## 📈 Roadmap

- [ ] **Mobile App**: Versão mobile com React Native
- [ ] **API REST**: API independente para integrações
- [ ] **Relatórios PDF**: Geração automática de relatórios
- [ ] **Notificações**: Sistema de alertas em tempo real
- [ ] **Multi-tenant**: Suporte a múltiplas empresas
- [ ] **Integração ERP**: Conectores para sistemas externos

## 🏆 Características Técnicas

### Performance
- **Code Splitting**: Carregamento otimizado
- **Lazy Loading**: Componentes sob demanda
- **Memoização**: React.memo e useMemo
- **Debounce**: Otimização de chamadas de API

### Acessibilidade
- **ARIA Labels**: Suporte a leitores de tela
- **Navegação por teclado**: Totalmente acessível
- **Contraste**: Cores com contraste adequado
- **Responsive**: Funciona em todos os dispositivos

### Monitoramento
- **Console Logs**: Debug detalhado
- **Error Boundaries**: Tratamento de erros
- **Performance Metrics**: Métricas de performance
- **Real-time Status**: Status de conexão em tempo real

---

**Desenvolvido com ❤️ por [Seu Nome]**
