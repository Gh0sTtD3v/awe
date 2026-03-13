import { AssetResolver } from "./assets";

export interface GltfSubsystem {
  loadGLTF(url: string): Promise<any>;
  parseGLTF(rawBuffer: ArrayBuffer): Promise<any>;
  addKTX?(): void;
}

export interface TextureSubsystem {
  loadTexture(url: string): Promise<any>;
  loadSharedTexture(url: string): Promise<any>;
  loadImage?(url: string, abort?: AbortSignal): Promise<any>;
  loadRawImage?(url: string): Promise<any>;
  textureLoader?: any;
}

export interface EnvMapSubsystem {
  loadCubeImage(source: any): Promise<any>;
  loadCubeMapFromScene(scene: any, flipY?: boolean, opts?: any): Promise<any>;
  loadPMREMEnvironment(env: any, flipY?: boolean, tex?: any): Promise<any>;
  loadRGBE(path: string): Promise<any>;
}

export const Subsystems: {
  gltf: GltfSubsystem | null;
  textures: TextureSubsystem | null;
  envmap: EnvMapSubsystem | null;
  renderer: any;
} = {
  gltf: null,
  textures: null,
  envmap: null,
  renderer: null,
};


/** Lightweight JSON loader — always available, no web deps */
export async function loadJson(url: string) {
  const response = await AssetResolver.fetch(url, { type: "other" });
  return response.json();
}
