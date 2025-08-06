import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { transferWineSchema, type Wine, type Cellar } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRightLeft, Wine as WineIcon } from "lucide-react";
import LocationGridSelector from "./LocationGridSelector";

const transferFormSchema = transferWineSchema.omit({ fromCellarId: true, wineId: true });

interface TransferWineModalProps {
  wine: Wine | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransferWineModal({ wine, isOpen, onClose }: TransferWineModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [transferAll, setTransferAll] = useState(false);
  const [selectedDestinationLocation, setSelectedDestinationLocation] = useState<{column: string, layer: number} | null>(null);

  // Fetch all user cellars
  const { data: cellars = [] } = useQuery<Cellar[]>({
    queryKey: ["/api/cellars"],
    enabled: isOpen,
  });

  // Filter out the current cellar
  const availableCellars = cellars.filter(cellar => cellar.id !== wine?.cellarId);

  const form = useForm<z.infer<typeof transferFormSchema>>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      toCellarId: "",
      quantity: 1,
      toColumn: "",
      toLayer: 1,
    },
  });

  // Watch the selected destination cellar to reset location when it changes
  const selectedDestinationCellarId = form.watch("toCellarId");

  // Reset location selection when destination cellar changes
  useEffect(() => {
    setSelectedDestinationLocation(null);
    form.setValue("toColumn", "");
    form.setValue("toLayer", 1);
  }, [selectedDestinationCellarId, form]);

  // Update form values when location is selected
  const handleLocationSelect = (column: string, layer: number) => {
    setSelectedDestinationLocation({ column, layer });
    form.setValue("toColumn", column);
    form.setValue("toLayer", layer);
  };

  const transferMutation = useMutation({
    mutationFn: async (data: z.infer<typeof transferWineSchema>) => {
      const response = await apiRequest("POST", "/api/wines/transfer", data);
      return await response.json();
    },
    onSuccess: () => {
      const fromCellarId = wine?.cellarId;
      const toCellarId = form.getValues("toCellarId");
      
      // Invalidate all relevant queries for both cellars
      queryClient.invalidateQueries({ queryKey: ["/api/cellars"] });
      
      // Source cellar updates
      if (fromCellarId) {
        queryClient.invalidateQueries({ queryKey: [`/api/cellars/${fromCellarId}/wines`] });
        queryClient.invalidateQueries({ queryKey: [`/api/cellars/${fromCellarId}/stats`] });
        queryClient.invalidateQueries({ queryKey: [`/api/cellars/${fromCellarId}/sections`] });
        queryClient.invalidateQueries({ queryKey: [`/api/cellars/${fromCellarId}`] });
      }
      
      // Destination cellar updates
      if (toCellarId) {
        queryClient.invalidateQueries({ queryKey: [`/api/cellars/${toCellarId}/wines`] });
        queryClient.invalidateQueries({ queryKey: [`/api/cellars/${toCellarId}/stats`] });
        queryClient.invalidateQueries({ queryKey: [`/api/cellars/${toCellarId}/sections`] });
        queryClient.invalidateQueries({ queryKey: [`/api/cellars/${toCellarId}`] });
      }
      
      toast({
        title: "Success",
        description: "Wine transferred successfully",
      });
      onClose();
      form.reset();
      setTransferAll(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer wine",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof transferFormSchema>) => {
    if (!wine) return;

    // Validate cellar selection
    if (!values.toCellarId) {
      form.setError("toCellarId", {
        type: "required",
        message: "Please select a destination cellar"
      });
      return;
    }

    const quantity = transferAll ? wine.quantity : values.quantity;
    
    transferMutation.mutate({
      fromCellarId: wine.cellarId,
      wineId: wine.id,
      quantity,
      toCellarId: values.toCellarId,
      toColumn: values.toColumn,
      toRow: values.toRow,
    });
  };

  const handleClose = () => {
    onClose();
    form.reset();
    setTransferAll(false);
    setSelectedDestinationLocation(null);
  };

  // Update quantity when transferAll changes
  const handleTransferAllChange = (checked: boolean) => {
    setTransferAll(checked);
    if (checked && wine) {
      form.setValue("quantity", wine.quantity);
    } else {
      form.setValue("quantity", 1);
    }
  };

  if (!wine) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer Wine
          </DialogTitle>
          <DialogDescription>
            Transfer bottles of "{wine.name}" to another cellar
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-wine-50 dark:bg-wine-950/20 rounded-lg border border-wine-200 dark:border-wine-800">
          <div className="flex items-center gap-3">
            <WineIcon className="h-5 w-5 text-wine-600 dark:text-wine-400" />
            <div>
              <p className="font-medium text-wine-900 dark:text-wine-100">{wine.name}</p>
              <p className="text-sm text-wine-700 dark:text-wine-300">
                {wine.producer} • {wine.year} • Location: {wine.column}{wine.layer}
              </p>
              <p className="text-sm text-wine-600 dark:text-wine-400">
                Available: {wine.quantity} bottle{wine.quantity !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="toCellarId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Cellar *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination cellar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCellars.map((cellar) => (
                        <SelectItem key={cellar.id} value={cellar.id}>
                          {cellar.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="transfer-all"
                  checked={transferAll}
                  onCheckedChange={handleTransferAllChange}
                />
                <label
                  htmlFor="transfer-all"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Transfer all bottles ({wine.quantity})
                </label>
              </div>

              {!transferAll && (
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={wine.quantity}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Location Selection for Destination Cellar */}
            {selectedDestinationCellarId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">
                    Select Destination Location (Optional)
                  </FormLabel>
                  {selectedDestinationLocation && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDestinationLocation(null);
                        form.setValue("toColumn", "");
                        form.setValue("toLayer", 1);
                      }}
                    >
                      Clear Location
                    </Button>
                  )}
                </div>
                
                <LocationGridSelector
                  cellarId={selectedDestinationCellarId}
                  selectedColumn={selectedDestinationLocation?.column}
                  selectedLayer={selectedDestinationLocation?.layer}
                  onLocationSelect={handleLocationSelect}
                  className="max-h-64 overflow-y-auto"
                />
                
                {selectedDestinationLocation && (
                  <p className="text-sm text-wine-600 dark:text-wine-400">
                    Selected location: Column {selectedDestinationLocation.column}, Layer {selectedDestinationLocation.layer}
                  </p>
                )}
                
                <p className="text-xs text-wine-600 dark:text-wine-400">
                  If no location is selected, the wine will be placed in the first available spot.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={transferMutation.isPending || availableCellars.length === 0}
                className="bg-wine-600 hover:bg-wine-700 dark:bg-wine-500 dark:hover:bg-wine-600"
              >
                {transferMutation.isPending ? "Transferring..." : "Transfer Wine"}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {availableCellars.length === 0 && (
          <p className="text-sm text-wine-600 dark:text-wine-400 text-center mt-4">
            No other cellars available for transfer. Create another cellar first.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}