import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Medal, Trophy, User } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useEgyptFilter } from "@/lib/egypt-filter-context";
import { useSport, getSportConfig } from "@/lib/sport-context";
import { getCountryFlagWithFallback } from "@/lib/country-flags";

interface Athlete {
  id: number;
  name: string;
  sport: string;
  weight: string;
  gender: string;
  worldRank: number;
  category: string;
  achievements: string[];
  profileImage: string;
  nationality: string;
}

interface AthleteSearchProps {
  onAthleteSelect?: (athlete: Athlete) => void;
  placeholder?: string;
  showResults?: boolean;
}

export default function AthleteSearch({ 
  onAthleteSelect, 
  placeholder,
  showResults = true 
}: AthleteSearchProps) {
  const { t } = useLanguage();
  const { showEgyptianOnly } = useEgyptFilter();
  const { selectedSport } = useSport();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [, setLocation] = useLocation();
  
  const sportConfig = getSportConfig(selectedSport);
  
  // Dynamic placeholder based on toggle
  const searchPlaceholder = placeholder || (showEgyptianOnly ? "Search Egyptian athletes..." : "Search athletes...");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search/athletes", debouncedSearch, showEgyptianOnly, selectedSport],
    queryFn: async () => {
      if (!debouncedSearch.trim()) return [];
      const endpoint = showEgyptianOnly ? "/api/search/egyptian-athletes" : "/api/search/athletes";
      const response = await fetch(`${endpoint}?q=${encodeURIComponent(debouncedSearch)}&sport=${selectedSport}`);
      if (!response.ok) throw new Error('Search failed');
      const results = await response.json();
      
      // Filter by sport on client-side as well for extra safety
      const sportFiltered = results.filter((athlete: Athlete) => 
        athlete.sport?.toLowerCase() === sportConfig.name.toLowerCase()
      );
      
      // Remove duplicates based on athlete ID to ensure unique results
      const uniqueResults = sportFiltered.filter((athlete: Athlete, index: number, self: Athlete[]) => 
        index === self.findIndex((a) => a.id === athlete.id)
      );
      
      return uniqueResults;
    },
    enabled: debouncedSearch.trim().length > 0
  });

  const handleAthleteSelect = (athlete: Athlete) => {
    // Call the provided callback if exists
    onAthleteSelect?.(athlete);
    
    // Navigate to athlete 360 page with query parameter
    setLocation(`/athlete360?athlete=${athlete.id}`);
    
    // Clear search term
    setSearchTerm("");
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mobile-input pl-10 pr-4"
        />
      </div>

      {showResults && searchTerm.trim() && (
        <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 sm:max-h-96 overflow-y-auto mobile-modal">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              {showEgyptianOnly ? "Searching Egyptian athletes..." : "Searching athletes..."}
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="p-2">
              {searchResults.map((athlete: Athlete) => (
                <Card
                  key={athlete.id}
                  className="mb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleAthleteSelect(athlete)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <img 
                          src={athlete.profileImage || `/api/athletes/${athlete.id}/image`} 
                          alt={athlete.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center hidden">
                          <User className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {athlete.name}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            Rank #{athlete.worldRank}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1 mb-1">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {athlete.category}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-sm">{getCountryFlagWithFallback(athlete.nationality)}</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {athlete.nationality}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Trophy className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {athlete.achievements?.length ?? 0} achievements
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : searchTerm.trim() && (
            <div className="p-4 text-center text-gray-500">
              {showEgyptianOnly 
                ? `No Egyptian athletes found for "${searchTerm}"`
                : `No athletes found for "${searchTerm}"`
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}