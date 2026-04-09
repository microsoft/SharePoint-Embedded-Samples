
import React, { createContext, useContext, useState, useCallback } from 'react';

interface ApiCall {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  request?: any;
  response?: any;
  status?: number;
}

interface ApiCallsContextType {
  apiCalls: ApiCall[];
  addApiCall: (call: Omit<ApiCall, 'id' | 'timestamp'>) => void;
  clearApiCalls: () => void;
}

const ApiCallsContext = createContext<ApiCallsContextType | undefined>(undefined);

export const useApiCalls = () => {
  const context = useContext(ApiCallsContext);
  if (!context) {
    throw new Error('useApiCalls must be used within an ApiCallsProvider');
  }
  return context;
};

export const ApiCallsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);

  const addApiCall = useCallback((call: Omit<ApiCall, 'id' | 'timestamp'>) => {
    const newCall: ApiCall = {
      ...call,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString()
    };
    setApiCalls(prev => [newCall, ...prev]);
  }, []);

  const clearApiCalls = useCallback(() => {
    setApiCalls([]);
  }, []);

  return (
    <ApiCallsContext.Provider value={{ apiCalls, addApiCall, clearApiCalls }}>
      {children}
    </ApiCallsContext.Provider>
  );
};
