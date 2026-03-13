import {
  PerspectiveCamera,
  SRGBColorSpace,
  WebGLRenderTarget,
  Camera as ThreeCamera,
} from "three";
import Camera from "../../camera";
import PostProcessing from "../rendering/postprocessing";
import Renderer from "../renderer";
import { FBO_DEBUG } from "../constants";
import FBOHelper from "../utils/globals/fbo-helper";
import type { Space } from "../../space/space";

import { SET_LIGHTING_STATE } from "../lighting-state";

export interface ScreenshotOptions {
  width?: number;
  height?: number;
  space: Space;
}

const DEF_OPTS = {
  width: 1024,
  height: 1024,
};

class ScreenshotRendering {
  constructor() {
    // this.capturer = new Capturer({})
  }

  private _isPerspective(camera: ThreeCamera): camera is PerspectiveCamera {
    return camera instanceof PerspectiveCamera;
  }

  /**
   *
   * @param { ScreenshotOptions } opts
   * @returns
   */
  async captureFrame(opts: ScreenshotOptions) {
    //
    opts = Object.assign({}, DEF_OPTS, opts);

    const { width, height, space } = opts;

    let renderTarget = new WebGLRenderTarget(width, height, {
      colorSpace: SRGBColorSpace,
    });

    const camera = Camera.current;

    if (!this._isPerspective(camera)) {
      throw new Error("Camera is not a PerspectiveCamera");
    }

    let aspect = camera.aspect;

    try {
      camera.aspect = width / height;

      camera.updateProjectionMatrix();

      space.updateMatrixWorld(true);

      let imgData = this.renderFrame(renderTarget, opts);

      let can = document.createElement("canvas");

      can.width = width;

      can.height = height;

      let ctx = can.getContext("2d");

      ctx.putImageData(imgData, 0, 0);

      let imgDataUrl = can.toDataURL("image/jpeg");

      can = null;

      return imgDataUrl;
    } finally {
      //
      camera.aspect = aspect;

      camera.updateProjectionMatrix();
    }
  }

  private renderFrame(
    renderTarget: WebGLRenderTarget,
    opts: ScreenshotOptions
  ) {
    //
    const { space } = opts;

    if (space.lighting?._lighting?.active == true) {
      SET_LIGHTING_STATE(true);
    } else {
      SET_LIGHTING_STATE(false);
    }

    PostProcessing.render(space, Camera.current, renderTarget);

    if (FBO_DEBUG) {
      FBOHelper.attach(renderTarget, "2D screenshot ");
    }

    // Renderer.setRenderTarget(renderTarget)

    // Renderer.render(scene, opts.camera)

    return this.getRenderTargetImage(renderTarget);
  }

  getRenderTargetImage(renderTarget: WebGLRenderTarget, cubeFace = 0) {
    //
    const width = renderTarget.width;

    const height = renderTarget.height;

    // RGBA format
    let pixels = new Uint8Array(width * height * 4);

    Renderer.readRenderTargetPixels(
      renderTarget,
      0,
      0,
      width,
      height,
      pixels,
      cubeFace
    );

    Renderer.setRenderTarget(null);

    // readRenderTargetPixels returns an image upside down
    let flippedpixels = new Uint8Array(pixels.length);

    let lineWidth = width * 4;

    for (let y = 0; y < height; y++) {
      flippedpixels.set(
        pixels.subarray(y * lineWidth, (y + 1) * lineWidth),
        (height - 1 - y) * lineWidth
      );
    }

    return new ImageData(Uint8ClampedArray.from(flippedpixels), width, height);
  }
}

export default new ScreenshotRendering();
