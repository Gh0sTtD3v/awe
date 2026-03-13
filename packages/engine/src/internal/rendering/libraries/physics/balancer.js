import { RigidBodyDesc, JointData, Vector3 } from "@dimforge/rapier3d";

export default class BalancerPhysics {
    constructor(world, axis = { x: 1, y: 0, z: 0 }) {
        this.world = world;

        this.axis = axis;
    }

    add(object) {
        if (object.collider.dimensions == null) {
            console.log("not having dimensions");

            return;
        }

        object.collider.rigidBody.setAngularDamping(0);

        const t = object.collider.rigidBody.translation();
        const c = object.collider.dimensions.center;

        let anchorBodyDesc = RigidBodyDesc.fixed();
        let anchorBody = this.world.createRigidBody(anchorBodyDesc);

        anchorBody.setRotation(object.collider.rigidBody.rotation(), true);
        anchorBody.setTranslation(
            object.collider.rigidBody.translation(),
            true,
        );

        let anchor = new Vector3(0, 0, 0); // Anchor point at the center

        let jointParams = JointData.revolute(anchor, anchor, this.axis);

        let joint = this.world.createImpulseJoint(
            jointParams,
            object.collider.rigidBody,
            anchorBody,
            true,
        );

        joint.configureMotorPosition(0, 6, 3);

        object.collider.rigidBody.lockTranslations(false);
    }
}
