// @ts-check

import {
    init as initRecast,
    exportNavMesh,
    exportTileCache,
} from "recast-navigation";
import {
    generateSoloNavMesh,
    generateTiledNavMesh,
} from "recast-navigation/generators";

let initialized = false;

let initPromise = initRecast().then(() => (initialized = true));

export type GenNavmeshResult =
    | {
          raw: Uint8Array;
          tiled: boolean;
          intermediates?: any;
      }
    | { error: string };

// worker to generate navmesh

// the worker receives a message with
// positions, indices, and the config
// generates the navmesh and sends it back

self.addEventListener("message", async (e) => {
    if (!initialized) {
        await initPromise;
    }

    const { positions, indices, config } = e.data;

    try {
        console.log("worker: generating navmesh", config);

        let raw: Uint8Array;
        let tiled = false;

        if (config.tileSize) {
            //
            let result = generateTiledNavMesh(positions, indices, config);
            // let result = generateTileCache(positions, indices, config);

            if (result.success !== true) {
                throw new Error(result.error);
            }

            tiled = true;
            // raw = exportTileCache(result.navMesh, result.tileCache);
            raw = exportNavMesh(result.navMesh);
            //
        } else {
            //
            let result = generateSoloNavMesh(positions, indices, config);

            if (result.success !== true) {
                throw new Error(result.error);
            }

            raw = exportNavMesh(result.navMesh);
        }

        console.log("worker: navmesh generated");

        self.postMessage(
            { raw, tiled },
            {
                transfer: [raw.buffer],
            }
        );
        //
    } catch (error) {
        console.error(error);
        self.postMessage({ error: error.message, fatal: true });
    }
});
