import {
  LinearFilter,
  Texture,
  SRGBColorSpace,
  AudioLoader,
  TextureLoader,
} from "three";

import { PMREMGenerator } from "./utils/pmrem-generator";

import { TargetedDracoLoader } from "./resources/loaders/draco-loader";

import { GLTFLoader } from "./resources/loaders/gltf-loader";

import { VRMLoaderPlugin } from "./avatar/vrm/builder/worker/three-vrm-module";

import {
  CHECK_ABORT_SIGNAL,
  REJECT_IF_ABORTED,
} from "./utils/abort";

import {
  BITMAP_SUPPORT,
  WEB_WORKER_SUPPORT,
  IS_MOBILE,
  FBO_DEBUG,
  DEBUG,
  SET_COMPRESSED_SUPPORT,
  IS_DESKTOP,
} from "./constants";

import WorkerPool from "./utils/worker-pool";

import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

import { KTX2Loader } from "./utils/ktx2-loader";
import { Assets } from "./resources/assets";
import {
  AssetResolver,
  createTypedLoadingManager,
} from "./assets";

class Loader {
  /** @type {import("three").WebGLRenderer | null} */
  renderer = null;

  constructor() {
    this.workerPool = null;

    if (WEB_WORKER_SUPPORT) {
      const createImageWorker = () =>
        new Worker(new URL("./worker/image.worker.js", import.meta.url));
      this.workerPool = new WorkerPool(createImageWorker, IS_MOBILE ? 4 : 8);
    }

    // Create typed LoadingManagers for type-aware URL resolution
    const modelManager = createTypedLoadingManager("model");
    const textureManager = createTypedLoadingManager("texture");
    const audioManager = createTypedLoadingManager("audio");
    const envmapManager = createTypedLoadingManager("envmap");

    // GLTF

    this.gltfLoader = new GLTFLoader(modelManager).setCrossOrigin("anonymous");

    this.dracoLoader = new TargetedDracoLoader();

    this.dracoLoader.setDecoderConfig({});

    this.dracoLoader.setDecoderPath(Assets.js.draco);

    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    this.audioLoader = new AudioLoader(audioManager);

    this.textureLoader = new TextureLoader(textureManager);
    this.textureLoader.setCrossOrigin("anonymous");

    this.gltfLoader.register((parser) => {
      const p = new VRMLoaderPlugin(parser, {
        helperRoot: null && helperRoot,
        autoUpdateHumanBones: true,
      });

      p.metaPlugin.needThumbnailImage = false;

      p.mtoonMaterialPlugin.getMaterialType = (materialIndex) => {
        return null;
      };

      return p;
    });

    this.bitmapOptions = {
      imageOrientation: /** @type {const} */ ("flipY"),
    };

    this.rgbeLoader = new RGBELoader(envmapManager);
  }

  addKTX() {
    // dont use on desktop
    if (IS_DESKTOP == true) return;

    // build a compressed support before loading the ktx2 loader
    // to detect first if its worth it

    this.ktxLoader = new KTX2Loader();

    this.ktxLoader
      .setTranscoderPath(Assets.js.basis)
      .detectSupport(this.renderer, DEBUG);

    SET_COMPRESSED_SUPPORT(this.ktxLoader.workerConfig);

    this.gltfLoader.setKTX2Loader(this.ktxLoader);
  }

  async loadGLTF(url) {
    const data = await AssetResolver.fetch(url, { type: "model" }).then(
      async (res) => {
        //
        if (res.ok) {
          //
          return res.arrayBuffer();
        }

        return Promise.reject("Failed to load gltf at " + url);
      },
    );

    return new Promise(async (resolve, reject) => {
      var gltf = await this.parseGLTF(data);

      gltf.rawBuffer = data;

      resolve(gltf);
    });
  }

  async parseGLTF(rawBuffer) {
    return this.gltfLoader.parseAsync(rawBuffer, "");
  }

