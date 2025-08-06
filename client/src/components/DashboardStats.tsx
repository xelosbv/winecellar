import { Card, CardContent } from "@/components/ui/card";
import { Wine, Layers, Star, DollarSign, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Stats {
  totalWines: number;
  locations: number;
  premiumWines: number;
  totalValue: number;
  totalBottles: number;
}

interface DashboardStatsProps {
  cellarId: string;
}

export default function DashboardStats({ cellarId }: DashboardStatsProps) {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: [`/api/cellars/${cellarId}/stats`],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="ml-4 space-y-2">
                  <div className="w-20 h-4 bg-gray-200 rounded"></div>
                  <div className="w-16 h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">Failed to load statistics</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statItems = [
    {
      icon: Wine,
      label: "Different Wines",
      value: stats.totalWines,
      bgColor: "bg-wine/10",
      iconColor: "text-wine",
    },
    {
      icon: Package,
      label: "Total Bottles",
      value: stats.totalBottles || stats.totalWines,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      icon: Layers,
      label: "Cellar Locations",
      value: stats.locations,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-deep",
    },
    {
      icon: DollarSign,
      label: "Collection Value",
      value: `$${stats.totalValue.toLocaleString()}`,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {statItems.map((stat) => (
        <Card key={stat.label} className="shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`text-xl ${stat.iconColor}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
