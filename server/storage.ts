import { type Wine, type InsertWine, type CellarColumn, type InsertCellarColumn } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Wine operations
  getWine(id: string): Promise<Wine | undefined>;
  getAllWines(): Promise<Wine[]>;
  getWinesByLocation(column: string, layer: number): Promise<Wine[]>;
  createWine(wine: InsertWine): Promise<Wine>;
  updateWine(id: string, wine: Partial<InsertWine>): Promise<Wine | undefined>;
  deleteWine(id: string): Promise<boolean>;
  searchWines(query: string): Promise<Wine[]>;
  
  // Cellar operations
  getCellarColumn(label: string): Promise<CellarColumn | undefined>;
  getAllCellarColumns(): Promise<CellarColumn[]>;
  createCellarColumn(column: InsertCellarColumn): Promise<CellarColumn>;
  updateCellarColumn(id: string, column: Partial<InsertCellarColumn>): Promise<CellarColumn | undefined>;
  
  // Statistics
  getWineCount(): Promise<number>;
  getLocationCount(): Promise<number>;
  getPremiumWineCount(): Promise<number>;
  getTotalCollectionValue(): Promise<number>;
}

export class MemStorage implements IStorage {
  private wines: Map<string, Wine>;
  private cellarColumns: Map<string, CellarColumn>;

  constructor() {
    this.wines = new Map();
    this.cellarColumns = new Map();
    this.initializeCellarColumns();
  }

  private initializeCellarColumns() {
    const columns = ['A', 'B', 'C', 'D', 'E', 'F'];
    columns.forEach(label => {
      const id = randomUUID();
      const column: CellarColumn = {
        id,
        label,
        layers: 4
      };
      this.cellarColumns.set(id, column);
    });
  }

  // Wine operations
  async getWine(id: string): Promise<Wine | undefined> {
    return this.wines.get(id);
  }

  async getAllWines(): Promise<Wine[]> {
    return Array.from(this.wines.values()).sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });
  }

  async getWinesByLocation(column: string, layer: number): Promise<Wine[]> {
    return Array.from(this.wines.values()).filter(
      wine => wine.column === column && wine.layer === layer
    );
  }

  async createWine(insertWine: InsertWine): Promise<Wine> {
    const id = randomUUID();
    const wine: Wine = {
      ...insertWine,
      id,
      producer: insertWine.producer || null,
      year: insertWine.year || null,
      region: insertWine.region || null,
      price: insertWine.price || null,
      notes: insertWine.notes || null,
      createdAt: new Date(),
    };
    this.wines.set(id, wine);
    return wine;
  }

  async updateWine(id: string, updateData: Partial<InsertWine>): Promise<Wine | undefined> {
    const existingWine = this.wines.get(id);
    if (!existingWine) return undefined;

    const updatedWine: Wine = {
      ...existingWine,
      ...updateData,
    };
    this.wines.set(id, updatedWine);
    return updatedWine;
  }

  async deleteWine(id: string): Promise<boolean> {
    return this.wines.delete(id);
  }

  async searchWines(query: string): Promise<Wine[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.wines.values()).filter(wine =>
      wine.name.toLowerCase().includes(searchTerm) ||
      wine.producer?.toLowerCase().includes(searchTerm) ||
      wine.region?.toLowerCase().includes(searchTerm) ||
      wine.year?.toString().includes(searchTerm)
    );
  }

  // Cellar operations
  async getCellarColumn(label: string): Promise<CellarColumn | undefined> {
    return Array.from(this.cellarColumns.values()).find(col => col.label === label);
  }

  async getAllCellarColumns(): Promise<CellarColumn[]> {
    return Array.from(this.cellarColumns.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  async createCellarColumn(insertColumn: InsertCellarColumn): Promise<CellarColumn> {
    const id = randomUUID();
    const column: CellarColumn = {
      ...insertColumn,
      id,
      layers: insertColumn.layers || 4,
    };
    this.cellarColumns.set(id, column);
    return column;
  }

  async updateCellarColumn(id: string, updateData: Partial<InsertCellarColumn>): Promise<CellarColumn | undefined> {
    const existingColumn = this.cellarColumns.get(id);
    if (!existingColumn) return undefined;

    const updatedColumn: CellarColumn = {
      ...existingColumn,
      ...updateData,
    };
    this.cellarColumns.set(id, updatedColumn);
    return updatedColumn;
  }

  // Statistics
  async getWineCount(): Promise<number> {
    return this.wines.size;
  }

  async getLocationCount(): Promise<number> {
    const usedLocations = new Set<string>();
    Array.from(this.wines.values()).forEach(wine => {
      usedLocations.add(`${wine.column}-${wine.layer}`);
    });
    return usedLocations.size;
  }

  async getPremiumWineCount(): Promise<number> {
    return Array.from(this.wines.values()).filter(wine => 
      wine.price && parseFloat(wine.price) > 200
    ).length;
  }

  async getTotalCollectionValue(): Promise<number> {
    return Array.from(this.wines.values()).reduce((total, wine) => {
      return total + (wine.price ? parseFloat(wine.price) : 0);
    }, 0);
  }
}

export const storage = new MemStorage();
