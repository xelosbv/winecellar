import { WineSearchResult } from "@shared/schema";

export async function searchWineDatabase(query: string): Promise<WineSearchResult[]> {
  try {
    const response = await fetch(`/api/wine-search/${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      console.warn('Wine search API unavailable, returning empty results');
      return [];
    }
    
    const results = await response.json();
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error('Error searching wine database:', error);
    return [];
  }
}
