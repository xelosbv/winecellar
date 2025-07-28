import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWineSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Wine routes
  app.get("/api/wines", async (req, res) => {
    try {
      const wines = await storage.getAllWines();
      res.json(wines);
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

  // External wine API search
  app.get("/api/wine-search/:query", async (req, res) => {
    try {
      const { query } = req.params;
      
      // Using OpenWineDatabase API or similar
      const response = await fetch(`https://api.openwinedatabase.com/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        // Fallback to empty results if API is unavailable
        return res.json([]);
      }
      
      const data = await response.json();
      res.json(data.results || []);
    } catch (error) {
      console.error("Wine API search error:", error);
      // Return empty results instead of error to gracefully handle API failures
      res.json([]);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
