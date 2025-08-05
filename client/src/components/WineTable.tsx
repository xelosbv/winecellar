import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wine as WineType } from "@shared/schema";
import { Wine, Eye, Edit, Trash2, Filter, X, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import WineDetailsModal from "./WineDetailsModal";
import EditWineModal from "./EditWineModal";

const wineTypeColors = {
  red: "bg-red-100 text-red-800",
  white: "bg-yellow-100 text-yellow-800",
  rosé: "bg-pink-100 text-pink-800",
  champagne: "bg-purple-100 text-purple-800",
  sparkling: "bg-blue-100 text-blue-800",
};

interface WineTableProps {
  cellarId: string;
  locationFilter?: { column: string; layer: number } | null;
  onClearLocationFilter?: () => void;
}

export default function WineTable({ cellarId, locationFilter, onClearLocationFilter }: WineTableProps) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [selectedWineForView, setSelectedWineForView] = useState<WineType | null>(null);
  const [selectedWineForEdit, setSelectedWineForEdit] = useState<WineType | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wines = [], isLoading } = useQuery<WineType[]>({
    queryKey: [`/api/cellars/${cellarId}/wines`],
  });

  const deleteWineMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/cellars/${cellarId}/wines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${cellarId}/wines`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${cellarId}/stats`] });
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
    
    const matchesSearch = !searchQuery.trim() || 
      wine.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wine.producer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wine as any).countryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wine.year?.toString().includes(searchQuery);
    
    const matchesYear = yearFilter === "all" || wine.year?.toString() === yearFilter;
    
    const matchesCountry = countryFilter === "all" || (wine as any).countryName === countryFilter;
    
    return matchesType && matchesLocation && matchesSearch && matchesYear && matchesCountry;
  });

  // Get unique years and countries for filter options
  const uniqueYears = Array.from(new Set(wines.map(w => w.year).filter((year): year is number => year !== null && year !== undefined))).sort((a, b) => b - a);
  const uniqueCountries = Array.from(new Set(wines.map(w => (w as any).countryName).filter(Boolean))).sort();

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
        <div className="flex justify-between items-center mb-4">
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
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-wine/10 text-wine border-wine/30" : ""}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </div>
        
        {/* Filter Controls */}
        {showFilters && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-gray-400 w-4 h-4" />
              </div>
              <Input
                className="pl-10"
                placeholder="Search by name, producer, country, or year..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
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
              
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.map(year => (
                    <SelectItem key={year} value={year!.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {uniqueCountries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Active Filters Display */}
            {(searchQuery || typeFilter !== "all" || yearFilter !== "all" || countryFilter !== "all") && (
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-sm text-gray-500">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                    Search: "{searchQuery}"
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-blue-100"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {typeFilter !== "all" && (
                  <Badge variant="secondary" className="bg-green-50 text-green-700">
                    Type: {typeFilter}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-green-100"
                      onClick={() => setTypeFilter("all")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {yearFilter !== "all" && (
                  <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                    Year: {yearFilter}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-purple-100"
                      onClick={() => setYearFilter("all")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {countryFilter !== "all" && (
                  <Badge variant="secondary" className="bg-orange-50 text-orange-700">
                    Country: {countryFilter}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-orange-100"
                      onClick={() => setCountryFilter("all")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("all");
                    setYearFilter("all");
                    setCountryFilter("all");
                  }}
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <CardContent className="p-0">
        {filteredWines.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="flex flex-col items-center">
              <Wine className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No wines found</h3>
              <p className="text-gray-500">
                {typeFilter === "all" 
                  ? "Start building your collection by adding your first wine."
                  : `No ${typeFilter} wines found. Try a different filter.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredWines.map((wine) => (
              <div key={wine.id} className="p-4 hover:bg-gray-50 transition-colors">
                {/* Mobile Layout */}
                <div className="block md:hidden">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="w-10 h-10 bg-wine/10 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <Wine className="text-wine w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{wine.name}</div>
                        <div className="text-sm text-gray-500 truncate">{wine.producer}</div>
                      </div>
                    </div>
                    
                    {/* Mobile Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-wine hover:text-wine-light"
                        onClick={() => setSelectedWineForView(wine)}
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => setSelectedWineForEdit(wine)}
                        title="Edit wine"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-600"
                        onClick={() => handleDeleteWine(wine.id)}
                        disabled={deleteWineMutation.isPending}
                        title="Delete wine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Mobile Details */}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1">Type</div>
                      <Badge 
                        className={`${wineTypeColors[wine.type as keyof typeof wineTypeColors] || "bg-gray-100 text-gray-800"} text-xs`}
                      >
                        {wine.type?.charAt(0).toUpperCase() + wine.type?.slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1">Year</div>
                      <div className="text-gray-900 font-medium">{wine.year || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1">Location</div>
                      <div className="text-gray-900 font-medium">{wine.column}-{wine.layer}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1">Bottles</div>
                      <div className="text-gray-900 font-medium">
                        {wine.quantity || 1}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1">Value</div>
                      <div className="text-gray-900 font-medium">
                        {wine.price ? `$${parseFloat(wine.price).toLocaleString()}` : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-medium mb-1">Country</div>
                      <div className="text-gray-900 font-medium truncate">{(wine as any).countryName || "N/A"}</div>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:block">
                  <div className="flex items-center gap-6">
                    {/* Actions - moved to beginning */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-wine hover:text-wine-light"
                        onClick={() => setSelectedWineForView(wine)}
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="ml-2 hidden lg:inline">View</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => setSelectedWineForEdit(wine)}
                        title="Edit wine"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="ml-2 hidden lg:inline">Edit</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-600"
                        onClick={() => handleDeleteWine(wine.id)}
                        disabled={deleteWineMutation.isPending}
                        title="Delete wine"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="ml-2 hidden lg:inline">Delete</span>
                      </Button>
                    </div>

                    {/* Wine Info */}
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="w-10 h-10 bg-wine/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <Wine className="text-wine w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{wine.name}</div>
                        <div className="text-sm text-gray-500 truncate">{wine.producer}</div>
                      </div>
                    </div>

                    {/* Wine Details */}
                    <div className="flex items-center gap-6 text-sm flex-shrink-0">
                      <div className="text-center">
                        <div className="text-gray-500 text-xs font-medium mb-1">Type</div>
                        <Badge 
                          className={`${wineTypeColors[wine.type as keyof typeof wineTypeColors] || "bg-gray-100 text-gray-800"} text-xs`}
                        >
                          {wine.type?.charAt(0).toUpperCase() + wine.type?.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-gray-500 text-xs font-medium mb-1">Year</div>
                        <div className="text-gray-900 font-medium">{wine.year || "N/A"}</div>
                      </div>
                      
                      <div className="text-center hidden lg:block">
                        <div className="text-gray-500 text-xs font-medium mb-1">Country</div>
                        <div className="text-gray-900 font-medium">{(wine as any).countryName || "N/A"}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-gray-500 text-xs font-medium mb-1">Location</div>
                        <div className="text-gray-900 font-medium">{wine.column}-{wine.layer}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-gray-500 text-xs font-medium mb-1">Bottles</div>
                        <div className="text-gray-900 font-medium">
                          {wine.quantity || 1}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-gray-500 text-xs font-medium mb-1">Value</div>
                        <div className="text-gray-900 font-medium">
                          {wine.price ? `$${parseFloat(wine.price).toLocaleString()}` : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {filteredWines.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredWines.length}</span> of <span className="font-medium">{wines.length}</span> wines
            </div>
          </div>
        </div>
      )}

      {/* Wine Details Modal */}
      {selectedWineForView && (
        <WineDetailsModal
          wine={selectedWineForView}
          isOpen={!!selectedWineForView}
          onClose={() => setSelectedWineForView(null)}
        />
      )}

      {/* Edit Wine Modal */}
      {selectedWineForEdit && (
        <EditWineModal
          wine={selectedWineForEdit}
          isOpen={!!selectedWineForEdit}
          onClose={() => setSelectedWineForEdit(null)}
          onSuccess={() => {
            setSelectedWineForEdit(null);
            queryClient.invalidateQueries({ queryKey: ["/api/wines"] });
            queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
          }}
        />
      )}
    </Card>
  );
}
