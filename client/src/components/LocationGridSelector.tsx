import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wine, Plus, X } from "lucide-react";
import { CellarSection, Wine as WineType } from "@shared/schema";

interface LocationGridSelectorProps {
  selectedColumn?: string;
  selectedLayer?: number;
  onLocationSelect: (column: string, layer: number) => void;
  className?: string;
}

export default function LocationGridSelector({ 
  selectedColumn, 
  selectedLayer, 
  onLocationSelect,
  className = ""
}: LocationGridSelectorProps) {
  const { data: cellarSections = [] } = useQuery<CellarSection[]>({
    queryKey: ["/api/cellar/sections"],
  });

  const { data: wines = [] } = useQuery<WineType[]>({
    queryKey: ["/api/wines"],
  });

  // Create a map of location occupancy
  const locationMap = new Map<string, number>();
  wines.forEach(wine => {
    const key = `${wine.column}-${wine.layer}`;
    const bottleCount = wine.quantity || 1;
    locationMap.set(key, (locationMap.get(key) || 0) + bottleCount);
  });

  const getLocationCount = (column: string, layer: number): number => {
    return locationMap.get(`${column}-${layer}`) || 0;
  };

  // Group all sections by column (both enabled and disabled)
  const groupedSections = cellarSections.reduce((acc, section) => {
    if (!acc[section.column]) {
      acc[section.column] = [];
    }
    acc[section.column].push(section);
    return acc;
  }, {} as Record<string, CellarSection[]>);

  // Get columns that have at least one enabled section
  const enabledColumns = Object.keys(groupedSections)
    .filter(column => groupedSections[column].some(section => section.isEnabled === "true"))
    .sort();

  const LocationCell = ({ section }: { section: CellarSection }) => {
    const count = getLocationCount(section.column, section.layer);
    const hasWines = count > 0;
    const isEnabled = section.isEnabled === "true";
    const isSelected = selectedColumn === section.column && selectedLayer === section.layer;

    const handleClick = () => {
      if (!isEnabled || hasWines) {
        return; // Don't allow selection of disabled or occupied locations
      }
      onLocationSelect(section.column, section.layer);
    };

    return (
      <div
        className={`h-12 w-12 rounded border transition-all duration-200 flex items-center justify-center text-xs font-medium cursor-pointer ${
          !isEnabled
            ? "bg-gray-50 border-gray-300 text-gray-300 cursor-not-allowed" // Disabled state
            : hasWines
            ? "bg-gradient-to-b from-wine/20 to-wine/40 border-wine/30 text-wine cursor-not-allowed" // Occupied
            : isSelected
            ? "bg-wine border-wine text-white shadow-lg scale-105" // Selected
            : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 hover:border-gray-300 hover:scale-105" // Available
        }`}
        title={
          !isEnabled 
            ? `${section.column}-${section.layer}: Disabled`
            : hasWines
            ? `${section.column}-${section.layer}: ${count} bottle${count !== 1 ? 's' : ''} (occupied)`
            : `${section.column}-${section.layer}: Available`
        }
        onClick={handleClick}
      >
        {!isEnabled ? (
          "✕"
        ) : hasWines ? (
          count
        ) : isSelected ? (
          "✓"
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </div>
    );
  };

  return (
    <Card className={`shadow-sm border border-gray-200 ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900">Select Wine Location</h3>
            {selectedColumn && selectedLayer && (
              <Badge className="bg-wine/10 text-wine border border-wine/30">
                Selected: {selectedColumn}-{selectedLayer}
              </Badge>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-100 rounded border border-gray-200 mr-2 flex items-center justify-center">
                <Plus className="w-3 h-3" />
              </div>
              <span>Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-wine border-wine text-white rounded mr-2 flex items-center justify-center text-xs">✓</div>
              <span>Selected</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gradient-to-b from-wine/20 to-wine/40 rounded border border-wine/30 mr-2"></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-50 rounded border border-gray-300 mr-2 flex items-center justify-center text-gray-300 text-xs">✕</div>
              <span>Disabled</span>
            </div>
          </div>

          {/* Grid */}
          <div className="space-y-3">
            {/* Column labels on top */}
            <div className="flex justify-between items-center text-xs text-gray-500 ml-8">
              <span>Column A</span>
              <span>Column E</span>
            </div>
            
            {/* Grid layout: layers vertically, columns horizontally */}
            <div className="flex gap-2">
              {/* Layer labels on the left */}
              <div className="flex flex-col gap-1 pt-6">
                {[1, 2, 3, 4].map(layer => (
                  <div key={layer} className="h-12 w-6 flex items-center justify-center text-xs text-gray-500">
                    {layer}
                  </div>
                ))}
              </div>
              
              {/* Grid cells */}
              <div className="flex flex-col gap-1">
                {/* Column letters at top */}
                <div className="flex gap-1 mb-1">
                  {enabledColumns.map(column => (
                    <div key={column} className="w-12 h-6 flex items-center justify-center text-sm font-medium text-gray-700">
                      {column}
                    </div>
                  ))}
                </div>
                
                {/* Grid rows (one per layer) */}
                {[1, 2, 3, 4].map(layer => (
                  <div key={layer} className="flex gap-1">
                    {enabledColumns.map(column => {
                      const section = groupedSections[column]?.find(s => s.layer === layer);
                      return section ? (
                        <LocationCell key={`${section.column}-${section.layer}`} section={section} />
                      ) : (
                        <div key={`${column}-${layer}`} className="h-12 w-12 bg-gray-100 border border-gray-200 rounded opacity-50"></div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {enabledColumns.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <Wine className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No cellar sections configured</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}