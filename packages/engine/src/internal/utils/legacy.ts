import type { Component3D } from "../../space/abstract/component-3d";

export function LEGACY_fixScale(component: Component3D, scaleRatio: number) {
    //
    if (scaleRatio === 1) return;

    let legacyWidth = component.data["meta"]?._legacyWidth;

    if (legacyWidth) {
        //
        const s = component.data["scale"];

        component.scale.set(s.x / scaleRatio, s.y / scaleRatio, s.z);

        component.userData["LEGACY_SCALE"] = true;
    }
}
