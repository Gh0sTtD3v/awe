import PhysicsRapier from "./rapier";
import type { PhysicsEngine } from "./types";

// Re-export types
export * from "./types";

/**
 * Physics manager
 *
 * @internal
 */
export class PhysicsManager {
  private rapier: PhysicsEngine | null = null;

  constructor() {}

  get(opts: {
    type: "rapier";
    debug: boolean;
  }): PhysicsEngine {
    if (this.rapier) {
      return this.rapier;
    }

    this.rapier = PhysicsRapier.get(opts);
    return this.rapier;
  }

  dispose() {
    if (this.rapier == null) return;
    this.rapier.dispose();
    this.rapier = null;
  }
}

export const Physics = new PhysicsManager();
