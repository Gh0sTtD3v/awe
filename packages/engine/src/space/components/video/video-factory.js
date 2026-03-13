// @ts-check

import { DefaultComponentFactory } from "../../abstract/default-component-factory";

import { VideoFactory } from "../../../internal/media/video";

export class VideoComponentFactory extends DefaultComponentFactory {
    async init(opts) {
        this.videoFactory = new VideoFactory();

        return super.init(opts);
    }

    dispose() {
        super.dispose();

        this.videoFactory.disposeAll();

        this.videoFactory = null;
    }
}