  async loadImage(url, abort) {
    checkWebBuild("loadImage");
    CHECK_ABORT_SIGNAL(abort);

    // Resolve the URL through asset resolver first
    const resolvedUrl = AssetResolver.resolve(url, { type: "texture" });

    // Convert relative URLs to absolute URLs for web worker compatibility
    // Web workers cannot resolve relative URLs since they don't have the same document context
    const absoluteUrl = resolvedUrl.startsWith("/")
      ? new URL(resolvedUrl, window.location.origin).href
      : resolvedUrl;

    return new Promise(async (resolve, reject) => {
      if (WEB_WORKER_SUPPORT) {
        this.workerPool.queueJob(
          "./imageworker.js",

          {
            url: absoluteUrl,

            imageOrientation: this.bitmapOptions.imageOrientation,

            bitmap: BITMAP_SUPPORT,
          },

          (e) => {
            // console.log(e.data)

            if (e.data.cancel) {
              console.log("job killed ");
            }

            // console.log("LODMesh worker callback", name, abort, e)

            if (REJECT_IF_ABORTED(abort, reject)) return;

            if (e.data.error == true) {
              // debugger
              reject("image not found " + url);
            } else {
              if (e.data.blob) {
                var url = URL.createObjectURL(e.data.blob);

                var image = new Image();

                image.crossOrigin = "anonymous";

                image.onload = () => {
                  resolve(image);
                };

                image.onerror = (error) => {
                  console.error(error);
                };

                image.src = url;
              } else {
                const img = e.data.image;

                img.naturalWidth = img.width;

                img.naturalHeight = img.height;

                resolve(img);
              }
            }
          },

          this,

          abort,
        );
      } else {
        AssetResolver.fetch(
          absoluteUrl,
          { type: "texture" },
          {
            signal: abort,
          },
        )
          .then(async (response) => {
            // console.log((new Date()).toTimeString(), "LODMesh worker callback", name, abort?.aborted)

            if (REJECT_IF_ABORTED(abort, reject)) return;

            if (!response.ok) {
              reject("not found " + absoluteUrl);

              return;
            }

            const mimeType = response.headers
              .get("Content-Type")
              ?.split(";")[0];

            const isSvg = mimeType.startsWith("image/svg");

            var blob = await response.blob();

            if (REJECT_IF_ABORTED(abort, reject)) return;

            if (!isSvg && BITMAP_SUPPORT) {
              let bmoptions = {
                imageOrientation: this.bitmapOptions.imageOrientation,
              };

              let img = await createImageBitmap(blob, bmoptions);

              if (REJECT_IF_ABORTED(abort, reject)) return;

              // @ts-ignore
              img.naturalWidth = img.width;

              // @ts-ignore
              img.naturalHeight = img.height;

              resolve(img);
            } else {
              let img = new Image();

              img.crossOrigin = "Anonymous";

              img.onload = () => {
                img.onload = null;

                img.onerror = null;

                resolve(img);
              };

              img.onerror = () => {
                img.onload = null;

                img.onerror = null;

                if (REJECT_IF_ABORTED(abort, reject)) return;

                reject("not found " + absoluteUrl);
              };

              img.src = URL.createObjectURL(blob);
            }
          })

          .catch((error) => {
            if (REJECT_IF_ABORTED(abort, reject)) return;

            reject(error);
          });
      }
    });
  }

  async loadTexture(url) {
    //
    var tex = new Texture();

    const image = await this.loadImage(url);
    tex.image = image;

    tex.needsUpdate = true;

    return tex;
  }

  async loadRawImage(url) {
    checkWebBuild("loadRawImage");
    const image = await this.loadImage(url);

    return image;
  }

  isLoading = {};

  async loadSharedTexture(url) {
    if (this.isLoading[url] != null) {
      await this.isLoading[url].promise;

      return this.isLoading[url].content;
    } else {
      var r = null;
      var p = new Promise((resolve) => {
        r = resolve;
      });

      this.isLoading[url] = {
        promise: p,
      };

      const image = await this.loadImage(url);

      var tex = new Texture();

      tex.image = image;

      tex.needsUpdate = true;

      this.isLoading[url].content = tex;

      r();

      return tex;
    }
  }
  /**
   *
   * @param { string } path
   * @returns { Promise<{ texture: DataTexture; texData: object }> }
   */
  async loadRGBE(path) {
    checkWebBuild("loadRGBE");

    var blobURL = path;

    var previouslyAblob = false;

    const response = await AssetResolver.fetch(path, { type: "envmap" });
    const buffer = await response.arrayBuffer();
    const type = response.headers.get("content-type")?.split(";")[0];
    blobURL = URL.createObjectURL(new Blob([buffer], { type }));

    return new Promise((resolve, reject) => {
      this.rgbeLoader.load(
        blobURL,
        (texture, texData) => {
          if (previouslyAblob == false) {
            URL.revokeObjectURL(blobURL);
          }
          resolve({ texture, texData });
        },
        undefined,
        (err) => {
          if (previouslyAblob == false) {
            URL.revokeObjectURL(blobURL);
          }
          reject(err);
        },
      );
    });
  }

