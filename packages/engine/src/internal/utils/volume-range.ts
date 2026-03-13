// @ts-check

import {
    CylinderGeometry,
    DoubleSide,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    Vector3,
} from "three";

import { DEBUG_AUDIO } from "../constants";
import { PlaybackController } from "./playback-controller";
import PipeLineMesh from "../pipeline/pipeline-mesh";
import { PositionalAudio } from "./positional-audio";

/**
 * @typedef { object } VolumeRangeOpts
 * @property { number } height
 * @property { number } radius
 * @property { boolean } [wireframe]
 *
 *
 * @typedef { object } AudioControllerRangeOpts
 * @property { PlaybackController } audioController
 * @property { number } height
 * @property { Object3D } refObject
 */

export interface VolumeRangeOpts {
    height: number;
    radius: number;
    wireframe?: boolean;
}

export interface AudioControllerRangeOpts {
    posAudio: PositionalAudio;
    height: number;
    refObject: Object3D;
}

class VolumeRange {
    //
    get({
        height,
        radius,
        wireframe = false,
    }: VolumeRangeOpts): Mesh<CylinderGeometry, MeshBasicMaterial> {
        //
        let geometry = new CylinderGeometry(radius, radius, height, 42, 42);

        const material = new MeshBasicMaterial({
            color: 0xeaff6c,
            side: DoubleSide,
            depthWrite: false,
            transparent: true,
            opacity: 0.1,
            wireframe: wireframe || DEBUG_AUDIO,
        });

        const mesh = new PipeLineMesh(geometry, material);

        // mesh.scale.set(radius, 1, radius)

        mesh.userData.radius = radius;

        mesh.userData.height = height;

        return mesh as any;
    }

    refPosition = new Vector3();

    getPosAudioRange({
        posAudio,
        height,
        refObject,
    }: AudioControllerRangeOpts) {
        //
        let radius = posAudio.volumeRange;

        const volumeRange = this.get({ radius, height });

        const updateMatrixWorld = volumeRange.updateMatrixWorld;

        volumeRange.updateMatrixWorld = (force) => {
            if (volumeRange.visible) {
                refObject.getWorldPosition(this.refPosition);

                volumeRange.position.x = this.refPosition.x;

                volumeRange.position.z = this.refPosition.z;

                volumeRange.scale.set(
                    posAudio.volumeRange,
                    1,
                    posAudio.volumeRange
                );

                updateMatrixWorld.call(volumeRange, force);
            }
        };

        return volumeRange;
    }
}

export default new VolumeRange();
