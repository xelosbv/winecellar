import { type Wine, type InsertWine, type CellarColumn, type InsertCellarColumn, type CellarSection, type InsertCellarSection, type Country, type InsertCountry, wines, cellarColumns, cellarSections, countries } from "@shared/schema";
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
  
  // Cellar section operations
  getCellarSection(column: string, layer: number): Promise<CellarSection | undefined>;
  getAllCellarSections(): Promise<CellarSection[]>;
  createCellarSection(section: InsertCellarSection): Promise<CellarSection>;
  updateCellarSection(id: string, section: Partial<InsertCellarSection>): Promise<CellarSection | undefined>;
  initializeCellarSections(): Promise<void>;
  
  // Country operations
  getCountry(id: string): Promise<Country | undefined>;
  getAllCountries(): Promise<Country[]>;
  createCountry(insertCountry: InsertCountry): Promise<Country>;
  updateCountry(id: string, updateData: Partial<InsertCountry>): Promise<Country | undefined>;
  deleteCountry(id: string): Promise<boolean>;
  
  // Statistics
  getWineCount(): Promise<number>;
  getLocationCount(): Promise<number>;
  getPremiumWineCount(): Promise<number>;
  getTotalCollectionValue(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeCellarColumns();
    this.initializeCountries();
    this.initializeCellarSections();
  }

  private async initializeCellarColumns() {
    const existingColumns = await db.select().from(cellarColumns);
    if (existingColumns.length === 0) {
      const columnLabels = ['A', 'B', 'C', 'D', 'E']; // A-E as requested, not A-F
      for (const label of columnLabels) {
        await db.insert(cellarColumns).values({
          label,
          layers: 4
        });
      }
    }
  }

  private async initializeCountries() {
    const existingCountries = await db.select().from(countries);
    if (existingCountries.length === 0) {
      const defaultCountries = ['France', 'Spain', 'Italy', 'Austria', 'Belgium'];
      for (const name of defaultCountries) {
        await db.insert(countries).values({ name });
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

  // Cellar section operations
  async getCellarSection(column: string, layer: number): Promise<CellarSection | undefined> {
    const [section] = await db.select().from(cellarSections)
      .where(and(eq(cellarSections.column, column), eq(cellarSections.layer, layer)));
    return section || undefined;
  }

  async getAllCellarSections(): Promise<CellarSection[]> {
    return await db.select().from(cellarSections).orderBy(cellarSections.column, cellarSections.layer);
  }

  async createCellarSection(insertSection: InsertCellarSection): Promise<CellarSection> {
    const [section] = await db
      .insert(cellarSections)
      .values(insertSection)
      .returning();
    return section;
  }

  async updateCellarSection(id: string, updateData: Partial<InsertCellarSection>): Promise<CellarSection | undefined> {
    const [section] = await db
      .update(cellarSections)
      .set(updateData)
      .where(eq(cellarSections.id, id))
      .returning();
    return section || undefined;
  }

  async initializeCellarSections(): Promise<void> {
    const existingSections = await db.select().from(cellarSections);
    if (existingSections.length === 0) {
      const columnLabels = ['A', 'B', 'C', 'D', 'E']; // A-E as requested, not A-F
      const layers = [1, 2, 3, 4]; // 4 layers, 1=top, 4=bottom
      
      for (const column of columnLabels) {
        for (const layer of layers) {
          await db.insert(cellarSections).values({
            column,
            layer,
            isEnabled: "true"
          });
        }
      }
    }
  }

  // Country operations
  async getCountry(id: string): Promise<Country | undefined> {
    const [country] = await db.select().from(countries).where(eq(countries.id, id));
    return country || undefined;
  }

  async getAllCountries(): Promise<Country[]> {
    return await db.select().from(countries).orderBy(countries.name);
  }

  async createCountry(insertCountry: InsertCountry): Promise<Country> {
    const [country] = await db
      .insert(countries)
      .values(insertCountry)
      .returning();
    return country;
  }

  async updateCountry(id: string, updateData: Partial<InsertCountry>): Promise<Country | undefined> {
    const [country] = await db
      .update(countries)
      .set(updateData)
      .where(eq(countries.id, id))
      .returning();
    return country || undefined;
  }

  async deleteCountry(id: string): Promise<boolean> {
    const result = await db.delete(countries).where(eq(countries.id, id));
    return (result.rowCount || 0) > 0;
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
