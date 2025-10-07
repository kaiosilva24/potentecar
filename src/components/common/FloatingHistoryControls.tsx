import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Undo2,
  Redo2,
  History,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useChangeHistoryStatus } from "../../hooks/useChangeHistory";
import { changeHistoryManager } from "../../utils/changeHistoryManager";
import { useToast } from "@/components/ui/use-toast";

interface FloatingHistoryControlsProps {
  onRefresh?: () => void;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  className?: string;
}

const FloatingHistoryControls: React.FC<FloatingHistoryControlsProps> = ({
  onRefresh,
  position = "bottom-right",
  className = "",
}) => {
  const { toast } = useToast();
  const { canUndo, canRedo, totalEntries, updateStatus } =
    useChangeHistoryStatus();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isRedoing, setIsRedoing] = useState(false);

  // Posicionamento baseado na prop
  const getPositionClasses = () => {
    switch (position) {
      case "bottom-left":
        return "bottom-6 left-6";
      case "top-right":
        return "top-6 right-6";
      case "top-left":
        return "top-6 left-6";
      case "bottom-right":
      default:
        return "bottom-6 right-6";
    }
  };

  // Desfazer alteração
  const handleUndo = async () => {
    if (!canUndo) {
      toast({
        title: "Não é possível desfazer",
        description: "Não há alterações para desfazer.",
        variant: "destructive",
      });
      return;
    }

    setIsUndoing(true);
    try {
      const success = await changeHistoryManager.undo();

      if (success) {
        toast({
          title: "Alteração desfeita",
          description: "A última alteração foi desfeita com sucesso.",
        });

        updateStatus();
        onRefresh?.();
      } else {
        toast({
          title: "Erro ao desfazer",
          description: "Não foi possível desfazer a alteração.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ [FloatingHistoryControls] Erro ao desfazer:", error);
      toast({
        title: "Erro ao desfazer",
        description: "Ocorreu um erro ao desfazer a alteração.",
        variant: "destructive",
      });
    } finally {
      setIsUndoing(false);
    }
  };

  // Refazer alteração
  const handleRedo = async () => {
    if (!canRedo) {
      toast({
        title: "Não é possível refazer",
        description: "Não há alterações para refazer.",
        variant: "destructive",
      });
      return;
    }

    setIsRedoing(true);
    try {
      const success = await changeHistoryManager.redo();

      if (success) {
        toast({
          title: "Alteração refeita",
          description: "A alteração foi refeita com sucesso.",
        });

        updateStatus();
        onRefresh?.();
      } else {
        toast({
          title: "Erro ao refazer",
          description: "Não foi possível refazer a alteração.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ [FloatingHistoryControls] Erro ao refazer:", error);
      toast({
        title: "Erro ao refazer",
        description: "Ocorreu um erro ao refazer a alteração.",
        variant: "destructive",
      });
    } finally {
      setIsRedoing(false);
    }
  };

  // Se não há entradas no histórico, não mostrar os controles
  if (totalEntries === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={`fixed ${getPositionClasses()} z-50 ${className}`}>
        <div className="flex flex-col items-end space-y-2">
          {/* Controles expandidos */}
          {isExpanded && (
            <div className="flex flex-col space-y-2 mb-2">
              {/* Botão Desfazer */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleUndo}
                    disabled={!canUndo || isUndoing}
                    size="sm"
                    className={`w-12 h-12 rounded-full shadow-lg transition-all duration-200 ${
                      canUndo
                        ? "bg-neon-blue hover:bg-neon-blue/80 text-black"
                        : "bg-tire-600 text-tire-400 cursor-not-allowed"
                    }`}
                  >
                    {isUndoing ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <Undo2 className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>
                    {canUndo
                      ? "Desfazer última alteração"
                      : "Nenhuma alteração para desfazer"}
                  </p>
                </TooltipContent>
              </Tooltip>

              {/* Botão Refazer */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleRedo}
                    disabled={!canRedo || isRedoing}
                    size="sm"
                    className={`w-12 h-12 rounded-full shadow-lg transition-all duration-200 ${
                      canRedo
                        ? "bg-neon-green hover:bg-neon-green/80 text-black"
                        : "bg-tire-600 text-tire-400 cursor-not-allowed"
                    }`}
                  >
                    {isRedoing ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <Redo2 className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>
                    {canRedo
                      ? "Refazer próxima alteração"
                      : "Nenhuma alteração para refazer"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Botão principal de histórico */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                size="sm"
                className="w-14 h-14 rounded-full bg-neon-purple hover:bg-neon-purple/80 text-white shadow-lg transition-all duration-200 relative"
              >
                <div className="flex flex-col items-center">
                  <History className="h-5 w-5" />
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 mt-1" />
                  ) : (
                    <ChevronUp className="h-3 w-3 mt-1" />
                  )}
                </div>

                {/* Badge com número de alterações */}
                {totalEntries > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {totalEntries > 99 ? "99+" : totalEntries}
                  </div>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <div className="text-sm">
                <p className="font-medium">Histórico de Alterações</p>
                <p className="text-xs text-gray-400">
                  {totalEntries} alterações registradas
                </p>
                <p className="text-xs text-gray-400">
                  Clique para {isExpanded ? "recolher" : "expandir"} controles
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default FloatingHistoryControls;
