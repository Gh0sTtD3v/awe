import React, { useCallback, useEffect, useRef, useState } from "react";

import { LoadingSpinner } from "../../../../ui/loading-spinner";
import { NoResult } from "../../../no-result";
import { useTokens } from "../../../../contexts/token-context";
import { AssetCardsGrid } from "../../../asset-cards-grid";
import { Input } from "../../components/input";
import { Card } from "./card";

export default function ImportNft({
  searchQuery,
  category,
  onNftInputChange,
  errorMsg,
  inputRef,
  handleInputKeyDown,
}) {
  const observer = useRef(null);

  const prevNext = useRef(null);

  const [isLoadingMore, setLoadingMore] = useState(false);

  const { anyTokens, anyTokenUrl } = useTokens();

  const lastNftElement = useCallback(
    (node) => {
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          //
          const next = anyTokens?.next;

          setLoadingMore(!!anyTokens?.next);

          if (next === null) return;

          if (prevNext.current === next) return;

          if (typeof anyTokens?.nextPage === "function") {
            anyTokens.nextPage();

            prevNext.current = next;
          }
        }
      });

      if (node) observer.current.observe(node);
    },
    [anyTokens?.next]
  );

  useEffect(() => {
    //
    if (anyTokens?.next == null && isLoadingMore) {
      setLoadingMore(false);
    }
  }, [anyTokens?.next, isLoadingMore]);

  const nftState = anyTokens?.state;

  const isLoading = isLoadingMore || nftState === "InitialLoading";

  const hasNfts = !!anyTokens?.assets?.length;

  const data = anyTokens?.assets ?? [];

  return (
    <React.Fragment>
      <Input
        innerRef={inputRef}
        error={errorMsg}
        onChange={onNftInputChange}
        defaultValue={anyTokenUrl}
        onKeyDown={handleInputKeyDown}
        placeholder="Paste a link (opensea)"
      />

      {nftState === "LoadingSuccess" && hasNfts ? (
        <>
          <AssetCardsGrid display="square">
            {data.map((it, i) => {
              const key = it.contract_address + it.token_id + i;

              return (
                <React.Fragment key={key}>
                  <Card
                    data={it}
                    category={category}
                    searchQuery={searchQuery}
                  />

                  {i === data.length - 1 && (
                    <>
                      <div ref={lastNftElement} />
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </AssetCardsGrid>
        </>
      ) : null}

      {nftState === "LoadingSuccess" && !hasNfts ? (
        <NoResult layout="m">No assets found</NoResult>
      ) : null}

      {nftState === "LoadinError" && !hasNfts ? (
        <NoResult layout="m">Failed to load assets</NoResult>
      ) : null}

      {isLoading ? (
        <div className="loading-more">
          <LoadingSpinner light={true} width={18} height={18} />
        </div>
      ) : null}
    </React.Fragment>
  );
}
