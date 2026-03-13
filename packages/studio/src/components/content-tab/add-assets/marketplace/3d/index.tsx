import React, { useEffect, useMemo, useState } from "react";
import { use3DLibrary } from "../../../../../hooks/use-3d-library";
import { AssetCardsGrid } from "../../../../asset-cards-grid";
import { ScrollableSection } from "../../../../scrollable-section";
import { Loading } from "../../../components/loading";
import { NotFound } from "../../../components/not-found";
import { Card } from "./card";
import { Filters } from "../../filters";
import { Card as OfficialCard } from "../official/card";

const childCategoryItems = [
  {
    value: "kits",
    title: "Kits",
  },
  {
    value: "buildings",
    title: "Buildings",
  },
  {
    value: "nature",
    title: "Nature",
  },
  {
    value: "vehicles",
    title: "Vehicles",
  },
  {
    value: "others",
    title: "Others",
  },
];

const kitsItems = [
  {
    value: "vipekit",
    title: "VipeKit",
    image:
      "https://cyber.mypinata.cloud/ipfs/Qmb4uPNb8btumQBVw2jkjSjtmeyPo1j1qht3GQvy8ZVdjc?filename=VipeKit_by_2_c9jul9.jpg",
  },
  {
    value: "galaxy-kit",
    title: "Galaxy",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmTsUhpViGK73NheC7foeq7Rm88wW8GYw6EHfRkK18jD2b?filename=1690299322-galaxy-thumb.jpg",
  },
  {
    value: "genesis-kit",
    title: "Genesis",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmPC4dtqWaN73S2AX2HfgtWA2E98x8777b9fySV1hiBmfc?filename=artgallery_GLTF.gltf_ku5e4d.png",
  },
  {
    value: "canvas-kit",
    title: "Canvas",
    image:
      "https://cyber.mypinata.cloud/ipfs/QmfHaAbaQbvybaj9sWCvu1Hy8Ys9QXjpvFCXn6xrtZuiQx?filename=CanvasCoverImage_j4azkb.png",
  },
];

const subCategoryItems = {
  props: null,
  nature: null,
  vehicles: null,
  kits: kitsItems,
  buildings: null,
};

export default function Model3D({ width }) {
  //

  const [childCategory, setChildCategory] = useState([]);

  const [searchQuery, setSearchQuery] = useState(null);

  const [childSubCategory, setChildSubCategory] = useState("");

  const library3dResp = use3DLibrary();

  const data = useMemo(() => {
    //
    if (!library3dResp.data) return [];

    let filteredResult = library3dResp.data;

    if (childCategory.includes("kits")) {
      filteredResult = childSubCategory
        ? filteredResult.filter((it) => it.source?.slug === childSubCategory)
        : filteredResult.filter((it) =>
            kitsItems.some((kit) => it.source?.slug === kit.value)
          );
    }

    if (childCategory.includes("buildings")) {
      filteredResult = filteredResult.filter((it) =>
        it.source?.nodeName?.toLowerCase().match(/building/g)
      );
    }

    if (childCategory.includes("vehicles")) {
      filteredResult = filteredResult.filter((it) =>
        it.source?.nodeName?.toLowerCase().match(/bus|car|truck|bicycle/g)
      );
    }

    if (childCategory.includes("nature")) {
      filteredResult = filteredResult.filter((it) =>
        it.source?.nodeName?.toLowerCase().match(/street_tree|sapin|roseau/g)
      );
    }

    if (childCategory.includes("others")) {
      filteredResult = filteredResult.filter(
        (it) =>
          !it.source?.nodeName
            ?.toLowerCase()
            .match(/street_tree|sapin|roseau|bus|car|truck|bicycle|building/g)
      );
    }

    if (searchQuery) {
      filteredResult = filteredResult.filter((it) =>
        it.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filteredResult;
    //
  }, [searchQuery, childCategory, childSubCategory, library3dResp.data]);

  const handleChangeFilter = (val) => {
    if (childCategory.includes(val)) {
      setChildCategory(childCategory.filter((el) => el !== val));
    } else {
      setChildCategory([...childCategory, val]);
    }
  };

  useEffect(() => {
    //setFilterItems(childCategoryItems);
  }, []);

  return (
    <React.Fragment>
      <Filters
        items={childCategoryItems}
        filters={childCategory}
        query={searchQuery}
        setSearchQuery={setSearchQuery}
        handleChangeFilter={handleChangeFilter}
        width={width}
      />

      <ScrollableSection>
        {library3dResp.isLoading ? (
          <Loading />
        ) : !data.length ? (
          <NotFound />
        ) : (
          <AssetCardsGrid display="square" skipScrollableSection={true}>
            <OfficialCard type={"mesh"} />

            {data?.map((it) => (
              <Card key={it.id} libraryItem={it} />
            ))}
          </AssetCardsGrid>
        )}
      </ScrollableSection>
    </React.Fragment>
  );
}
