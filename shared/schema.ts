import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const countries = pgTable("countries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wines = pgTable("wines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  producer: text("producer"),
  year: integer("year"),
  type: text("type").notNull(), // red, white, rosé, champagne, sparkling
  region: text("region"),
  countryId: varchar("country_id").references(() => countries.id),
  column: text("column").notNull(), // A-F
  layer: integer("layer").notNull(), // 1-4
  price: decimal("price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cellarColumns = pgTable("cellar_columns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label").notNull(), // A, B, C, D, E, F
  layers: integer("layers").notNull().default(4),
});

// Relations
export const winesRelations = relations(wines, ({ one }) => ({
  country: one(countries, {
    fields: [wines.countryId],
    references: [countries.id],
  }),
}));

export const countriesRelations = relations(countries, ({ many }) => ({
  wines: many(wines),
}));

export const insertCountrySchema = createInsertSchema(countries).omit({
  id: true,
  createdAt: true,
});

export const insertWineSchema = createInsertSchema(wines).omit({
  id: true,
  createdAt: true,
});

export const insertCellarColumnSchema = createInsertSchema(cellarColumns).omit({
  id: true,
});

export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Country = typeof countries.$inferSelect;
export type InsertWine = z.infer<typeof insertWineSchema>;
export type Wine = typeof wines.$inferSelect;
export type InsertCellarColumn = z.infer<typeof insertCellarColumnSchema>;
export type CellarColumn = typeof cellarColumns.$inferSelect;

// API response types for wine search
export interface WineSearchResult {
  name: string;
  producer?: string;
  year?: number;
  type?: string;
  region?: string;
  description?: string;
}
