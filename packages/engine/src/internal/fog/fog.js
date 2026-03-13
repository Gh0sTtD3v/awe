import { Fog as THREEFog, Color } from "three";
import Shared from "../utils/globals/shared";

function getTextureHeight(texture) {
    if (texture == null) return null;

    if (typeof texture?.image?.height === "number") {
        return texture.image.height;
    }

    if (Array.isArray(texture?.image) && texture.image[0] != null) {
        const firstFace = texture.image[0];
        if (typeof firstFace?.height === "number") {
            return firstFace.height;
        }
    }

    if (typeof texture?.image?.image?.height === "number") {
        return texture.image.image.height;
    }

    if (typeof texture?.source?.data?.height === "number") {
        return texture.source.data.height;
    }

    return null;
}

function getCubeUVSize(texture) {
    const imageHeight = getTextureHeight(texture);

    if (imageHeight == null || imageHeight <= 0) {
        return null;
    }

    const maxMip = Math.log2(imageHeight) - 2;
    const texelHeight = 1.0 / imageHeight;
    const texelWidth = 1.0 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16));

    return { texelWidth, texelHeight, maxMip };
}

export default class Fog extends THREEFog {
    constructor(background, opts) {
        if (background?.isColor) {
            super(background.getHex(), opts?.near, opts?.far);
        } else {
            super(0xffffff, opts?.near, opts?.far);
        }

        this.fogFadeColor = new Color(opts?.fadeColor ?? 0x054d73);
        this.fogTexture = background?.isColor ? null : background ?? null;

        Shared.fogFadeColor.value.copy(this.fogFadeColor);
        Shared.fogTexture.value = this.fogTexture;

        const cubeUVSize = getCubeUVSize(this.fogTexture);
        if (cubeUVSize != null) {
            Shared.fogTextureEnabled.value = 1;
            Shared.fogTextureCubeUVSize.value.set(
                cubeUVSize.texelWidth,
                cubeUVSize.texelHeight,
                cubeUVSize.maxMip,
            );
        } else {
            Shared.fogTextureEnabled.value = 0;
            Shared.fogTextureCubeUVSize.value.set(0, 0, 0);
        }
    }
}
