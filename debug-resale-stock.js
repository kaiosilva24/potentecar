// Script para debugar o cálculo do saldo de produtos de revenda
console.log('🔍 Debugging Resale Stock Value Calculation');

// Simular dados de teste baseados no que vimos no dashboard
const resaleProducts = [
  {
    id: 1,
    name: "CARCAÇA 225 45 17",
    current_stock: 5,
    purchase_price: 50.00
  },
  {
    id: 2, 
    name: "carcaça 205 70 15",
    current_stock: 10,
    purchase_price: 55.00
  }
];

const stockItems = [
  {
    item_id: 1,
    item_name: "CARCAÇA 225 45 17",
    item_type: "product",
    quantity: 5,
    unit_cost: 50.00
  },
  {
    item_id: 2,
    item_name: "carcaça 205 70 15", 
    item_type: "product",
    quantity: 10,
    unit_cost: 55.00
  }
];

console.log('\n📊 Calculando usando lógica do dashboard (linhas 158-176):');

const resaleProductStockValue = resaleProducts.reduce((total, product) => {
  // Tratar valores null/undefined adequadamente
  const stock = product.current_stock ?? 0;
  const price = product.purchase_price ?? 0;
  
  // Verificar se há estoque correspondente na tabela stock_items
  const stockItem = stockItems.find(item => 
    item.item_name === product.name || item.item_id === product.id
  );
  
  // Usar estoque da tabela stock_items se disponível
  const finalStock = stockItem ? (stockItem.quantity || 0) : stock;
  const finalPrice = price > 0 ? price : (stockItem?.unit_cost || 0);
  
  const stockValue = finalStock * finalPrice;
  
  console.log(`  - ${product.name}:`);
  console.log(`    Stock original: ${stock}, Stock final: ${finalStock}`);
  console.log(`    Price original: R$ ${price.toFixed(2)}, Price final: R$ ${finalPrice.toFixed(2)}`);
  console.log(`    Valor: ${finalStock} × R$ ${finalPrice.toFixed(2)} = R$ ${stockValue.toFixed(2)}`);
  
  return total + stockValue;
}, 0);

console.log(`\n💰 Valor total calculado: R$ ${resaleProductStockValue.toFixed(2)}`);

console.log('\n🔧 Valor forçado no dataManager: R$ 600.00');
console.log(`📊 Diferença: R$ ${(resaleProductStockValue - 600).toFixed(2)}`);

if (resaleProductStockValue === 650) {
  console.log('\n✅ Confirmado: O cálculo local está retornando R$ 650.00');
  console.log('🔍 Possíveis causas da diferença:');
  console.log('  1. Dados diferentes entre dashboard e dataManager');
  console.log('  2. Lógica de cálculo diferente');
  console.log('  3. Valores cached no localStorage');
}
