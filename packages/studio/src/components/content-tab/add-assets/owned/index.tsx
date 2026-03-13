import React, { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Chains } from "./constants";
import { classes } from "../../../../utils/classes";
import { isInvalidOpenSeaUrl } from "../../../../hooks/use-any-tokens";
import { useTokens } from "../../../../contexts/token-context";
import { Tab } from "../../components/tab";
import { Loading } from "../../components/loading";
import { Filters } from "../filters";

const Nfts = dynamic(() => import("./nfts"), {
  ssr: false,
  loading: () => <Loading />,
});

const ImportNft = dynamic(() => import("./import-nft"), {
  ssr: false,
  loading: () => <Loading />,
});

const childCategoryItems = [
  {
    value: "all",
    title: `All`,
  },
  {
    value: "images",
    title: "Images",
  },
  {
    value: "3d",
    title: "3D",
  },
  {
    value: "animations",
    title: "Animated",
  },
];

function Owned({ width }) {
  //
  const inputRef = useRef(null);

  const [category, setCategory] = useState("all");

  const [customLink, setCustomLink] = useState("");

  const [searchQuery, setSearchQuery] = useState(null);

  const [chainFilter, setChainFilter] = useState("ethereum");

  const { anyTokenUrl, setSelectedChain, setAnyTokenUrl } = useTokens();

  const onNftInputChange = (value) => {
    setCustomLink(value);
  };

  const handleInputKeyDown = (event) => {
    //
    if (event.key === "Enter") {
      setAnyTokenUrl(customLink);
      setCustomLink("");
      setCategory("all");
    }
  };

  const errorMsg =
    anyTokenUrl && isInvalidOpenSeaUrl(anyTokenUrl) ? "Invalid URL" : null;

  const props = { width, category, searchQuery, chainFilter };

  return (
    <div className={classes("[&_.custom-select-wrapper]:-mt-[14px] [&_.custom-select-wrapper]:mb-[18px] [&_.connect-wallet]:flex-row-reverse [&_.connect-wallet]:w-auto [&_.connect-wallet_.button-pill-icon]:ml-0 [&_.connect-wallet_.button-pill-icon]:mr-[14px] [&_.js-prevent-custom-select-close]:text-white/60", "env")}>
      <Filters
        items={
          anyTokenUrl
            ? childCategoryItems
            : [
                ...childCategoryItems,
                {
                  value: "vrms",
                  title: "Avatars",
                },
              ]
        }
        filters={[category]}
        query={searchQuery}
        setSearchQuery={setSearchQuery}
        handleChangeFilter={(val) => {
          setCategory(val);
        }}
        width={width}
      />

      <Tab
        itemsGrow={false}
        items={Chains}
        currentTab={chainFilter}
        onChange={(value) => {
          setChainFilter(value);
          setSelectedChain(value);
        }}
      />
      {anyTokenUrl ? (
        <ImportNft
          errorMsg={errorMsg}
          inputRef={inputRef}
          onNftInputChange={onNftInputChange}
          handleInputKeyDown={handleInputKeyDown}
          {...props}
        />
      ) : (
        <Nfts
          errorMsg={errorMsg}
          inputRef={inputRef}
          onNftInputChange={onNftInputChange}
          handleInputKeyDown={handleInputKeyDown}
          {...props}
        />
      )}
    </div>
  );
}

export default Owned;
