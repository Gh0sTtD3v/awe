import type { Component3D } from "./component-3d";

export interface ComponentMixin {
    init(component: Component3D): Promise<void>;

    update(): void;

    dispose(component: Component3D): void;
}
