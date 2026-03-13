import type { Component3D } from "../../space/abstract/component-3d";
import type { BaseIntersectionEvent } from "../types";

export class IntersectionEvent implements BaseIntersectionEvent {
    constructor(
        public readonly me: Component3D,
        public readonly other: Component3D,
        public frame: number,
    ) {}
}
