import { BufferAttribute, BufferGeometry, Matrix4, Vector3 } from "three";
import { vi } from "vitest";

const { rendererMock, cameraMock } = vi.hoisted(() => ({
  rendererMock: {
    shadowMap: {
      autoUpdate: true,
    },
    renderRealTimeShadow: false,
  },
  cameraMock: {
    current: {
      position: { x: 0, y: 0, z: 0 },
    },
    _frustum: {
      intersectsSphere: () => true,
    },
  },
}));

vi.mock("../src/internal/renderer.js", () => ({
  default: rendererMock,
}));

vi.mock("../src/camera", () => ({
  default: cameraMock,
}));

import GeometryInstancer from "../src/internal/pipeline/instanced-geometry.js";

describe("Instanced geometry dynamic shadows", () => {
  it("keeps dynamic-shadow instances in the main render buffer", () => {
    const geometry = new BufferGeometry();

    geometry.setAttribute(
      "position",
      new BufferAttribute(
        new Float32Array([
          0, 0, 0,
          1, 0, 0,
          0, 1, 0,
        ]),
        3,
      ),
    );
    geometry.setIndex([0, 1, 2]);
    geometry.computeBoundingSphere();

    const instancer = new GeometryInstancer(geometry, {
      scale: true,
    });

    const wrapper = {
      position: new Vector3(),
      scale: new Vector3(1, 1, 1),
      rotation: [0, 0, 0, 1],
      visible: true,
      opacity: 1,
      dynamicShadow: true,
    };

    const camera = {
      frustum: {
        intersectsSphere: () => true,
      },
      position: new Vector3(),
      projectionMatrix: new Matrix4(),
      matrixWorldInverse: new Matrix4(),
    };

    instancer.sort([wrapper], camera);

    expect(instancer._maxInstanceCount).toBe(1);
    expect(instancer.visibleWrappers).toEqual([wrapper]);
  });
});
