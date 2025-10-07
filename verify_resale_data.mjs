import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (substitua pelas suas credenciais)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyResaleData() {
  console.log('🔍 Verificando dados de produtos de revenda no Supabase...\n');

  try {
    // 1. Verificar produtos de revenda cadastrados
    console.log('📋 1. PRODUTOS DE REVENDA CADASTRADOS:');
    const { data: resaleProducts, error: resaleError } = await supabase
      .from('resale_products')
      .select('id, name, supplier_name, purchase_price, sale_price, current_stock, archived')
      .eq('archived', false)
      .order('name');

    if (resaleError) {
      console.error('❌ Erro ao consultar resale_products:', resaleError);
    } else {
      console.log(`✅ Total de produtos de revenda: ${resaleProducts.length}`);
      resaleProducts.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name}`);
        console.log(`     - Fornecedor: ${product.supplier_name}`);
        console.log(`     - Preço Compra: R$ ${product.purchase_price}`);
        console.log(`     - Preço Venda: R$ ${product.sale_price}`);
        console.log(`     - Estoque Atual: ${product.current_stock || 0}`);
        console.log('');
      });
    }

    // 2. Verificar estoque dos produtos de revenda
    console.log('📦 2. ESTOQUE DE PRODUTOS DE REVENDA:');
    const { data: stockItems, error: stockError } = await supabase
      .from('stock_items')
      .select('id, item_id, item_name, item_type, quantity, unit_cost, total_value, min_level')
      .eq('item_type', 'product')
      .order('item_name');

    if (stockError) {
      console.error('❌ Erro ao consultar stock_items:', stockError);
    } else {
      // Filtrar apenas produtos de revenda
      const resaleProductIds = resaleProducts.map(p => p.id);
      const resaleStockItems = stockItems.filter(item => 
        resaleProductIds.includes(item.item_id)
      );

      console.log(`✅ Total de itens em estoque (produtos): ${stockItems.length}`);
      console.log(`✅ Produtos de revenda em estoque: ${resaleStockItems.length}`);
      
      let totalQuantity = 0;
      let totalValue = 0;
      let lowStockCount = 0;

      resaleStockItems.forEach((item, index) => {
        const quantity = item.quantity || 0;
        const value = item.total_value || 0;
        const minLevel = item.min_level || 0;
        const isLowStock = minLevel > 0 && quantity <= minLevel;
        
        totalQuantity += quantity;
        totalValue += value;
        if (isLowStock) lowStockCount++;

        console.log(`  ${index + 1}. ${item.item_name}`);
        console.log(`     - Quantidade: ${quantity}`);
        console.log(`     - Custo Unitário: R$ ${(item.unit_cost || 0).toFixed(2)}`);
        console.log(`     - Valor Total: R$ ${value.toFixed(2)}`);
        console.log(`     - Nível Mínimo: ${minLevel}`);
        console.log(`     - Status: ${isLowStock ? '⚠️ ESTOQUE BAIXO' : '✅ OK'}`);
        console.log('');
      });

      // 3. Resumo das métricas
      console.log('📊 3. RESUMO DAS MÉTRICAS:');
      console.log(`   - Total de produtos cadastrados: ${resaleProducts.length}`);
      console.log(`   - Produtos com estoque: ${resaleStockItems.length}`);
      console.log(`   - Quantidade total em estoque: ${totalQuantity}`);
      console.log(`   - Valor total do estoque: R$ ${totalValue.toFixed(2)}`);
      console.log(`   - Alertas de estoque baixo: ${lowStockCount}`);
    }

    // 4. Verificar se há dados na tabela resale_products_stock (se existir)
    console.log('\n📋 4. VERIFICANDO TABELA RESALE_PRODUCTS_STOCK:');
    const { data: resaleStock, error: resaleStockError } = await supabase
      .from('resale_products_stock')
      .select('*')
      .limit(10);

    if (resaleStockError) {
      console.log('ℹ️ Tabela resale_products_stock não encontrada ou sem dados');
    } else {
      console.log(`✅ Registros na tabela resale_products_stock: ${resaleStock.length}`);
      resaleStock.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.product_name}`);
        console.log(`     - Quantidade: ${item.quantity}`);
        console.log(`     - Preço Compra: R$ ${item.purchase_price}`);
        console.log(`     - Preço Venda: R$ ${item.sale_price}`);
        console.log(`     - Valor Total: R$ ${item.total_value}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
verifyResaleData().then(() => {
  console.log('✅ Verificação concluída!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erro na verificação:', error);
  process.exit(1);
});
