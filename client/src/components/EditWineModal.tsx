import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { apiRequest } from "@/lib/queryClient";
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
  price: z.string().optional(),
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
      column: wine.column,
      layer: wine.layer,
      price: wine.price || "",
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
      column: wine.column,
      layer: wine.layer,
      price: wine.price || "",
      notes: wine.notes || "",
      countryId: wine.countryId || "",
      quantity: wine.quantity || 1,
    });
  }, [wine, form]);

  const updateWineMutation = useMutation({
    mutationFn: async (data: EditWineFormData) => {
      const { id, ...updateData } = data;
      // Convert year to number if provided
      const formattedData = {
        ...updateData,
        year: updateData.year ? parseInt(updateData.year) : null,
        price: updateData.price || null,
      };
      return await apiRequest("PUT", `/api/wines/${id}`, formattedData);
    },
    onSuccess: () => {
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
                      <Input placeholder="Enter producer name" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                      <Input placeholder="e.g. Bordeaux" {...field} />
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

              {/* Price */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per bottle ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        min="0" 
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