  async loadCubeImage(source) {
    checkWebBuild("loadCubeImage");
    let background;

    if (
      source?.format?.toLowerCase() == ".jpg" ||
      source?.format?.toLowerCase() == ".jpeg" ||
      source?.format?.toLowerCase() == ".png"
    ) {
      var tex = new Texture();

      var img = new Image();

      img.crossOrigin = "Anonymous";

      var url = source.image;

      var tex = await this.loadTexture(url);

      tex.colorSpace = SRGBColorSpace;

      tex.minFilter = LinearFilter;

      tex.needsUpdate = true;

      background = await this.loadPMREMEnvironment(source, true, tex);

      background.sharp = tex;
    }

    // if hdr
    else {
      background = await this.loadPMREMEnvironment(source, true);
    }

    return background;
  }

  async loadCubeMapFromScene(scene, flipY = false, opts) {
    checkWebBuild("loadCubeMapFromScene");
    if (this.pmremGenerator == null) {
      this.pmremGenerator = new PMREMGenerator(this.renderer);
    }

    this.pmremGenerator.compileCubemapShader();

    // legacy
    // scene.children.forEach((child) => {
    //     if (child.name === "artwork") {
    //         child.visible = false;
    //     }
    // });

    let envMap = this.pmremGenerator.fromScene(scene, 0, 0.01, 5000, opts);

    // @ts-ignore
    envMap.flipY = false;

    // legacy
    // scene.children.forEach((child) => {
    //     if (child.name === "artwork") {
    //         child.visible = true
    //     }
    // })

    // @ts-ignore
    envMap.texture.renderTarget = envMap;

    this.pmremGenerator.dispose();

    return envMap;
  }

  // pmremCache = {};

  /**
   *
   * @param { import('@gltypes').EnvironmentParams} environment
   * @returns { Promise<Texture> }
   */
  async loadPMREMEnvironment(environment, flipY = false, tex = null) {
    checkWebBuild("loadPMREMEnvironment");
    // console.log("loadPMREMEnvironment flipY", !!flipY)

    if (!environment.path) return null;

    // if (this.pmremCache[environment.path] != null) {
    //     console.log(
    //         "loadPMREMEnvironment found in cache",
    //         environment.path,
    //     );

    //     return this.pmremCache[environment.path];
    // }

    return this._loadPMREMEnvironmentNoCache(environment, flipY, tex);
  }

  async _loadPMREMEnvironmentNoCache(environment, flipY = false, tex = null) {
    checkWebBuild("_loadPMREMEnvironmentNoCache");
    if (this.pmremGenerator == null) {
      this.pmremGenerator = new PMREMGenerator(this.renderer);
    }

    this.pmremGenerator.compileEquirectangularShader();

    if (tex == null) {
      const { texture } = await this.loadRGBE(environment.path);
      texture.flipY = flipY;

      tex = texture;
    }

    tex.needsUpdate = true;

    if (FBO_DEBUG) {
      if (this.fboHelper == null) {
        this.fboHelper = (
          await import("./utils/globals/fbo-helper")
        ).default;
      }

      this.fboHelper.attach(tex, "tex" + Math.random());
    }

    // const { texture } = await this.loadRGBE(environment.path);
    // texture.flipY = flipY

    const temp = this.pmremGenerator.fromEquirectangular(tex);

    // console.log(tem)

    // @ts-ignore
    temp.texture.renderTarget = temp;

    let envMap = temp.texture;

    envMap.magFilter = LinearFilter;

    envMap.userData.isShared = true;

    if (FBO_DEBUG) {
      if (this.fboHelper == null) {
        this.fboHelper = (
          await import("./utils/globals/fbo-helper")
        ).default;
      }

      this.fboHelper.attach(envMap, "tex" + Math.random());
    }

    return envMap;
  }

  async loadJson(url) {
    const reponse = await AssetResolver.fetch(url, { type: "other" });

    const data = await reponse.json();

    return data;
  }

  /**
   * @param { string } url
   * @returns { Promise<AudioBuffer> }
   */
  async loadAudio(url) {
    checkWebBuild("loadAudio");
    const resolvedUrl = AssetResolver.resolve(url, { type: "audio" });
    return new Promise((resolve, reject) => {
      this.audioLoader.load(resolvedUrl, resolve, () => {}, reject);
    });
  }
}

function checkWebBuild(label) {
  // web-only module — no-op guard kept for call-site documentation
}

export default new Loader();
