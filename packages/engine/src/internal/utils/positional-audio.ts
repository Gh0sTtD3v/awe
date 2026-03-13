// @ts-check

import {
    Audio,
    Object3D,
    PositionalAudio as THREE_PositionalAudio,
    Quaternion,
    Vector3,
    Mesh,
    CylinderGeometry,
    MeshBasicMaterial,
} from "three";

import Scene from "../scene";
import emitter from "../engine-emitter";
import { EngineEvents } from "../engine-events";
import audioListener from "./globals/audio-listener";
import volumerange from "./volume-range";
import { DEBUG_AUDIO } from "../constants";
import { disposeObject3D } from "./dispose";

export const LOAD_AUDIO_CLOSE_DIST = 15;

const TRANSITION_DELAY = 0.25;

const DECAY_FACTOR = 0.05;

const VOLUME_SCALE = 1.84;

export const AUDIO_TYPES = {
    SPATIAL: "spatial",
    AMBIENT: "ambient",
} as const;

export type AudioType = (typeof AUDIO_TYPES)[keyof typeof AUDIO_TYPES];

const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3();
const _orientation = new Vector3();

export class PositionalAudio extends THREE_PositionalAudio {
    //
    private _wasDisposed = false;
    private _audioType: AudioType;
    private _volumeRange = 0;

    private _muted = false;

    private _spatialGain: GainNode;
    private _mediaElem: HTMLMediaElement;

    private _isOutsideRange = null;
    private _rangeDebug: Mesh<CylinderGeometry, MeshBasicMaterial>;
    private _forceRangeDebug = false;

    constructor() {
        //
        super(audioListener);

        this._spatialGain = this.context.createGain();

        this.setFilter(this._spatialGain);

        this._addEvents();
    }

    private _getRangeDebug() {
        //
        if (this._rangeDebug == null) {
            //
            this._rangeDebug = volumerange.get({
                height: 9,
                radius: 1,
            });

            Scene.add(this._rangeDebug);

            // in edit mode will be set on selection
            this._rangeDebug.visible = DEBUG_AUDIO;
        }

        return this._rangeDebug;
    }

    private _removeRangeDebug() {
        //
        if (this._rangeDebug == null) return;

        this._rangeDebug.removeFromParent();

        disposeObject3D(this._rangeDebug);

        this._rangeDebug = null;
    }

    private _active = false;

    private _addEvents() {
        //
        if (this._active) return;

        this._active = true;

        emitter.on(EngineEvents.LATE_UPDATE, this.onUpdate);
    }

    private _removeEvents() {
        //
        if (!this._active) return;

        this._active = false;

        emitter.off(EngineEvents.LATE_UPDATE, this.onUpdate);
    }

    setSource(source: HTMLMediaElement) {
        //
        if (this._mediaElem != null) {
            Audio.prototype.disconnect.call(this);
            this._mediaElem = null;
        }

        this._mediaElem = source;

        if (this._mediaElem != null) {
            this.setMediaElementSource(this._mediaElem);
        }
    }

    setAudioType(audioType: AudioType, range?: number) {
        //
        if (audioType === this._audioType) return;

        if (audioType === AUDIO_TYPES.SPATIAL) {
            //
            this._setSpatialAudio(range);
            //
        } else if (audioType === AUDIO_TYPES.AMBIENT) {
            //
            this._setAmbient();
        }

        this._audioType = audioType;
    }

    private _setSpatialAudio(range = 3) {
        //
        this.setVolumeRange(range);

        this.setDistanceModel("linear");

        this.setRefDistance(1);

        this.setMaxDistance(10_000_000);

        this._spatialGain.gain.setValueAtTime(0, 0);

        this._getRangeDebug();
    }

    private _setAmbient() {
        //
        this.setVolumeRange(1);

        this.setDistanceModel("linear");

        this.setRefDistance(1);

        this.setMaxDistance(10_000_000);

        this._spatialGain.gain.cancelScheduledValues(0);

        this._spatialGain.gain.setTargetAtTime(1, 0, TRANSITION_DELAY);

        this.setVolume(1);

        this._removeRangeDebug();
    }

