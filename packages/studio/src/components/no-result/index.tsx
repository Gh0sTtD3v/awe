import React from "react";

import { classes } from "../../utils/classes";

export interface NoResultProps {
    children: string | React.ReactNode;
    layout: string; // s m l
}

const layoutStyles = {
    m: "py-[35px] px-5",
    l: "py-[60px] px-5 text-[15px] leading-[17px]",
    xl: "py-[136px] px-5 text-[15px] leading-[17px]",
    fill: "pt-5 px-5 pb-20 flex-grow text-[15px] justify-center leading-[17px]",
};

export function NoResult({ layout = "m", children }: NoResultProps) {
    return (
        <div
            className={classes(
                "w-full text-white/60 text-center text-[13px] font-normal leading-[15px] whitespace-pre-wrap flex flex-col gap-[25px]",
                "no-result",
                layoutStyles[layout as keyof typeof layoutStyles]
            )}
        >
            {children}
        </div>
    );
}
