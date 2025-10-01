import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type SportType = 'taekwondo' | 'karate';

interface SportContextType {
  selectedSport: SportType;
  setSelectedSport: (sport: SportType) => void;
}

const SportContext = createContext<SportContextType | undefined>(undefined);

export function SportProvider({ children }: { children: ReactNode }) {
  // Initialize with saved sport to avoid FOUC
  const [selectedSport, setSelectedSport] = useState<SportType>(() => {
    const savedSport = localStorage.getItem('selectedSport') as SportType;
    return (savedSport === 'taekwondo' || savedSport === 'karate') ? savedSport : 'taekwondo';
  });

  // Apply sport theme to document
  useEffect(() => {
    const documentElement = document.documentElement;
    
    // Remove any existing sport classes
    documentElement.classList.remove('sport-taekwondo', 'sport-karate');
    
    // Add current sport class
    documentElement.classList.add(`sport-${selectedSport}`);
    
    // Save to localStorage
    localStorage.setItem('selectedSport', selectedSport);
  }, [selectedSport]);

  return (
    <SportContext.Provider value={{ selectedSport, setSelectedSport }}>
      {children}
    </SportContext.Provider>
  );
}

export function useSport() {
  const context = useContext(SportContext);
  if (context === undefined) {
    throw new Error('useSport must be used within a SportProvider');
  }
  return context;
}

// Helper functions for sport-specific configurations
export function getSportConfig(sport: SportType) {
  const configs = {
    taekwondo: {
      name: 'Taekwondo',
      primaryColor: 'blue',
      categories: ['M-54 kg', 'M-58 kg', 'M-63 kg', 'M-68 kg', 'M-74 kg', 'M-80 kg', 'M-87 kg', 'M+87 kg', 'W-46 kg', 'W-49 kg', 'W-53 kg', 'W-57 kg', 'W-62 kg', 'W-67 kg', 'W-73 kg', 'W+73 kg'],
      rankingTypes: ['world', 'olympic'],
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    karate: {
      name: 'Karate',
      primaryColor: 'red',
      categories: ['Men Kata', 'Women Kata', 'Men Kumite -60kg', 'Men Kumite -67kg', 'Men Kumite -75kg', 'Men Kumite -84kg', 'Men Kumite +84kg', 'Women Kumite -50kg', 'Women Kumite -55kg', 'Women Kumite -61kg', 'Women Kumite -68kg', 'Women Kumite +68kg'],
      rankingTypes: ['world', 'olympic'],
      iconColor: 'text-red-600 dark:text-red-400'
    }
  };
  
  return configs[sport];
}