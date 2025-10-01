import { createContext, useContext, useState, ReactNode } from "react";

interface EgyptFilterContextType {
  showEgyptianOnly: boolean;
  setShowEgyptianOnly: (value: boolean) => void;
}

const EgyptFilterContext = createContext<EgyptFilterContextType | undefined>(undefined);

export function EgyptFilterProvider({ children }: { children: ReactNode }) {
  const [showEgyptianOnly, setShowEgyptianOnly] = useState(true);

  return (
    <EgyptFilterContext.Provider value={{ showEgyptianOnly, setShowEgyptianOnly }}>
      {children}
    </EgyptFilterContext.Provider>
  );
}

export function useEgyptFilter() {
  const context = useContext(EgyptFilterContext);
  if (context === undefined) {
    throw new Error('useEgyptFilter must be used within an EgyptFilterProvider');
  }
  return context;
}