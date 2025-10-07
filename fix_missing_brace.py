#!/usr/bin/env python3
# Script para adicionar chave de fechamento faltante

file_path = r'C:\Users\kaiob\Downloads\sistemarec-1\sistemarec-1\src\components\sales\SalesDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Adicionar } antes da linha 1252 (índice 1251)
# A linha 1252 atualmente é: "        }"
# Precisamos adicionar "          }" antes dela para fechar o if (isRawMaterialMode)

lines.insert(1251, '          }\n')

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("✅ Chave de fechamento adicionada com sucesso!")
