// @ts-check

import emitter from "../engine-emitter";
import { EngineEvents } from "../engine-events";
import { disposeObject3D } from "./dispose";

export interface MediaPlayer {
    play(): void;
    pause(): void;
    paused: boolean;
    muted: boolean;
}

export class PlaybackController {
    //
    _isPaused: boolean;
    _isWorldPaused: boolean;
    _media: MediaPlayer;
    _enabled: boolean;
    _wasDisposed: boolean;

    constructor(public opts: { media: MediaPlayer }) {
        //
        this._media = opts.media;

        this._isPaused = this._media?.paused ?? true;

        this.addEvents();
    }

    play() {
        if (!this._isPaused) return;

        this._isPaused = false;

        return this._syncPlayer();
    }

    pause() {
        if (this._isPaused) return;

        this._isPaused = true;

        this._syncPlayer();
    }

    get muted() {
        return this._media.muted;
    }

    set muted(isMuted) {
        this._media.muted = isMuted;
    }

    _syncPlayer() {
        //
        if (this._media == null) return;

        if (!this._isWorldPaused && !this._isPaused) {
            // console.log("AC/PLAY", this.audio.parent.userData.name)

            if (!this._media.paused) {
                this._media.play();
            }
        } else {
            // console.log("AC/PAUSE", this.audio.parent.userData.name)

            if (this._media.paused) {
                this._media.pause();
            }
        }
    }

    onPlay = () => {
        //
        this._isWorldPaused = false;

        this._syncPlayer();
    };

    onPause = () => {
        //
        this._isWorldPaused = true;

        this._syncPlayer();
    };

    addEvents() {
        if (this._enabled) return;

        this._enabled = true;

        emitter.on(EngineEvents.PLAY, this.onPlay);

        emitter.on(EngineEvents.PAUSE, this.onPause);
    }

    removeEvents() {
        //
        if (!this._enabled) return;

        this._enabled = false;

        emitter.off(EngineEvents.PLAY, this.onPlay);

        emitter.off(EngineEvents.PAUSE, this.onPause);
    }

    dispose() {
        //
        if (this._wasDisposed) return;

        this._wasDisposed = true;

        this.removeEvents();
    }
}
