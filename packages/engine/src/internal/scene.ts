import { Scene as THREESCENE, Fog } from "three";
import { DEBUG } from "./constants";

class Scene extends THREESCENE {
  constructor() {
    super();

    if (DEBUG) {
      globalThis.scene = this;
    }

    this.matrixAutoUpdate = false;
    // this.matrixWorldAutoUpdate = false
  }

  setState() {
    return Promise.resolve();
  }
}

export default new Scene();
