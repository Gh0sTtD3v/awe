"use client";

import { useEffect } from "react";
import mainSvg from "./main.svg";
import studioSvg from "./studio.svg";

const SPRITE_CONTAINER_ID = "__studio-sprite-defs";

export function SpriteProvider() {
    useEffect(() => {
        if (document.getElementById(SPRITE_CONTAINER_ID)) return;

        const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );
        svg.id = SPRITE_CONTAINER_ID;
        svg.setAttribute("style", "display:none");
        document.body.insertBefore(svg, document.body.firstChild);

        const mainUrl = typeof mainSvg === "string" ? mainSvg : mainSvg.src;
        const studioUrl =
            typeof studioSvg === "string" ? studioSvg : studioSvg.src;

        Promise.all([fetch(mainUrl), fetch(studioUrl)])
            .then(([mainRes, studioRes]) =>
                Promise.all([mainRes.text(), studioRes.text()])
            )
            .then(([mainText, studioText]) => {
                // Extract inner content (symbols/defs) from <svg> wrapper
                const extract = (s: string) =>
                    s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
                svg.innerHTML = extract(mainText) + extract(studioText);
            });

        return () => {
            svg.remove();
        };
    }, []);

    return null;
}
