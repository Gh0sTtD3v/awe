import emitter from "../engine-emitter";
import { EngineEvents } from "../engine-events";

import { Vector3 } from "three";

let DEFAULT_DATA = {
  spawnDistance: 2,
  decaySpeed: 1.5,
  randomXZ: 0.9,
  spawnSource: {
    x: 0,
    y: 0,
    z: 0,
  },
  scale: 1,
  condition: null,
};

const dataAtlas = [
  { x: 0.5, y: 0.5, z: 0.0, w: 0.0 },
  { x: 0.5, y: 0.5, z: 0, w: 0.5 },
  { x: 0.5, y: 0.5, z: 0.5, w: 0.5 },
  { x: 0.5, y: 0.5, z: 0.5, w: 0 },
];

let dId = 0;

const tempA = new Vector3();

const tempB = new Vector3();

const tempC = new Vector3();

import gsap from "gsap";

export default class DustWrapper {
  constructor(mesh, opts = {}) {
    this.mesh = mesh;

    this.data = Object.assign(DEFAULT_DATA, opts);

    this.target = this.data.target;

    this.lastPos = {
      x: this.target.position.x,
      y: this.target.position.y,
      z: this.target.position.z,
    };

    this.activeWrappers = [];

    this.addEvents();
  }

  update() {
    if (this.data.condition != null && this.data.condition() == false) {
      return;
    }

    const distance = this.calculateDistance(this.lastPos, this.target.position);

    tempA.copy(this.target.position);

    if (distance > this.data.spawnDistance) {
      var s = (Math.random() * 0.5 + 0.3) * this.data.scale;

      tempC.subVectors(tempA, tempB).normalize();

      const spawn = this.mesh.add({
        position: {
          x:
            this.target.position.x +
            (Math.random() - Math.random()) * this.data.randomXZ +
            this.data.spawnSource.x,
          y: this.target.position.y + this.data.spawnSource.y,
          z:
            this.target.position.z +
            (Math.random() - Math.random()) * this.data.randomXZ +
            this.data.spawnSource.z,
        },

        rotationY: Math.PI * 2 * Math.random(),

        scale: { x: s, y: s, z: s },

        atlas: dataAtlas[dId++ % 3],
      });

      // console.log( (Math.random() - Math.random()) * this.data.randomXZ )

      this.decay(spawn, {
        direction: tempC,
      });

      this.lastPos = {
        x: this.target.position.x,
        y: this.target.position.y,
        z: this.target.position.z,
      };
    }

    tempB.copy(this.target.position);
  }

  decay(wrapper, data) {
    const current = {
      scale: wrapper.scale.x,
      finalScale: 0,

      posX: wrapper.position.x,
      posY: wrapper.position.y,
      posZ: wrapper.position.z,
    };

    wrapper.tween = gsap.to(current, {
      posX: current.posX + data.direction.x * 0.5,
      posY: current.posY + data.direction.y * 0.5 + 1,
      posZ: current.posZ + data.direction.z * 0.5,

      scale: current.finalScale,
      duration: this.data.decaySpeed,
      ease: "power4.easeOut",
      onUpdate: () => {
        wrapper.scale.set(current.scale, current.scale, current.scale);

        wrapper.setPosition({
          x: current.posX,
          y: current.posY,
          z: current.posZ,
        });
      },

      onComplete: () => {
        this.activeWrappers.splice(this.activeWrappers.indexOf(wrapper), 1);

        wrapper.tween = null;

        this.mesh.remove(wrapper);
      },
    });

    this.activeWrappers.push(wrapper);
  }

  addEvents() {
    if (this.updateEvent == null) {
      this.updateEvent = this.update.bind(this);

      emitter.on(EngineEvents.PRE_RENDER, this.updateEvent);
    }
  }

  removeEvents() {
    if (this.updateEvent != null) {
      emitter.off(EngineEvents.PRE_RENDER, this.updateEvent);

      this.updateEvent = null;
    }
  }

  dispose() {
    this.removeEvents();

    let i = 0;

    while (i < this.activeWrappers.length) {
      const w = this.activeWrappers[i];

      if (w.tween != null) {
        w.tween.kill();

        this.mesh.remove(w);

        w.tween = null;
      }

      i++;
    }

    this.activeWrappers = [];
  }

  calculateDistance(p1, p2) {
    var a = p2.x - p1.x;
    var b = p2.y - p1.y;
    var c = p2.z - p1.z;

    return Math.sqrt(a * a + b * b + c * c);
  }
}
