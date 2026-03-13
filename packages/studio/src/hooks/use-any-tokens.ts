import { useEffect, useRef } from "react";
import useSWRInfinite from "swr/infinite";
import { OpenSeaNft } from "../dApp/nfts";
import type { NftsResponse } from "../dApp/nfts/types";

const OS_ASSET_PREFIX =
  /^https:\/\/opensea\.io(?:\/fr)?\/(?:assets|item)\/([^\/]+)\/([^\/]+)\/([^\/]+)/;

const OS_COLLECTION_PREFIX =
  /https:\/\/opensea\.io(?:\/[a-zA-Z-]+)?\/collection\/(.+)/;

export function isInvalidOpenSeaUrl(url: string) {
  return (
    !url.match(OS_ASSET_PREFIX) &&
    !url.match(OS_COLLECTION_PREFIX)
  );
}

function parseQuery(url: string) {
  //

  if (!url) return null;

  const openSeacollection = url.match(OS_COLLECTION_PREFIX);

  const openSeaAsset = url.match(OS_ASSET_PREFIX);

  if (openSeacollection && openSeacollection.length > 1) {
    //
    const addr = openSeacollection[1];

    return {
      addr,
      chain: null,
      tokenId: null,
      type: "collection",
      provider: "opensea",
    };
  }

  if (openSeaAsset && openSeaAsset.length > 3) {
    //
    const chain = openSeaAsset[1];
    const addr = openSeaAsset[2];
    const tokenId = openSeaAsset[3];

    return {
      addr,
      chain,
      tokenId,
      type: "asset",
      provider: "opensea",
    };
  }

  return null;
}

async function fetcher([
  url,
  [keys, previousPageData, index, abortController],
]) {
  //

  const [blockchain, addr, tokenId, provider, type] = keys;

  let next = null;

  if (previousPageData?.next) {
    next = previousPageData.next;
  }

  try {
    //
    if (!addr) return null;

    if (provider === "opensea") {
      //
      const options = {
        signal: abortController.signal,
        next,
      };

      if (type === "collection") {
        const assets = await OpenSeaNft.getNftsBySlug(addr, options);

        return assets;
      }

      if (type === "asset") {
        const asset = await OpenSeaNft.getNft(
          addr,
          blockchain,
          tokenId,
          options
        );

        return {
          assets: [asset],
          next: null,
        };
      }
    }


  } catch (error) {
    console.error(error);

    return null;
  }

  return null;
}

const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  refreshInterval: 1000_000_000,
};

export function useAnyTokens(query: string) {
  //
  const abortController = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    abortController.current = controller;

    return () => {
      abortController.current.abort();
    };
  }, []);

  const parsedQuery = parseQuery(query);

  const params = [
    parsedQuery?.chain,
    parsedQuery?.addr,
    parsedQuery?.tokenId,
    parsedQuery?.provider,
    parsedQuery?.type,
  ];

  const getKey = (pageIndex, previousPageData) => {
    //

    return [
      query,
      [params, previousPageData, pageIndex, abortController.current],
    ];
  };

  const { data, error, isLoading, setSize } = useSWRInfinite(
    getKey,
    fetcher,
    swrOptions
  );

  if (parsedQuery == null) return null;

  let assets = [];

  let next = null;

  for (const item of (data || []) as NftsResponse[]) {
    //
    if (!Array.isArray(item?.assets)) continue;
    assets = [...assets, ...item.assets];
    next = item?.next ?? null;
  }

  const nextPage = () => setSize((prevSize) => prevSize + 1);

  if (error) {
    return {
      state: "LoadinError",
      error,
    };
  }

  if (isLoading) {
    return {
      state: "InitialLoading",
    };
  }

  return {
    state: "LoadingSuccess",
    next,
    assets,
    nextPage,
  };
}