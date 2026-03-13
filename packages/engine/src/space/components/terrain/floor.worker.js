// @ts-check

import { generateTerrainGeometry } from "./generate-geometry";


self.addEventListener(
    "message",

    async function (e) {
        
        const geometry = generateTerrainGeometry(e.data);

        self.postMessage(
            {
                position: geometry.attributes.position.array,
                normal: geometry.attributes.normal.array,
                uv: geometry.attributes.uv.array,
                index: geometry.index.array,
                // position:
            },
            // @ts-ignore
            [
                geometry.attributes.position.array.buffer,
                geometry.attributes.normal.array.buffer,
                geometry.attributes.uv.array.buffer,
                geometry.index.array.buffer,
            ],
        );
    },
);
