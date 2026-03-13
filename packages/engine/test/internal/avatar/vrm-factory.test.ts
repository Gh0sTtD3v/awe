import { Vector3 } from "three";
import Camera from "../../../src/camera";
import { LOD_VRM } from "../../../src/internal/constants";
import { VRMFactory } from "../../../src/internal/avatar/vrm/index.js";

describe("VRMFactory.setWrapperQuality", () => {
  it("keeps CPU-animation avatars on the high-quality wrapper even when far away", () => {
    Camera.current.position.set(0, 0, 0);

    const wrapper = {
      main: false,
      ignoreLOD: false,
      data: { useCpuAnimation: true },
      position: new Vector3(0, 0, -2000),
      isLOD: false,
      save: vi.fn(),
      restore: vi.fn(),
      updateVRM: vi.fn(),
    };

    const factory = {
      VRMBakedMeshes: {
        [LOD_VRM]: { name: "lod-mesh" },
      },
    };

    const visible = VRMFactory.prototype.setWrapperQuality.call(factory, wrapper);

    expect(visible).toBe(true);
    expect(wrapper.isLOD).toBe(false);
    expect(wrapper.save).not.toHaveBeenCalled();
    expect(wrapper.restore).not.toHaveBeenCalled();
    expect(wrapper.updateVRM).not.toHaveBeenCalled();
  });

  it("restores CPU-animation avatars that already slipped into LOD", () => {
    Camera.current.position.set(0, 0, 0);

    const restoredGLTF = { name: "cpu-mesh" };
    const wrapper = {
      main: false,
      ignoreLOD: false,
      data: { useCpuAnimation: true },
      position: new Vector3(0, 0, -2000),
      isLOD: true,
      gltf: { name: "lod-mesh" },
      saved: { gltf: restoredGLTF },
      restore: vi.fn(function restore() {
        this.gltf = restoredGLTF;
      }),
      updateVRM: vi.fn(),
    };

    const factory = {
      VRMBakedMeshes: {
        [LOD_VRM]: { name: "lod-mesh" },
      },
    };

    const visible = VRMFactory.prototype.setWrapperQuality.call(factory, wrapper);

    expect(visible).toBe(true);
    expect(wrapper.isLOD).toBe(false);
    expect(wrapper.restore).toHaveBeenCalledTimes(1);
    expect(wrapper.updateVRM).toHaveBeenCalledWith(restoredGLTF);
  });

  it("still sends GPU avatars to LOD when they are far away", () => {
    Camera.current.position.set(0, 0, 0);

    const lodMesh = { name: "lod-mesh" };
    const wrapper = {
      main: false,
      ignoreLOD: false,
      data: { useCpuAnimation: false },
      position: new Vector3(0, 0, -200),
      isLOD: false,
      save: vi.fn(),
      updateVRM: vi.fn(),
    };

    const factory = {
      VRMBakedMeshes: {
        [LOD_VRM]: lodMesh,
      },
    };

    const visible = VRMFactory.prototype.setWrapperQuality.call(factory, wrapper);

    expect(visible).toBe(true);
    expect(wrapper.isLOD).toBe(true);
    expect(wrapper.save).toHaveBeenCalledTimes(1);
    expect(wrapper.updateVRM).toHaveBeenCalledWith(lodMesh);
  });
});
