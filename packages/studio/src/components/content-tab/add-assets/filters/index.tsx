import React from "react";
import { TagsList } from "../../../tags-list";
import { CollapseFilters } from "../../components/collapse-filters";

export function Filters({
  width,
  query,
  filters = [],
  items = [],
  setSearchQuery,
  handleChangeFilter = null,
}) {
  //
  const tabs = items.map((item) => ({
    ...item,
    isActive: filters?.includes(item.value),
  }));

  const count = filters?.filter((text) => text !== "all").length;

  return (
    <CollapseFilters
      count={count}
      width={width}
      search={query}
      filterItems={items}
      onSearchChange={setSearchQuery}
    >
      <TagsList items={tabs} onChange={handleChangeFilter} />
    </CollapseFilters>
  );
}
