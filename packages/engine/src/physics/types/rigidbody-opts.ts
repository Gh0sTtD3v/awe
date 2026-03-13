import { ColliderOpts } from "./collider-opts";

export type RigidBodyType = "DYNAMIC" | "KINEMATIC" | "PLAYER" | "FIXED";

export interface RigidBodyOpts {
    type: RigidBodyType;
    position: { x: number; y: number; z: number };
    quaternion: { x: number; y: number; z: number; w: number };
    linearDamping?: number;
    angularDamping?: number;
    translationLock?: [boolean, boolean, boolean];
    rotationLock?: [boolean, boolean, boolean];
    colliders: ColliderOpts[];
}
