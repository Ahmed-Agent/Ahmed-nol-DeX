import { createContext, useContext, useState, useCallback, useMemo, type ReactNode, useEffect } from 'react';
import { Token } from './tokenService';
import { useChain } from './chainContext';
import { DEFAULT_TOKENS } from './config';

interface TokenSelectionContextValue {
  selectedFromToken: Token | null;
  selectedToToken: Token | null;
  selectFromToken: (token: Token) => void;
  selectToToken: (token: Token) => void;
  clearSelection: () => void;
  selectionVersion: number;
}

const TokenSelectionContext = createContext<TokenSelectionContextValue | null>(null);

export function TokenSelectionProvider({ children }: { children: ReactNode }) {
  const { chainId } = useChain();
  const defaults = DEFAULT_TOKENS[chainId as keyof typeof DEFAULT_TOKENS] || DEFAULT_TOKENS[137];
  
  const [selectedFromToken, setSelectedFromToken] = useState<Token | null>(defaults.from);
  const [selectedToToken, setSelectedToToken] = useState<Token | null>(defaults.to);
  const [selectionVersion, setSelectionVersion] = useState(0);

  // Update defaults when chain changes
  useEffect(() => {
    const newDefaults = DEFAULT_TOKENS[chainId as keyof typeof DEFAULT_TOKENS] || DEFAULT_TOKENS[137];
    setSelectedFromToken(newDefaults.from);
    setSelectedToToken(newDefaults.to);
  }, [chainId]);

  const selectFromToken = useCallback((token: Token) => {
    setSelectedFromToken(token);
    setSelectionVersion(v => v + 1);
  }, []);

  const selectToToken = useCallback((token: Token) => {
    setSelectedToToken(token);
    setSelectionVersion(v => v + 1);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFromToken(null);
    setSelectedToToken(null);
  }, []);

  const value = useMemo(() => ({
    selectedFromToken,
    selectedToToken,
    selectFromToken,
    selectToToken,
    clearSelection,
    selectionVersion,
  }), [selectedFromToken, selectedToToken, selectFromToken, selectToToken, clearSelection, selectionVersion]);

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
