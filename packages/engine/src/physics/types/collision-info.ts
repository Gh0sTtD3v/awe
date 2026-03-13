import { Quaternion, TypedArray, Vector3 } from "three";

import { PhysicsData } from "./physics-data";
import { Component3D } from "../../space/abstract/component-3d";

export interface ColliderDimensionsMap {

    CUBE: {
        width: number;
        height: number;
        depth: number;
    };

    SPHERE: {
        radius: number;
        center: { x: number; y: number; z: number };
    };

    CAPSULE: {
        radius: number;
        height: number;
        center: { x: number; y: number; z: number };
    };

    CYLINDER: {
        radius: number;
        height: number;
        center: { x: number; y: number; z: number };
    };

    MESH: null;
}

export interface CollisionInfo extends PhysicsData {
    mesh: Component3D;

    position: Vector3;
    quaternion: Quaternion;
    scale: Vector3;
    dimensions: ColliderDimensionsMap[keyof ColliderDimensionsMap];
    vertices?: TypedArray;
    indices?: TypedArray;
}
