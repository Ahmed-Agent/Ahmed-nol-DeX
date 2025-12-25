import { createContext, useContext, useState, useCallback, useMemo, type ReactNode, useEffect, useRef } from 'react';
import { Token, getTokenList } from './tokenService';
import { useChain } from './chainContext';

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
  const { chainId, chain } = useChain();
  const previousChainRef = useRef<string | null>(null);

  const [selectedFromToken, setSelectedFromToken] = useState<Token | null>(null);
  const [selectedToToken, setSelectedToToken] = useState<Token | null>(null);
  const [selectionVersion, setSelectionVersion] = useState(0);

  const getRandomTokens = useCallback((cid: number) => {
    const list = getTokenList(cid);
    if (!list || list.length === 0) return { from: null, to: null };
    
    let from: Token | null = null;
    
    // Default logic based on requirements
    if (cid === 137) {
      // Polygon: From is always the specific Matic address 0x...1010
      from = list.find(t => t.address.toLowerCase() === '0x0000000000000000000000000000000000001010') || list[0];
    } else if (cid === 1) {
      // Ethereum: From is always the native ETH 0x...0000
      from = list.find(t => t.address.toLowerCase() === '0x0000000000000000000000000000000000000000') || list[0];
    } else {
      from = list[Math.floor(Math.random() * list.length)];
    }

    // To is always randomized from the remaining list
    const filteredList = list.filter(t => t.address.toLowerCase() !== from?.address.toLowerCase());
    const to = filteredList.length > 0 
      ? filteredList[Math.floor(Math.random() * filteredList.length)]
      : (list.length > 1 ? list.find(t => t.address !== from?.address) || null : null);
    
    return { from, to };
  }, []);

  useEffect(() => {
    // If we're in BRG mode, we keep what was selected
    if (chain === 'BRG') {
      previousChainRef.current = 'BRG';
      return;
    }

    // If we just switched from BRG to something else, or it's first load
    // we reset to defaults for that chain.
    const { from, to } = getRandomTokens(chainId);
    setSelectedFromToken(from);
    setSelectedToToken(to);
    previousChainRef.current = chain;
  }, [chainId, chain, getRandomTokens]);

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
