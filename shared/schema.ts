import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cellars = pgTable("cellars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const countries = pgTable("countries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wines = pgTable("wines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cellarId: varchar("cellar_id").notNull().references(() => cellars.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  producer: text("producer"),
  year: integer("year"),
  type: text("type").notNull(), // red, white, rosé, champagne, sparkling
  region: text("region"),
  countryId: varchar("country_id").references(() => countries.id),
  column: text("column").notNull(), // A-F
  layer: integer("layer").notNull(), // 1-4
  price: decimal("price", { precision: 10, scale: 2 }),
  quantity: integer("quantity").notNull().default(1), // Number of bottles
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cellarColumns = pgTable("cellar_columns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cellarId: varchar("cellar_id").notNull().references(() => cellars.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // A, B, C, D, E, F
  layers: integer("layers").notNull().default(4),
  isEnabled: text("is_enabled").notNull().default("true"), // "true" or "false" as text
});

export const cellarSections = pgTable("cellar_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cellarId: varchar("cellar_id").notNull().references(() => cellars.id, { onDelete: "cascade" }),
  column: text("column").notNull(), // A, B, C, D, E, F
  layer: integer("layer").notNull(), // 1, 2, 3, 4 (1=top, 4=bottom)
  isEnabled: text("is_enabled").notNull().default("true"), // "true" or "false" as text
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  cellars: many(cellars),
}));

export const cellarsRelations = relations(cellars, ({ one, many }) => ({
  user: one(users, {
    fields: [cellars.userId],
    references: [users.id],
  }),
  wines: many(wines),
  columns: many(cellarColumns),
  sections: many(cellarSections),
}));

export const winesRelations = relations(wines, ({ one }) => ({
  cellar: one(cellars, {
    fields: [wines.cellarId],
    references: [cellars.id],
  }),
  country: one(countries, {
    fields: [wines.countryId],
    references: [countries.id],
  }),
}));

export const cellarColumnsRelations = relations(cellarColumns, ({ one }) => ({
  cellar: one(cellars, {
    fields: [cellarColumns.cellarId],
    references: [cellars.id],
  }),
}));

export const cellarSectionsRelations = relations(cellarSections, ({ one }) => ({
  cellar: one(cellars, {
    fields: [cellarSections.cellarId],
    references: [cellars.id],
  }),
}));

export const countriesRelations = relations(countries, ({ many }) => ({
  wines: many(wines),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCellarSchema = createInsertSchema(cellars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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

export const insertCellarSectionSchema = createInsertSchema(cellarSections).omit({
  id: true,
  createdAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertCellar = z.infer<typeof insertCellarSchema>;
export type Cellar = typeof cellars.$inferSelect;
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Country = typeof countries.$inferSelect;
export type InsertWine = z.infer<typeof insertWineSchema>;
export type Wine = typeof wines.$inferSelect;
export type InsertCellarColumn = z.infer<typeof insertCellarColumnSchema>;
export type CellarColumn = typeof cellarColumns.$inferSelect;
export type InsertCellarSection = z.infer<typeof insertCellarSectionSchema>;
export type CellarSection = typeof cellarSections.$inferSelect;

// API response types for wine search
export interface WineSearchResult {
  name: string;
  producer?: string;
  year?: number;
  type?: string;
  region?: string;
  country?: string;
  price?: number;
  description?: string;
  points?: number;
  variety?: string;
}
