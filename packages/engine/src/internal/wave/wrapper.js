import emitter from "../engine-emitter";
import { EngineEvents } from "../engine-events";

let DEFAULT_DATA = {};

export default class WaveWrapper {
  constructor(mesh, opts = {}) {
    this.mesh = mesh;

    this.data = Object.assign(DEFAULT_DATA, opts);

    this.target = this.data.target;

    // this.lastPos = {
    //     x: this.target.position.x,
    //     y: this.target.position.y,
    //     z: this.target.position.z,
    // };

    // this.activeWrappers = [];

    this.addEvents();
  }

  update() {
    this.mesh.position.copy(this.target.position);

    // this.mesh.rotation.y = this.target.rotation.y

    this.mesh.position.y = 0.5;
  }

  addEvents() {
    if (this.updateEvent == null) {
      this.updateEvent = this.update.bind(this);

      emitter.on(EngineEvents.LATE_UPDATE, this.updateEvent);
    }
  }

  removeEvents() {
    if (this.updateEvent != null) {
      emitter.off(EngineEvents.LATE_UPDATE, this.updateEvent);

      this.updateEvent = null;
    }
  }

  dispose() {
    this.removeEvents();

    let i = 0;

    while (i < this.activeWrappers.length) {
      const w = this.activeWrappers[i];

      // if (w.tween != null) {
      //     w.tween.kill();

      //     this.mesh.remove(w);

      //     w.tween = null;
      // }

      i++;
    }

    this.activeWrappers = [];
  }
}
