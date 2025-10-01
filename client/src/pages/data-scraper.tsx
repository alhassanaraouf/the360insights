import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Globe, Trophy, Download, Database, Search, FileText, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Countries with verified Olympic/World Championship athlete data
const commonCountries = {
  'EGY': 'Egypt 🥉',
  'KSA': 'Saudi Arabia 🥈',
  'UAE': 'United Arab Emirates',
  'JOR': 'Jordan 🥇',
  'MAR': 'Morocco',
  'TUN': 'Tunisia 🥈',
  'KOR': 'South Korea 🥇', 
  'USA': 'United States 🥇',
  'GBR': 'Great Britain 🥇',
  'IRI': 'Iran 🥉',
  'THA': 'Thailand 🥇',
  'CRO': 'Croatia 🥉'
};

export default function DataScraper() {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [customCountryCode, setCustomCountryCode] = useState('');
  const [scrapeResults, setScrapeResults] = useState<any>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [rankingType, setRankingType] = useState<'world' | 'olympic'>('world');
  const [importType, setImportType] = useState<'athletes' | 'competitions'>('athletes');
  const { toast } = useToast();

  // Country scraping mutation
  const scrapeCountryMutation = useMutation({
    mutationFn: async (countryCode: string) => {
      const response = await fetch(`/api/scrape/country/${countryCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Scraping failed');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setScrapeResults(data);
      toast({
        title: "Scraping Completed",
        description: `Successfully scraped ${data.totalAthletes} athletes from ${data.message.split(' ')[3]}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scraping Failed",
        description: error.message || "Failed to scrape athlete data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Rankings scraping mutation
  const scrapeRankingsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/scrape/rankings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Scraping failed');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setScrapeResults(data);
      toast({
        title: "Rankings Scraped",
        description: `Successfully scraped ${data.totalAthletes} ranked athletes`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scraping Failed", 
        description: error.message || "Failed to scrape rankings data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // JSON import mutation for athletes
  const importJsonMutation = useMutation({
    mutationFn: async ({ file, rankingType }: { file: File; rankingType: 'world' | 'olympic' }) => {
      const formData = new FormData();
      formData.append('jsonFile', file);
      formData.append('rankingType', rankingType);
      
      const response = await fetch('/api/import/json', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'JSON import failed');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setScrapeResults(data);
      const competitionsText = data.competitionsImported 
        ? ` and ${data.competitionsImported} competitions`
        : '';
      toast({
        title: "Athletes Import Successful",
        description: `Successfully imported ${data.totalAthletes} athletes${competitionsText} from JSON file`,
      });
      setJsonFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import JSON data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // JSON import mutation for competitions
  const importCompetitionsMutation = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      const formData = new FormData();
      formData.append('jsonFile', file);
      
      const response = await fetch('/api/import/competitions', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Competition import failed');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      setScrapeResults(data);
      toast({
        title: "Competitions Import Successful",
        description: `Successfully imported ${data.totalCompetitions} competitions from JSON file`,
      });
      setJsonFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import competition data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCountryScrape = () => {
    const countryCode = selectedCountry === "CUSTOM" ? customCountryCode : selectedCountry;
    if (!countryCode || countryCode.length !== 3) {
      toast({
        title: "Invalid Country Code",
        description: "Please select a country or enter a valid 3-letter country code.",
        variant: "destructive",
      });
      return;
    }
    scrapeCountryMutation.mutate(countryCode);
  };

  const handleRankingsScrape = () => {
    scrapeRankingsMutation.mutate();
  };

  const handleJsonImport = () => {
    if (!jsonFile) {
      toast({
        title: "No File Selected",
        description: "Please select a JSON file to import.",
        variant: "destructive",
      });
      return;
    }
    
    if (importType === 'athletes') {
      importJsonMutation.mutate({ file: jsonFile, rankingType });
    } else {
      importCompetitionsMutation.mutate({ file: jsonFile });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setJsonFile(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a JSON file.",
          variant: "destructive",
        });
        event.target.value = '';
      }
    }
  };

  const isLoading = scrapeCountryMutation.isPending || scrapeRankingsMutation.isPending || importJsonMutation.isPending || importCompetitionsMutation.isPending;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Taekwondo Data Scraper
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Import authentic athlete data from taekwondodata.com to enhance your analytics database.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6 mb-8">
        {/* Country Scraping */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Scrape by Country</span>
            </CardTitle>
            <CardDescription>
              Import athletes from a specific country using ISO 3-letter country codes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOM">
                    🌍 Custom Country Code
                  </SelectItem>
                  {Object.entries(commonCountries).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name} ({code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or enter custom code
                </span>
              </div>
            </div>

            {selectedCountry === "CUSTOM" && (
              <div className="space-y-2">
                <Label htmlFor="customCode">Enter Country Code</Label>
                <Input
                  id="customCode"
                  type="text"
                  placeholder="e.g., GER, FRA, AUS, BRA, ITA"
                  value={customCountryCode}
                  onChange={(e) => setCustomCountryCode(e.target.value.toUpperCase())}
                  maxLength={3}
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Enter any 3-letter ISO country code to scrape authentic athlete data
                </p>
              </div>
            )}

            <Button 
              onClick={handleCountryScrape}
              disabled={isLoading || (selectedCountry === "CUSTOM" && !customCountryCode) || (!selectedCountry)}
              className="w-full flex items-center space-x-2"
            >
              <Search className="h-4 w-4" />
              <span>{scrapeCountryMutation.isPending ? "Scraping..." : "Scrape Country Athletes"}</span>
            </Button>
          </CardContent>
        </Card>

        {/* Rankings Scraping */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>World Rankings</span>
            </CardTitle>
            <CardDescription>
              Import current world rankings data with athlete rankings and categories.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                World Rankings Include:
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>Current world rank positions</li>
                <li>Athlete names and nationalities</li>
                <li>Weight categories and divisions</li>
                <li>Gender classifications</li>
              </ul>
            </div>

            <Button 
              onClick={handleRankingsScrape}
              disabled={isLoading}
              className="w-full flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{scrapeRankingsMutation.isPending ? "Scraping..." : "Scrape World Rankings"}</span>
            </Button>
          </CardContent>
        </Card>

        {/* JSON Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>JSON Import</span>
            </CardTitle>
            <CardDescription>
              Import athlete or competition data from JSON files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Import Type</Label>
              <RadioGroup 
                value={importType} 
                onValueChange={(value: 'athletes' | 'competitions') => setImportType(value)}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="athletes" id="athletes" />
                  <Label htmlFor="athletes">Athletes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="competitions" id="competitions" />
                  <Label htmlFor="competitions">Competitions</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="json-file">Select JSON File</Label>
              <Input
                id="json-file"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                disabled={isLoading}
              />
              {jsonFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {jsonFile.name}
                </p>
              )}
            </div>

            {importType === 'athletes' && (
              <div className="space-y-2">
                <Label>Ranking Type</Label>
                <RadioGroup value={rankingType} onValueChange={(value) => setRankingType(value as 'world' | 'olympic')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="world" id="world" />
                    <Label htmlFor="world">World Rankings</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="olympic" id="olympic" />
                    <Label htmlFor="olympic">Olympic Rankings</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                JSON Format Requirements:
              </h4>
              {importType === 'athletes' ? (
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                  <li>Each athlete needs unique userid field</li>
                  <li>Ranking data in display_ranking field (1st, 2nd, 3rd, etc.)</li>
                  <li>Month names will be converted to numbers (Jan → 1)</li>
                  <li>Athletes can appear multiple times for different weights</li>
                </ul>
              ) : (
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                  <li>Each competition needs title and date fields</li>
                  <li>Optional: location, status, competitionLevel, description</li>
                  <li>Status values: "upcoming", "completed", "cancelled"</li>
                  <li>Level values: "national", "international", "olympic", "world_championship"</li>
                </ul>
              )}
            </div>

            <Button 
              onClick={handleJsonImport}
              disabled={isLoading || !jsonFile}
              className="w-full flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>
                {(importJsonMutation.isPending || importCompetitionsMutation.isPending) 
                  ? "Importing..." 
                  : `Import ${importType === 'athletes' ? 'Athletes' : 'Competitions'}`
                }
              </span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results Display */}
      {scrapeResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Scraping Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {scrapeResults.athletesFound || scrapeResults.totalAthletes || scrapeResults.totalCompetitions || 0}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  {scrapeResults.totalCompetitions ? 'Competitions Found' : 'Athletes Found'}
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {scrapeResults.athletesSaved || scrapeResults.saved || 0}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Successfully Saved</div>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {scrapeResults.duplicatesSkipped || 0}
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300">Duplicates Skipped</div>
              </div>
            </div>

            {scrapeResults.athletes && scrapeResults.athletes.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Sample Athletes:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {scrapeResults.athletes.map((athlete: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div>
                        <div className="font-medium">{athlete.name}</div>
                        <div className="text-sm text-gray-500">
                          {athlete.nationality} • {athlete.category || 'N/A'} • {athlete.gender || 'N/A'}
                        </div>
                      </div>
                      {athlete.worldRank && (
                        <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          Rank #{athlete.worldRank}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scrapeResults.competitions && scrapeResults.competitions.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Sample Competitions:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {scrapeResults.competitions.map((competition: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div>
                        <div className="font-medium">{competition.title}</div>
                        <div className="text-sm text-gray-500">
                          {competition.date} • {competition.location || 'Location TBD'} • {competition.competitionLevel || 'N/A'}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        {competition.status || 'upcoming'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-2">Country Scraping:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-gray-600 dark:text-gray-300">
                <li>Select from common countries or enter custom ISO code</li>
                <li>Uses 3-letter country codes (e.g., EGY, USA, KOR)</li>
                <li>Imports all active athletes from the country</li>
                <li>Includes weight categories and gender classification</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">World Rankings:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-gray-600 dark:text-gray-300">
                <li>Imports current WTF world rankings</li>
                <li>Includes rank positions and categories</li>
                <li>Updates existing athletes with ranking data</li>
                <li>Covers all weight divisions and genders</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">JSON Import:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-gray-600 dark:text-gray-300">
                <li>Imports from JSON files with display_ranking format</li>
                <li>Handles ordinal rankings (1st, 2nd, 3rd, etc.)</li>
                <li>Converts month names to numbers (Jan → 1)</li>
                <li>Supports both world and Olympic ranking types</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}