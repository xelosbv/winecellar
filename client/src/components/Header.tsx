import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Wine, Plus, User } from "lucide-react";

interface HeaderProps {
  onAddWine: () => void;
}

export default function Header({ onAddWine }: HeaderProps) {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard" },
    { path: "/wines", label: "My Wines" },
    { path: "/add-wine", label: "Add Wine" },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Wine className="text-wine text-2xl mr-3" />
            <h1 className="text-xl font-bold text-gray-900">WineCellar Pro</h1>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  className={`font-medium pb-2 ${
                    location === item.path
                      ? "text-wine border-b-2 border-wine"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {item.label}
                </a>
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center space-x-4">
            <Button 
              onClick={onAddWine}
              className="bg-wine text-white hover:bg-wine-light"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Wine
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
