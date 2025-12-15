import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { Token } from './tokenService';

interface TokenSelectionContextValue {
  selectedFromToken: Token | null;
  selectFromToken: (token: Token) => void;
  clearSelection: () => void;
  selectionVersion: number;
}

const TokenSelectionContext = createContext<TokenSelectionContextValue | null>(null);

interface TokenSelectionProviderProps {
  children: ReactNode;
}

export function TokenSelectionProvider({ children }: TokenSelectionProviderProps) {
  const [selectedFromToken, setSelectedFromToken] = useState<Token | null>(null);
  const [selectionVersion, setSelectionVersion] = useState(0);

  const selectFromToken = useCallback((token: Token) => {
    setSelectedFromToken(token);
    setSelectionVersion(v => v + 1);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFromToken(null);
  }, []);

  const value = useMemo(() => ({
    selectedFromToken,
    selectFromToken,
    clearSelection,
    selectionVersion,
  }), [selectedFromToken, selectFromToken, clearSelection, selectionVersion]);

  return (
    <TokenSelectionContext.Provider value={value}>
      {children}
    </TokenSelectionContext.Provider>
  );
}

export function useTokenSelection(): TokenSelectionContextValue {
  const context = useContext(TokenSelectionContext);
  if (!context) {
    throw new Error('useTokenSelection must be used within a TokenSelectionProvider');
  }
  return context;
}
