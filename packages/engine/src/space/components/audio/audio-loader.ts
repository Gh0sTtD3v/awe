import { AssetResolver } from "../../../internal/assets";

/**
 * @internal
 *
 * Loads and caches audio files for use by {@link AudioComponent} instances.
 * Audio files are fetched once and cached as blobs; subsequent loads of the same
 * URL return a new `HTMLAudioElement` from the cached blob. Each element starts muted
 * to comply with browser autoplay policies.
 */
export class AudioLoader {
    /** @internal */
    _cache: Record<string, Promise<Blob>> = {};

    /** @internal */
    _urls: Record<string, string> = {};

    private fetchAudio(url: string) {
        if (this._cache[url] == null) {
            this._cache[url] = AssetResolver.fetch(url, { type: "audio" }).then((response) => {
                if (response.ok) {
                    return response.blob();
                }

                throw new Error("Failed to load audio at " + url);
            });
        }

        return this._cache[url];
    }

    /** @internal */
    async loadAudio(url: string) {
        const blob = await this.fetchAudio(url);

        let blobUrl = this._urls[url];

        if (blobUrl == null) {
            blobUrl = URL.createObjectURL(blob);

            this._urls[url] = blobUrl;
        }

        const audio = new Audio();

        audio.muted = true;

        const ready = new Promise<void>((resolve, reject) => {
            audio.addEventListener("canplaythrough", () => resolve(), { once: true });
            audio.addEventListener("error", () => reject(new Error("Failed to load audio: " + url)), { once: true });
        });

        audio.src = blobUrl;

        await ready;

        return audio;
    }

    /** @internal */
    dispose() {
        for (let url in this._urls) {
            URL.revokeObjectURL(this._urls[url]);
        }

        for (let url in this._cache) {
            this._cache[url] = null;
        }
    }
}
