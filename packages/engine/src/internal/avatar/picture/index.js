import Textures from "../../textures";

import { DEFAULT_PLAYER_AVATAR_PICTURE } from "../../constants";

import PictureWrapper from './wrapper';

export class PictureFactory {
    constructor() {
        this.atlas = null;
    }

    static async preload() {
        let data = {
            name: "DEFAULT_PLAYER_AVATAR_PICTURE",
            url: DEFAULT_PLAYER_AVATAR_PICTURE,
        };

        await Textures.loadTextures([data]);
    }

    get() {
        // init with default picture

        const defaultImage =
            Textures["DEFAULT_PLAYER_AVATAR_PICTURE"].source.data;

        return new PictureWrapper({
            atlas: this.atlas,

            block: this.atlas.addImage(
                defaultImage,
                DEFAULT_PLAYER_AVATAR_PICTURE,
            ),

            factory: this,
        });
    }

    

    setAtlas(atlas) {
        this.atlas = atlas;
    }

    dispose(){

        console.log(' dispose PictureFactory ')

    }
}
