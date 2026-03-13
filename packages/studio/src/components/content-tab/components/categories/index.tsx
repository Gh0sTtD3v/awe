import React from "react";
import { classes } from "../../../../utils/classes";
import { Tab } from "../tab";

export function Categories({
  width,
  category,
  categoryItems = null,
  setCategory = null,
  subCategory = null,
  subCategoryItems = null,
  setSubCategory = null,
  onReset = null,
  skipClose = false,
}) {
  const onClose = () => {
    if (onReset) return onReset();

    setCategory("");

    if (setSubCategory) setSubCategory("");
  };

  return (
    <div className={classes("flex items-center min-w-0 not-last:mb-[6px] [&_.tabs:first-child]:-ml-[5px] [&_.tabs:first-child]:shrink-0 [&_.tabs:last-child]:shrink", "categories")}>
      <Tab
        color="transparent-white"
        size="s"
        itemsGrow={false}
        hideUnselected={true}
        items={categoryItems}
        currentTab={category}
        onChange={(value) => {
          setCategory(value);
        }}
        onClose={onClose}
        containerWidth={width}
        skipClose={skipClose}
      />

      {category !== "" && subCategoryItems && (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="6"
            height="8"
            viewBox="0 0 6 8"
            fill="none"
            className="shrink-0 ml-[6px] mr-1"
          >
            <path
              d="M5.12713 3.24407C5.58759 3.64284 5.58759 4.35716 5.12713 4.75593L1.65465 7.76318C1.00701 8.32406 4.56679e-08 7.864 8.31177e-08 7.00725L3.4602e-07 0.992749C3.8347e-07 0.135997 1.00701 -0.324056 1.65465 0.23682L5.12713 3.24407Z"
              fill="#353535"
            />
          </svg>

          <Tab
            color="transparent-white"
            size="s"
            itemsGrow={false}
            hideUnselected={true}
            skipClose={true}
            items={subCategoryItems}
            currentTab={subCategory}
            onChange={(value) => {
              setSubCategory(value);
            }}
            containerWidth={width}
          />
        </>
      )}
    </div>
  );
}
