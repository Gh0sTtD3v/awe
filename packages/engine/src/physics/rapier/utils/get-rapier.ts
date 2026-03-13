import type * as RAPIER from "@dimforge/rapier3d";

let _RAPIER: typeof RAPIER = null;

export async function getRapier(): Promise<typeof RAPIER> {
    if (_RAPIER == null) {
        if (typeof window === "undefined") {
            // Node.js / headless: use the compat build which bundles WASM as base64
            // @ts-ignore
            _RAPIER = await import("@dimforge/rapier3d-compat");
            // @ts-ignore
            await _RAPIER.init();
        } else {
            _RAPIER = await import("@dimforge/rapier3d");
        }
    }

    return _RAPIER;
}
