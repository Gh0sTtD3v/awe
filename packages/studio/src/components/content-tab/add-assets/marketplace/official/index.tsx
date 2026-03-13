import React, { useMemo, useState } from "react";
import { useWorldSettings } from "../../../../../hooks/component-hooks";
import { AssetCardsGrid } from "../../../../asset-cards-grid";
import { useContentTab } from "../../../../../contexts/content-tab-context";
import { ScrollableSection } from "../../../../scrollable-section";
import { NotFound } from "../../../components/not-found";
import { Filters } from "../../filters";
import { Card } from "./card";

const childCategoryItems = [
  {
    value: "worldsettings",
    title: "World Settings",
  },
  {
    value: "items",
    title: "Items",
  },
];

export default function Official({ width }) {
  //
  const [childCategory, setChildCategory] = useState([]);

  const [searchQuery, setSearchQuery] = useState(null);

  const worldSettings = useWorldSettings();

  const { isReplaceToggled } = useContentTab();

  const data = useMemo(() => {
    //

    let result = worldSettings.slice();

    if (searchQuery) {
      result = result.filter(
        (it) =>
          it.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          it.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const hasItems = childCategory.includes("items");

    const hasWorldSettings = childCategory.includes("worldsettings");

    if (hasItems && !hasWorldSettings) {
      result = result.filter((it) => ["terrain", "text"].includes(it.type));
    } else if (hasWorldSettings && !hasItems) {
      result = result.filter((it) => !["terrain", "text"].includes(it.type));
    }

    const ordering = {
      background: 1,
      lighting: 2,
      terrain: 3,
      water: 4,
      spawn: 5,
      postprocessing: 6,
      fog: 7,
      godray: 8,
      bird: 9,
      camera: 10,
      batch: 11,
      envmap: 12,
      reflector: 13,
      grass: 14,
      rain: 15,
      text: 16,
      iframe: 17,
      //particles: 18,
    };

    result = result.sort((a, b) => {
      const o1 = ordering[a.type] ?? Infinity;
      const o2 = ordering[b.type] ?? Infinity;
      return o1 - o2;
    });

    return result;
  }, [worldSettings, childCategory, searchQuery]);

  const handleChangeFilter = (val) => {
    //
    if (childCategory.includes(val)) {
      setChildCategory(childCategory.filter((el) => el !== val));
    } else {
      setChildCategory([...childCategory, val]);
    }
  };

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

      {data.length === 0 ? (
        <NotFound />
      ) : (
        <ScrollableSection>
          <AssetCardsGrid display="square" skipScrollableSection={true}>
            {data.map((item) => (
              <Card
                key={item.type}
                type={item.type}
                disabled={isReplaceToggled}
              />
            ))}
          </AssetCardsGrid>
        </ScrollableSection>
      )}
    </React.Fragment>
  );
}
