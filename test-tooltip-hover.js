// Teste específico para verificar valores do tooltip ao passar o mouse
console.log('🖱️ [Teste Tooltip] Iniciando teste de hover no gráfico...');

// Função para simular hover no gráfico
function testTooltipHover() {
  console.log('📊 [Teste Tooltip] Procurando elementos do gráfico...');
  
  // Procurar elementos do gráfico SVG
  const svgElements = document.querySelectorAll('svg.recharts-surface');
  console.log(`📊 [Teste Tooltip] Encontrados ${svgElements.length} gráficos SVG`);
  
  if (svgElements.length > 0) {
    const svg = svgElements[0]; // Primeiro gráfico
    const bars = svg.querySelectorAll('.recharts-bar-rectangle path');
    console.log(`📊 [Teste Tooltip] Encontradas ${bars.length} barras no gráfico`);
    
    if (bars.length > 0) {
      // Simular hover na primeira barra
      const firstBar = bars[0];
      console.log('🖱️ [Teste Tooltip] Simulando hover na primeira barra...');
      
      // Criar evento de mouse
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100
      });
      
      const mouseMoveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100
      });
      
      // Disparar eventos
      firstBar.dispatchEvent(mouseEnterEvent);
      firstBar.dispatchEvent(mouseMoveEvent);
      
      console.log('✅ [Teste Tooltip] Eventos de hover disparados');
      
      // Aguardar um pouco e verificar se tooltip apareceu
      setTimeout(() => {
        const tooltips = document.querySelectorAll('[class*="tooltip"], [class*="bg-factory-800"]');
        console.log(`🔍 [Teste Tooltip] Tooltips encontrados: ${tooltips.length}`);
        
        tooltips.forEach((tooltip, index) => {
          console.log(`📋 [Teste Tooltip ${index}] Conteúdo:`, tooltip.textContent);
          console.log(`📋 [Teste Tooltip ${index}] Classes:`, tooltip.className);
        });
      }, 500);
      
    } else {
      console.warn('⚠️ [Teste Tooltip] Nenhuma barra encontrada no gráfico');
    }
  } else {
    console.warn('⚠️ [Teste Tooltip] Nenhum gráfico SVG encontrado');
  }
}

// Função para verificar dados específicos dos produtos
function checkProductData() {
  console.log('📦 [Teste Tooltip] Verificando dados dos produtos...');
  
  // Dados esperados baseados nos logs
  const expectedData = [
    {
      name: '175 70 14 P6',
      quantity: 1,
      unitCost: 5.42,
      totalValue: 5.42
    },
    {
      name: '175 65 14 P1', 
      quantity: 1,
      unitCost: 93.75,
      totalValue: 93.75
    }
  ];
  
  console.log('📊 [Teste Tooltip] Dados esperados:', expectedData);
  
  // Verificar formatação de moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  expectedData.forEach(product => {
    console.log(`💰 [Teste Tooltip] ${product.name}:`);
    console.log(`   - Quantidade: ${product.quantity} un`);
    console.log(`   - Valor Total: ${formatCurrency(product.totalValue)}`);
    console.log(`   - Valor Unitário: ${formatCurrency(product.unitCost)}`);
  });
}

// Executar testes
setTimeout(() => {
  checkProductData();
}, 1000);

setTimeout(() => {
  testTooltipHover();
}, 2000);

// Adicionar listener para capturar logs do CustomTooltip
const originalLog = console.log;
console.log = function(...args) {
  if (args[0] && args[0].includes('[CustomTooltip]')) {
    console.warn('🎯 [Capturado] Tooltip Log:', ...args);
  }
  originalLog.apply(console, args);
};

console.log('🧪 [Teste Tooltip] Teste configurado. Passe o mouse sobre o gráfico para testar!');
