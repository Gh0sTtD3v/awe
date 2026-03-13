import { PseudoPositionalAudio } from "../../../../internal/utils/pseudo-pos-audio";
import { IframeComponent } from "../iframe-component";
import { YoutubePlayer } from "./youtube-player";

/** @internal */
export class YoutubeIframeHandler {
    //
    youtubePlayer: YoutubePlayer;

    iframe: HTMLIFrameElement;

    posAudio: PseudoPositionalAudio;

    inputVolume = 1;

    constructor(private component: IframeComponent) {}

    onGenerateIframe() {
        //
        let urlData = this.component.urlData;
        if (urlData.type !== "YOUTUBE") return;
        let videoId = urlData.videoId;

        this.iframe = document.createElement("iframe");

        let url = `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1&playsinline=1&enablejsapi=1&rel=0&playlist=${videoId}&loop=1&fs=0&modestbranding=1"`;

        this._setAttrs({
            style: "width: 100%; height: 100%",
            src: url,
            title: "YouTube video player",
            frameborder: "0",
            allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        });

        this.iframe.onload = async () => {
            //
            if (this.component.wasDisposed) return;

            await YoutubeIframeHandler.initYoutubeAPI();

            if (this.component.wasDisposed) return;

            // @ts-ignore
            const YTPlayer = new YT.Player(this.iframe);

            this.youtubePlayer = new YoutubePlayer({
                YTPlayer,
                autoPlay: !!this.component.data.youtubeOpts.autoPlay,
            });

            this.posAudio = new PseudoPositionalAudio({
                player: this.youtubePlayer,
            });

            this.component.add(this.posAudio);

            this.component.container._audioManager.addAudioSource(
                this.component,
                this.posAudio,
                () => this.component.data.youtubeOpts
            );

            this._updateAudioType();

            if (this.component.data.youtubeOpts.autoPlay) {
                this.youtubePlayer.play();
            }
        };

        return this.iframe;
    }

    private _setAttrs(attrs: Record<string, string>) {
        //
        for (const key in attrs) {
            this.iframe.setAttribute(key, attrs[key]);
        }
    }

    static _apiReady = null;

    static initYoutubeAPI() {
        //
        if (this._apiReady == null) {
            this._apiReady = new Promise((resolve) => {
                const tag = document.createElement("script");

                tag.id = "iframe-youtube";

                tag.src = "https://www.youtube.com/iframe_api";

                const firstScriptTag =
                    document.getElementsByTagName("script")[0];

                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

                // @ts-ignore
                window.onYouTubeIframeAPIReady =
                    function onYouTubeIframeAPIReady() {
                        console.log("Youtube ready");

                        resolve(null);
                    };
            });
        }

        return this._apiReady;
    }

    onUpdate() {
        //
        this._updateAudioType();
    }

    _updateAudioType() {
        //
        if (this.posAudio == null) return;

        this.posAudio.setAudioType(this.component.data.youtubeOpts.audioType);

        if (this.component.data.youtubeOpts.audioType === "spatial") {
            this.posAudio.setVolumeRange(
                this.component.data.youtubeOpts.audioRange
            );
        }
    }

    onDispose() {
        //
        this.component.container._audioManager.removeAudioSource(
            this.component
        );

        this.posAudio.dispose();
    }
}
