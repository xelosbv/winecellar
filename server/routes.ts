import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWineSchema, insertCountrySchema, insertCellarSectionSchema } from "@shared/schema";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Wine routes
  app.get("/api/wines", async (req, res) => {
    try {
      const wines = await storage.getAllWines();
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

  app.get("/api/wines/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const wines = await storage.searchWines(q);
      res.json(wines);
    } catch (error) {
      res.status(500).json({ error: "Failed to search wines" });
    }
  });

  app.get("/api/wines/location/:column/:layer", async (req, res) => {
    try {
      const { column, layer } = req.params;
      const layerNum = parseInt(layer);
      if (isNaN(layerNum)) {
        return res.status(400).json({ error: "Layer must be a number" });
      }
      const wines = await storage.getWinesByLocation(column, layerNum);
      res.json(wines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wines by location" });
    }
  });

  app.get("/api/wines/:id", async (req, res) => {
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

  app.post("/api/wines", async (req, res) => {
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

  app.put("/api/wines/:id", async (req, res) => {
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

  app.delete("/api/wines/:id", async (req, res) => {
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

  // Cellar routes
  app.get("/api/cellar/columns", async (req, res) => {
    try {
      const columns = await storage.getAllCellarColumns();
      res.json(columns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cellar columns" });
    }
  });

  app.get("/api/cellar/sections", async (req, res) => {
    try {
      const sections = await storage.getAllCellarSections();
      res.json(sections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cellar sections" });
    }
  });

  app.put("/api/cellar/sections/:id", async (req, res) => {
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

  // Statistics routes
  app.get("/api/stats", async (req, res) => {
    try {
      const [totalWines, locations, premiumWines, totalValue] = await Promise.all([
        storage.getWineCount(),
        storage.getLocationCount(),
        storage.getPremiumWineCount(),
        storage.getTotalCollectionValue()
      ]);

      res.json({
        totalWines,
        locations,
        premiumWines,
        totalValue
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
          price: wine.price,
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
