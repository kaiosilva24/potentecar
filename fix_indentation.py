#!/usr/bin/env python3
# Script para corrigir indentação no SalesDashboard.tsx

file_path = r'C:\Users\kaiob\Downloads\sistemarec-1\sistemarec-1\src\components\sales\SalesDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Corrigir linhas 1177-1251 (índice 1176-1250)
for i in range(1176, 1251):
    if i < len(lines):
        # Adicionar 2 espaços no início da linha
        lines[i] = '  ' + lines[i]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("✅ Indentação corrigida com sucesso!")
