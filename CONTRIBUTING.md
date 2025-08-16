# Guia de Contribuição

Obrigado por considerar contribuir para o Sistema de Gestão Empresarial! Este documento fornece diretrizes para contribuir com o projeto.

## Código de Conduta

Ao participar deste projeto, você concorda em manter um ambiente respeitoso e colaborativo. Seja respeitoso com os outros contribuidores, mantenha discussões construtivas e foque na melhoria do projeto.

## Como Contribuir

### Reportando Bugs

Se você encontrou um bug, por favor, crie uma issue detalhando:

1. Passos para reproduzir o problema
2. Comportamento esperado
3. Comportamento atual
4. Screenshots (se aplicável)
5. Ambiente (navegador, sistema operacional, etc.)

### Sugerindo Melhorias

Para sugerir melhorias ou novas funcionalidades:

1. Crie uma issue descrevendo sua ideia
2. Explique por que essa melhoria seria útil
3. Sugira uma abordagem para implementação (opcional)

### Processo de Pull Request

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nome-da-feature`)
3. Faça suas alterações
4. Execute os testes e linting (`npm run lint`)
5. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
6. Push para a branch (`git push origin feature/nome-da-feature`)
7. Abra um Pull Request

### Padrões de Código

- Siga o estilo de código existente no projeto
- Escreva testes para novas funcionalidades
- Mantenha a documentação atualizada
- Use mensagens de commit claras e descritivas

## Configuração do Ambiente de Desenvolvimento

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/sistema-gestao.git
cd sistema-gestao

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Inicie o servidor de desenvolvimento
npm run dev
```

## Estrutura do Projeto

Familiarize-se com a estrutura do projeto:

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

## Dúvidas?

Se você tiver dúvidas sobre como contribuir, sinta-se à vontade para abrir uma issue perguntando ou entrar em contato com os mantenedores do projeto.

---

Agradecemos sua contribuição para tornar este projeto melhor!