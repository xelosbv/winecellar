import { useState } from "react";
import Header from "@/components/Header";
import DashboardStats from "@/components/DashboardStats";
import CellarVisualization from "@/components/CellarVisualization";
import WineTable from "@/components/WineTable";
import AddWineModal from "@/components/AddWineModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wine, Search, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Wine as WineType } from "@shared/schema";
import { Link } from "wouter";

export default function Dashboard() {
  const [isAddWineModalOpen, setIsAddWineModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: wines = [] } = useQuery<WineType[]>({
    queryKey: ["/api/wines"],
  });

  const { data: searchResults = [] } = useQuery<WineType[]>({
    queryKey: ["/api/wines/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/wines/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: searchQuery.trim().length > 0,
  });

  const recentWines = wines.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAddWine={() => setIsAddWineModalOpen(true)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardStats />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <CellarVisualization />
          
          {/* Quick Actions Sidebar */}
          <div className="space-y-6">
            {/* Quick Wine Search */}
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Wine Search</h3>
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="text-gray-400 w-4 h-4" />
                  </div>
                  <Input
                    className="pl-10"
                    placeholder="Search by name, year, or producer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                {/* Search Results */}
                {searchQuery.trim() && searchResults.length > 0 && (
                  <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
                    {searchResults.slice(0, 5).map((wine) => (
                      <div key={wine.id} className="flex items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="w-8 h-8 bg-wine/10 rounded-lg flex items-center justify-center mr-3">
                          <Wine className="text-wine w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{wine.name}</p>
                          <p className="text-xs text-gray-500">{wine.producer} • {wine.column}-{wine.layer}</p>
                        </div>
                      </div>
                    ))}
                    {searchResults.length > 5 && (
                      <Link href="/wines">
                        <div className="text-center p-2 text-sm text-wine hover:text-wine-light cursor-pointer">
                          View all {searchResults.length} results →
                        </div>
                      </Link>
                    )}
                  </div>
                )}

                {/* No results message */}
                {searchQuery.trim() && searchResults.length === 0 && (
                  <div className="mb-4 p-3 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">
                    No wines found matching "{searchQuery}"
                  </div>
                )}
                
                <Button 
                  className="w-full bg-wine text-white hover:bg-wine-light"
                  onClick={() => setIsAddWineModalOpen(true)}
                >
                  <Wine className="w-4 h-4 mr-2" />
                  Add New Wine
                </Button>
              </CardContent>
            </Card>
            
            {/* Recent Additions */}
            <Card className="shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Additions</h3>
                <div className="space-y-3">
                  {recentWines.length === 0 ? (
                    <div className="text-center py-4">
                      <Wine className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No wines added yet</p>
                    </div>
                  ) : (
                    recentWines.map((wine) => (
                      <div key={wine.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-wine/10 rounded-lg flex items-center justify-center mr-3">
                          <Wine className="text-wine" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{wine.name}</p>
                          <p className="text-xs text-gray-500">Column {wine.column}, Layer {wine.layer}</p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {wine.createdAt && new Date(wine.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {wines.length > 3 && (
                  <Button variant="ghost" className="w-full mt-4 text-wine hover:text-wine-light">
                    View All Wines <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Wine Collection Table */}
        <div className="mt-8">
          <WineTable />
        </div>
      </main>

      <AddWineModal 
        isOpen={isAddWineModalOpen} 
        onClose={() => setIsAddWineModalOpen(false)} 
      />
    </div>
  );
}
