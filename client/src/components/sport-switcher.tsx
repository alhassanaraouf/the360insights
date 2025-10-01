import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSport, type SportType, getSportConfig } from "@/lib/sport-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Trophy, Target } from "lucide-react";

export default function SportSwitcher() {
  const { selectedSport, setSelectedSport } = useSport();
  const { toast } = useToast();

  const handleSportChange = (newSport: SportType) => {
    if (newSport === selectedSport) return;
    
    setSelectedSport(newSport);
    
    // Invalidate all queries to refresh data for the new sport
    queryClient.invalidateQueries();
    
    const sportConfig = getSportConfig(newSport);
    toast({
      title: "Sport Changed",
      description: `Switched to ${sportConfig.name}. Data is now filtered for ${sportConfig.name} athletes.`,
    });
  };

  const currentSportConfig = getSportConfig(selectedSport);

  return (
    <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
      <div className={`p-1 rounded ${selectedSport === 'taekwondo' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
        {selectedSport === 'taekwondo' ? <Trophy className="h-4 w-4" /> : <Target className="h-4 w-4" />}
      </div>
      <Select value={selectedSport} onValueChange={handleSportChange}>
        <SelectTrigger className="border-none bg-transparent h-8 w-[140px] text-sm font-medium focus:ring-0 focus:ring-offset-0" data-testid="sport-selector">
          <SelectValue>
            {currentSportConfig.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="taekwondo" data-testid="sport-option-taekwondo">
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Taekwondo</span>
            </div>
          </SelectItem>
          <SelectItem value="karate" data-testid="sport-option-karate">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span>Karate</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}