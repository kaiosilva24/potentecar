const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lqjbkpnuqmkqjxpvqzqb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxamJrcG51cW1rcWp4cHZxenFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM1OTc4NDAsImV4cCI6MjA0OTE3Mzg0MH0.7Uo3lQOLPCXDYJJLWJqJfnKSjKZBKUqFaXGKQtJRGJY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugStockValues() {
  console.log('🔍 [DEBUG] Verificando valores REAIS no Supabase...\n')
  
  try {
    // 1. Buscar TODOS os itens de estoque
    console.log('📊 [DEBUG] Buscando itens de estoque...')
    const { data: stockItems, error: stockError } = await supabase
      .from('stock_items')
      .select('*')
      .order('item_name')
    
    if (stockError) {
      console.error('❌ [DEBUG] Erro ao buscar estoque:', stockError)
      return
    }
    
    console.log(`✅ [DEBUG] Encontrados ${stockItems.length} itens de estoque:`)
    console.log('─'.repeat(80))
    
    let totalValue = 0
    
    stockItems.forEach((item, index) => {
      const itemValue = item.quantity * item.unit_cost
      totalValue += itemValue
      
      console.log(`${index + 1}. ${item.item_name}`)
      console.log(`   Tipo: ${item.item_type}`)
      console.log(`   Quantidade: ${item.quantity} ${item.unit}`)
      console.log(`   Custo unitário: R$ ${item.unit_cost.toFixed(2)}`)
      console.log(`   Valor total: R$ ${itemValue.toFixed(2)}`)
      console.log(`   Última atualização: ${item.last_updated}`)
      console.log('')
    })
    
    console.log('─'.repeat(80))
    console.log(`💰 [DEBUG] VALOR TOTAL CALCULADO: R$ ${totalValue.toFixed(2)}`)
    console.log('─'.repeat(80))
    
    // 2. Verificar se há produtos de revenda
    console.log('\n🛒 [DEBUG] Verificando produtos de revenda...')
    const { data: resaleProducts, error: resaleError } = await supabase
      .from('resale_products')
      .select('*')
      .order('name')
    
    if (resaleError) {
      console.error('❌ [DEBUG] Erro ao buscar produtos de revenda:', resaleError)
    } else {
      console.log(`✅ [DEBUG] Encontrados ${resaleProducts.length} produtos de revenda`)
      
      let resaleValue = 0
      resaleProducts.forEach((product, index) => {
        const productValue = (product.current_stock || 0) * (product.purchase_price || 0)
        resaleValue += productValue
        
        console.log(`${index + 1}. ${product.name}`)
        console.log(`   Estoque atual: ${product.current_stock || 0} ${product.unit}`)
        console.log(`   Preço de compra: R$ ${(product.purchase_price || 0).toFixed(2)}`)
        console.log(`   Valor total: R$ ${productValue.toFixed(2)}`)
        console.log('')
      })
      
      console.log(`💰 [DEBUG] VALOR TOTAL REVENDA: R$ ${resaleValue.toFixed(2)}`)
      console.log(`💰 [DEBUG] VALOR TOTAL GERAL: R$ ${(totalValue + resaleValue).toFixed(2)}`)
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro geral:', error)
  }
}

debugStockValues()
