import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Cellar, InsertCellar } from "@shared/schema";

export function useCellars() {
  return useQuery<Cellar[]>({
    queryKey: ["/api/cellars"],
  });
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