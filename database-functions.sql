-- =====================================================
-- FUNÇÕES DO BANCO PARA MÉTRICAS EM TEMPO REAL
-- =====================================================

-- Função para calcular saldo em caixa
CREATE OR REPLACE FUNCTION get_saldo_caixa()
RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(
      CASE 
        WHEN tipo = 'entrada' THEN valor 
        WHEN tipo = 'saida' THEN -valor 
        ELSE 0 
      END
    ), 0)
    FROM movimentos_caixa
    WHERE DATE(created_at) = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql;

-- Função para calcular total em estoque
CREATE OR REPLACE FUNCTION get_total_estoque()
RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(quantidade * preco_custo), 0)
    FROM produtos
    WHERE ativo = true
  );
END;
$$ LANGUAGE plpgsql;

-- Função para vendas do dia
CREATE OR REPLACE FUNCTION get_vendas_dia()
RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(total), 0)
    FROM vendas
    WHERE DATE(created_at) = CURRENT_DATE
    AND status = 'finalizada'
  );
END;
$$ LANGUAGE plpgsql;

-- Função para vendas do mês
CREATE OR REPLACE FUNCTION get_vendas_mes()
RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(total), 0)
    FROM vendas
    WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND status = 'finalizada'
  );
END;
$$ LANGUAGE plpgsql;

-- Função para contas a receber
CREATE OR REPLACE FUNCTION get_contas_receber()
RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(valor), 0)
    FROM contas_receber
    WHERE status = 'pendente'
    AND vencimento >= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql;

-- Função para contas a pagar
CREATE OR REPLACE FUNCTION get_contas_pagar()
RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(valor), 0)
    FROM contas_pagar
    WHERE status = 'pendente'
    AND vencimento >= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql;

-- Função para produtos em baixo estoque
CREATE OR REPLACE FUNCTION get_produtos_baixo_estoque()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM produtos
    WHERE quantidade <= estoque_minimo
    AND ativo = true
  );
END;
$$ LANGUAGE plpgsql;

-- Função para clientes ativos
CREATE OR REPLACE FUNCTION get_clientes_ativos()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT cliente_id)
    FROM vendas
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND status = 'finalizada'
  );
END;
$$ LANGUAGE plpgsql;

-- Função para ticket médio
CREATE OR REPLACE FUNCTION get_ticket_medio()
RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(total), 0)
    FROM vendas
    WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND status = 'finalizada'
  );
END;
$$ LANGUAGE plpgsql;

-- Função para margem de lucro
CREATE OR REPLACE FUNCTION get_margem_lucro()
RETURNS DECIMAL AS $$
DECLARE
  receita DECIMAL;
  custo DECIMAL;
BEGIN
  SELECT COALESCE(SUM(total), 0) INTO receita
  FROM vendas
  WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND status = 'finalizada';
  
  SELECT COALESCE(SUM(vi.quantidade * p.preco_custo), 0) INTO custo
  FROM vendas v
  JOIN venda_itens vi ON v.id = vi.venda_id
  JOIN produtos p ON vi.produto_id = p.id
  WHERE EXTRACT(MONTH FROM v.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM v.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND v.status = 'finalizada';
  
  IF receita > 0 THEN
    RETURN ((receita - custo) / receita) * 100;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO EM TEMPO REAL
-- =====================================================

-- Trigger para notificar mudanças em vendas
CREATE OR REPLACE FUNCTION notify_metrics_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('metrics_update', json_build_object(
    'table', TG_TABLE_NAME,
    'action', TG_OP,
    'timestamp', NOW()
  )::text);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers nas tabelas principais
DROP TRIGGER IF EXISTS vendas_metrics_trigger ON vendas;
CREATE TRIGGER vendas_metrics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON vendas
  FOR EACH ROW EXECUTE FUNCTION notify_metrics_change();

DROP TRIGGER IF EXISTS produtos_metrics_trigger ON produtos;
CREATE TRIGGER produtos_metrics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON produtos
  FOR EACH ROW EXECUTE FUNCTION notify_metrics_change();

DROP TRIGGER IF EXISTS movimentos_caixa_metrics_trigger ON movimentos_caixa;
CREATE TRIGGER movimentos_caixa_metrics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON movimentos_caixa
  FOR EACH ROW EXECUTE FUNCTION notify_metrics_change();

-- =====================================================
-- VIEWS PARA HISTÓRICO DE MÉTRICAS
-- =====================================================

-- View para histórico de vendas diárias
CREATE OR REPLACE VIEW vendas_historico AS
SELECT 
  DATE(created_at) as data,
  SUM(total) as valor,
  COUNT(*) as quantidade,
  'vendas' as tipo_metrica
FROM vendas
WHERE status = 'finalizada'
GROUP BY DATE(created_at)
ORDER BY data DESC;

-- View para histórico de movimentação de caixa
CREATE OR REPLACE VIEW caixa_historico AS
SELECT 
  DATE(created_at) as data,
  SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END) as valor,
  'caixa' as tipo_metrica
FROM movimentos_caixa
GROUP BY DATE(created_at)
ORDER BY data DESC;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para otimizar consultas de métricas
CREATE INDEX IF NOT EXISTS idx_vendas_data_status ON vendas(created_at, status);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo_estoque ON produtos(ativo, quantidade, estoque_minimo);
CREATE INDEX IF NOT EXISTS idx_movimentos_caixa_data_tipo ON movimentos_caixa(created_at, tipo);
CREATE INDEX IF NOT EXISTS idx_contas_receber_status_vencimento ON contas_receber(status, vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_status_vencimento ON contas_pagar(status, vencimento);
