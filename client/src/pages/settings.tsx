import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Country, InsertCountry, CellarSection, Cellar } from "@shared/schema";
import { Plus, Edit, Trash2, Layout, Globe, ToggleLeft, ToggleRight, Home, Wine, Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useLocation, Link } from "wouter";

const insertCountrySchema = z.object({
  name: z.string().min(1, "Country name is required"),
});

type SettingsTab = "countries" | "cellar";

export default function Settings() {
  const { cellarId } = useParams();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<SettingsTab>("countries");

  // Handle URL query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const tabParam = urlParams.get('tab');
    if (tabParam === 'cellar') {
      setActiveTab('cellar');
    }
  }, [location]);
  const [newCountryName, setNewCountryName] = useState("");
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editName, setEditName] = useState("");
  const [columnCount, setColumnCount] = useState(5);
  const [rowCount, setRowCount] = useState(4);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: countries = [], isLoading: countriesLoading } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
  });

  const { data: cellar } = useQuery<Cellar>({
    queryKey: [`/api/cellars/${cellarId}`],
    enabled: !!cellarId,
  });

  const { data: cellarSections = [], isLoading: sectionsLoading } = useQuery<CellarSection[]>({
    queryKey: [`/api/cellars/${cellarId}/sections`],
    enabled: !!cellarId,
  });

  // Update local state when cellar data loads
  useEffect(() => {
    if (cellar) {
      setColumnCount(cellar.columnCount || 5);
      setRowCount(cellar.rowCount || 4);
    }
  }, [cellar]);

  const createCountryMutation = useMutation({
    mutationFn: async (countryData: InsertCountry) => {
      return await apiRequest("POST", "/api/countries", countryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      setNewCountryName("");
      toast({
        title: "Country added",
        description: "The country has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add country. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCountryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCountry> }) => {
      return await apiRequest("PUT", `/api/countries/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      setEditingCountry(null);
      setEditName("");
      toast({
        title: "Country updated",
        description: "The country has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update country. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCountryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/countries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      toast({
        title: "Country deleted",
        description: "The country has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete country. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { isEnabled: string } }) => {
      return await apiRequest("PUT", `/api/cellar/sections/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${cellarId}/sections`] });
      toast({
        title: "Section updated",
        description: "The cellar section has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update section. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateLayoutMutation = useMutation({
    mutationFn: async ({ columnCount, rowCount }: { columnCount: number; rowCount: number }) => {
      return await apiRequest("POST", `/api/cellars/${cellarId}/layout`, { columnCount, rowCount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${cellarId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${cellarId}/sections`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${cellarId}/columns`] });
      toast({
        title: "Layout updated",
        description: "Your cellar layout has been updated successfully. You may need to update wine positions.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cellar layout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddCountry = () => {
    try {
      const validatedData = insertCountrySchema.parse({ name: newCountryName });
      createCountryMutation.mutate(validatedData);
    } catch (error) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid country name.",
        variant: "destructive",
      });
    }
  };

  const handleEditCountry = (country: Country) => {
    setEditingCountry(country);
    setEditName(country.name);
  };

  const handleUpdateCountry = () => {
    if (!editingCountry) return;
    
    try {
      const validatedData = insertCountrySchema.parse({ name: editName });
      updateCountryMutation.mutate({ 
        id: editingCountry.id, 
        data: validatedData 
      });
    } catch (error) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid country name.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCountry = (id: string) => {
    if (confirm("Are you sure you want to delete this country?")) {
      deleteCountryMutation.mutate(id);
    }
  };

  const handleToggleSection = (section: CellarSection) => {
    const newEnabled = section.isEnabled === "true" ? "false" : "true";
    updateSectionMutation.mutate({
      id: section.id,
      data: { isEnabled: newEnabled }
    });
  };

  const handleUpdateLayout = () => {
    if (columnCount < 1 || columnCount > 26 || rowCount < 1) {
      toast({
        title: "Invalid configuration",
        description: "Columns must be between 1-26, rows must be at least 1.",
        variant: "destructive",
      });
      return;
    }

    updateLayoutMutation.mutate({ columnCount, rowCount });
  };

  const renderLayoutConfiguration = () => (
    <Card className="shadow-sm border border-gray-200 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Layout className="w-5 h-5 mr-2" />
          Layout Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-4">
            Customize your cellar dimensions to match your physical setup. Columns are labeled A-Z, rows are numbered 1 to your specified count.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="column-count" className="text-sm font-medium">
              Number of Columns (1-26)
            </Label>
            <Input
              id="column-count"
              type="number"
              min="1"
              max="26"
              value={columnCount}
              onChange={(e) => setColumnCount(parseInt(e.target.value) || 1)}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {Array.from({ length: columnCount }, (_, i) => String.fromCharCode(65 + i)).join(', ')}
            </p>
          </div>
          
          <div>
            <Label htmlFor="row-count" className="text-sm font-medium">
              Number of Rows/Layers
            </Label>
            <Input
              id="row-count"
              type="number"
              min="1"
              value={rowCount}
              onChange={(e) => setRowCount(parseInt(e.target.value) || 1)}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Rows: 1 (top) to {rowCount} (bottom)
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleUpdateLayout}
            disabled={updateLayoutMutation.isPending}
            className="bg-wine text-white hover:bg-wine-light"
          >
            {updateLayoutMutation.isPending ? "Updating..." : "Update Layout"}
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              setColumnCount(cellar?.columnCount || 5);
              setRowCount(cellar?.rowCount || 4);
            }}
          >
            Reset
          </Button>
        </div>
        
        {(columnCount !== (cellar?.columnCount || 5) || rowCount !== (cellar?.rowCount || 4)) && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Warning: Changing layout will reset all section configurations and may affect existing wine positions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderCellarDesigner = () => {
    const groupedSections = cellarSections.reduce((acc, section) => {
      if (!acc[section.column]) {
        acc[section.column] = [];
      }
      acc[section.column].push(section);
      return acc;
    }, {} as Record<string, CellarSection[]>);

    return (
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Layout className="w-5 h-5 mr-2" />
            Section Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Enable or disable individual sections within your cellar layout. Disabled sections won't appear in the dashboard.
            </p>
          </div>
          
          {sectionsLoading ? (
            <div className="text-center py-4">Loading cellar layout...</div>
          ) : (
            <div className="flex gap-4">
              {/* Layer numbers on the left */}
              <div className="flex flex-col justify-start pt-6">
                {Array.from({ length: rowCount }, (_, i) => i + 1).map((layer) => (
                  <div key={layer} className="h-16 flex items-center justify-center text-sm font-medium text-gray-500 mb-2">
                    {layer}
                  </div>
                ))}
              </div>
              
              {/* Columns grid */}
              <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${Object.keys(groupedSections).length}, minmax(0, 1fr))` }}>
                {Object.entries(groupedSections)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([column, sections]) => (
                    <div key={column} className="text-center">
                      <div className="text-sm font-medium text-gray-600 mb-2">Column {column}</div>
                      <div className="space-y-2">
                        {sections
                          .sort((a, b) => a.layer - b.layer) // 1-4 from top to bottom
                          .map((section) => (
                            <div
                              key={section.id}
                              className={`
                                relative p-3 border-2 rounded-lg cursor-pointer transition-all h-16 flex flex-col items-center justify-center
                                ${section.isEnabled === "true" 
                                  ? "border-wine bg-wine/10 text-wine" 
                                  : "border-gray-300 bg-gray-100 text-gray-500"
                                }
                              `}
                              onClick={() => handleToggleSection(section)}
                            >
                              <div className="text-xs font-medium">
                                {column}-{section.layer}
                              </div>
                              <div className="mt-1">
                                {section.isEnabled === "true" ? (
                                  <ToggleRight className="w-4 h-4" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4" />
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCountryManager = () => (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Globe className="w-5 h-5 mr-2" />
          Country Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add New Country */}
        <div className="mb-6">
          <Label htmlFor="new-country" className="text-sm font-medium">
            Add New Country
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="new-country"
              value={newCountryName}
              onChange={(e) => setNewCountryName(e.target.value)}
              placeholder="Enter country name"
              className="flex-1"
            />
            <Button 
              onClick={handleAddCountry}
              disabled={createCountryMutation.isPending || !newCountryName.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Countries List */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Current Countries</Label>
          {countriesLoading ? (
            <div className="text-center py-4">Loading countries...</div>
          ) : (
            <div className="space-y-2">
              {countries.map((country) => (
                <div key={country.id} className="flex items-center justify-between p-3 border rounded-lg">
                  {editingCountry?.id === country.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        size="sm" 
                        onClick={handleUpdateCountry}
                        disabled={updateCountryMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingCountry(null);
                          setEditName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{country.name}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCountry(country)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteCountry(country.id)}
                          disabled={deleteCountryMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6">
      {/* Navigation Header */}
      <nav className="mb-6 flex items-center justify-between bg-white border-b border-gray-200 pb-4">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link href="/wines">
            <Button variant="ghost" size="sm" className="flex items-center">
              <Wine className="w-4 h-4 mr-2" />
              Wines
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="flex items-center text-wine">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your wine cellar preferences and configuration.</p>
      </div>

      {/* Settings Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("countries")}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "countries"
                ? "bg-white text-wine shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Globe className="w-4 h-4 mr-2" />
            Countries
          </button>
          <button
            onClick={() => setActiveTab("cellar")}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "cellar"
                ? "bg-white text-wine shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Layout className="w-4 h-4 mr-2" />
            Cellar Designer
          </button>
        </div>
      </div>

      {/* Settings Content */}
      <div className="space-y-6">
        {activeTab === "countries" && renderCountryManager()}
        {activeTab === "cellar" && (
          <>
            {renderLayoutConfiguration()}
            {renderCellarDesigner()}
          </>
        )}
      </div>
    </div>
  );
}