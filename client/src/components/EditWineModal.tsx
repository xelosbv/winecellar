import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Wine as WineType, insertWineSchema, Country } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import LocationGridSelector from "./LocationGridSelector";

interface EditWineModalProps {
  wine: WineType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const editWineSchema = insertWineSchema.partial().extend({
  id: z.string(),
  year: z.string().optional(),
  buyingPrice: z.string().optional(),
  marketValue: z.string().optional(),
  toDrinkFrom: z.string().optional(),
  toDrinkUntil: z.string().optional(),
});

type EditWineFormData = z.infer<typeof editWineSchema>;

export default function EditWineModal({ wine, isOpen, onClose, onSuccess }: EditWineModalProps) {
  const { toast } = useToast();

  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
  });

  const form = useForm<EditWineFormData>({
    resolver: zodResolver(editWineSchema),
    defaultValues: {
      id: wine.id,
      name: wine.name || "",
      producer: wine.producer || "",
      year: wine.year?.toString() || "",
      type: wine.type || "",
      region: wine.region || "",
      grapes: wine.grapes || "",
      column: wine.column,
      layer: wine.layer,
      buyingPrice: wine.buyingPrice || "",
      marketValue: wine.marketValue || "",
      volume: wine.volume || "",
      toDrinkFrom: wine.toDrinkFrom?.toString() || "",
      toDrinkUntil: wine.toDrinkUntil?.toString() || "",
      notes: wine.notes || "",
      countryId: wine.countryId || "",
      quantity: wine.quantity || 1,
    },
  });

  // Reset form when wine changes
  useEffect(() => {
    form.reset({
      id: wine.id,
      name: wine.name || "",
      producer: wine.producer || "",
      year: wine.year?.toString() || "",
      type: wine.type || "",
      region: wine.region || "",
      grapes: wine.grapes || "",
      column: wine.column,
      layer: wine.layer,
      buyingPrice: wine.buyingPrice || "",
      marketValue: wine.marketValue || "",
      volume: wine.volume || "",
      toDrinkFrom: wine.toDrinkFrom?.toString() || "",
      toDrinkUntil: wine.toDrinkUntil?.toString() || "",
      notes: wine.notes || "",
      countryId: wine.countryId || "",
      quantity: wine.quantity || 1,
    });
  }, [wine, form]);

  const updateWineMutation = useMutation({
    mutationFn: async (data: EditWineFormData) => {
      const { id, ...updateData } = data;
      // Convert numeric fields
      const formattedData = {
        ...updateData,
        year: updateData.year ? parseInt(updateData.year) : null,
        buyingPrice: updateData.buyingPrice || null,
        marketValue: updateData.marketValue || null,
        toDrinkFrom: updateData.toDrinkFrom ? parseInt(updateData.toDrinkFrom) : null,
        toDrinkUntil: updateData.toDrinkUntil ? parseInt(updateData.toDrinkUntil) : null,
      };
      return await apiRequest("PUT", `/api/wines/${id}`, formattedData);
    },
    onSuccess: () => {
      // Invalidate relevant cache queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${wine.cellarId}/wines`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${wine.cellarId}/stats`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${wine.cellarId}/sections`] });
      queryClient.invalidateQueries({ queryKey: ["/api/wines"] });
      
      toast({
        title: "Wine updated",
        description: "The wine has been successfully updated.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update wine. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditWineFormData) => {
    updateWineMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Wine</DialogTitle>
          <DialogDescription>
            Update wine information, location, or tasting notes for your collection.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Wine Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wine Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter wine name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Producer */}
              <FormField
                control={form.control}
                name="producer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Producer *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter producer name" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Year */}
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g. 2018" 
                        min="1900" 
                        max={new Date().getFullYear()} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wine Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select wine type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="red">Red Wine</SelectItem>
                        <SelectItem value="white">White Wine</SelectItem>
                        <SelectItem value="rosé">Rosé Wine</SelectItem>
                        <SelectItem value="champagne">Champagne</SelectItem>
                        <SelectItem value="sparkling">Sparkling Wine</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Country */}
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
                        {countries.map((country) => (
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

              {/* Region */}
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Bordeaux" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Grapes */}
              <FormField
                control={form.control}
                name="grapes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grapes/Varietals</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Cabernet Sauvignon, Merlot" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            {/* Location Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Wine Location</h3>
              <LocationGridSelector
                cellarId={wine.cellarId}
                selectedColumn={form.watch("column")}
                selectedLayer={form.watch("layer")}
                onLocationSelect={(column, layer) => {
                  form.setValue("column", column);
                  form.setValue("layer", layer);
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Bottles *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1" 
                        min="1" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Buying Price */}
              <FormField
                control={form.control}
                name="buyingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buying Price ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="Price paid"
                        min="0" 
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Market Value */}
              <FormField
                control={form.control}
                name="marketValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Value ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="Current value"
                        min="0" 
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Volume */}
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

              {/* To Drink From */}
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* To Drink Until */}
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any notes about this wine..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateWineMutation.isPending}
                className="bg-wine hover:bg-wine-light"
              >
                {updateWineMutation.isPending ? "Updating..." : "Update Wine"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}