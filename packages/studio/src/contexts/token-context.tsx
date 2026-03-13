import {
  useState,
  useEffect,
  createContext,
  SetStateAction,
  useContext,
} from "react";
import type { Blockchain } from "../dApp/nfts/types";
import { useAnyTokens } from "../hooks/use-any-tokens";
import { useOwnedTokens } from "../hooks/use-owned-tokens";

export interface TokensProps {
  children: React.ReactNode;
}

type TokenState = {
  anyTokenUrl: string;
  selectedChain: Blockchain;
  selectedWallet: {
    [key: string]: string;
  };
  accountByWallet: {
    [key: string]: string[];
  };
  anyTokens: ReturnType<typeof useAnyTokens>;
  ownedTokens: ReturnType<typeof useOwnedTokens>;
  //
  setSelectedChain: (b: string) => void;
  setAnyTokenUrl: (url: string) => void;
  setAccountByWallet: (value: SetStateAction<{}>) => void;
  switchWallet: (addr: string, chain: Blockchain) => void;
  addEvmWallet: (addr: string, chain: Blockchain) => void;
};

const TokenContext = createContext<TokenState>(null);

export function TokenProvider({ children }: TokensProps) {
  //
  const user = null;
  const ready = true;

  const [anyTokenUrl, setAnyTokenUrl] = useState(null);

  // Load EVM wallets from localStorage on mount
  const getStoredEvmWallets = (): string[] => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("evmWallets");
    return stored ? JSON.parse(stored) : [];
  };

  // Load selected wallet from localStorage on mount
  const getStoredSelectedWallet = (): { [key: string]: string } => {
    if (typeof window === "undefined") return {};
    const stored = localStorage.getItem("selectedWallet");
    return stored ? JSON.parse(stored) : {};
  };

  // Load selected chain from localStorage on mount
  const getStoredSelectedChain = (): Blockchain | null => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("selectedChain");
    return stored ? (stored as Blockchain) : null;
  };

  const [selectedChainState, setSelectedChainState] = useState<Blockchain | null>(
    getStoredSelectedChain()
  );

  const setSelectedChain = (chain: string) => {
    setSelectedChainState(chain as Blockchain);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedChain", chain);
    }
  };

  const selectedChain = selectedChainState;

  const [accountByWallet, setAccountByWallet] = useState({
    evm: getStoredEvmWallets(),
  });

  const [selectedWallet, setSelectedWallet] = useState(getStoredSelectedWallet());

  useEffect(() => {
    if (ready && user?.wallet?.address && !selectedWallet["ethereum"]) {
      switchWallet(user.wallet.address, "ethereum");
    }
  }, [selectedWallet, user, ready]);

  function switchWallet(addr: string, chain: Blockchain) {
    setSelectedWallet((state) => {
      const newState = {
        ...state,
        [chain]: addr,
      };
      
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("selectedWallet", JSON.stringify(newState));
      }
      
      return newState;
    });
  }

  function addEvmWallet(addr: string, chain: Blockchain) {
    if (!addr) return;

    setAccountByWallet((state) => {
      const evmWallets = state.evm || [];
      
      // Don't add if already exists
      if (evmWallets.includes(addr)) {
        return state;
      }

      const newEvmWallets = [...evmWallets, addr];
      
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("evmWallets", JSON.stringify(newEvmWallets));
      }

      return {
        ...state,
        evm: newEvmWallets,
      };
    });

    // Switch to the newly added wallet
    switchWallet(addr, chain);
  }

  const chain = selectedChain;

  const anyTokens = useAnyTokens(anyTokenUrl);

  const selectedWalletAdd = selectedWallet?.[chain] ?? null;

  const ownedTokens = useOwnedTokens(selectedWalletAdd, chain);

  const currentOwnedToken = ownedTokens?.[chain]?.[selectedWalletAdd];

  const state = {
    anyTokens,
    anyTokenUrl,
    selectedWallet,
    accountByWallet,
    //
    switchWallet,
    selectedChain,
    setAnyTokenUrl,
    setSelectedChain,
    setAccountByWallet,
    addEvmWallet,
    ownedTokens: currentOwnedToken,
  };

  return (
    <TokenContext.Provider value={state}>{children}</TokenContext.Provider>
  );
}

export function useTokens() {
  return useContext(TokenContext);
}
