import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Este é um componente de exemplo para demonstrar como escrever testes
function ExampleComponent({ onClick }: { onClick: () => void }) {
  return (
    <div>
      <h1>Exemplo de Componente</h1>
      <button onClick={onClick}>Clique aqui</button>
    </div>
  );
}

describe('ExampleComponent', () => {
  it('renderiza corretamente', () => {
    render(<ExampleComponent onClick={() => {}} />);
    
    // Verifica se o título está presente
    expect(screen.getByText('Exemplo de Componente')).toBeInTheDocument();
    
    // Verifica se o botão está presente
    expect(screen.getByText('Clique aqui')).toBeInTheDocument();
  });

  it('chama a função onClick quando o botão é clicado', async () => {
    // Cria um mock da função onClick
    const handleClick = jest.fn();
    
    render(<ExampleComponent onClick={handleClick} />);
    
    // Simula o clique no botão
    await userEvent.click(screen.getByText('Clique aqui'));
    
    // Verifica se a função foi chamada
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});