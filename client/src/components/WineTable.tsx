import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wine as WineType } from "@shared/schema";
import { Wine, Eye, Edit, Trash2, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const wineTypeColors = {
  red: "bg-red-100 text-red-800",
  white: "bg-yellow-100 text-yellow-800",
  rosé: "bg-pink-100 text-pink-800",
  champagne: "bg-purple-100 text-purple-800",
  sparkling: "bg-blue-100 text-blue-800",
};

interface WineTableProps {
  locationFilter?: { column: string; layer: number } | null;
  onClearLocationFilter?: () => void;
}

export default function WineTable({ locationFilter, onClearLocationFilter }: WineTableProps) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wines = [], isLoading } = useQuery<WineType[]>({
    queryKey: ["/api/wines"],
  });

  const deleteWineMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/wines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Wine deleted",
        description: "The wine has been removed from your collection.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete wine. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredWines = wines.filter(wine => {
    const matchesType = typeFilter === "all" || wine.type === typeFilter;
    const matchesLocation = !locationFilter || 
      (wine.column === locationFilter.column && wine.layer === locationFilter.layer);
    return matchesType && matchesLocation;
  });

  const handleDeleteWine = (id: string) => {
    if (confirm("Are you sure you want to delete this wine?")) {
      deleteWineMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="text-center">Loading wines...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Wine Collection</h2>
            {locationFilter && (
              <div className="flex items-center mt-2">
                <Badge variant="secondary" className="bg-wine/10 text-wine border border-wine/30">
                  Location: {locationFilter.column}-{locationFilter.layer}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-2 hover:bg-wine/20"
                    onClick={onClearLocationFilter}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="red">Red Wine</SelectItem>
                <SelectItem value="white">White Wine</SelectItem>
                <SelectItem value="champagne">Champagne</SelectItem>
                <SelectItem value="rosé">Rosé</SelectItem>
                <SelectItem value="sparkling">Sparkling</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wine</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bottles</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredWines.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center">
                  <div className="flex flex-col items-center">
                    <Wine className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No wines found</h3>
                    <p className="text-gray-500">
                      {typeFilter === "all" 
                        ? "Start building your collection by adding your first wine."
                        : `No ${typeFilter} wines found. Try a different filter.`}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredWines.map((wine) => (
                <tr key={wine.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-wine/10 rounded-lg flex items-center justify-center mr-4">
                        <Wine className="text-wine" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{wine.name}</div>
                        <div className="text-sm text-gray-500">{wine.producer}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      className={`${wineTypeColors[wine.type as keyof typeof wineTypeColors] || "bg-gray-100 text-gray-800"}`}
                    >
                      {wine.type?.charAt(0).toUpperCase() + wine.type?.slice(1)} Wine
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{wine.year || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(wine as any).countryName || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{wine.column}-{wine.layer}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="font-medium">{wine.quantity || 1}</span>
                      <span className="ml-1 text-gray-500">bottle{(wine.quantity || 1) !== 1 ? 's' : ''}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {wine.price ? `$${parseFloat(wine.price).toLocaleString()}` : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="text-wine hover:text-wine-light">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-600"
                        onClick={() => handleDeleteWine(wine.id)}
                        disabled={deleteWineMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {filteredWines.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredWines.length}</span> of <span className="font-medium">{wines.length}</span> wines
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
