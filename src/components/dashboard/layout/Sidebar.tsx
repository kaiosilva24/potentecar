import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Home,
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  HelpCircle,
  FolderKanban,
  ShoppingCart,
  Bug,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  LogOut,
} from "lucide-react";
import potentCarLogo from "../../../assets/potente-car.png";
import { useLowStockNotifications } from "../../../hooks/useLowStockNotifications";
import { LowStockTooltip } from "../../ui/LowStockTooltip";
import { useOverdueDebtsNotifications } from "../../../hooks/useOverdueDebtsNotifications";
import { OverdueDebtsTooltip } from "../../ui/OverdueDebtsTooltip";
import { useCreditSalesNotifications } from "../../../hooks/useCreditSalesNotifications";
import { useAuth } from "../../../../supabase/auth";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  isActive?: boolean;
}

interface SidebarProps {
  items?: NavItem[];
  activeItem?: string;
  onItemClick?: (label: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const defaultNavItems: NavItem[] = [
  { icon: <LayoutDashboard size={20} />, label: "Dashboard", isActive: true },
  { icon: <DollarSign size={20} />, label: "Financeiro" },
  { icon: <FolderKanban size={20} />, label: "Estoque" },
  { icon: <Calendar size={20} />, label: "Produção" },
  { icon: <ShoppingCart size={20} />, label: "Vendas" },
  { icon: <Users size={20} />, label: "Cadastros" },
];

const defaultBottomItems: NavItem[] = [
  { icon: <Settings size={20} />, label: "Settings" },
  { icon: <LogOut size={20} />, label: "Logout" },
];

const Sidebar = ({
  items = defaultNavItems,
  activeItem = "Home",
  onItemClick = () => {},
  isCollapsed = false,
  onToggleCollapse = () => {},
}: SidebarProps) => {
  // Auth hook for logout functionality
  const { signOut } = useAuth();
  
  // Low stock notifications hook
  const { lowStockItems, lowStockCount, isLoading } = useLowStockNotifications();
  
  // Overdue debts notifications hook
  const { overdueDebts, overdueCount, isLoading: debtsLoading } = useOverdueDebtsNotifications();
  
  // Credit sales notifications hook
  const { totalCreditValue, creditCount, isLoading: creditLoading } = useCreditSalesNotifications();
  
  // Tooltip state for low stock
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipPinned, setTooltipPinned] = useState(false);
  
  // Tooltip state for overdue debts
  const [debtsTooltipVisible, setDebtsTooltipVisible] = useState(false);
  const [debtsTooltipPosition, setDebtsTooltipPosition] = useState({ x: 0, y: 0 });

  const handleLowStockMouseEnter = (event: React.MouseEvent) => {
    // Don't show on hover if tooltip is pinned
    if (tooltipPinned) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Smart positioning: place tooltip to the left if there's space, otherwise to the right
    const spaceOnRight = window.innerWidth - rect.right;
    const spaceOnLeft = rect.left;
    const tooltipWidth = 300;
    
    let x, y;
    
    if (spaceOnRight >= tooltipWidth + 20) {
      // Place to the right
      x = rect.right + 10;
    } else if (spaceOnLeft >= tooltipWidth + 20) {
      // Place to the left
      x = rect.left - tooltipWidth - 10;
    } else {
      // Place above or below if no horizontal space
      x = Math.max(10, Math.min(rect.left, window.innerWidth - tooltipWidth - 10));
    }
    
    // Always place above the button to avoid blocking content below
    y = rect.top - 20;
    
    const position = { x, y };
    setTooltipPosition(position);
    setTooltipVisible(true);
  };

  const handleLowStockMouseLeave = () => {
    // Don't hide on mouse leave if tooltip is pinned
    if (tooltipPinned) return;
    setTooltipVisible(false);
  };

  const handleLowStockClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Smart positioning: place tooltip to the left if there's space, otherwise to the right
    const spaceOnRight = window.innerWidth - rect.right;
    const spaceOnLeft = rect.left;
    const tooltipWidth = 300;
    
    let x, y;
    
    if (spaceOnRight >= tooltipWidth + 20) {
      // Place to the right
      x = rect.right + 10;
    } else if (spaceOnLeft >= tooltipWidth + 20) {
      // Place to the left
      x = rect.left - tooltipWidth - 10;
    } else {
      // Place above or below if no horizontal space
      x = Math.max(10, Math.min(rect.left, window.innerWidth - tooltipWidth - 10));
    }
    
    // Always place above the button to avoid blocking content below
    y = rect.top - 20;
    
    const position = { x, y };
    setTooltipPosition(position);
    
    // Toggle pinned state and visibility
    if (tooltipPinned && tooltipVisible) {
      setTooltipPinned(false);
      setTooltipVisible(false);
    } else {
      setTooltipPinned(true);
      setTooltipVisible(true);
    }
  };

