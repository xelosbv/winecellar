import { useState } from "react";
import { useParams } from "wouter";
import Header from "@/components/Header";
import WineTable from "@/components/WineTable";
import AddWineModal from "@/components/AddWineModal";

export default function Wines() {
  const { cellarId } = useParams();
  const [isAddWineModalOpen, setIsAddWineModalOpen] = useState(false);

  if (!cellarId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header cellarId={cellarId} onAddWine={() => setIsAddWineModalOpen(true)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Wine Collection</h1>
          <p className="text-gray-600 mt-2">Manage and explore your wine inventory</p>
        </div>

        <WineTable 
          cellarId={cellarId}
          locationFilter={null}
          onClearLocationFilter={() => {}}
        />
      </main>

      <AddWineModal 
        cellarId={cellarId}
        isOpen={isAddWineModalOpen} 
        onClose={() => setIsAddWineModalOpen(false)} 
      />
    </div>
  );
}
