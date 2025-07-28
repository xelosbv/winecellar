import { type Wine, type InsertWine, type CellarColumn, type InsertCellarColumn, wines, cellarColumns } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, and } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeCellarColumns();
  }

  private async initializeCellarColumns() {
    const existingColumns = await db.select().from(cellarColumns);
    if (existingColumns.length === 0) {
      const columnLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
      for (const label of columnLabels) {
        await db.insert(cellarColumns).values({
          label,
          layers: 4
        });
      }
    }
  }

  // Wine operations
  async getWine(id: string): Promise<Wine | undefined> {
    const [wine] = await db.select().from(wines).where(eq(wines.id, id));
    return wine || undefined;
  }

  async getAllWines(): Promise<Wine[]> {
    return await db.select().from(wines).orderBy(wines.createdAt);
  }

  async getWinesByLocation(column: string, layer: number): Promise<Wine[]> {
    return await db.select().from(wines)
      .where(and(eq(wines.column, column), eq(wines.layer, layer)));
  }

  async createWine(insertWine: InsertWine): Promise<Wine> {
    const [wine] = await db
      .insert(wines)
      .values(insertWine)
      .returning();
    return wine;
  }

  async updateWine(id: string, updateData: Partial<InsertWine>): Promise<Wine | undefined> {
    const [wine] = await db
      .update(wines)
      .set(updateData)
      .where(eq(wines.id, id))
      .returning();
    return wine || undefined;
  }

  async deleteWine(id: string): Promise<boolean> {
    const result = await db.delete(wines).where(eq(wines.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchWines(query: string): Promise<Wine[]> {
    const searchTerm = `%${query}%`;
    return await db.select().from(wines).where(
      or(
        ilike(wines.name, searchTerm),
        ilike(wines.producer, searchTerm),
        ilike(wines.region, searchTerm),
        ilike(wines.type, searchTerm),
        ilike(wines.notes, searchTerm)
      )
    );
  }

  // Cellar operations
  async getCellarColumn(label: string): Promise<CellarColumn | undefined> {
    const [column] = await db.select().from(cellarColumns).where(eq(cellarColumns.label, label));
    return column || undefined;
  }

  async getAllCellarColumns(): Promise<CellarColumn[]> {
    return await db.select().from(cellarColumns).orderBy(cellarColumns.label);
  }

  async createCellarColumn(insertColumn: InsertCellarColumn): Promise<CellarColumn> {
    const [column] = await db
      .insert(cellarColumns)
      .values(insertColumn)
      .returning();
    return column;
  }

  async updateCellarColumn(id: string, updateData: Partial<InsertCellarColumn>): Promise<CellarColumn | undefined> {
    const [column] = await db
      .update(cellarColumns)
      .set(updateData)
      .where(eq(cellarColumns.id, id))
      .returning();
    return column || undefined;
  }

  // Statistics
  async getWineCount(): Promise<number> {
    const result = await db.select().from(wines);
    return result.length;
  }

  async getLocationCount(): Promise<number> {
    const result = await db.select({
      column: wines.column,
      layer: wines.layer
    }).from(wines);
    
    const usedLocations = new Set<string>();
    result.forEach(wine => {
      usedLocations.add(`${wine.column}-${wine.layer}`);
    });
    return usedLocations.size;
  }

  async getPremiumWineCount(): Promise<number> {
    const result = await db.select().from(wines);
    return result.filter(wine => 
      wine.price && parseFloat(wine.price) > 200
    ).length;
  }

  async getTotalCollectionValue(): Promise<number> {
    const result = await db.select().from(wines);
    return result.reduce((total, wine) => {
      return total + (wine.price ? parseFloat(wine.price) : 0);
    }, 0);
  }
}

export const storage = new DatabaseStorage();
