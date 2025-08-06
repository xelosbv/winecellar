import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWineSchema, type InsertWine, type WineSearchResult } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { searchWineDatabase } from "@/lib/wineApi";
import { useToast } from "@/hooks/use-toast";
import { Search, X, Camera } from "lucide-react";
import LocationGridSelector from "./LocationGridSelector";
import CameraCapture from "./CameraCapture";

interface AddWineModalProps {
  cellarId: string;
  isOpen: boolean;
  onClose: () => void;
  prefilledLocation?: { column: string; layer: number } | null;
}

export default function AddWineModal({ cellarId, isOpen, onClose, prefilledLocation }: AddWineModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WineSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: countries = [] } = useQuery({
    queryKey: ["/api/countries"],
    queryFn: async () => {
      const response = await fetch("/api/countries");
      return response.json();
    },
  });

  const form = useForm<InsertWine>({
    resolver: zodResolver(insertWineSchema),
    defaultValues: {
      cellarId: cellarId,
      name: "",
      producer: "",
      year: undefined,
      type: "",
      region: "",
      grapes: "",
      countryId: "",
      column: prefilledLocation?.column || "",
      layer: prefilledLocation?.layer || undefined,
      price: "",
      quantity: 1,
      volume: "",
      toDrinkFrom: undefined,
      toDrinkUntil: undefined,
      notes: "",
    },
  });

  const addWineMutation = useMutation({
    mutationFn: async (data: InsertWine) => {
      // Transform empty strings to null for numeric fields
      const formattedData = {
        ...data,
        price: data.price || null,
        year: data.year || null,
        toDrinkFrom: data.toDrinkFrom || null,
        toDrinkUntil: data.toDrinkUntil || null,
        countryId: data.countryId || null,
      };
      const response = await apiRequest("POST", `/api/cellars/${cellarId}/wines`, formattedData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${cellarId}/wines`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${cellarId}/stats`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${cellarId}/sections`] });
      toast({
        title: "Wine added successfully",
        description: "Your wine has been added to the collection.",
      });
      form.reset();
      setSearchQuery("");
      setSearchResults([]);
      onClose();
    },
    onError: (error) => {
      console.error("Failed to add wine:", error);
      toast({
        title: "Error",
        description: "Failed to add wine. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchWineDatabase(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const selectWineFromResults = async (wine: WineSearchResult) => {
    form.setValue("name", wine.name);
    if (wine.producer) form.setValue("producer", wine.producer);
    if (wine.year) form.setValue("year", wine.year);
    if (wine.type) form.setValue("type", wine.type.toLowerCase());
    if (wine.region) form.setValue("region", wine.region);
    if (wine.grapes) form.setValue("grapes", wine.grapes);
    if (wine.price) form.setValue("price", wine.price.toString());
    
    // Handle country mapping - find or create country
    if (wine.country) {
      const existingCountry = countries.find((c: any) => 
        c.name.toLowerCase() === wine.country!.toLowerCase() ||
        (wine.country === 'US' && c.name.toLowerCase() === 'united states') ||
        (wine.country === 'United States' && c.name.toLowerCase() === 'us')
      );
      
      if (existingCountry) {
        form.setValue("countryId", existingCountry.id);
      } else {
        // Create new country
        try {
          const countryName = wine.country === 'US' ? 'United States' : wine.country;
          const response = await apiRequest("POST", "/api/countries", { name: countryName });
          const newCountry = await response.json();
          if (newCountry && newCountry.id) {
            form.setValue("countryId", newCountry.id);
            // Refresh countries list
            queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
          }
        } catch (error) {
          console.warn("Could not create country:", wine.country);
        }
      }
    }
    
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleCameraAnalysis = (wineData: any) => {
    // Fill form with analyzed wine data
    if (wineData.name) form.setValue("name", wineData.name);
    if (wineData.producer) form.setValue("producer", wineData.producer);
    if (wineData.year) form.setValue("year", wineData.year);
    if (wineData.type) form.setValue("type", wineData.type.toLowerCase());
    if (wineData.region) form.setValue("region", wineData.region);
    if (wineData.grapes) form.setValue("grapes", wineData.grapes);
    
    // Handle country mapping
    if (wineData.country) {
      const existingCountry = countries.find((c: any) => 
        c.name.toLowerCase() === wineData.country.toLowerCase() ||
        (wineData.country === 'US' && c.name.toLowerCase() === 'united states') ||
        (wineData.country === 'United States' && c.name.toLowerCase() === 'us')
      );
      
      if (existingCountry) {
        form.setValue("countryId", existingCountry.id);
      }
    }
    
    setShowCamera(false);
  };

  const onSubmit = (data: InsertWine) => {
    addWineMutation.mutate(data);
  };

  // Reset form when modal closes and update location when prefilled
  useEffect(() => {
    if (!isOpen) {
      form.reset({
        cellarId: cellarId,
        name: "",
        producer: "",
        year: undefined,
        type: "",
        region: "",
        grapes: "",
        countryId: "",
        column: "",
        layer: undefined,
        price: "",
        quantity: 1,
        volume: "",
        toDrinkFrom: undefined,
        toDrinkUntil: undefined,
        notes: "",
      });
      setSearchQuery("");
      setSearchResults([]);
    } else {
      // Ensure cellarId is always set when modal opens
      form.setValue("cellarId", cellarId);
      if (prefilledLocation) {
        // Set the location fields when modal opens with prefilled location
        form.setValue("column", prefilledLocation.column);
        form.setValue("layer", prefilledLocation.layer);
      }
    }
  }, [isOpen, prefilledLocation, form, cellarId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">Add New Wine</DialogTitle>
          <DialogDescription>
            Add a new wine to your cellar collection. Search the database for automatic details or enter information manually.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Hidden cellarId field */}
            <input type="hidden" {...form.register("cellarId")} />
            {/* Wine Search and Camera */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700">Search Wine Database</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCamera(true)}
                  className="flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Scan Label
                </Button>
              </div>
              <div className="relative">
                <Input
                  placeholder="Type wine name to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-20"
                />
                {isSearching && (
                  <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                    <div className="h-4 w-4 border-2 border-wine-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">Search automatically as you type or use camera to scan labels</p>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-blue-900">
                      Search Results ({searchResults.length} wine{searchResults.length !== 1 ? 's' : ''} found)
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchResults([])}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {searchResults.slice(0, 3).map((wine, index) => (
                      <div
                        key={index}
                        className="bg-white p-3 rounded border border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => selectWineFromResults(wine)}
                      >
                        <div className="font-medium text-gray-900">{wine.name}</div>
                        <div className="text-sm text-gray-600">
                          {wine.producer && `${wine.producer} - `}
                          {wine.type && `${wine.type}`}
                          {wine.year && ` (${wine.year})`}
                        </div>
                      </div>
                    ))}
                    {searchResults.length > 3 && (
                      <div className="text-center py-2 text-sm text-gray-500">
                        Showing top 3 results. {searchResults.length - 3} more wine{searchResults.length - 3 !== 1 ? 's' : ''} available.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Wine Details */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wine Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="producer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Producer</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1800}
                        max={2030}
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wine Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="red">Red Wine</SelectItem>
                        <SelectItem value="white">White Wine</SelectItem>
                        <SelectItem value="rosé">Rosé</SelectItem>
                        <SelectItem value="champagne">Champagne</SelectItem>
                        <SelectItem value="sparkling">Sparkling</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            {/* Location Grid Selector - Full Width */}
            <div className="col-span-full">
              <FormField
                control={form.control}
                name="column"
                render={({ field: columnField }) => (
                  <FormField
                    control={form.control}
                    name="layer"
                    render={({ field: layerField }) => (
                      <FormItem>
                        <FormLabel>Wine Location *</FormLabel>
                        <FormControl>
                          <LocationGridSelector
                            cellarId={cellarId}
                            selectedColumn={columnField.value}
                            selectedLayer={layerField.value}
                            onLocationSelect={(column, layer) => {
                              columnField.onChange(column);
                              layerField.onChange(layer);
                            }}
                          />
                        </FormControl>
                        {(form.formState.errors.column || form.formState.errors.layer) && (
                          <div className="text-sm text-red-500">
                            Please select a wine location
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Price</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          {...field}
                          value={field.value || ""}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Bottles *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="999"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grapes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grapes/Varietals</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="e.g., Cabernet Sauvignon, Merlot" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="countryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map((country: any) => (
                          <SelectItem key={country.id} value={country.id}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="volume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bottle Volume</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select volume" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="37.5cl">37.5cl (Half bottle)</SelectItem>
                        <SelectItem value="75cl">75cl (Standard)</SelectItem>
                        <SelectItem value="1.5l">1.5L (Magnum)</SelectItem>
                        <SelectItem value="3l">3L (Double Magnum)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="toDrinkFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Drink From</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2020}
                        max={2060}
                        placeholder="Year"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="toDrinkUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Drink Until</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2020}
                        max={2080}
                        placeholder="Year"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Tasting notes, special occasions, etc."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-wine text-white hover:bg-wine-light"
                disabled={addWineMutation.isPending}
              >
                {addWineMutation.isPending ? "Adding..." : "Add Wine"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Camera Capture Component */}
      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onImageCapture={() => {}} // Not used in this implementation
        onAnalysisComplete={handleCameraAnalysis}
      />
    </Dialog>
  );
}
