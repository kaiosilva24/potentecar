/**
 * Script simples para testar a implementação da sincronização do saldo de produtos de revenda
 * 
 * Este script verifica se:
 * 1. Os métodos foram adicionados ao DataManager
 * 2. Os estados foram adicionados ao Dashboard
 * 3. Os useEffects foram implementados corretamente
 * 4. O listener de eventos foi adicionado
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testando implementação da sincronização do saldo de produtos de revenda...\n');

// Caminhos dos arquivos
const dataManagerPath = path.join(__dirname, 'src/utils/dataManager.ts');
const dashboardPath = path.join(__dirname, 'src/components/pages/dashboard.tsx');

/**
 * Verificar se um arquivo contém determinadas strings
 */
function checkFileContains(filePath, checks, fileName) {
  console.log(`📁 Verificando ${fileName}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Arquivo não encontrado: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let allPassed = true;
  
  checks.forEach(({ description, search, required = true }) => {
    const found = content.includes(search);
    const status = found ? '✅' : (required ? '❌' : '⚠️');
    console.log(`  ${status} ${description}`);
    
    if (required && !found) {
      allPassed = false;
    }
  });
  
  return allPassed;
}

/**
 * Testes para o DataManager
 */
const dataManagerChecks = [
  {
    description: 'Método saveResaleProductStockBalance',
    search: 'async saveResaleProductStockBalance(balance: number)',
    required: true
  },
  {
    description: 'Método loadResaleProductStockBalance',
    search: 'async loadResaleProductStockBalance()',
    required: true
  },
  {
    description: 'Método subscribeToResaleProductStockChanges',
    search: 'subscribeToResaleProductStockChanges(callback:',
    required: true
  },
  {
    description: 'Chave resale_product_stock_balance',
    search: 'resale_product_stock_balance',
    required: true
  },
  {
    description: 'Upsert no Supabase',
    search: '.upsert({',
    required: true
  },
  {
    description: 'Subscription em tempo real',
    search: '.on(\'postgres_changes\'',
    required: true
  }
];

/**
 * Testes para o Dashboard
 */
const dashboardChecks = [
  {
    description: 'Estado resaleProductStockBalance',
    search: 'const [resaleProductStockBalance, setResaleProductStockBalance]',
    required: true
  },
  {
    description: 'Estado isLoadingResaleProductStock',
    search: 'const [isLoadingResaleProductStock, setIsLoadingResaleProductStock]',
    required: true
  },
  {
    description: 'useEffect de inicialização',
    search: 'initializeResaleProductStockSync',
    required: true
  },
  {
    description: 'useEffect de monitoramento',
    search: 'resaleProducts, stockItems',
    required: true
  },
  {
    description: 'Listener de eventos customizados',
    search: 'resaleProductStockUpdated',
    required: true
  },
  {
    description: 'Card com loading state',
    search: 'isLoadingResaleProductStock',
    required: true
  },
  {
    description: 'Cálculo do saldo de revenda',
    search: 'resaleProducts.reduce',
    required: true
  },
  {
    description: 'Subscription cleanup',
    search: 'unsubscribe()',
    required: true
  }
];

// Executar testes
console.log('🧪 Executando testes...\n');

const dataManagerPassed = checkFileContains(dataManagerPath, dataManagerChecks, 'DataManager');
console.log('');

const dashboardPassed = checkFileContains(dashboardPath, dashboardChecks, 'Dashboard');
console.log('');

// Verificar se o SQL foi criado
const sqlPath = path.join(__dirname, 'create_system_settings_table.sql');
const sqlExists = fs.existsSync(sqlPath);
console.log(`📄 Verificando SQL...`);
console.log(`  ${sqlExists ? '✅' : '❌'} Arquivo create_system_settings_table.sql`);

if (sqlExists) {
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  const hasCorrectType = sqlContent.includes('value TEXT NOT NULL');
  console.log(`  ${hasCorrectType ? '✅' : '❌'} Campo value com tipo TEXT`);
}

// Resultado final
console.log('\n📊 Resultado dos testes:');
console.log(`  DataManager: ${dataManagerPassed ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`  Dashboard: ${dashboardPassed ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`  SQL: ${sqlExists ? '✅ PASSOU' : '❌ FALHOU'}`);

const allPassed = dataManagerPassed && dashboardPassed && sqlExists;
console.log(`\n🎯 Status geral: ${allPassed ? '✅ IMPLEMENTAÇÃO COMPLETA' : '❌ IMPLEMENTAÇÃO INCOMPLETA'}`);

if (allPassed) {
  console.log('\n🚀 Próximos passos:');
  console.log('  1. Execute o SQL no Supabase para criar a tabela system_settings');
  console.log('  2. Inicie o servidor de desenvolvimento: npm run dev');
  console.log('  3. Navegue até o dashboard para testar a sincronização');
  console.log('  4. Verifique os logs no console do navegador');
} else {
  console.log('\n⚠️ Alguns componentes não foram implementados corretamente.');
  console.log('   Verifique os itens marcados com ❌ acima.');
}

console.log('\n✨ Teste concluído!');
