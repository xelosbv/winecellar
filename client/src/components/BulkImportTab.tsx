import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from 'xlsx';

interface BulkImportTabProps {
  cellarId: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function BulkImportTab({ cellarId }: BulkImportTabProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (wines: any[]): Promise<ImportResult> => {
      const response = await fetch(`/api/cellars/${cellarId}/wines/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wines)
      });
      if (!response.ok) throw new Error('Import failed');
      return await response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${cellarId}/wines`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${cellarId}/stats`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cellars/${cellarId}/sections`] });
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} wines. ${result.failed} failed.`,
        variant: result.failed > 0 ? "destructive" : "default"
      });
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "Failed to import wines. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({
        title: "Invalid File Type",
        description: "Please select an Excel (.xlsx, .xls) or CSV file.",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
    setShowPreview(false);
    parseFile(file);
  };

  const parseFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        toast({
          title: "Invalid File",
          description: "File must contain at least a header row and one data row.",
          variant: "destructive"
        });
        return;
      }

      // Process and validate data
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1) as any[][];
      
      const processedData = dataRows
        .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map((row, index) => {
          const wine: any = {};
          headers.forEach((header, i) => {
            const normalizedHeader = normalizeHeader(header);
            wine[normalizedHeader] = row[i] || null;
          });
          wine.rowNumber = index + 2; // +2 because of header and 0-based index
          return wine;
        });

      setPreviewData(processedData.slice(0, 10)); // Show first 10 rows for preview
      setShowPreview(true);
      
      toast({
        title: "File Parsed",
        description: `Found ${processedData.length} wines ready for import.`,
      });
    } catch (error) {
      console.error('File parsing error:', error);
      toast({
        title: "Parse Error",
        description: "Failed to parse the file. Please check the format.",
        variant: "destructive"
      });
    }
  };

  const normalizeHeader = (header: string): string => {
    const headerMap: { [key: string]: string } = {
      'name': 'name',
      'wine name': 'name',
      'producer': 'producer',
      'winery': 'producer',
      'year': 'year',
      'vintage': 'year',
      'type': 'type',
      'wine type': 'type',
      'color': 'type',
      'region': 'region',
      'appellation': 'region',
      'country': 'country',
      'price': 'buyingPrice',
      'cost': 'buyingPrice',
      'buying price': 'buyingPrice',
      'purchase price': 'buyingPrice',
      'value': 'marketValue',
      'market value': 'marketValue',
      'current value': 'marketValue',
      'column': 'column',
      'location column': 'column',
      'layer': 'layer',
      'location layer': 'layer',
      'level': 'layer',
      'quantity': 'quantity',
      'bottles': 'quantity',
      'volume': 'volume',
      'size': 'volume',
      'notes': 'notes',
      'description': 'notes',
      'tasting notes': 'notes',
      'to drink from': 'toDrinkFrom',
      'drink from': 'toDrinkFrom',
      'to drink until': 'toDrinkUntil',
      'drink until': 'toDrinkUntil',
      'grapes': 'grapes',
      'varietals': 'grapes',
      'grape varieties': 'grapes',
      'grape types': 'grapes'
    };

    const normalized = header.toLowerCase().trim();
    return headerMap[normalized] || normalized;
  };

  const handleImport = async () => {
    if (!selectedFile || previewData.length === 0) return;

    try {
      setImportProgress(0);
      
      // Re-parse the entire file for import
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1) as any[][];
      
      const allWines = dataRows
        .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map(row => {
          const wine: any = { cellarId };
          headers.forEach((header, i) => {
            const normalizedHeader = normalizeHeader(header);
            let value = row[i];
            
            // Convert data types
            if (normalizedHeader === 'year' && value) {
              value = parseInt(value.toString());
            }
            if (normalizedHeader === 'layer' && value) {
              value = parseInt(value.toString());
            }
            if (normalizedHeader === 'quantity' && value) {
              value = parseInt(value.toString()) || 1;
            }
            if ((normalizedHeader === 'buyingPrice' || normalizedHeader === 'marketValue') && value) {
              value = parseFloat(value.toString());
            }
            
            wine[normalizedHeader] = value || null;
          });
          
          // Set defaults
          if (!wine.quantity) wine.quantity = 1;
          if (!wine.type) wine.type = 'red';
          
          return wine;
        });

      setImportProgress(50);
      await importMutation.mutateAsync(allWines);
      setImportProgress(100);
      
    } catch (error) {
      console.error('Import error:', error);
      setImportProgress(0);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      [
        'Name', 'Producer', 'Year', 'Type', 'Region', 'Grapes', 'Country', 
        'Column', 'Layer', 'Quantity', 'Volume', 'Buying Price', 'Market Value', 'Notes',
        'To Drink From', 'To Drink Until'
      ],
      [
        'Chateau Margaux', 'Chateau Margaux', 2015, 'red', 'Margaux', 'Cabernet Sauvignon, Merlot', 'France',
        'A', 1, 1, '75cl', 850, 1200, 'Excellent vintage from premier cru estate',
        2025, 2040
      ],
      [
        'Dom Perignon', 'Moet & Chandon', 2012, 'champagne', 'Champagne', 'Chardonnay, Pinot Noir', 'France',
        'B', 2, 2, '75cl', 180, 220, 'Prestige cuvee from renowned house',
        2022, 2030
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Wine Import Template');
    XLSX.writeFile(workbook, 'wine_import_template.xlsx');
    
    toast({
      title: "Template Downloaded",
      description: "Wine import template has been downloaded to your device.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Wine Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <h3 className="font-medium text-blue-900">Download Import Template</h3>
              <p className="text-sm text-blue-700">Get a sample Excel file with the correct format</p>
            </div>
            <Button variant="outline" onClick={downloadTemplate} className="border-blue-300 text-blue-700 hover:bg-blue-100">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div>
            <Label htmlFor="wine-file" className="text-sm font-medium">
              Select Wine File (Excel or CSV)
            </Label>
            <div className="mt-2">
              <Input
                id="wine-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-wine file:text-white hover:file:bg-wine-light"
              />
            </div>
            {selectedFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <FileSpreadsheet className="w-4 h-4" />
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* Import Progress */}
          {importProgress > 0 && importProgress < 100 && (
            <div>
              <Label className="text-sm font-medium">Import Progress</Label>
              <Progress value={importProgress} className="mt-2" />
            </div>
          )}

          {/* Preview */}
          {showPreview && previewData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Preview (First 10 rows)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Producer</th>
                      <th className="px-3 py-2 text-left">Year</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Grapes</th>
                      <th className="px-3 py-2 text-left">Column</th>
                      <th className="px-3 py-2 text-left">Layer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 5).map((wine, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">{wine.name || 'N/A'}</td>
                        <td className="px-3 py-2">{wine.producer || 'N/A'}</td>
                        <td className="px-3 py-2">{wine.year || 'N/A'}</td>
                        <td className="px-3 py-2">{wine.type || 'N/A'}</td>
                        <td className="px-3 py-2">{wine.grapes || 'N/A'}</td>
                        <td className="px-3 py-2">{wine.column || 'N/A'}</td>
                        <td className="px-3 py-2">{wine.layer || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 5 && (
                  <div className="px-3 py-2 bg-gray-50 text-sm text-gray-600 border-t">
                    ... and {previewData.length - 5} more rows
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <Alert className={importResult.failed > 0 ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}>
              <div className="flex items-center gap-2">
                {importResult.failed > 0 ? (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <AlertDescription>
                  <div className="font-medium">
                    Import Results: {importResult.success} successful, {importResult.failed} failed
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm font-medium mb-1">Errors:</div>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {importResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>... and {importResult.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Import Button */}
          {showPreview && previewData.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || importProgress > 0}
              className="w-full bg-wine text-white hover:bg-wine-light"
            >
              {importMutation.isPending ? "Importing..." : `Import ${previewData.length} Wines`}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}