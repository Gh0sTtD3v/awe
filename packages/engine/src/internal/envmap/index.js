import { PerspectiveCamera } from "three";
import { Subsystems } from "../subsystems";
import emitter from "../engine-emitter";
import { EngineEvents } from "../engine-events";
import { Assets } from "../resources/assets";
import { envmaps } from "../../space/components/envmap/data";

const dummyCamera = new PerspectiveCamera();

class EnvMapFactory {
  constructor() {}

  async get(opts, space) {
    const envMap = await this.getPBREnvMap(opts, space);

    return envMap;
  }

  async getPBREnvMap(opts, scene) {
    let cubeMap;

    if (opts.type === "image") {
      const preset = envmaps[opts.imageId];
      const path =
        Assets.envmap[opts.imageId] ?? opts.imagePath ?? preset?.path;
      const format = opts.imageFormat ?? preset?.format;
      const image = preset?.image ?? opts.imagePath;

      cubeMap = await Subsystems.envmap.loadCubeImage({ path, format, image });
    } else {
      scene.updateMatrixWorld(true);

      emitter.emit(EngineEvents.BEFORE_SCENE_RENDER, scene, dummyCamera, true);

      cubeMap = (await Subsystems.envmap.loadCubeMapFromScene(scene, false, opts)).texture;

      scene.position.set(0, 0, 0);
    }

    return cubeMap;
  }
}

export default new EnvMapFactory();
