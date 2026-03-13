import { Texture } from "three";
import { GLTFLoader } from "./resources/loaders/gltf-loader";
import { NodeDracoLoader as TargetedDracoLoader } from "./resources/loaders/node-draco-loader";
import {
  AssetResolver,
  createTypedLoadingManager,
} from "./assets";
import { Assets } from "./resources/assets";
import type { GltfSubsystem, TextureSubsystem } from "./subsystems";

export class GltfLoaderHeadless implements GltfSubsystem {
  private gltfLoader: any;

  constructor() {
    const modelManager = createTypedLoadingManager("model");
    this.gltfLoader = new GLTFLoader(modelManager).setCrossOrigin("anonymous");
    const dracoLoader = new TargetedDracoLoader();
    dracoLoader.setDecoderConfig({});
    dracoLoader.setDecoderPath(Assets.js.draco);
    this.gltfLoader.setDRACOLoader(dracoLoader);
  }

  async loadGLTF(url: string) {
    const data = await AssetResolver.fetch(url, { type: "model" }).then(
      (res: any) => res.arrayBuffer(),
    );
    return new Promise((resolve, reject) => {
      this.gltfLoader.parse(
        data,
        "",
        (gltf: any) => {
          gltf.rawBuffer = data;
          resolve(gltf);
        },
        (err: any) => {
          reject(err);
        },
      );
    });
  }

  async parseGLTF(rawBuffer: ArrayBuffer) {
    return this.gltfLoader.parseAsync(rawBuffer, "");
  }
}

/** Stub: returns empty Textures in headless mode */
export const headlessTextureStub: TextureSubsystem = {
  async loadTexture() {
    return new Texture();
  },
  async loadSharedTexture() {
    return new Texture();
  },
};