  const handleOverdueDebtsClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (debtsTooltipVisible) {
      setDebtsTooltipVisible(false);
      return;
    }
    
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Smart positioning: place tooltip to the left if there's space, otherwise to the right
    const spaceOnRight = window.innerWidth - rect.right;
    const spaceOnLeft = rect.left;
    const tooltipWidth = 300;
    
    let x, y;
    
    if (spaceOnRight >= tooltipWidth + 20) {
      // Place to the right
      x = rect.right + 10;
    } else if (spaceOnLeft >= tooltipWidth + 20) {
      // Place to the left
      x = rect.left - tooltipWidth - 10;
    } else {
      // Place above or below if no horizontal space
      x = Math.max(10, Math.min(rect.left, window.innerWidth - tooltipWidth - 10));
    }
    
    // Always place above the button to avoid blocking content below
    y = rect.top - 20;
    
    const position = { x, y };
    setDebtsTooltipPosition(position);
    setDebtsTooltipVisible(true);
  };

  // Handle click outside to close tooltips
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (debtsTooltipVisible) {
        setDebtsTooltipVisible(false);
      }
      if (tooltipPinned && tooltipVisible) {
        setTooltipPinned(false);
        setTooltipVisible(false);
      }
    };

    if (debtsTooltipVisible || (tooltipPinned && tooltipVisible)) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [debtsTooltipVisible, tooltipPinned, tooltipVisible]);

  return (
    <div className={`${isCollapsed ? 'w-[60px]' : 'w-[280px]'} h-screen bg-factory-900/90 backdrop-blur-md border-r border-tire-700/30 flex flex-col glass-morphism transition-all duration-300 relative overflow-visible`}>
      {/* Botão de Toggle */}
      <Button
        onClick={onToggleCollapse}
        variant="ghost"
        size="sm"
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full bg-factory-800 border border-tire-600/30 hover:bg-factory-700 p-0"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-tire-300" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-tire-300" />
        )}
      </Button>

      <div className={`${isCollapsed ? 'p-2' : 'pt-6 px-6 pb-2'} flex flex-col items-center`}>
        {!isCollapsed && (
          <>
            <img 
              src={potentCarLogo} 
              alt="Potente Car" 
              className="h-16 w-auto object-contain mb-2"
            />
            <p className="text-sm text-tire-400 text-center">Sistema de Gestão Financeira</p>
          </>
        )}
      </div>

      <ScrollArea className="flex-1 px-0.5 pt-6 max-h-[calc(100vh-200px)]">
        <div className="space-y-1.5 px-0.5 pt-6 pb-4 flex flex-col items-center justify-center min-h-full">
          {items.map((item) => (
            <Button
              key={item.label}
              variant={"ghost"}
              className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start gap-3'} h-10 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out hover:scale-[1.01] active:scale-[0.99] focus:ring-2 focus:ring-offset-1 focus:outline-none mx-0 my-1 ${item.label === activeItem ? "bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 text-neon-blue hover:from-neon-blue/30 hover:to-neon-purple/30 neon-glow focus:ring-neon-blue/50" : "text-tire-300 hover:bg-tire-800/50 hover:text-white focus:ring-tire-500/50"}`}
              onClick={() => onItemClick(item.label)}
              title={isCollapsed ? item.label : undefined}
            >
              <span
                className={`${item.label === activeItem ? "text-neon-blue" : "text-tire-400"}`}
              >
                {item.icon}
              </span>
              {!isCollapsed && item.label}
            </Button>
          ))}
        </div>

        <Separator className="my-4 bg-tire-700/50" />

        {!isCollapsed && (
          <div className="space-y-3 px-2">
            <h3 className="text-xs font-medium px-4 py-1 text-tire-500 uppercase tracking-wider">
              Notificações
            </h3>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-8 rounded-xl text-sm font-medium text-tire-300 hover:bg-tire-800/50 hover:text-white hover:scale-[1.01] active:scale-[0.99] focus:ring-2 focus:ring-neon-blue/50 focus:ring-offset-1 focus:outline-none transition-all duration-200 ease-in-out relative mx-0 my-1"
              onMouseEnter={handleLowStockMouseEnter}
              onMouseLeave={handleLowStockMouseLeave}
              onClick={handleLowStockClick}
              disabled={isLoading}
            >
              <span className={`h-2 w-2 rounded-full ${lowStockCount > 0 ? 'bg-red-400 animate-pulse' : 'bg-tire-600'}`}></span>
              {isLoading ? (
                "Verificando..."
              ) : (
                `Estoque Baixo (${lowStockCount})`
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-8 rounded-xl text-sm font-medium text-tire-300 hover:bg-tire-800/50 hover:text-white hover:scale-[1.01] active:scale-[0.99] focus:ring-2 focus:ring-red-500/50 focus:ring-offset-1 focus:outline-none transition-all duration-200 ease-in-out relative mx-0 my-1"
              onClick={handleOverdueDebtsClick}
              disabled={debtsLoading}
            >
              <span className={`h-2 w-2 rounded-full ${overdueCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-tire-600'}`}></span>
              {debtsLoading ? (
                "Verificando..."
              ) : (
                `Dívidas Vencidas (${overdueCount})`
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-8 rounded-xl text-sm font-medium text-tire-300 hover:bg-tire-800/50 hover:text-white hover:scale-[1.01] active:scale-[0.99] focus:ring-2 focus:ring-neon-green/50 focus:ring-offset-1 focus:outline-none transition-all duration-200 ease-in-out mx-0 my-1"
            >
              <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse"></span>
              {creditLoading ? (
                "A Receber: Carregando..."
              ) : (
                `A Receber: R$ ${totalCreditValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </Button>
          </div>
        )}
      </ScrollArea>

      <div className={`${isCollapsed ? 'p-2' : 'p-2'} mt-auto border-t border-tire-700/30`}>
        {defaultBottomItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            className={`w-full ${isCollapsed ? 'justify-center px-0' : 'justify-start gap-3'} h-10 rounded-xl text-sm font-medium text-tire-300 hover:bg-tire-800/50 hover:text-white hover:scale-[1.01] active:scale-[0.99] focus:ring-2 focus:ring-tire-500/50 focus:ring-offset-1 focus:outline-none mb-1.5 transition-all duration-200 ease-in-out mx-0 my-1`}
            onClick={() => item.label === "Logout" ? signOut() : onItemClick(item.label)}
            title={isCollapsed ? (item.label === "Settings" ? "Configurações" : item.label === "Logout" ? "Sair" : item.label) : undefined}
          >
            <span className="text-tire-400">{item.icon}</span>
            {!isCollapsed && (item.label === "Settings" ? "Configurações" : item.label === "Logout" ? "Sair" : item.label)}
          </Button>
        ))}
      </div>

      {/* Low Stock Tooltip - Rendered outside sidebar via portal */}
      <LowStockTooltip
        lowStockItems={lowStockItems}
        isVisible={tooltipVisible}
        position={tooltipPosition}
        isPinned={tooltipPinned}
      />
      
      {/* Overdue Debts Tooltip - Rendered outside sidebar via portal */}
      <OverdueDebtsTooltip
        overdueDebts={overdueDebts}
        isVisible={debtsTooltipVisible}
        position={debtsTooltipPosition}
      />
    </div>
  );
};

export default Sidebar;