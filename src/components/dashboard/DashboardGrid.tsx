import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  BarChart2,
  Users,
  Clock,
  Settings,
  Palette,
  RotateCcw,
  Check,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/use-toast";

interface ProjectCardProps {
  title: string;
  progress: number;
  team: Array<{ name: string; avatar: string }>;
  dueDate: string;
}

interface DashboardGridProps {
  projects?: ProjectCardProps[];
  isLoading?: boolean;
}

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
  type: "totalProjects" | "teamMembers" | "upcomingDeadlines";
}

const defaultProjects: ProjectCardProps[] = [
  {
    title: "Website Redesign",
    progress: 75,
    team: [
      {
        name: "Alice",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
      },
      {
        name: "Bob",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
      },
      {
        name: "Charlie",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
      },
    ],
    dueDate: "2024-04-15",
  },
  {
    title: "Mobile App Development",
    progress: 45,
    team: [
      {
        name: "David",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
      },
      {
        name: "Eve",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eve",
      },
    ],
    dueDate: "2024-05-01",
  },
  {
    title: "Marketing Campaign",
    progress: 90,
    team: [
      {
        name: "Frank",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Frank",
      },
      {
        name: "Grace",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Grace",
      },
      {
        name: "Henry",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Henry",
      },
    ],
    dueDate: "2024-03-30",
  },
];

