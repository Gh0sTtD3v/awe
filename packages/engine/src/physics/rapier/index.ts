import RapierPhysicsEngine from "./rapier-physics-engine";

class PhysicsRapier {
    constructor() {}

    get(opts) {
        return new RapierPhysicsEngine(opts);
    }
}

export default new PhysicsRapier();
