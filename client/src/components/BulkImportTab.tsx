import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, X, ArrowRight, Settings } from "lucide-react";
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

interface ColumnMapping {
  sourceColumn: string;
  targetField: string | 'ignore';
  sampleValue: string;
}

interface ParsedData {
  headers: string[];
  rows: any[][];
  mappings: ColumnMapping[];
}

export default function BulkImportTab({ cellarId }: BulkImportTabProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Available wine fields for mapping
  const wineFields = [
    { value: 'name', label: 'Wine Name' },
    { value: 'producer', label: 'Producer/Winery' },
    { value: 'year', label: 'Year/Vintage' },
    { value: 'type', label: 'Wine Type' },
    { value: 'region', label: 'Region' },
    { value: 'country', label: 'Country' },
    { value: 'buyingPrice', label: 'Buying Price' },
    { value: 'marketValue', label: 'Market Value' },
    { value: 'column', label: 'Cellar Column' },
    { value: 'layer', label: 'Cellar Layer' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'volume', label: 'Volume' },
    { value: 'notes', label: 'Notes' },
    { value: 'toDrinkFrom', label: 'Drink From Year' },
    { value: 'toDrinkUntil', label: 'Drink Until Year' },
    { value: 'grapes', label: 'Grapes/Varietals' },
    { value: 'ignore', label: '-- Ignore Column --' },
  ];

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
    setCurrentStep('upload');
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

      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1) as any[][];
      
      // Filter out empty rows
      const validRows = dataRows.filter(row => 
        row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );

      // Create initial column mappings with smart detection
      const mappings: ColumnMapping[] = headers.map((header, index) => {
        const sampleValue = validRows[0]?.[index]?.toString() || '';
        const detectedField = autoDetectField(header);
        
        return {
          sourceColumn: header,
          targetField: detectedField,
          sampleValue: sampleValue
        };
      });

      setParsedData({
        headers,
        rows: validRows,
        mappings
      });
      
      setCurrentStep('mapping');
      
      toast({
        title: "File Parsed",
        description: `Found ${validRows.length} rows. Please review column mappings.`,
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

  const autoDetectField = (header: string): string => {
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
    return headerMap[normalized] || 'ignore';
  };

  const updateColumnMapping = (index: number, targetField: string) => {
    if (!parsedData) return;
    
    const newMappings = [...parsedData.mappings];
    newMappings[index].targetField = targetField;
    
    setParsedData({
      ...parsedData,
      mappings: newMappings
    });
  };

  const generatePreviewData = () => {
    if (!parsedData) return [];
    
    return parsedData.rows.slice(0, 5).map((row, index) => {
      const wine: any = { cellarId };
      
      parsedData.mappings.forEach((mapping, columnIndex) => {
        if (mapping.targetField !== 'ignore') {
          let value = row[columnIndex];
          
          // Convert data types based on target field
          if (mapping.targetField === 'year' && value) {
            value = parseInt(value.toString());
          }
          if (mapping.targetField === 'layer' && value) {
            value = parseInt(value.toString());
          }
          if (mapping.targetField === 'quantity' && value) {
            value = parseInt(value.toString()) || 1;
          }
          if ((mapping.targetField === 'buyingPrice' || mapping.targetField === 'marketValue') && value) {
            value = parseFloat(value.toString());
          }
          
          wine[mapping.targetField] = value || null;
        }
      });
      
      // Set defaults
      if (!wine.quantity) wine.quantity = 1;
      if (!wine.type) wine.type = 'red';
      
      return wine;
    });
  };

  const handleImport = async () => {
    if (!parsedData) return;

    try {
      setImportProgress(0);
      
      const allWines = parsedData.rows.map(row => {
        const wine: any = { cellarId };
        
        parsedData.mappings.forEach((mapping, columnIndex) => {
          if (mapping.targetField !== 'ignore') {
            let value = row[columnIndex];
            
            // Convert data types based on target field
            if (mapping.targetField === 'year' && value) {
              value = parseInt(value.toString());
            }
            if (mapping.targetField === 'layer' && value) {
              value = parseInt(value.toString());
            }
            if (mapping.targetField === 'quantity' && value) {
              value = parseInt(value.toString()) || 1;
            }
            if ((mapping.targetField === 'buyingPrice' || mapping.targetField === 'marketValue') && value) {
              value = parseFloat(value.toString());
            }
            
            wine[mapping.targetField] = value || null;
          }
        });
        
        // Set defaults
        if (!wine.quantity) wine.quantity = 1;
        if (!wine.type) wine.type = 'red';
        
        return wine;
        });

      setImportProgress(50);
      await importMutation.mutateAsync(allWines);
      setImportProgress(100);
      setCurrentStep('complete');
      
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

  const previewData = generatePreviewData();

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-8 mb-6">
        <div className={`flex items-center space-x-2 ${currentStep === 'upload' ? 'text-wine' : currentStep === 'mapping' || currentStep === 'preview' || currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-wine text-white' : currentStep === 'mapping' || currentStep === 'preview' || currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
            1
          </div>
          <span className="text-sm font-medium">Upload File</span>
        </div>
        <ArrowRight className="text-gray-400" size={16} />
        <div className={`flex items-center space-x-2 ${currentStep === 'mapping' ? 'text-wine' : currentStep === 'preview' || currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'mapping' ? 'bg-wine text-white' : currentStep === 'preview' || currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
            2
          </div>
          <span className="text-sm font-medium">Map Columns</span>
        </div>
        <ArrowRight className="text-gray-400" size={16} />
        <div className={`flex items-center space-x-2 ${currentStep === 'preview' ? 'text-wine' : currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'preview' ? 'bg-wine text-white' : currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
            3
          </div>
          <span className="text-sm font-medium">Import</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Wine Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: File Upload */}
          {currentStep === 'upload' && (
            <>
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
            </>
          )}

          {/* Step 2: Column Mapping */}
          {currentStep === 'mapping' && parsedData && (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Settings className="w-5 h-5" />
                  <h3 className="font-medium">Map Your Columns</h3>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Review the detected columns and choose how to map them to wine fields. You can ignore unwanted columns.
                </p>
              </div>

              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {parsedData.mappings.map((mapping, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 border rounded-lg bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{mapping.sourceColumn}</div>
                      <div className="text-sm text-gray-500 truncate">Sample: {mapping.sampleValue || 'No data'}</div>
                    </div>
                    <ArrowRight className="text-gray-400 flex-shrink-0" size={16} />
                    <div className="flex-1">
                      <Select value={mapping.targetField} onValueChange={(value) => updateColumnMapping(index, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {wineFields.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('upload')}
                >
                  Back to Upload
                </Button>
                <Button 
                  onClick={() => setCurrentStep('preview')}
                  className="bg-wine text-white hover:bg-wine-light"
                >
                  Preview Import
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Preview and Import */}
          {currentStep === 'preview' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <h3 className="font-medium">Preview Import</h3>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Review how your data will be imported. This shows the first 5 rows.
                </p>
              </div>

              {previewData.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-900">Name</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-900">Producer</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-900">Year</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-900">Type</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-900">Price</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-900">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {previewData.map((wine, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{wine.name || '-'}</td>
                            <td className="px-3 py-2">{wine.producer || '-'}</td>
                            <td className="px-3 py-2">{wine.year || '-'}</td>
                            <td className="px-3 py-2">{wine.type || '-'}</td>
                            <td className="px-3 py-2">{wine.buyingPrice ? `$${wine.buyingPrice}` : '-'}</td>
                            <td className="px-3 py-2">{wine.column && wine.layer ? `${wine.column}-${wine.layer}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('mapping')}
                >
                  Back to Mapping
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                  className="bg-wine text-white hover:bg-wine-light"
                >
                  {importMutation.isPending ? 'Importing...' : `Import ${parsedData?.rows.length || 0} Wines`}
                </Button>
              </div>
            </>
          )}

          {/* Import Progress */}
          {importProgress > 0 && importProgress < 100 && (
            <div>
              <Label className="text-sm font-medium">Import Progress</Label>
              <Progress value={importProgress} className="mt-2" />
            </div>
          )}


          {/* Import Results */}
          {importResult && currentStep === 'complete' && (
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

          {/* New Import Button */}
          {currentStep === 'complete' && (
            <Button
              onClick={() => {
                setSelectedFile(null);
                setParsedData(null);
                setImportResult(null);
                setCurrentStep('upload');
              }}
              className="w-full bg-wine text-white hover:bg-wine-light"
            >
              Import Another File
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}