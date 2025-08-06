import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Wine as WineType } from "@shared/schema";
import { Wine, MapPin, Calendar, Package, DollarSign, Globe } from "lucide-react";

interface WineDetailsModalProps {
  wine: WineType;
  isOpen: boolean;
  onClose: () => void;
}

const wineTypeColors = {
  red: "bg-red-100 text-red-800",
  white: "bg-yellow-100 text-yellow-800",
  rosé: "bg-pink-100 text-pink-800",
  champagne: "bg-purple-100 text-purple-800",
  sparkling: "bg-blue-100 text-blue-800",
};

export default function WineDetailsModal({ wine, isOpen, onClose }: WineDetailsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-wine/10 rounded-lg flex items-center justify-center">
              <Wine className="text-wine w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{wine.name}</div>
              <div className="text-sm text-gray-500 font-normal">{wine.producer}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wine Type Badge */}
          <div className="flex items-center gap-2">
            <Badge 
              className={`${wineTypeColors[wine.type as keyof typeof wineTypeColors] || "bg-gray-100 text-gray-800"}`}
            >
              {wine.type?.charAt(0).toUpperCase() + wine.type?.slice(1)} Wine
            </Badge>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Year */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Year</div>
                <div className="font-medium">{wine.year || "N/A"}</div>
              </div>
            </div>

            {/* Country */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Country</div>
                <div className="font-medium">{(wine as any).countryName || "N/A"}</div>
              </div>
            </div>

            {/* Region */}
            {wine.region && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Region</div>
                  <div className="font-medium">{wine.region}</div>
                </div>
              </div>
            )}

            {/* Grapes */}
            {wine.grapes && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Wine className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Grapes/Varietals</div>
                  <div className="font-medium">{wine.grapes}</div>
                </div>
              </div>
            )}

            {/* Volume */}
            {wine.volume && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Volume</div>
                  <div className="font-medium">{wine.volume}</div>
                </div>
              </div>
            )}

            {/* Drinking Window From */}
            {wine.toDrinkFrom && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Drink From</div>
                  <div className="font-medium">{wine.toDrinkFrom}</div>
                </div>
              </div>
            )}

            {/* Drinking Window Until */}
            {wine.toDrinkUntil && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Drink Until</div>
                  <div className="font-medium">{wine.toDrinkUntil}</div>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Bottles</div>
                <div className="font-medium">
                  {wine.quantity || 1} bottle{(wine.quantity || 1) !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Price */}
            {wine.price && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Price per bottle</div>
                  <div className="font-medium">${parseFloat(wine.price).toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* Total Value */}
            {wine.price && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Value</div>
                  <div className="font-medium text-green-600">
                    ${(parseFloat(wine.price) * (wine.quantity || 1)).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {wine.notes && (
            <div>
              <div className="text-sm text-gray-500 mb-2">Notes</div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                {wine.notes}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}