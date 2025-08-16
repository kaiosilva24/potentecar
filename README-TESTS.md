# Guia de Testes do Sistema de Gestão Empresarial

Este documento fornece informações sobre como executar testes, adicionar novos testes e entender a estrutura de testes do projeto.

## Configuração de Testes

O projeto utiliza as seguintes ferramentas para testes:

- **Jest**: Framework de testes
- **Testing Library**: Biblioteca para testar componentes React
- **ESLint**: Análise estática de código
- **Prettier**: Formatação de código
- **Husky**: Hooks de Git para garantir qualidade do código antes de commits
- **lint-staged**: Executa linters em arquivos que serão commitados

## Executando Testes

### Testes Unitários

Para executar todos os testes:

```bash
npm test
```

Para executar testes em modo de observação (útil durante o desenvolvimento):

```bash
npm run test:watch
```

Para gerar relatório de cobertura de testes:

```bash
npm run test:coverage
```

### Linting e Formatação

Para verificar problemas de linting:

```bash
npm run lint
```

Para formatar o código com Prettier:

```bash
npx prettier --write .
```

## Estrutura de Testes

### Localização dos Testes

Os testes estão organizados seguindo a estrutura:

- `src/__tests__/`: Testes gerais do aplicativo
- `src/components/__tests__/`: Testes específicos para componentes
- `src/utils/__tests__/`: Testes para utilitários

### Convenções de Nomenclatura

- Arquivos de teste devem ter o sufixo `.test.tsx` ou `.test.ts`
- Nomes de testes devem ser descritivos e seguir o padrão: `describe('ComponentName', () => { it('should do something', () => {}) })`

## Escrevendo Novos Testes

### Exemplo de Teste de Componente

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YourComponent from '../YourComponent';

describe('YourComponent', () => {
  it('renderiza corretamente', () => {
    render(<YourComponent />);
    expect(screen.getByText('Texto esperado')).toBeInTheDocument();
  });

  it('responde a interações do usuário', async () => {
    const handleClick = jest.fn();
    render(<YourComponent onClick={handleClick} />);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Exemplo de Teste de Utilitário

```tsx
import { suaFuncao } from '../seuArquivo';

describe('suaFuncao', () => {
  it('retorna o resultado esperado', () => {
    const resultado = suaFuncao(1, 2);
    expect(resultado).toBe(3);
  });

  it('lida com casos de erro', () => {
    expect(() => suaFuncao(-1, 2)).toThrow('Valor inválido');
  });
});
```

## Mocks

### Mockando Módulos

Para mockar um módulo externo:

```tsx
jest.mock('@/services/api', () => ({
  fetchData: jest.fn().mockResolvedValue({ data: 'mocked data' }),
}));
```

### Mockando Hooks

Para mockar hooks personalizados:

```tsx
jest.mock('@/hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({
    user: { id: '1', name: 'Test User' },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));
```

## Testes de Integração

Para testes que envolvem múltiplos componentes ou interações com APIs:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';
import YourComponent from '../YourComponent';

// Mock da API
jest.mock('@/services/api');

describe('YourComponent Integration', () => {
  it('carrega e exibe dados da API', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <YourComponent />
      </QueryClientProvider>
    );
    
    // Verifica estado de carregamento
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    
    // Espera dados serem carregados
    await waitFor(() => {
      expect(screen.getByText('Dados carregados')).toBeInTheDocument();
    });
  });
});
```

## Boas Práticas

1. **Teste comportamentos, não implementações**: Foque no que o componente deve fazer, não em como ele faz.
2. **Mantenha testes independentes**: Cada teste deve ser executável isoladamente.
3. **Use dados realistas**: Utilize dados que se assemelham ao que será usado em produção.
4. **Evite testes frágeis**: Não dependa de detalhes de implementação que podem mudar.
5. **Mantenha cobertura alta**: Tente manter uma cobertura de testes acima de 70%.
6. **Teste casos de erro**: Não teste apenas o caminho feliz, teste também como o código lida com erros.

## Solução de Problemas

### Testes Falham Localmente mas Passam no CI

- Verifique diferenças de ambiente (versões de Node.js, dependências)
- Verifique problemas de timezone ou configurações regionais
- Verifique se há dependências de arquivos que existem apenas localmente

### Testes Intermitentes

- Use `waitFor` ou `findBy*` para operações assíncronas
- Aumente timeouts para operações lentas
- Verifique se há dependências externas não mockadas

## Recursos Adicionais

- [Documentação do Jest](https://jestjs.io/docs/getting-started)
- [Documentação do Testing Library](https://testing-library.com/docs/)
- [Guia de Melhores Práticas para Testes React](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)