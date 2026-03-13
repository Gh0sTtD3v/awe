import { useEffect, useRef, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { OpenSeaNft } from "../dApp/nfts";
import type { Blockchain, NftsResponse } from "../dApp/nfts/types";

const swrOptions = {
  revalidateOnFocus: false,
  revalidateFirstPage: false,
  revalidateOnReconnect: false,
  refreshInterval: 1000_000_000,
};

async function fetcher([
  [address, chain],
  [previousPageData, index, abortController],
]) {
  //
  try {
    //
    let next = null;

    if (previousPageData?.next) {
      next = previousPageData.next;
    }

    const options = {
      signal: abortController.signal,
      next,
    };

    // All chains now use OpenSea
    if (!address.startsWith("0x")) throw new Error("Invalid address");

    const data = await OpenSeaNft.getUserNfts(address, chain, options);

    return data;
  } catch (error) {
    return {
      assets: [],
      next: null,
    };
  }
}

export function useOwnedTokens(address: string, chain: Blockchain) {
  //
  const abortController = useRef(null);

  const [assetsState, setAssetsState] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    abortController.current = controller;

    return () => {
      abortController.current.abort();
    };
  }, []);

  const next = assetsState?.[chain]?.next;

  const getKey = (pageIndex, previousPageData) => {
    //

    if (!address || !chain) return null;

    if (next === null) return null;

    return [
      [address, chain],
      [previousPageData, pageIndex, abortController.current],
    ];
  };

  const { data, error, isLoading, setSize } = useSWRInfinite(
    getKey,
    fetcher,
    swrOptions
  );

  useEffect(() => {
    //

    if (!chain) return;

    if (isLoading) {
      //
      setAssetsState((state) => {
        //
        return {
          ...state,
          [chain]: {
            ...(state?.[chain] || []),
            [address]: {
              state: "InitialLoading",
            },
          },
        };
      });

      return;
    }

    if (error) {
      //
      setAssetsState((state) => {
        return {
          ...state,
          [chain]: {
            ...(state?.[chain] || []),
            [address]: {
              state: "LoadinError",
              error,
            },
          },
        };
      });

      return;
    }

    if (data) {
      //
      let tokens = [];

      let next = null;

      for (const item of (data || []) as NftsResponse[]) {
        //
        if (!Array.isArray(item.assets)) continue;
        tokens = tokens.concat(item.assets);
        next = item.next;
      }

      setAssetsState((state) => {
        //
        return {
          ...state,
          [chain]: {
            ...(state?.[chain] || []),
            [address]: {
              next,
              nextPage,
              assets: tokens,
              state: "LoadingSuccess",
            },
          },
        };
      });
    }
  }, [data, isLoading, error, chain, address]);

  const nextPage = () => setSize((prevSize) => prevSize + 1);

  return assetsState;
}
