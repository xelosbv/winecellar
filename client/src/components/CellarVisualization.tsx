import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Wine as WineType, CellarSection } from "@shared/schema";
import { Edit, Plus } from "lucide-react";
import { Link } from "wouter";
import AddWineModal from "./AddWineModal";

interface CellarLocation {
  column: string;
  layer: number;
  wineCount: number;
}

interface CellarVisualizationProps {
  onLocationClick?: (column: string, layer: number) => void;
}

export default function CellarVisualization({ onLocationClick }: CellarVisualizationProps) {
  const [isAddWineModalOpen, setIsAddWineModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{column: string, layer: number} | null>(null);

  const { data: wines = [] } = useQuery<WineType[]>({
    queryKey: ["/api/wines"],
  });

  const { data: cellarSections = [] } = useQuery<CellarSection[]>({
    queryKey: ["/api/cellar/sections"],
  });

  // Create a map of location to wine count
  const locationMap = new Map<string, number>();
  wines.forEach((wine) => {
    const key = `${wine.column}-${wine.layer}`;
    locationMap.set(key, (locationMap.get(key) || 0) + 1);
  });

  // Filter only enabled sections and group by column
  const enabledSections = cellarSections.filter(section => section.isEnabled === "true");
  const groupedSections = enabledSections.reduce((acc, section) => {
    if (!acc[section.column]) {
      acc[section.column] = [];
    }
    acc[section.column].push(section);
    return acc;
  }, {} as Record<string, CellarSection[]>);

  // Get unique columns and sort them
  const enabledColumns = Object.keys(groupedSections).sort();

  const getLocationCount = (column: string, layer: number): number => {
    return locationMap.get(`${column}-${layer}`) || 0;
  };

  const LocationCell = ({ section }: { section: CellarSection }) => {
    const count = getLocationCount(section.column, section.layer);
    const hasWines = count > 0;

    const handleClick = () => {
      if (hasWines) {
        // Filter wines by this location when clicking on numbered cells
        onLocationClick?.(section.column, section.layer);
      } else {
        // Add wine to empty locations
        setSelectedLocation({ column: section.column, layer: section.layer });
        setIsAddWineModalOpen(true);
      }
    };

    return (
      <div
        className={`h-8 rounded border cursor-pointer transition-colors flex items-center justify-center text-xs font-medium ${
          hasWines
            ? "bg-gradient-to-b from-wine/20 to-wine/40 border-wine/30 text-wine hover:from-wine/30 hover:to-wine/50"
            : "bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200"
        }`}
        title={`${section.column}-${section.layer}: ${count} wines`}
        onClick={handleClick}
      >
        {hasWines ? count : <Plus className="w-3 h-3" />}
      </div>
    );
  };

  return (
    <>
      <Card className="lg:col-span-2 shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Cellar Layout</h2>
            <Link href="/settings?tab=cellar">
              <Button variant="ghost" className="text-sm text-wine hover:text-wine-light">
                <Edit className="w-4 h-4 mr-1" />
                Edit Layout
              </Button>
            </Link>
          </div>
          
          <div className={`grid gap-2 mb-4`} style={{ gridTemplateColumns: `repeat(${enabledColumns.length}, minmax(0, 1fr))` }}>
            {enabledColumns.map((column) => (
              <div key={column} className="text-center">
                <div className="text-xs font-medium text-gray-600 mb-2">{column}</div>
                <div className="space-y-1">
                  {groupedSections[column]
                    ?.sort((a, b) => b.layer - a.layer) // Sort layers from 4 to 1 (top to bottom)
                    .map((section) => (
                      <LocationCell key={`${section.column}-${section.layer}`} section={section} />
                    ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
            <span>Layer 4 (Top)</span>
            <span>Layer 1 (Bottom)</span>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Legend</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gradient-to-b from-wine/20 to-wine/40 rounded border border-wine/30 mr-2"></div>
                <span className="text-gray-600">Has wines</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-100 rounded border border-gray-200 mr-2"></div>
                <span className="text-gray-600">Empty slot</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AddWineModal 
        isOpen={isAddWineModalOpen} 
        onClose={() => {
          setIsAddWineModalOpen(false);
          setSelectedLocation(null);
        }}
        prefilledLocation={selectedLocation}
      />
    </>
  );
}
