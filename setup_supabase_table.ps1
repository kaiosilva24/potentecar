# Script PowerShell para criar a tabela system_settings no Supabase
# Execute este script para resolver os erros 404 dos cards do dashboard

Write-Host "🚀 Configurando tabela system_settings no Supabase..." -ForegroundColor Green

# Verificar se o arquivo SQL existe
$sqlFile = ".\create_system_settings_table.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Arquivo SQL não encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Arquivo SQL encontrado: $sqlFile" -ForegroundColor Yellow

# Ler o conteúdo do arquivo SQL
$sqlContent = Get-Content $sqlFile -Raw
Write-Host "📝 Conteúdo SQL carregado (${sqlContent.Length} caracteres)" -ForegroundColor Yellow

Write-Host ""
Write-Host "📋 INSTRUÇÕES PARA EXECUTAR NO SUPABASE:" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Acesse o Supabase Dashboard: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "2. Selecione seu projeto: yrxixhpnepuccpvungnc" -ForegroundColor White
Write-Host "3. Vá para: SQL Editor (ícone de código)" -ForegroundColor White
Write-Host "4. Clique em 'New Query'" -ForegroundColor White
Write-Host "5. Cole o SQL abaixo e execute (RUN):" -ForegroundColor White
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host $sqlContent -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Após executar, volte ao dashboard e recarregue a página" -ForegroundColor White
Write-Host "7. Os erros 404 devem desaparecer e os cards funcionarão" -ForegroundColor White
Write-Host ""
Write-Host "✅ Script concluído! Execute o SQL no Supabase Dashboard." -ForegroundColor Green

# Copiar SQL para clipboard se possível
try {
    $sqlContent | Set-Clipboard
    Write-Host "📋 SQL copiado para a área de transferência!" -ForegroundColor Yellow
} catch {
    Write-Host "⚠️ Não foi possível copiar para área de transferência" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 DIAGNÓSTICO DOS ERROS ATUAIS:" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta
Write-Host "❌ system_settings?key=eq.average_tire_cost → 404" -ForegroundColor Red
Write-Host "❌ system_settings?key=eq.average_tire_profit → 404" -ForegroundColor Red  
Write-Host "❌ system_settings?key=eq.average_resale_profit → 404" -ForegroundColor Red
Write-Host ""
Write-Host "✅ APÓS EXECUTAR O SQL:" -ForegroundColor Green
Write-Host "✅ Tabela system_settings será criada" -ForegroundColor Green
Write-Host "✅ 3 configurações serão inseridas com valores iniciais" -ForegroundColor Green
Write-Host "✅ RLS e políticas de segurança serão configuradas" -ForegroundColor Green
Write-Host "✅ Cards do dashboard funcionarão corretamente" -ForegroundColor Green
