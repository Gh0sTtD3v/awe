import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { CustomSelect } from "../../../../ui/custom-select";
import { LoadingSpinner } from "../../../../ui/loading-spinner";
import { NoResult } from "../../../no-result";
import { WalletFactory } from "../../../../dApp/wallets";
import { useTokens } from "../../../../contexts/token-context";
import { AssetCardsGrid } from "../../../asset-cards-grid";
import { Input } from "../../components/input";
import { Card } from "./card";

export default function Nfts({
  searchQuery,
  category,
  chainFilter,
  onNftInputChange,
  errorMsg,
  inputRef,
  handleInputKeyDown,
}) {
  //
  const prevNext = useRef(null);

  const observerNft = useRef(null);



  const {
    anyTokenUrl,
    ownedTokens,
    selectedChain,
    selectedWallet,
    accountByWallet,
    setSelectedChain,
    //
    switchWallet,
    addEvmWallet,
  } = useTokens();

  useEffect(() => {
    setSelectedChain("ethereum");
  }, []);

  const currentWallet = selectedWallet[selectedChain] ?? null;

  const accounts = accountByWallet["evm"] ?? [];

  const wallets = accounts.map((it) => ({
    value: it,
    label: it,
  }));

  const [isLoadingMore, setLoadingMore] = useState(false);

  const nftState = ownedTokens?.state;

  const data = useMemo(() => {
    //
    const merge = ownedTokens?.assets || [];

    const dictionary = new Map();

    merge.forEach((item) => {
      const key = item.contract_address + item.token_id;

      if (key) {
        dictionary.set(key, item);
      }
    });

    return Array.from(dictionary.values());
  }, [ownedTokens?.assets]);

  const lastNftItem = useCallback(
    (node) => {
      //
      if (observerNft.current) observerNft.current.disconnect();

      observerNft.current = new IntersectionObserver((entries) => {
        //
        if (entries[0].isIntersecting) {
          //
          const next = ownedTokens?.next;

          setLoadingMore(!!next);

          if (next === null) return;

          if (prevNext.current == next) return;

          if (typeof ownedTokens.nextPage === "function") {
            ownedTokens.nextPage();

            prevNext.current = next;
          }
        }
      });

      if (node) observerNft.current.observe(node);
    },
    [ownedTokens?.next]
  );


  useEffect(() => {
    //
    if (ownedTokens?.next == null && isLoadingMore) {
      setLoadingMore(false);
    }
  }, [ownedTokens?.next, isLoadingMore]);

  const handleAddAccount = async () => {
    try {
      if (!selectedChain) return;

      // Use unified wallet connection
      const result = await WalletFactory(selectedChain);

      if (!result || !result.walletId) return;

      const addr = result.walletId;

      // Add EVM wallet (saves to localStorage and switches to it)
      addEvmWallet(addr, selectedChain);
    } catch (err) {
      console.error(err);
    }
  };

  const hasNfts = !!data?.length;

  const isLoading =
    isLoadingMore || nftState === "InitialLoading";

  return (
    <React.Fragment>
      <CustomSelect
        options={[
          ...wallets,
          {
            type: "button",
            label: "Add Account",
            onClick: handleAddAccount,
            icon: {
              name: "add-asset",
              width: 14,
              height: 14,
              pos: "right",
            },
          },
        ]}
        defaultLabel="Select Wallet"
        selectedOption={
          currentWallet
            ? {
              value: currentWallet,
              label: currentWallet,
            }
            : null
        }
        setSelectedOption={(val) => {
          switchWallet(val.value, selectedChain);
        }}
      />

      {handleInputKeyDown && (
        <Input
          innerRef={inputRef}
          error={errorMsg}
          onChange={onNftInputChange}
          defaultValue={anyTokenUrl}
          onKeyDown={handleInputKeyDown}
          placeholder="Paste a link (opensea)"
        />
      )}

      {nftState === "LoadingSuccess" && hasNfts ? (
        <AssetCardsGrid display="square" className="asset-card-nfts">
          {data.map((it, i) => {
            const key = it.contract_address + it.token_id;

            return (
              <React.Fragment key={key}>
                <Card data={it} category={category} searchQuery={searchQuery} />

                {i === data.length - 1 && (
                  <div ref={lastNftItem} />
                )}
              </React.Fragment>
            );
          })}
        </AssetCardsGrid>
      ) : null}

      {nftState === "LoadingSuccess" && !hasNfts ? (
        <NoResult layout="m">No assets found</NoResult>
      ) : null}

      {nftState === "LoadinError" && !hasNfts ? (
        <NoResult layout="m">Failed to load assets</NoResult>
      ) : null}

      {isLoading ? (
        <div className="loading-more">
          <LoadingSpinner light={true} width={18} height={18} className={""} />
        </div>
      ) : null}
    </React.Fragment>
  );
}
