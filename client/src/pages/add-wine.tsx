import { useState } from "react";
import Header from "@/components/Header";
import AddWineModal from "@/components/AddWineModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wine } from "lucide-react";

export default function AddWine() {
  const [isAddWineModalOpen, setIsAddWineModalOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAddWine={() => setIsAddWineModalOpen(true)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAddWineModalOpen && (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Wine className="w-16 h-16 text-wine mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Add Wine to Collection</h2>
              <p className="text-gray-600 mb-6">Click the button below to start adding a new wine to your cellar.</p>
              <Button 
                className="bg-wine text-white hover:bg-wine-light"
                onClick={() => setIsAddWineModalOpen(true)}
              >
                <Wine className="w-4 h-4 mr-2" />
                Add New Wine
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <AddWineModal 
        isOpen={isAddWineModalOpen} 
        onClose={() => setIsAddWineModalOpen(false)} 
      />
    </div>
  );
}