    setVolumeRange(range: number) {
        //
        if (this._volumeRange === range) return;

        this._volumeRange = range;

        this.setRefDistance(range);
    }

    get volumeRange() {
        return this._volumeRange;
    }

    get muted() {
        return this._muted;
    }

    set muted(isMuted: boolean) {
        //
        if (this._muted !== isMuted) {
            //
            this._muted = isMuted;

            const volume = isMuted ? 0 : 1;

            this.setVolumeRange(volume);
        }
    }

    get isOutsideRange() {
        return this._isOutsideRange;
    }

    toggleRangeDebug(visible: boolean) {
        this._forceRangeDebug = visible;
    }

    updateMatrixWorld(force: boolean) {
        //
        Object3D.prototype.updateMatrixWorld.call(this, force);
    }

    onUpdate = () => {
        //
        if (
            !audioListener.parent ||
            this._muted ||
            this.context.state != "running"
        )
            return;

        this.parent.matrixWorld.decompose(_position, _quaternion, _scale);

        _orientation.set(0, 0, 1).applyQuaternion(_quaternion);

        this._updatePanner(_position, _quaternion, _scale, _orientation);

        if (this._audioType !== AUDIO_TYPES.SPATIAL) return;

        const refDistance = this._volumeRange;

        if (this._rangeDebug != null) {
            //
            this._rangeDebug.visible =
                DEBUG_AUDIO || this._forceRangeDebug;

            if (this._rangeDebug.visible) {
                this._rangeDebug.position.copy(_position);
                this._rangeDebug.scale.set(refDistance, 1, refDistance);
            }
        }

        const currentDistance = _position.distanceTo(
            audioListener.parent.position
        );

        let diff = currentDistance - refDistance;

        if (diff < 0) {
            //
            this._isOutsideRange = false;

            this._rangeDebug.material.color.set(0x00ff00);

            let decayedGain = Math.min(
                1,
                1 / (DECAY_FACTOR * refDistance * refDistance)
            );

            this._spatialGain.gain.setTargetAtTime(
                decayedGain,
                this.context.currentTime,
                TRANSITION_DELAY
            );
        } else {
            this._isOutsideRange = true;

            this._rangeDebug.material.color.set(0xff0000);

            this._spatialGain.gain.setTargetAtTime(
                0, //1 / (this.currentDistance * this.currentDistance),
                this.context.currentTime,
                TRANSITION_DELAY
            );
        }
    };

    private _updatePanner(
        _position: Vector3,
        _quaternion: Quaternion,
        _scale: Vector3,
        _orientation: Vector3
    ) {
        //
        _orientation.set(0, 0, 1).applyQuaternion(_quaternion);

        const panner = this.panner;

        if (panner.positionX) {
            // code path for Chrome and Firefox (see #14393)

            const endTime = this.context.currentTime + this.listener.timeDelta;

            panner.positionX.linearRampToValueAtTime(_position.x, endTime);
            panner.positionY.linearRampToValueAtTime(_position.y, endTime);
            panner.positionZ.linearRampToValueAtTime(_position.z, endTime);
            panner.orientationX.linearRampToValueAtTime(
                _orientation.x,
                endTime
            );
            panner.orientationY.linearRampToValueAtTime(
                _orientation.y,
                endTime
            );
            panner.orientationZ.linearRampToValueAtTime(
                _orientation.z,
                endTime
            );
        } else {
            panner.setPosition(_position.x, _position.y, _position.z);
            panner.setOrientation(
                _orientation.x,
                _orientation.y,
                _orientation.z
            );
        }
    }

    dispose() {
        //
        if (this._wasDisposed) return;

        this._wasDisposed = true;

        this._removeEvents();

        if (this.source != null) {
            // this.audio.disconnect()
            Audio.prototype.disconnect.call(this);

            this.stop();
        }

        this._removeRangeDebug();

        this._mediaElem = null;

        this.parent?.remove(this);

        if (this._spatialGain != null) {
            //
            this._spatialGain.disconnect();

            this._spatialGain = null;
        }
    }
}
