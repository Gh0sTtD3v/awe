// @ts-check

import { BoxGeometry, MeshBasicMaterial, Texture, Vector3 } from "three";

import PlaceHolderMaterial from "./placeholdermaterial";
import PipelineMesh from "../../pipeline/pipeline-mesh";
import { Subsystems } from "../../subsystems";
import { Assets } from "../../resources/assets";

export const defaultPlaceholderSize = [1, 1, 0.1];

const basicblack = new MeshBasicMaterial({ color: 0x000000 });

let _placeholderTexture: Texture | null = null;
function getPlaceholderTexture(): Texture {
    if (!_placeholderTexture) {
        _placeholderTexture = Subsystems.textures?.textureLoader
            ? Subsystems.textures.textureLoader.load(
                  Assets.textures["art-placeholder"],
              )
            : new Texture();
    }
    return _placeholderTexture;
}

class PlaceholderFactory {
    //
    create(opts: { id: string; size: number[] }) {
        return new Placeholder(opts);
    }
}

export class Placeholder extends PipelineMesh {
    //
    placeholderId: string;

    constructor(opts: { id: string; size: number[] }) {
        //
        const size = opts.size || defaultPlaceholderSize;

        const material = new PlaceHolderMaterial({
            map: getPlaceholderTexture(),
            ratio: size[0] / size[1],
        });

        super(new BoxGeometry(size[0], size[1], size[2]), material, {
            visibleOnMirror: false,
            occlusionMaterial: basicblack,
        });

        this.name = "Placeholder";

        this.placeholderId = opts.id;
    }

    setSelected(selected: boolean) {
        //
        (this.material as PlaceHolderMaterial).uniforms.selected.value =
            selected ? 1 : 0;
    }
}

export default new PlaceholderFactory();
