import emitter from "../engine-emitter";
import { EngineEvents } from "../engine-events";
import Scene from "../scene";
import audioListener from "./globals/audio-listener";
import { DEBUG_AUDIO, IS_EDIT_MODE } from "../constants";
import AugmentedGroup from "../events/augmented-group";
import {
    CylinderGeometry,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    Vector3,
} from "three";
import volumerange from "./volume-range";
import { disposeObject3D } from "./dispose";

const TRANSITION_DELAY = 0.25;

const DECAY_FACTOR = 0.05;

const _position = new Vector3();

export interface AudioPlayer {
    volume: number;
    muted: boolean;
    paused: boolean;
}

export class PseudoPositionalAudio extends AugmentedGroup {
    //
    gain: GainNode;
    currentDistance: number;
    refDistance: number;
    player: AudioPlayer;
    _audioType: "spatial" | "ambient";
    _volumeRange: number;
    _volumeScale = 1;
    _wasDisposed = false;

    _baseVolume = 1;
    _gainValue = 1;

    private _isOutsideRange = null;
    private _rangeDebug: Mesh<CylinderGeometry, MeshBasicMaterial>;

    constructor(opts: { player: AudioPlayer }) {
        super();

        this.gain = audioListener.context.createGain();

        this.gain.connect(audioListener.getInput());

        this.currentDistance = 0;

        this.refDistance = 0;

        this.player = opts.player;

        this._rangeDebug = volumerange.get({
            height: 9,
            radius: 1,
        });

        this._rangeDebug.visible = false;

        Scene.add(this._rangeDebug);

        this._addEvents();
    }

    get muted() {
        return this.player.muted;
    }

    set muted(muted: boolean) {
        this.player.muted = muted;
    }

    get volume() {
        return this._baseVolume;
    }

    set volume(volume: number) {
        this._baseVolume = volume;
        this._updateVolume();
    }

    _updateVolume() {
        //
        this.player.volume = this._baseVolume * this._gainValue;
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

    get isOutsideRange() {
        return this._isOutsideRange;
    }

    setAudioType(_audioType: "spatial" | "ambient") {
        if (_audioType === this._audioType) return;

        if (_audioType === "spatial") {
            this.setSpatialAudio();
        } else if (_audioType === "ambient") {
            this.setConstantAudio();
        }

        this._audioType = _audioType;
    }

    setVolumeRange(range: number) {
        //
        if (this._volumeRange === range) return;
        this._volumeRange = range;
    }

    setSpatialAudio() {
        this.setVolumeRange(2);
        this._gainValue = 0;
        this._updateVolume();
        this.gain.gain.setValueAtTime(0, 0);
        this._rangeDebug.visible = IS_EDIT_MODE || DEBUG_AUDIO;
    }

    setConstantAudio() {
        this._gainValue = 0.5;
        this.gain.gain.setValueAtTime(1, 0);
        this._rangeDebug.visible = false;
        this._updateVolume();
    }

    onUpdate = () => {
        if (
            !this.player ||
            this.player.paused ||
            this.player.muted ||
            !audioListener.parent ||
            this._audioType !== "spatial" ||
            !this.parent
        )
            return;

        this.getWorldPosition(_position);

        this.refDistance = this._volumeRange * this._volumeScale;

        this._rangeDebug.position.copy(_position);
        this._rangeDebug.scale.set(this.refDistance, 1, this.refDistance);

        this.currentDistance = _position.distanceTo(
            audioListener.parent.position
        );

        let diff = this.currentDistance - this.refDistance;

        if (diff < 0) {
            this._isOutsideRange = false;

            let scaledDistance = this.currentDistance / this._volumeScale;

            let decayedGain = Math.min(
                1,
                1 / (DECAY_FACTOR * scaledDistance * scaledDistance)
            );

            this.gain.gain.setTargetAtTime(
                decayedGain,
                audioListener.context.currentTime,
                TRANSITION_DELAY
            );
        } else {
            this._isOutsideRange = true;

            this.gain.gain.setTargetAtTime(
                0, //1 / (this.currentDistance * this.currentDistance),
                audioListener.context.currentTime,
                TRANSITION_DELAY
            );
        }

        this._gainValue = this.gain.gain.value;

        this._updateVolume();
    };

    dispose() {
        if (this._wasDisposed) return;

        this._wasDisposed = true;

        this._removeEvents();

        this.gain.disconnect();

        this._rangeDebug.removeFromParent();

        disposeObject3D(this._rangeDebug);
    }
}
