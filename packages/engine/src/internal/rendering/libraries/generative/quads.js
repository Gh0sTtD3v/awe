import {
    BufferGeometry,
    BufferAttribute,
    Vector3,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
} from "three";

import GLTF from "../../../gltf";

import { Assets } from "../../../resources/assets";

const BLADE_COUNT = 180;
const VERTEX_COUNT = 3;
const BLADE_WIDTH = 0.13;
const BLADE_HEIGHT = 1.0;
const BLADE_HEIGHT_VARIATION = 0.6;
const BLADE_DISTANCE = 2.5;

//WELL512
export function RandomNumberGenerator(seed) {
    const state = new Array(16);
    let index = 0;

    // Simple seeding: fill state with seed values
    for (let i = 0; i < 16; i++) {
        state[i] = (seed + i) >>> 0;
    }

    return function () {
        const a = state[index];
        const c = state[(index + 13) & 15];
        const b = a ^ c ^ (a << 16) ^ (c << 15);
        const d = (a & 0xfffffff) ^ ((a << 8) ^ (b >>> 13));

        const e = state[(index + 9) & 15] ^ (b & 0xfffffff);
        const f = e ^ (e << 4);
        const g = (state[index] =
            d ^
            (d << 18) ^
            (f >>> 11) ^
            (f & 0xfffffdff) ^
            (d & 0xfffffff) ^
            ((d << 8) & 0xffffff00) ^
            ((f << 7) & 0x00fffff8) ^
            (d >>> 14) ^
            ((f >>> 11) & 0xffe00000) ^
            (d >>> 18));

        index = (index + 15) & 15;
        return (g >>> 0) / 4294967296.0; // Ensure the result is treated as unsigned
    };
}

const factor = 0.5;

const DEFAULT_OPTS = {
    colors: [
        [1.0 * factor, 0.427 * factor, 0.078 * factor],
        [0.075 * factor, 0.486 * factor, 0.071 * factor],
        [0.071 * factor, 0.522 * factor, 0.067 * factor],
        [0.145 * factor, 0.545 * factor, 0.031 * factor],
    ],
};

class QuadFactory {
    constructor() {}

    // async get(opts = {}) {
    //     const grass = await GLTF.load({
    //         url: Assets.models.grassLODs,
    //         name: "grassLODs",
    //     });
    // }

    async get(opts = {}) {
        const grass = await GLTF.load({
            url: Assets.models.grassLODs,
            name: "grassLODs",
        });

        const geo = grass.scene.getObjectByName("GrassLOD00").geometry;

        geo.computeBoundingBox();

        // set at the bottom using the bounding box

        geo.translate(0, -geo.boundingBox.min.y, 0);

        geo.computeBoundingBox();

        geo.lod = [
            grass.scene.getObjectByName("GrassLOD01").geometry,
            grass.scene.getObjectByName("GrassLOD02").geometry,
        ];

        geo.lod[0].computeBoundingBox();

        geo.lod[0].translate(0, -geo.lod[0].boundingBox.min.y, 0);

        geo.lod[0].computeBoundingBox();

        geo.lod[1].computeBoundingBox();

        geo.lod[1].translate(0, -geo.lod[1].boundingBox.min.y, 0);

        geo.lod[1].computeBoundingBox();

        return new Mesh(geo, new MeshBasicMaterial({ color: 0x003300 }));
    }
}

export default new QuadFactory();
