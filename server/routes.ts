import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { analyzeWineLabel } from "./wineAnalysis";
import { insertWineSchema, insertCellarSchema, insertCountrySchema, insertCellarSectionSchema, transferWineSchema } from "@shared/schema";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Cellar routes
  app.get("/api/cellars", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cellars = await storage.getUserCellars(userId);
      res.json(cellars);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cellars" });
    }
  });

  app.get("/api/cellars/:cellarId", isAuthenticated, async (req, res) => {
    try {
      const { cellarId } = req.params;
      const cellar = await storage.getCellar(cellarId);
      if (!cellar) {
        return res.status(404).json({ error: "Cellar not found" });
      }
      res.json(cellar);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cellar" });
    }
  });

  app.post("/api/cellars", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCellarSchema.parse({ ...req.body, userId });
      const cellar = await storage.createCellar(validatedData);
      res.status(201).json(cellar);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid cellar data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create cellar" });
    }
  });

  app.patch("/api/cellars/:cellarId", isAuthenticated, async (req: any, res) => {
    try {
      const { cellarId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify cellar ownership
      const cellar = await storage.getCellar(cellarId);
      if (!cellar || cellar.userId !== userId) {
        return res.status(404).json({ error: "Cellar not found" });
      }

      const updateData = insertCellarSchema.omit({ userId: true }).partial().parse(req.body);
      const updatedCellar = await storage.updateCellar(cellarId, updateData);
      res.json(updatedCellar);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid cellar data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update cellar" });
    }
  });

  app.post("/api/cellars/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { cellars: cellarOrders } = req.body;
      
      if (!Array.isArray(cellarOrders)) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      await storage.updateCellarsOrder(userId, cellarOrders);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update cellar order" });
    }
  });

  // Wine routes (now cellar-specific)
  app.get("/api/cellars/:cellarId/wines", isAuthenticated, async (req, res) => {
    try {
      const { cellarId } = req.params;
      const wines = await storage.getCellarWines(cellarId);
      // Fetch country names for each wine
      const winesWithCountries = await Promise.all(
        wines.map(async (wine) => {
          if (wine.countryId) {
            const country = await storage.getCountry(wine.countryId);
            return { ...wine, countryName: country?.name || null };
          }
          return { ...wine, countryName: null };
        })
      );
      res.json(winesWithCountries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wines" });
    }
  });

  app.get("/api/cellars/:cellarId/wines/search", isAuthenticated, async (req, res) => {
    try {
      const { cellarId } = req.params;
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const wines = await storage.searchWines(cellarId, q);
      res.json(wines);
    } catch (error) {
      res.status(500).json({ error: "Failed to search wines" });
    }
  });

  app.get("/api/cellars/:cellarId/wines/location/:column/:layer", isAuthenticated, async (req, res) => {
    try {
      const { cellarId, column, layer } = req.params;
      const layerNum = parseInt(layer);
      if (isNaN(layerNum)) {
        return res.status(400).json({ error: "Layer must be a number" });
      }
      const wines = await storage.getWinesByLocation(cellarId, column, layerNum);
      res.json(wines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wines by location" });
    }
  });
  app.get("/api/wines/:id", isAuthenticated, async (req, res) => {
    try {
      const wine = await storage.getWine(req.params.id);
      if (!wine) {
        return res.status(404).json({ error: "Wine not found" });
      }
      res.json(wine);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wine" });
    }
  });

  app.post("/api/cellars/:cellarId/wines", isAuthenticated, async (req, res) => {
    try {
      const { cellarId } = req.params;
      const validatedData = insertWineSchema.parse({ ...req.body, cellarId });
      const wine = await storage.createWine(validatedData);
      res.status(201).json(wine);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid wine data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create wine" });
    }
  });

  // Bulk wine import endpoint
  app.post("/api/cellars/:cellarId/wines/bulk-import", isAuthenticated, async (req, res) => {
    try {
      const { cellarId } = req.params;
      const wines = req.body;
      
      if (!Array.isArray(wines)) {
        return res.status(400).json({ error: "Request body must be an array of wines" });
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < wines.length; i++) {
        try {
          const wineData = { ...wines[i], cellarId };
          
          // Convert empty strings to null for numeric fields
          if (wineData.buyingPrice === '') wineData.buyingPrice = null;
          if (wineData.marketValue === '') wineData.marketValue = null;
          if (wineData.year === '') wineData.year = null;
          if (wineData.layer === '') wineData.layer = null;
          if (wineData.quantity === '') wineData.quantity = 1;
          if (wineData.toDrinkFrom === '') wineData.toDrinkFrom = null;
          if (wineData.toDrinkUntil === '') wineData.toDrinkUntil = null;
          
          // Handle country lookup
          if (wineData.country && !wineData.countryId) {
            const countries = await storage.getAllCountries();
            const country = countries.find(c => 
              c.name.toLowerCase() === wineData.country.toLowerCase()
            );
            if (country) {
              wineData.countryId = country.id;
            }
            delete wineData.country;
          }
          
          const validatedData = insertWineSchema.parse(wineData);
          await storage.createWine(validatedData);
          successCount++;
        } catch (error) {
          failedCount++;
          if (error instanceof z.ZodError) {
            errors.push(`Row ${i + 1}: ${error.errors.map(e => e.message).join(', ')}`);
          } else {
            errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      res.json({
        success: successCount,
        failed: failedCount,
        errors: errors
      });
    } catch (error) {
      console.error("Bulk import error:", error);
      res.status(500).json({ error: "Failed to process bulk import" });
    }
  });

  app.post("/api/wines", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertWineSchema.parse(req.body);
      const wine = await storage.createWine(validatedData);
      res.status(201).json(wine);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid wine data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create wine" });
    }
  });

  app.put("/api/wines/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertWineSchema.partial().parse(req.body);
      const wine = await storage.updateWine(req.params.id, validatedData);
      if (!wine) {
        return res.status(404).json({ error: "Wine not found" });
      }
      res.json(wine);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid wine data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update wine" });
    }
  });

  app.delete("/api/cellars/:cellarId/wines/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteWine(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Wine not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete wine" });
    }
  });

  // Wine transfer route
  app.post("/api/wines/transfer", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = transferWineSchema.parse(req.body);
      const result = await storage.transferWine({
        ...validatedData,
        userId: req.user.claims.sub,
      });
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid transfer data", details: error.errors });
      }
      console.error("Transfer error:", error);
      res.status(500).json({ error: "Failed to transfer wine" });
    }
  });

  // Cellar layout routes (now cellar-specific)
  app.get("/api/cellars/:cellarId/columns", isAuthenticated, async (req, res) => {
    try {
      const { cellarId } = req.params;
      const columns = await storage.getCellarColumns(cellarId);
      res.json(columns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cellar columns" });
    }
  });

  app.get("/api/cellars/:cellarId/sections", isAuthenticated, async (req, res) => {
    try {
      const { cellarId } = req.params;
      const sections = await storage.getCellarSections(cellarId);
      res.json(sections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cellar sections" });
    }
  });

  // Update cellar layout configuration
  app.post("/api/cellars/:cellarId/layout", isAuthenticated, async (req, res) => {
    try {
      const { cellarId } = req.params;
      const { columnCount, rowCount } = req.body;
      
      // Validate input
      if (!columnCount || !rowCount || columnCount < 1 || rowCount < 1 || columnCount > 26) {
        return res.status(400).json({ error: "Invalid layout configuration. Columns must be between 1-26, rows must be at least 1." });
      }
      
      await storage.updateCellarLayout(cellarId, columnCount, rowCount);
      res.json({ message: "Cellar layout updated successfully" });
    } catch (error) {
      console.error("Error updating cellar layout:", error);
      res.status(500).json({ error: "Failed to update cellar layout" });
    }
  });

  app.put("/api/cellar/sections/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCellarSectionSchema.partial().parse(req.body);
      const section = await storage.updateCellarSection(req.params.id, validatedData);
      if (!section) {
        return res.status(404).json({ error: "Cellar section not found" });
      }
      res.json(section);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid section data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update cellar section" });
    }
  });

  // Country routes
  app.get("/api/countries", async (req, res) => {
    try {
      const countries = await storage.getAllCountries();
      res.json(countries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch countries" });
    }
  });

  app.get("/api/countries/:id", async (req, res) => {
    try {
      const country = await storage.getCountry(req.params.id);
      if (!country) {
        return res.status(404).json({ error: "Country not found" });
      }
      res.json(country);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch country" });
    }
  });

  app.post("/api/countries", async (req, res) => {
    try {
      const validatedData = insertCountrySchema.parse(req.body);
      const country = await storage.createCountry(validatedData);
      res.status(201).json(country);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid country data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create country" });
    }
  });

  app.put("/api/countries/:id", async (req, res) => {
    try {
      const validatedData = insertCountrySchema.partial().parse(req.body);
      const country = await storage.updateCountry(req.params.id, validatedData);
      if (!country) {
        return res.status(404).json({ error: "Country not found" });
      }
      res.json(country);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid country data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update country" });
    }
  });

  app.delete("/api/countries/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCountry(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Country not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete country" });
    }
  });

  // Statistics routes (now cellar-specific)
  app.get("/api/cellars/:cellarId/stats", isAuthenticated, async (req, res) => {
    try {
      const { cellarId } = req.params;
      const [totalWines, locations, premiumWines, totalValue, totalBottles] = await Promise.all([
        storage.getCellarWineCount(cellarId),
        storage.getCellarLocationCount(cellarId),
        storage.getCellarPremiumWineCount(cellarId),
        storage.getCellarTotalValue(cellarId),
        storage.getCellarTotalBottles(cellarId)
      ]);

      res.json({
        totalWines,
        locations,
        premiumWines,
        totalValue,
        totalBottles
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Local wine dataset search
  let wineDataset: any[] = [];
  
  // Load wine dataset on server start
  try {
    const datasetPath = path.join(process.cwd(), 'server', 'wine-dataset.json');
    if (fs.existsSync(datasetPath)) {
      const datasetContent = fs.readFileSync(datasetPath, 'utf8');
      wineDataset = JSON.parse(datasetContent);
      console.log(`Loaded ${wineDataset.length} wines from dataset`);
    } else {
      console.log("Wine dataset file not found at:", datasetPath);
    }
  } catch (error) {
    console.error("Error loading wine dataset:", error);
  }

  app.get("/api/wine-search/:query", async (req, res) => {
    try {
      const { query } = req.params;
      const searchTerm = query.toLowerCase().trim();
      
      if (!searchTerm || searchTerm.length < 2) {
        return res.json([]);
      }
      
      // Search through the wine dataset
      const results = wineDataset
        .filter(wine => {
          const title = (wine.title || '').toLowerCase();
          const winery = (wine.winery || '').toLowerCase();
          const variety = (wine.variety || '').toLowerCase();
          const country = (wine.country || '').toLowerCase();
          const province = (wine.province || '').toLowerCase();
          
          return title.includes(searchTerm) || 
                 winery.includes(searchTerm) || 
                 variety.includes(searchTerm) ||
                 country.includes(searchTerm) ||
                 province.includes(searchTerm);
        })
        .slice(0, 10) // Limit to top 10 results
        .map(wine => ({
          name: wine.title,
          producer: wine.winery,
          year: wine.title.match(/\b(19|20)\d{2}\b/)?.[0] ? parseInt(wine.title.match(/\b(19|20)\d{2}\b/)[0]) : null,
          type: mapWineVarietyToType(wine.variety),
          region: wine.region_1 || wine.province,
          country: wine.country,
          buyingPrice: wine.price,
          marketValue: null,
          description: wine.description,
          points: wine.points,
          variety: wine.variety
        }));
      
      res.json(results);
    } catch (error) {
      console.error("Wine dataset search error:", error);
      res.json([]);
    }
  });

  // Wine label analysis route
  app.post("/api/analyze-wine-label", isAuthenticated, async (req, res) => {
    try {
      const { image } = req.body;
      
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: "Image data is required" 
        });
      }

      const result = await analyzeWineLabel(image);
      res.json(result);
    } catch (error) {
      console.error("Wine label analysis error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to analyze wine label" 
      });
    }
  });

  // Helper function to map wine varieties to our wine types
  function mapWineVarietyToType(variety: string): string {
    if (!variety) return '';
    
    const varietyLower = variety.toLowerCase();
    
    if (varietyLower.includes('cabernet') || varietyLower.includes('merlot') || 
        varietyLower.includes('pinot noir') || varietyLower.includes('syrah') ||
        varietyLower.includes('rhône') || varietyLower.includes('red blend') ||
        varietyLower.includes('bordeaux') || varietyLower.includes('sangiovese') ||
        varietyLower.includes('tempranillo') || varietyLower.includes('chianti')) {
      return 'red';
    }
    
    if (varietyLower.includes('chardonnay') || varietyLower.includes('sauvignon blanc') ||
        varietyLower.includes('pinot grigio') || varietyLower.includes('riesling') ||
        varietyLower.includes('white blend') || varietyLower.includes('albariño') ||
        varietyLower.includes('gewürztraminer') || varietyLower.includes('viognier')) {
      return 'white';
    }
    
    if (varietyLower.includes('champagne') || varietyLower.includes('cava') ||
        varietyLower.includes('prosecco')) {
      return 'champagne';
    }
    
    if (varietyLower.includes('sparkling') || varietyLower.includes('crémant')) {
      return 'sparkling';
    }
    
    if (varietyLower.includes('rosé') || varietyLower.includes('rose')) {
      return 'rosé';
    }
    
    // Default based on common red varieties
    return 'red';
  }

  const httpServer = createServer(app);
  return httpServer;
}
