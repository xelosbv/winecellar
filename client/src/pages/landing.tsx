import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wine, Users, Database, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-wine-50 to-wine-100 dark:from-wine-950 dark:to-wine-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Wine className="h-16 w-16 text-wine-600 dark:text-wine-400" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-wine-900 dark:text-wine-100 mb-4">
            Wine Cellar Manager
          </h1>
          <p className="text-xl text-wine-700 dark:text-wine-300 mb-8 max-w-2xl mx-auto">
            Organize, track, and manage multiple wine collections with powerful
            cellar visualization and inventory management tools.
          </p>
          <Button 
            size="lg" 
            className="bg-wine-600 hover:bg-wine-700 dark:bg-wine-500 dark:hover:bg-wine-600"
            onClick={() => window.location.href = '/api/login'}
          >
            Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="border-wine-200 dark:border-wine-800">
            <CardHeader>
              <Database className="h-8 w-8 text-wine-600 dark:text-wine-400 mb-2" />
              <CardTitle className="text-wine-900 dark:text-wine-100">Multiple Cellars</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-wine-700 dark:text-wine-300">
                Create and manage multiple wine cellars with customizable layouts
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-wine-200 dark:border-wine-800">
            <CardHeader>
              <Wine className="h-8 w-8 text-wine-600 dark:text-wine-400 mb-2" />
              <CardTitle className="text-wine-900 dark:text-wine-100">Visual Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-wine-700 dark:text-wine-300">
                Interactive grid system with columns A-E and 4 customizable layers
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-wine-200 dark:border-wine-800">
            <CardHeader>
              <Users className="h-8 w-8 text-wine-600 dark:text-wine-400 mb-2" />
              <CardTitle className="text-wine-900 dark:text-wine-100">Multi-User</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-wine-700 dark:text-wine-300">
                Secure authentication with personal cellar management
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-wine-200 dark:border-wine-800">
            <CardHeader>
              <Shield className="h-8 w-8 text-wine-600 dark:text-wine-400 mb-2" />
              <CardTitle className="text-wine-900 dark:text-wine-100">Data Security</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-wine-700 dark:text-wine-300">
                PostgreSQL database with automated backups and data integrity
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-wine-900 dark:text-wine-100 mb-4">
            Ready to organize your wine collection?
          </h2>
          <Button 
            variant="outline" 
            size="lg"
            className="border-wine-600 text-wine-600 hover:bg-wine-600 hover:text-white dark:border-wine-400 dark:text-wine-400"
            onClick={() => window.location.href = '/api/login'}
          >
            Sign In to Continue
          </Button>
        </div>
      </div>
    </div>
  );
}