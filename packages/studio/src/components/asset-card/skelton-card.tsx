import { classes } from "../../utils/classes";

export function SkeltonCard({ display = "rectangle", className = "" }) {
    //
    return (
        <div
            className={classes(
                "relative w-full h-[180px] rounded-studio-card overflow-hidden bg-studio-darker",
                display === "square" && "aspect-square h-auto",
                "asset-card",
                className
            )}
        >
            <div className="absolute inset-0 animate-pulse" style={{ animation: "skeleton-loading 1s ease-in-out infinite alternate" }} />
        </div>
    );
}
