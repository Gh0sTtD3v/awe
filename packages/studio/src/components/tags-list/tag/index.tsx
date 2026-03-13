import React from "react";
import { classes } from "../../../utils/classes";

export interface TagProps {
    label: string;
    active: boolean;
    onClick: () => void;
}

export function Tag({ label, active, onClick }: TagProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={classes(
                "flex items-center justify-center px-2.5 pt-2.5 pb-[9px]",
                "whitespace-nowrap text-[11px] font-medium leading-[9px] tracking-[0.22px] uppercase",
                "transition-[color,background-color] duration-300 ease-out-quad",
                "rounded-lg",
                active 
                    ? "text-white bg-white/20 hover:bg-white/30" 
                    : "text-white/40 bg-white/10 hover:bg-white/20"
            )}
        >
            {label}
        </button>
    );
}