const ProjectCard = ({ title, progress, team, dueDate }: ProjectCardProps) => {
  return (
    <Card className="bg-factory-800/50 backdrop-blur-sm border border-tire-600/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-white">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-factory-700/50 flex items-center justify-center">
          <BarChart2 className="h-4 w-4 text-tire-300" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-tire-300">Progress</span>
              <span className="text-white">{progress}%</span>
            </div>
            <Progress
              value={progress}
              className="h-2 bg-factory-700/50 rounded-full"
              style={
                {
                  backgroundColor: "rgb(55, 65, 81, 0.5)",
                } as React.CSSProperties
              }
            />
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2 text-tire-300">
              <Clock className="h-4 w-4" />
              <span>Due {dueDate}</span>
            </div>
            <div className="flex -space-x-2">
              {team.map((member, i) => (
                <Avatar
                  key={i}
                  className="h-7 w-7 border-2 border-factory-800 shadow-sm"
                >
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback className="bg-neon-blue/20 text-neon-blue font-medium">
                    {member.name[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DashboardGrid = ({
  projects = defaultProjects,
  isLoading = false,
}: DashboardGridProps) => {
  const [loading, setLoading] = useState(isLoading);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [selectedCardForColor, setSelectedCardForColor] = useState<string>("");
  const [customColorValue, setCustomColorValue] = useState<string>("#3B82F6");
  const { toast } = useToast();

  // Color options for customization - matching StockDashboard
  const colorOptions = [
    {
      name: "Verde Neon",
      color: "text-neon-green",
      bgColor: "bg-factory-800/50",
      hex: "#10B981",
    },
    {
      name: "Azul Neon",
      color: "text-neon-blue",
      bgColor: "bg-factory-800/50",
      hex: "#3B82F6",
    },
    {
      name: "Roxo Neon",
      color: "text-neon-purple",
      bgColor: "bg-factory-800/50",
      hex: "#8B5CF6",
    },
    {
      name: "Laranja Neon",
      color: "text-neon-orange",
      bgColor: "bg-factory-800/50",
      hex: "#F59E0B",
    },
    {
      name: "Rosa Neon",
      color: "text-pink-400",
      bgColor: "bg-factory-800/50",
      hex: "#EC4899",
    },
    {
      name: "Vermelho",
      color: "text-red-400",
      bgColor: "bg-factory-800/50",
      hex: "#EF4444",
    },
    {
      name: "Amarelo",
      color: "text-yellow-400",
      bgColor: "bg-factory-800/50",
      hex: "#EAB308",
    },
    {
      name: "Ciano",
      color: "text-neon-cyan",
      bgColor: "bg-factory-800/50",
      hex: "#06B6D4",
    },
    {
      name: "Branco",
      color: "text-white",
      bgColor: "bg-factory-800/50",
      hex: "#FFFFFF",
    },
    {
      name: "Cinza",
      color: "text-gray-400",
      bgColor: "bg-factory-800/50",
      hex: "#6B7280",
    },
  ];

  // Default card configuration
  const defaultCards: MetricCard[] = [
    {
      id: "totalProjects",
      title: "Total Projects",
      value: projects.length,
      subtitle: "Active projects this month",
      icon: "📊",
      color: "text-neon-blue",
      bgColor: "bg-factory-800/50",
      type: "totalProjects",
    },
    {
      id: "teamMembers",
      title: "Team Members",
      value: 12,
      subtitle: "Active contributors",
      icon: "👥",
      color: "text-neon-purple",
      bgColor: "bg-factory-800/50",
      type: "teamMembers",
    },
    {
      id: "upcomingDeadlines",
      title: "Upcoming Deadlines",
      value: 5,
      subtitle: "Due this week",
      icon: "📅",
      color: "text-neon-orange",
      bgColor: "bg-factory-800/50",
      type: "upcomingDeadlines",
    },
  ];

  // State for card customization
  const [cards, setCards] = useState<MetricCard[]>(() => {
    const saved = localStorage.getItem("dashboardGrid_cardColors");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return defaultCards.map((defaultCard) => {
          const savedCard = parsed.find(
            (c: MetricCard) => c.id === defaultCard.id,
          );
          return savedCard ? { ...defaultCard, ...savedCard } : defaultCard;
        });
      } catch {
        return defaultCards;
      }
    }
    return defaultCards;
  });

  // Convert hex to Tailwind color class
  const hexToTailwindColor = (
    hex: string,
  ): { color: string; bgColor: string } => {
    const colorMap: { [key: string]: { color: string; bgColor: string } } = {
      "#10B981": { color: "text-neon-green", bgColor: "bg-factory-800/50" },
      "#3B82F6": { color: "text-neon-blue", bgColor: "bg-factory-800/50" },
      "#8B5CF6": { color: "text-neon-purple", bgColor: "bg-factory-800/50" },
      "#F59E0B": { color: "text-neon-orange", bgColor: "bg-factory-800/50" },
      "#EC4899": { color: "text-pink-400", bgColor: "bg-factory-800/50" },
      "#EF4444": { color: "text-red-400", bgColor: "bg-factory-800/50" },
      "#EAB308": { color: "text-yellow-400", bgColor: "bg-factory-800/50" },
      "#06B6D4": { color: "text-neon-cyan", bgColor: "bg-factory-800/50" },
      "#FFFFFF": { color: "text-white", bgColor: "bg-factory-800/50" },
      "#6B7280": { color: "text-gray-400", bgColor: "bg-factory-800/50" },
    };
    return (
      colorMap[hex.toUpperCase()] || {
        color: "text-neon-blue",
        bgColor: "bg-factory-800/50",
      }
    );
  };

  // Handle custom color change
  const handleCustomColorChange = (hex: string) => {
    setCustomColorValue(hex);
    if (selectedCardForColor) {
      const tailwindColors = hexToTailwindColor(hex);
      handleColorChange(
        selectedCardForColor,
        tailwindColors.color,
        tailwindColors.bgColor,
      );
    }
  };

  // Save to localStorage whenever cards change
  useEffect(() => {
    localStorage.setItem("dashboardGrid_cardColors", JSON.stringify(cards));
  }, [cards]);

  // Handle color change
  const handleColorChange = (
    cardId: string,
    color: string,
    bgColor: string,
  ) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, color, bgColor } : card,
      ),
    );

    toast({
      title: "Cor atualizada",
      description: "A cor do card foi alterada com sucesso.",
    });
  };

  // Reset to default
  const resetToDefault = () => {
    setCards(defaultCards);
    localStorage.removeItem("dashboardGrid_cardColors");
    toast({
      title: "Configurações resetadas",
      description: "Os cards foram restaurados para a configuração padrão.",
    });
  };

  // Simulate loading for demo purposes
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (loading) {
    return (
      <div className="p-6 h-full bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Card
              key={index}
              className="bg-factory-800/50 backdrop-blur-sm border border-tire-600/30 rounded-2xl shadow-sm h-[220px] flex items-center justify-center"
            >
              <div className="flex flex-col items-center justify-center p-6">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-tire-600/30 border-t-neon-blue animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-4 w-4 rounded-full bg-neon-blue/20 animate-pulse" />
                  </div>
                </div>
                <p className="mt-4 text-sm font-medium text-tire-300">
                  Loading project data...
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-6 h-full bg-factory-900/90 backdrop-blur-md rounded-2xl border border-tire-700/30">
        {/* Header with customization button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-blue to-neon-green flex items-center justify-center">
                <span className="text-white font-bold text-lg">📊</span>
              </div>
              Dashboard Principal
            </h2>
            <p className="text-tire-300 mt-2">
              Visão geral dos projetos e métricas
            </p>
          </div>
          <div className="flex items-center gap-2">


          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Summary Cards with customizable colors */}
          {cards.map((card) => (
            <Card
              key={card.id}
              className="bg-factory-800/50 backdrop-blur-sm border border-tire-600/30 rounded-2xl shadow-sm overflow-hidden"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium text-white">
                  {card.title}
                </CardTitle>
                <div
                  className={`h-8 w-8 rounded-full ${card.bgColor} flex items-center justify-center`}
                >
                  {card.type === "totalProjects" && (
                    <BarChart2 className={`h-4 w-4 ${card.color}`} />
                  )}
                  {card.type === "teamMembers" && (
                    <Users className={`h-4 w-4 ${card.color}`} />
                  )}
                  {card.type === "upcomingDeadlines" && (
                    <CalendarDays className={`h-4 w-4 ${card.color}`} />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-white">
                  {card.value}
                </div>
                <p className="text-sm text-tire-300 mt-1">{card.subtitle}</p>
              </CardContent>
            </Card>
          ))}

          {/* Project Cards */}
          {projects.map((project, index) => (
            <ProjectCard key={index} {...project} />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DashboardGrid;
