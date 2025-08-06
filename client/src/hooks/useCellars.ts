import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Cellar, InsertCellar } from "@shared/schema";

export function useCellars() {
  return useQuery<Cellar[]>({
    queryKey: ["/api/cellars"],
  });
}

export function useLastUsedCellar() {
  const { data: cellars, isLoading } = useCellars();
  
  const getLastUsedCellarId = () => {
    return localStorage.getItem('lastUsedCellarId');
  };
  
  const setLastUsedCellarId = (cellarId: string) => {
    localStorage.setItem('lastUsedCellarId', cellarId);
  };
  
  const getDefaultCellarId = () => {
    if (cellars && cellars.length > 0) {
      // Return the last used cellar if it exists and is still valid
      const lastUsedId = getLastUsedCellarId();
      if (lastUsedId && cellars.some(c => c.id === lastUsedId)) {
        return lastUsedId;
      }
      // Otherwise return the first available cellar
      return cellars[0].id;
    }
    return null;
  };
  
  return {
    lastUsedCellarId: getLastUsedCellarId(),
    setLastUsedCellarId,
    defaultCellarId: getDefaultCellarId(),
    isLoading,
  };
}

export function useCreateCellar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cellar: Omit<InsertCellar, 'userId'>) => {
      const response = await fetch("/api/cellars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cellar),
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cellars"] });
    },
  });
}