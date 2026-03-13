// import Emitter from "engine/events/emitter";

// import Events from "engine/events/events";

import {
    Vector3,
    Object3D,
    Shape,
    ShapeGeometry,
    MeshBasicMaterial,
} from "three";

import gsap from "gsap";

const padding = 0.5;

import PipeLineMesh from "../pipeline/pipeline-mesh";

import DialogBackgroundMaterial from './material/index';

import { DisposePipelinesMeshes } from "../utils/dispose";

// import Camera from '../../camera'

// import {

//     to3DPosition

// } from 'engine/internal/utils/positiontransformation.js'

export default class DialogWrapper extends Object3D {
    constructor(opts) {
        super();

        this.opts = opts;

        this.backgroundMesh = null;

        this.text = opts.textBlock;

        this.parent = opts.parent;

        this.text.attachTo(this.parent);

        this.update();
    }

    update(opts = {}) {
        if (opts.text) {
            this.text.update(opts.text);

            this.text.attachTo(this.parent);
        }

        this.background = this.getBackground();

        this.background.position.set(
            this.text.size.center.x,
            this.text.size.center.y,
            0.0
        );

        if (this.opts.billboard == false) {
            this.background.position.z = -0.1;
        }

        this.hide();
    }

    show(textSpeed = 0.05, delay = 0, signal = null) {
        return new Promise((resolve) => {
            if (signal?.aborted) return;
            let i = 0;

            this.tween = gsap.delayedCall(delay, () => {
                if (signal?.aborted) return;
                this.backgroundMesh.visible = true;

                this.nextShow(i, textSpeed, resolve, signal);
            });
        });
    }

    async showScript(opts) {
        let i = 0;

        while (i < opts.texts.length) {
            this.hide();

            this.update({ text: opts.texts[i] });

            await this.show(opts.speed, opts.signal);

            if (opts.signal?.aborted) {
                return;
            }

            this.tween = gsap.delayedCall(opts.delay, () => {});

            await this.tween;

            if (opts.signal?.aborted) {
                return;
            }

            i++;
        }

        this.tween = gsap.delayedCall(opts.delay, () => {});

        this.hide();

        // res.showScript({
        //     texts: [
        //         "Hello\nI'm am avocado your friend\nI'm here to help you",
        //         "What can I do for you ?",
        //     ],
        //     speed: 0.05,

        //     delay: 1.5
        // })
    }

    nextShow(i = 0, textSpeed = 0.2, resolve, signal) {
        if (i < this.text.wrappers.length) {
            let wrapper = this.text.wrappers[i];

            this.tween = gsap.delayedCall(textSpeed, () => {
                if (signal?.aborted) return;
                wrapper.opacity = 1;

                this.nextShow(i++, textSpeed, resolve, signal);
            });

            i++;
        } else {
            resolve();
        }
    }

    hide() {
        let wrappers = this.text.wrappers;

        let i = 0;

        while (i < wrappers.length) {
            let wrapper = wrappers[i];

            wrapper.opacity = 0;

            i++;
        }

        this.backgroundMesh.visible = false;
    }

    getBackground() {
        let x = -this.text.size.width * 0.5 - padding;
        let y = -this.text.size.height * 0.5 - padding;
        let width = this.text.size.width + padding * 2;
        let height = this.text.size.height + padding * 2;
        let radius = 0.5;

        let shape = new Shape();
        shape.moveTo(x, y + radius);
        shape.lineTo(x, y + height - radius);
        shape.quadraticCurveTo(x, y + height, x + radius, y + height);
        shape.lineTo(x + width - radius, y + height);
        shape.quadraticCurveTo(
            x + width,
            y + height,
            x + width,
            y + height - radius
        );
        shape.lineTo(x + width, y + radius);
        shape.quadraticCurveTo(x + width, y, x + width - radius, y);
        shape.lineTo(x + radius, y);
        shape.quadraticCurveTo(x, y, x, y + radius);

        const geom = new ShapeGeometry(shape);

        if (this.backgroundMesh == null) {
            var mat;

            if (this.opts.billboard == false) {
                mat = new MeshBasicMaterial({
                    color: this.opts.backgroundColor,
                    transparent: true,
                    opacity: this.opts.backgroundOpacity,
                    side: 2,
                });
            } else {
                mat = new DialogBackgroundMaterial({
                    color: this.opts.backgroundColor,
                    transparent: true,
                    opacity: this.opts.backgroundOpacity,
                    side: 2,
                });
            }

            this.backgroundMesh = new PipeLineMesh(geom, mat, {
                lightingMaterial: mat,
                visibleOnOcclusion: false,
            });

            if (this.opts.billboard) {
                // this.backgroundMesh.renderOrder = 5000
            }

            this.add(this.backgroundMesh);
        } else {
            this.backgroundMesh.geometry.dispose();

            this.backgroundMesh.geometry = null;
        }

        this.backgroundMesh.geometry = geom;

        return this.backgroundMesh;
    }

    dispose() {
        if (this.tween) {
            this.tween.kill();
        }

        this.text.dispose();

        if (this.backgroundMesh) {
            DisposePipelinesMeshes(this.backgroundMesh);

            this.backgroundMesh.dispose();

            this.backgroundMesh = null;
        }
    }
}
