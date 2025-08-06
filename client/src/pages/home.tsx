import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCellars, useCreateCellar } from "@/hooks/useCellars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCellarSchema, type Cellar } from "@shared/schema";
import { z } from "zod";
import { Plus, Wine, LogOut, Edit, GripVertical } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const createCellarFormSchema = insertCellarSchema.omit({ userId: true });
const editCellarFormSchema = insertCellarSchema.omit({ userId: true }).partial();

export default function Home() {
  const { user } = useAuth();
  const { data: cellars, isLoading: cellarsLoading } = useCellars();
  const createCellarMutation = useCreateCellar();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCellar, setEditingCellar] = useState<Cellar | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [reorderedCellars, setReorderedCellars] = useState<Cellar[]>([]);

  const form = useForm<z.infer<typeof createCellarFormSchema>>({
    resolver: zodResolver(createCellarFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const editForm = useForm<z.infer<typeof editCellarFormSchema>>({
    resolver: zodResolver(editCellarFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Update cellar mutation
  const updateCellarMutation = useMutation({
    mutationFn: async ({ cellarId, data }: { cellarId: string; data: Partial<z.infer<typeof editCellarFormSchema>> }) => {
      const response = await apiRequest("PATCH", `/api/cellars/${cellarId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cellars"] });
      toast({
        title: "Success",
        description: "Cellar updated successfully",
      });
      setEditingCellar(null);
      editForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cellar",
        variant: "destructive",
      });
    },
  });

  // Reorder cellars mutation
  const reorderCellarsMutation = useMutation({
    mutationFn: async (cellars: Array<{ id: string; order: number }>) => {
      const response = await apiRequest("POST", "/api/cellars/reorder", { cellars });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cellars"] });
      toast({
        title: "Success",
        description: "Cellar order updated successfully",
      });
      setIsReorderMode(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cellar order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: z.infer<typeof createCellarFormSchema>) => {
    try {
      await createCellarMutation.mutateAsync(values);
      toast({
        title: "Success",
        description: "Cellar created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create cellar",
        variant: "destructive",
      });
    }
  };

  const onEditSubmit = async (values: z.infer<typeof editCellarFormSchema>) => {
    if (!editingCellar) return;
    updateCellarMutation.mutate({ cellarId: editingCellar.id, data: values });
  };

  const startEditing = (cellar: Cellar) => {
    setEditingCellar(cellar);
    editForm.reset({
      name: cellar.name,
      description: cellar.description || "",
    });
  };

  const startReorderMode = () => {
    setIsReorderMode(true);
    setReorderedCellars([...(cellars || [])]);
  };

  const cancelReorderMode = () => {
    setIsReorderMode(false);
    setReorderedCellars([]);
  };

  const saveReorderChanges = () => {
    const updates = reorderedCellars.map((cellar, index) => ({
      id: cellar.id,
      order: index,
    }));
    reorderCellarsMutation.mutate(updates);
  };

  const moveCellar = (fromIndex: number, toIndex: number) => {
    const newCellars = [...reorderedCellars];
    const [movedCellar] = newCellars.splice(fromIndex, 1);
    newCellars.splice(toIndex, 0, movedCellar);
    setReorderedCellars(newCellars);
  };

  if (cellarsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wine-50 to-wine-100 dark:from-wine-950 dark:to-wine-900 flex items-center justify-center">
        <div className="text-wine-700 dark:text-wine-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-50 to-wine-100 dark:from-wine-950 dark:to-wine-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <Wine className="h-8 w-8 text-wine-600 dark:text-wine-400" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-wine-900 dark:text-wine-100">
                Wine Cellar Manager
              </h1>
              <p className="text-wine-700 dark:text-wine-300 text-sm sm:text-base">
                Welcome back, {(user as any)?.firstName || (user as any)?.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/api/logout'}
            className="border-wine-600 text-wine-600 hover:bg-wine-600 hover:text-white dark:border-wine-400 dark:text-wine-400 w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Cellars Grid */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <h2 className="text-2xl font-bold text-wine-900 dark:text-wine-100">
              Your Cellars
            </h2>
            <div className="flex gap-2 w-full sm:w-auto">
              {cellars && cellars.length > 1 && !isReorderMode && (
                <Button 
                  variant="outline"
                  onClick={startReorderMode}
                  className="border-wine-600 text-wine-600 hover:bg-wine-600 hover:text-white dark:border-wine-400 dark:text-wine-400 flex-1 sm:flex-none"
                >
                  <GripVertical className="h-4 w-4 mr-2" />
                  Reorder
                </Button>
              )}
              {isReorderMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={cancelReorderMode}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveReorderChanges}
                    disabled={reorderCellarsMutation.isPending}
                    className="bg-wine-600 hover:bg-wine-700 dark:bg-wine-500 dark:hover:bg-wine-600 flex-1 sm:flex-none"
                  >
                    {reorderCellarsMutation.isPending ? "Saving..." : "Save Order"}
                  </Button>
                </>
              ) : (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-wine-600 hover:bg-wine-700 dark:bg-wine-500 dark:hover:bg-wine-600 flex-1 sm:flex-none">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Cellar
                    </Button>
                  </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Cellar</DialogTitle>
                  <DialogDescription>
                    Add a new wine cellar to your collection
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My Wine Cellar" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your wine cellar..."
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createCellarMutation.isPending}
                        className="bg-wine-600 hover:bg-wine-700 dark:bg-wine-500 dark:hover:bg-wine-600"
                      >
                        {createCellarMutation.isPending ? "Creating..." : "Create Cellar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
              )}
            </div>
          </div>

          {cellars && cellars.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(isReorderMode ? reorderedCellars : cellars)?.map((cellar, index) => (
                <div key={cellar.id} className="relative group">
                  {isReorderMode && (
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => index > 0 && moveCellar(index, index - 1)}
                          disabled={index === 0}
                          className="h-8 w-8 p-0"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => index < reorderedCellars.length - 1 && moveCellar(index, index + 1)}
                          disabled={index === reorderedCellars.length - 1}
                          className="h-8 w-8 p-0"
                        >
                          ↓
                        </Button>
                      </div>
                      <span className="text-sm text-wine-600 dark:text-wine-400">
                        Position {index + 1}
                      </span>
                    </div>
                  )}
                  
                  <Link href={`/cellar/${cellar.id}`}>
                    <Card className={`cursor-pointer hover:shadow-lg transition-shadow border-wine-200 dark:border-wine-800 hover:border-wine-400 dark:hover:border-wine-600 ${isReorderMode ? 'pointer-events-none' : ''}`}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-wine-900 dark:text-wine-100">
                              {cellar.name}
                            </CardTitle>
                            {cellar.description && (
                              <CardDescription className="text-wine-700 dark:text-wine-300">
                                {cellar.description}
                              </CardDescription>
                            )}
                          </div>
                          {!isReorderMode && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                startEditing(cellar);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center text-sm text-wine-600 dark:text-wine-400">
                          <Wine className="h-4 w-4 mr-2" />
                          Click to manage wines
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-wine-200 dark:border-wine-800">
              <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                <Wine className="h-16 w-16 text-wine-400 dark:text-wine-600 mb-4" />
                <h3 className="text-xl font-semibold text-wine-900 dark:text-wine-100 mb-2 text-center">
                  No cellars yet
                </h3>
                <p className="text-wine-700 dark:text-wine-300 text-center mb-6 text-sm sm:text-base">
                  Create your first wine cellar to start organizing your collection
                </p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-wine-600 hover:bg-wine-700 text-white font-medium px-6 py-2 w-full sm:w-auto shadow-lg"
                  size="lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Cellar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Cellar Dialog */}
        <Dialog open={!!editingCellar} onOpenChange={(open) => !open && setEditingCellar(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Cellar</DialogTitle>
              <DialogDescription>
                Update your cellar information
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Wine Cellar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your wine cellar..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingCellar(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateCellarMutation.isPending}
                    className="bg-wine-600 hover:bg-wine-700 dark:bg-wine-500 dark:hover:bg-wine-600"
                  >
                    {updateCellarMutation.isPending ? "Updating..." : "Update Cellar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}