import { Component3D } from "../../../space/abstract/component-3d";
import { Component3DData } from "../../../space/abstract/component-3d-data";
import { USER_INTERACTED } from "../../constants";
import emitter from "../../engine-emitter";
import { EngineEvents } from "../../engine-events";
import { ComponentManager } from "../../../space/components";
import { Source } from "three";

/**
 * Manages audio sources and their volume/mute state based on global settings.
 */
export interface AudioSource {
    muted: boolean;
    volume: number;
}

export interface AudioTypeData {
    audioType?: "spatial" | "ambient";
    volume?: number;
    muted?: boolean;
}

interface SourceData {
    component: Component3D;
    audioSource: AudioSource;
    select: () => AudioTypeData;
}

interface AudioSettings {
    volumeBG: number;
    volume: number;
    muted: boolean;
}

let defaultSettings: AudioSettings = {
    muted: false,
    volume: 1,
    volumeBG: 1,
};

export class AudioManager {
    //
    _sources: SourceData[] = [];
    _sourcesById: Record<string, SourceData> = {};
    _active = false;
    _interacted = false;
    _disposers = [] as (() => void)[];

    _settingNeedsUpdate = false;

    constructor(private _container: ComponentManager) {
        //
        this._addEvents();

        USER_INTERACTED.then(() => {
            this._interacted = true;
        });
    }

    private _addEvents() {
        if (this._active) return;
        this._active = true;
        emitter.on(EngineEvents.LATE_UPDATE, this._onUpdate);
    }

    private _removeEvents() {
        if (!this._active) return;
        this._active = false;
        emitter.off(EngineEvents.LATE_UPDATE, this._onUpdate);
    }

    private _onUpdate = () => {
        //
        const sources = this._sources;

        if (sources.length === 0) return;

        let settings = defaultSettings;

        for (let i = 0; i < sources.length; i++) {
            //
            const source = sources[i];

            let data = source.select();

            this._updateMuted(source, settings, data);

            if (!source.audioSource.muted) {
                this._updateVolume(source, settings, data);
            }
        }
    };

    private _updateMuted(
        s: SourceData,
        settings: AudioSettings,
        data: AudioTypeData
    ) {
        //
        const isMuted =
            !this._interacted ||
            data.muted ||
            settings.muted;

        if (s.audioSource.muted !== isMuted) {
            s.audioSource.muted = isMuted;
        }
    }

    private _updateVolume(
        s: SourceData,
        settings: AudioSettings,
        data: AudioTypeData
    ) {
        //
        const settingsVolume =
            data.audioType === "ambient" ? settings.volumeBG : settings.volume;

        let volume = data.volume * settingsVolume;

        if (s.audioSource.volume !== volume) {
            s.audioSource.volume = volume;
        }
    }

    addAudioSource(
        component: Component3D,
        audioSource: AudioSource,
        select: () => AudioTypeData = () => component.data as AudioTypeData
    ) {
        //
        if (audioSource == null) {
            //
            throw new Error("audioSource is null");
        }

        this._sources.push({
            component,
            audioSource,
            select,
        });

        this._sourcesById[component.componentId] =
            this._sources[this._sources.length - 1];

        component.on(component.EVENTS.DISPOSED, () => {
            //
            this.removeAudioSource(component);
        });
    }

    removeAudioSource(component: Component3D) {
        //
        this._sources = this._sources.filter(
            (source) => source.component !== component
        );

        delete this._sourcesById[component.componentId];
    }

    dispose() {
        this._removeEvents();
        this._disposers.forEach((d) => d());
        this._disposers = [];
        this._sources = [];
    }
}
