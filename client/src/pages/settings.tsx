import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCountrySchema, type InsertCountry, type Country } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Settings } from "lucide-react";

export default function SettingsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: countries = [], isLoading } = useQuery({
    queryKey: ["/api/countries"],
    queryFn: async () => {
      const response = await fetch("/api/countries");
      if (!response.ok) {
        throw new Error("Failed to fetch countries");
      }
      return response.json();
    },
  });

  const form = useForm<InsertCountry>({
    resolver: zodResolver(insertCountrySchema),
    defaultValues: {
      name: "",
    },
  });

  const addCountryMutation = useMutation({
    mutationFn: async (data: InsertCountry) => {
      const response = await apiRequest("POST", "/api/countries", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      toast({
        title: "Country added successfully",
        description: "The country has been added to your list.",
      });
      form.reset();
      setIsAddDialogOpen(false);
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
      const response = await apiRequest("PUT", `/api/countries/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      toast({
        title: "Country updated successfully",
        description: "The country has been updated.",
      });
      form.reset();
      setEditingCountry(null);
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
      const response = await apiRequest("DELETE", `/api/countries/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      toast({
        title: "Country deleted successfully",
        description: "The country has been removed from your list.",
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

  const onSubmit = (data: InsertCountry) => {
    if (editingCountry) {
      updateCountryMutation.mutate({ id: editingCountry.id, data });
    } else {
      addCountryMutation.mutate(data);
    }
  };

  const handleEdit = (country: Country) => {
    setEditingCountry(country);
    form.setValue("name", country.name);
    setIsAddDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingCountry(null);
    form.reset();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-gray-600" />
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Manage Countries</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={handleCloseDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Country
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCountry ? "Edit Country" : "Add New Country"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter country name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={handleCloseDialog}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={addCountryMutation.isPending || updateCountryMutation.isPending}
                      >
                        {editingCountry ? "Update" : "Add"} Country
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading countries...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country Name</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                      No countries found. Add your first country to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  countries.map((country: Country) => (
                    <TableRow key={country.id}>
                      <TableCell className="font-medium">{country.name}</TableCell>
                      <TableCell>
                        {country.createdAt 
                          ? new Date(country.createdAt).toLocaleDateString()
                          : "N/A"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(country)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCountryMutation.mutate(country.id)}
                            disabled={deleteCountryMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}