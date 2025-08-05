import { 
  users, cellars, countries, wines, cellarColumns, cellarSections, 
  type User, type UpsertUser, type Cellar, type InsertCellar, type Country, type Wine, 
  type CellarColumn, type CellarSection, type InsertCountry, type InsertWine, 
  type InsertCellarColumn, type InsertCellarSection 
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Cellar operations
  getCellar(id: string): Promise<Cellar | undefined>;
  getUserCellars(userId: string): Promise<Cellar[]>;
  createCellar(cellar: InsertCellar): Promise<Cellar>;
  updateCellar(id: string, cellar: Partial<InsertCellar>): Promise<Cellar | undefined>;
  deleteCellar(id: string): Promise<boolean>;
  
  // Wine operations  
  getWine(id: string): Promise<Wine | undefined>;
  getCellarWines(cellarId: string): Promise<Wine[]>;
  getWinesByLocation(cellarId: string, column: string, layer: number): Promise<Wine[]>;
  createWine(wine: InsertWine): Promise<Wine>;
  updateWine(id: string, wine: Partial<InsertWine>): Promise<Wine | undefined>;
  deleteWine(id: string): Promise<boolean>;
  searchWines(cellarId: string, query: string): Promise<Wine[]>;
  
  // Cellar column operations
  getCellarColumn(cellarId: string, label: string): Promise<CellarColumn | undefined>;
  getCellarColumns(cellarId: string): Promise<CellarColumn[]>;
  createCellarColumn(column: InsertCellarColumn): Promise<CellarColumn>;
  updateCellarColumn(id: string, column: Partial<InsertCellarColumn>): Promise<CellarColumn | undefined>;
  
  // Cellar section operations
  getCellarSection(cellarId: string, column: string, layer: number): Promise<CellarSection | undefined>;
  getCellarSections(cellarId: string): Promise<CellarSection[]>;
  createCellarSection(section: InsertCellarSection): Promise<CellarSection>;
  updateCellarSection(id: string, section: Partial<InsertCellarSection>): Promise<CellarSection | undefined>;
  initializeCellarLayout(cellarId: string): Promise<void>;
  
  // Country operations
  getCountry(id: string): Promise<Country | undefined>;
  getAllCountries(): Promise<Country[]>;
  createCountry(insertCountry: InsertCountry): Promise<Country>;
  updateCountry(id: string, updateData: Partial<InsertCountry>): Promise<Country | undefined>;
  deleteCountry(id: string): Promise<boolean>;
  
  // Statistics
  getCellarWineCount(cellarId: string): Promise<number>;
  getCellarLocationCount(cellarId: string): Promise<number>;
  getCellarPremiumWineCount(cellarId: string): Promise<number>;
  getCellarTotalValue(cellarId: string): Promise<number>;
  getCellarTotalBottles(cellarId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeCountries();
  }

  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Cellar operations
  async getCellar(id: string): Promise<Cellar | undefined> {
    const [cellar] = await db.select().from(cellars).where(eq(cellars.id, id));
    return cellar;
  }

  async getUserCellars(userId: string): Promise<Cellar[]> {
    return await db.select().from(cellars).where(eq(cellars.userId, userId));
  }

  async createCellar(cellar: InsertCellar): Promise<Cellar> {
    const [newCellar] = await db.insert(cellars).values(cellar).returning();
    // Initialize the cellar layout after creating the cellar
    await this.initializeCellarLayout(newCellar.id);
    return newCellar;
  }

  async updateCellar(id: string, cellar: Partial<InsertCellar>): Promise<Cellar | undefined> {
    const [updated] = await db
      .update(cellars)
      .set({ ...cellar, updatedAt: new Date() })
      .where(eq(cellars.id, id))
      .returning();
    return updated;
  }

  async deleteCellar(id: string): Promise<boolean> {
    const result = await db.delete(cellars).where(eq(cellars.id, id));
    return result.rowCount > 0;
  }

  // Wine operations
  async getWine(id: string): Promise<Wine | undefined> {
    const [wine] = await db.select().from(wines).where(eq(wines.id, id));
    return wine;
  }

  async getCellarWines(cellarId: string): Promise<Wine[]> {
    return await db.select().from(wines).where(eq(wines.cellarId, cellarId));
  }

  async getWinesByLocation(cellarId: string, column: string, layer: number): Promise<Wine[]> {
    return await db
      .select()
      .from(wines)
      .where(and(eq(wines.cellarId, cellarId), eq(wines.column, column), eq(wines.layer, layer)));
  }

  async createWine(wine: InsertWine): Promise<Wine> {
    const [created] = await db.insert(wines).values(wine).returning();
    return created;
  }

  async updateWine(id: string, wine: Partial<InsertWine>): Promise<Wine | undefined> {
    const [updated] = await db
      .update(wines)
      .set(wine)
      .where(eq(wines.id, id))
      .returning();
    return updated;
  }

  async deleteWine(id: string): Promise<boolean> {
    const result = await db.delete(wines).where(eq(wines.id, id));
    return result.rowCount > 0;
  }

  async searchWines(cellarId: string, query: string): Promise<Wine[]> {
    return await db
      .select()
      .from(wines)
      .where(
        and(
          eq(wines.cellarId, cellarId),
          or(
            ilike(wines.name, `%${query}%`),
            ilike(wines.producer, `%${query}%`),
            ilike(wines.region, `%${query}%`),
            ilike(wines.notes, `%${query}%`)
          )
        )
      );
  }

  // Cellar column operations
  async getCellarColumn(cellarId: string, label: string): Promise<CellarColumn | undefined> {
    const [column] = await db
      .select()
      .from(cellarColumns)
      .where(and(eq(cellarColumns.cellarId, cellarId), eq(cellarColumns.label, label)));
    return column;
  }

  async getCellarColumns(cellarId: string): Promise<CellarColumn[]> {
    return await db.select().from(cellarColumns).where(eq(cellarColumns.cellarId, cellarId));
  }

  async createCellarColumn(column: InsertCellarColumn): Promise<CellarColumn> {
    const [created] = await db.insert(cellarColumns).values(column).returning();
    return created;
  }

  async updateCellarColumn(id: string, column: Partial<InsertCellarColumn>): Promise<CellarColumn | undefined> {
    const [updated] = await db
      .update(cellarColumns)
      .set(column)
      .where(eq(cellarColumns.id, id))
      .returning();
    return updated;
  }

  // Cellar section operations
  async getCellarSection(cellarId: string, column: string, layer: number): Promise<CellarSection | undefined> {
    const [section] = await db
      .select()
      .from(cellarSections)
      .where(
        and(
          eq(cellarSections.cellarId, cellarId),
          eq(cellarSections.column, column),
          eq(cellarSections.layer, layer)
        )
      );
    return section;
  }

  async getCellarSections(cellarId: string): Promise<CellarSection[]> {
    return await db.select().from(cellarSections).where(eq(cellarSections.cellarId, cellarId));
  }

  async createCellarSection(section: InsertCellarSection): Promise<CellarSection> {
    const [created] = await db.insert(cellarSections).values(section).returning();
    return created;
  }

  async updateCellarSection(id: string, section: Partial<InsertCellarSection>): Promise<CellarSection | undefined> {
    const [updated] = await db
      .update(cellarSections)
      .set(section)
      .where(eq(cellarSections.id, id))
      .returning();
    return updated;
  }

  async initializeCellarLayout(cellarId: string): Promise<void> {
    // Initialize columns A-E
    const columnLabels = ['A', 'B', 'C', 'D', 'E'];
    for (const label of columnLabels) {
      const existing = await this.getCellarColumn(cellarId, label);
      if (!existing) {
        await this.createCellarColumn({
          cellarId,
          label,
          layers: 4,
          isEnabled: 'true'
        });
      }
    }

    // Initialize sections for each column and layer
    for (const column of columnLabels) {
      for (let layer = 1; layer <= 4; layer++) {
        const existing = await this.getCellarSection(cellarId, column, layer);
        if (!existing) {
          await this.createCellarSection({
            cellarId,
            column,
            layer,
            isEnabled: 'true'
          });
        }
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

  // Country operations
  async getCountry(id: string): Promise<Country | undefined> {
    const [country] = await db.select().from(countries).where(eq(countries.id, id));
    return country;
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
    return country;
  }

  async deleteCountry(id: string): Promise<boolean> {
    const result = await db.delete(countries).where(eq(countries.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Statistics (cellar-specific)
  async getCellarWineCount(cellarId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(wines)
      .where(eq(wines.cellarId, cellarId));
    return result.count;
  }

  async getCellarLocationCount(cellarId: string): Promise<number> {
    const [result] = await db.select({ 
      count: sql<number>`count(distinct (${wines.column} || '-' || ${wines.layer}))` 
    })
    .from(wines)
    .where(eq(wines.cellarId, cellarId));
    return result.count;
  }

  async getCellarPremiumWineCount(cellarId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(wines)
      .where(and(eq(wines.cellarId, cellarId), sql`${wines.price} > 100`));
    return result.count;
  }

  async getCellarTotalValue(cellarId: string): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${wines.price} * ${wines.quantity}), 0)` })
      .from(wines)
      .where(eq(wines.cellarId, cellarId));
    return result.total;
  }

  async getCellarTotalBottles(cellarId: string): Promise<number> {
    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${wines.quantity}), 0)` })
      .from(wines)
      .where(eq(wines.cellarId, cellarId));
    return result.total;
  }
}

export const storage = new DatabaseStorage();