import { classes } from "../../utils/classes";
import { ScrollableSection } from "../scrollable-section";

export function AssetCardsGrid({
  display = "rectangle",
  skipScrollableSection = false,
  children,
  className = "",
}) {
  return (
    <div
      className={classes(
        "relative flex max-h-full min-h-0 w-full",
        display === "rectangle" && "[&_.scrollable-wrapper]:flex-col [&_.asset-card:not(:last-child)]:mb-0.5",
        display === "square" && skipScrollableSection && "grid gap-[3px] justify-start grid-cols-[repeat(auto-fill,minmax(66.66px,1fr))]",
        display === "square" && !skipScrollableSection && "[&_.scrollable-wrapper]:grid [&_.scrollable-wrapper]:gap-[3px] [&_.scrollable-wrapper]:justify-start [&_.scrollable-wrapper]:grid-cols-[repeat(auto-fill,minmax(66.66px,1fr))]",
        display === "rows" && "[&_.scrollbar-hidden]:flex [&_.scrollbar-hidden]:flex-col [&_.scrollbar-hidden]:gap-0.5 [&_.folder]:shrink-0",
        "[&_.tabs]:mb-2.5",
        "asset-cards-grid",
        className
      )}
    >
      {skipScrollableSection ? (
        children
      ) : (
        <ScrollableSection>{children}</ScrollableSection>
      )}
    </div>
  );
}
