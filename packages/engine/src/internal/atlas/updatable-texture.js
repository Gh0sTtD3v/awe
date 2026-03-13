import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter } from "three";

import { DEBUG, FBO_DEBUG } from "../constants";

import { TEXTURE_SIZE } from './constants';

import FBOHelper from "../utils/globals/fbo-helper";

import Renderer from "../renderer";

let emptyCanvas = document.createElement("canvas");

const ctx = emptyCanvas.getContext("2d");

ctx.fillStyle = "black";

export default class UpdatableTexture extends CanvasTexture {
    constructor(format) {
        const canvas = document.createElement("canvas");
        canvas.width = TEXTURE_SIZE;
        canvas.height = TEXTURE_SIZE;

        const ctx = canvas.getContext("2d");
        ctx.canvas.width = TEXTURE_SIZE;
        ctx.canvas.height = TEXTURE_SIZE;
        ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

        super(canvas);

        this.canvas = canvas;

        // this.ctx = ctx

        this.minFilter = LinearMipmapLinearFilter;
        this.magFilter = LinearFilter;

        this.needsUpdate = true;

        if (FBO_DEBUG) {
            // FBOHelper.attach(this, 'yolo'+Math.random())
        }
    }

    update(src, x, y) {
        const tex = {
            image: src,
        };

        if (x + src.width > this.width || y + src.height > this.height) {
            console.log(src);
            console.log("bad dimensions");

            debugger;
            return;
        }

        Renderer.copyTextureToTexture({ x: x, y: y }, tex, this);
    }

    erase(src, x, y) {
        emptyCanvas.width = src.width;
        emptyCanvas.height = src.height;

        ctx.fillRect(0, 0, emptyCanvas.width, emptyCanvas.height);

        const tex = {
            image: emptyCanvas,
        };

        if (x + src.width > this.width || y + src.height > this.height) {
            console.log(src);
            console.log("bad dimensions");

            debugger;
            return;
        }

        Renderer.copyTextureToTexture({ x: x, y: y }, tex, this);
    }
}
