
import React, { createContext, useContext, useState, useEffect } from 'react';

interface ConfigContextType {
  showConfig: boolean;
  setShowConfig: (show: boolean) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [showConfig, setShowConfig] = useState<boolean>(() => {
    const stored = localStorage.getItem('showConfig');
    return stored === null ? true : JSON.parse(stored);
  });

  useEffect(() => {
    localStorage.setItem('showConfig', JSON.stringify(showConfig));
  }, [showConfig]);

  return (
    <ConfigContext.Provider value={{ showConfig, setShowConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
