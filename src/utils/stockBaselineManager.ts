/**
 * Stock Baseline Manager
 *
 * Gerencia o ajuste automático do baseline do lucro empresarial
 * quando há modificações manuais no estoque de matéria-prima e produtos de revenda.
 *
 * REGRA:
 * - ADICIONAR estoque → SOMAR valor ao baseline (entrou dinheiro/produto)
 * - REMOVER estoque → SUBTRAIR valor do baseline (saiu dinheiro/produto)
 */

import { dataManager } from "./dataManager";

export class StockBaselineManager {
  /**
   * Ajusta o baseline ao ADICIONAR estoque
   * @param quantity Quantidade adicionada
   * @param unitCost Custo unitário do item
   * @param itemName Nome do item (para logs)
   */
  static async adjustBaselineOnAdd(
    quantity: number,
    unitCost: number,
    itemName: string = "Item"
  ): Promise<boolean> {
    try {
      const valueAdded = quantity * unitCost;
      console.log(`💰 [StockBaselineManager] ADICIONANDO ao baseline:`, {
        item: itemName,
        quantity,
        unitCost,
        valueAdded: valueAdded.toFixed(2),
      });

      const currentBaseline = await dataManager.loadBusinessValueBaseline();

      if (currentBaseline === null) {
        console.log(
          `⚠️ [StockBaselineManager] Baseline não definido, ajuste não aplicado`
        );
        return false;
      }

      const newBaseline = currentBaseline + valueAdded;
      const success = await dataManager.saveBusinessValueBaseline(newBaseline);

      if (success) {
        console.log(`✅ [StockBaselineManager] Baseline atualizado!`, {
          previous: currentBaseline.toFixed(2),
          added: valueAdded.toFixed(2),
          new: newBaseline.toFixed(2),
        });
      }

      return success;
    } catch (error) {
      console.error(
        `❌ [StockBaselineManager] Erro ao adicionar ao baseline:`,
        error
      );
      return false;
    }
  }

  /**
   * Ajusta o baseline ao REMOVER estoque
   * @param quantity Quantidade removida
   * @param unitCost Custo unitário do item
   * @param itemName Nome do item (para logs)
   */
  static async adjustBaselineOnRemove(
    quantity: number,
    unitCost: number,
    itemName: string = "Item"
  ): Promise<boolean> {
    try {
      const valueRemoved = quantity * unitCost;
      console.log(`💰 [StockBaselineManager] SUBTRAINDO do baseline:`, {
        item: itemName,
        quantity,
        unitCost,
        valueRemoved: valueRemoved.toFixed(2),
      });

      const currentBaseline = await dataManager.loadBusinessValueBaseline();

      if (currentBaseline === null) {
        console.log(
          `⚠️ [StockBaselineManager] Baseline não definido, ajuste não aplicado`
        );
        return false;
      }

      const newBaseline = currentBaseline - valueRemoved;
      const success = await dataManager.saveBusinessValueBaseline(newBaseline);

      if (success) {
        console.log(`✅ [StockBaselineManager] Baseline atualizado!`, {
          previous: currentBaseline.toFixed(2),
          removed: valueRemoved.toFixed(2),
          new: newBaseline.toFixed(2),
        });
      }

      return success;
    } catch (error) {
      console.error(
        `❌ [StockBaselineManager] Erro ao subtrair do baseline:`,
        error
      );
      return false;
    }
  }

  /**
   * Verifica se o baseline está definido
   */
  static async isBaselineDefined(): Promise<boolean> {
    try {
      const baseline = await dataManager.loadBusinessValueBaseline();
      return baseline !== null;
    } catch (error) {
      console.error(
        `❌ [StockBaselineManager] Erro ao verificar baseline:`,
        error
      );
      return false;
    }
  }

  /**
   * Obtém informações do baseline atual
   */
  static async getBaselineInfo(): Promise<{
    baseline: number | null;
    isDefined: boolean;
  }> {
    try {
      const baseline = await dataManager.loadBusinessValueBaseline();
      return {
        baseline,
        isDefined: baseline !== null,
      };
    } catch (error) {
      console.error(
        `❌ [StockBaselineManager] Erro ao obter info do baseline:`,
        error
      );
      return {
        baseline: null,
        isDefined: false,
      };
    }
  }
}
