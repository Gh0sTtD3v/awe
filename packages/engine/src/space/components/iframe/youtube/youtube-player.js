// @ts-check

import { IS_EDIT_MODE, USER_INTERACTED } from "../../../../internal/constants";

/** @internal */
export class YoutubePlayer {
    //
    constructor(opts) {
        //
        this.player = opts.YTPlayer;

        this._playerReady = false;

        this._audioReady = false;

        this._muted = false;

        this._paused = IS_EDIT_MODE || !opts.autoPlay;

        this._volume = 1;

        this.waitYTPlayer();

        // this.player.addEventListener("onStateChange", this.onPlayerStateChange)
    }

    waitYTPlayer() {
        //
        this.player.addEventListener("onReady", () => {
            console.log("Youtubeeee ready", this);

            this._playerReady = true;

            this.syncPlayback();

            USER_INTERACTED.then(() => {
                this.player.unMute();

                this._audioReady = true;

                this.syncAudio();
            });
        });
    }

    onPlayerStateChange = (event) => {
        console.log("video state change", event.data);

        if (event.data === 2 && !this._paused) {
            this._paused = true;
        } else if (event.data === 1 && this._paused) {
            this._paused = false;
        }
    };

    get paused() {
        return this._paused;
    }

    /**
     * @returns { boolean }
     */
    get muted() {
        return this._muted;
    }

    /**
     * @param { boolean } val
     */
    set muted(val) {
        //
        if (this._muted === val) return;

        this._muted = val;

        this.syncAudio();
    }

    /**
     * @returns { number }
     */
    get currentTime() {
        return this.player.getCurrentTime();
    }

    /**
     * @param { number } val
     */
    set currentTime(val) {
        //
        if (!this._playerReady) return;

        this.player.seekTo(val, true);
    }

    /**
     * @returns { number }
     */
    get volume() {
        return this._volume;
    }

    /**
     * @param { number } val
     */
    set volume(val) {
        //
        if (this._volume === val) return;

        this._volume = val;

        this.syncAudio();
    }

    /**
     * @returns { string }
     */
    get src() {
        return this.player.getVideoUrl();
    }

    /**
     * @param { string } val
     */
    set src(val) {
        if (val === null) {
            this.player.stopVideo();
        } else {
            this.player.cueVideoByUrl(val);
        }
    }

    async play() {
        if (!this._paused) return;

        this._paused = false;

        this.syncPlayback();
    }

    pause() {
        if (this._paused) return;

        this._paused = true;

        this.syncPlayback();
    }

    syncPlayback() {
        if (!this._playerReady) return;

        if (this._paused) {
            this.player.pauseVideo();
        } else {
            this.player.playVideo();
        }
    }

    syncAudio() {
        if (!this._audioReady) return;

        const volume = Math.floor(this._volume * 100);

        if (this._muted) {
            this.player.mute();
        } else {
            this.player.unMute();
        }

        this.player.setVolume(volume);
    }
}
