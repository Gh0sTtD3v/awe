import { Component3D } from "../../space/abstract/component-3d";
import { ColliderOpts } from ".";
import { RigidBodyOpts } from ".";

export * from "./collider-opts";

export * from "./rigidbody-opts";

export * from "./physics-data";

export * from "./events";

export * from "./collision-info";

export * from "./constants";

export * from "./collider";

export * from "./rigidbody";

export * from "./physics-engine";

export * from "./character-controller";

export interface PhysicsOpts {
    //
    component: Component3D;

    rigitBodyOpts: RigidBodyOpts;
}
