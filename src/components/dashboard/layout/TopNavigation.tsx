import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bell, Home, Search, Settings, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../../supabase/auth";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../../ui/language-switcher";

interface TopNavigationProps {
  onSearch?: (query: string) => void;
  notifications?: Array<{ id: string; title: string }>;
}

const TopNavigation = ({
  onSearch = () => {},
  notifications = [
    { id: "1", title: "New project assigned" },
    { id: "2", title: "Meeting reminder" },
  ],
}: TopNavigationProps) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="w-full h-8 border-b border-tire-700/30 bg-factory-900/90 backdrop-blur-md flex items-center justify-end px-4 fixed top-0 z-50 shadow-lg glass-morphism">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-3 text-xs text-tire-300 hover:text-white hover:bg-tire-700/50 transition-colors"
        onClick={() => signOut()}
      >
        {t("topNav.logout", "Sair")}
      </Button>
    </div>
  );
};

export default TopNavigation;
