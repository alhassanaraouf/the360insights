import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';

interface AthleteContextType {
  selectedAthleteId: number | null;
  setSelectedAthleteId: (id: number | null) => void;
  navigateWithAthlete: (path: string) => void;
}

const AthleteContext = createContext<AthleteContextType | undefined>(undefined);

export function AthleteProvider({ children }: { children: ReactNode }) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [, navigate] = useLocation();

  // Check for athlete ID in URL parameters on mount and URL changes
  useEffect(() => {
    const checkUrlForAthlete = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const athleteIdFromUrl = urlParams.get('athlete');
      
      if (athleteIdFromUrl && parseInt(athleteIdFromUrl) !== selectedAthleteId) {
        setSelectedAthleteId(parseInt(athleteIdFromUrl));
      }
    };

    // Check on mount
    checkUrlForAthlete();

    // Listen for URL changes
    const handlePopstate = () => {
      checkUrlForAthlete();
    };

    window.addEventListener('popstate', handlePopstate);
    
    return () => {
      window.removeEventListener('popstate', handlePopstate);
    };
  }, []); // Remove selectedAthleteId from dependencies to prevent infinite loops

  // Helper function to navigate while preserving athlete context
  const navigateWithAthlete = (path: string) => {
    if (selectedAthleteId) {
      const separator = path.includes('?') ? '&' : '?';
      navigate(`${path}${separator}athlete=${selectedAthleteId}`);
    } else {
      navigate(path);
    }
  };

  return (
    <AthleteContext.Provider value={{ selectedAthleteId, setSelectedAthleteId, navigateWithAthlete }}>
      {children}
    </AthleteContext.Provider>
  );
}

export function useAthlete() {
  const context = useContext(AthleteContext);
  if (context === undefined) {
    throw new Error('useAthlete must be used within an AthleteProvider');
  }
  return context;
}