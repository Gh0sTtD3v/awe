import { BoxGeometry, Mesh, MeshBasicMaterial, Color } from "three";
import { Component3D } from "../../abstract/component-3d";
import { ChatZoneComponentData } from "./chat-zone-data";
import { IS_EDIT_MODE } from "../../../internal/constants";

export type { ChatZoneComponentData } from "./chat-zone-data";

let _geometry: BoxGeometry | null = null;
let _material: MeshBasicMaterial | null = null;

function getGeometry(): BoxGeometry {
	if (!_geometry) _geometry = new BoxGeometry(1, 1, 1);
	return _geometry;
}

function getMaterial(): MeshBasicMaterial {
	if (!_material) {
		_material = new MeshBasicMaterial({
			color: new Color("#3fa7ff"),
			transparent: true,
			opacity: 0.12,
			depthWrite: false,
		});
	}
	return _material;
}

/**
 * @public
 *
 * A box-shaped area with its own text chat channel: players standing inside
 * it can talk to each other apart from the rest of the world.
 *
 * The component only marks the area. Working out who is inside, and who gets
 * which message, is the host game's job and belongs on its server.
 *
 * Visible as a translucent box in the studio, invisible during play.
 */
export class ChatZoneComponent extends Component3D<ChatZoneComponentData> {

	private _box: Mesh = null;

	/** @internal */
	protected async init() {
		this.getCollisionMesh().visible = IS_EDIT_MODE;
	}

	/** @internal */
	getCollisionMesh() {
		if (this._box == null) {
			this._box = new Mesh(getGeometry(), getMaterial());
			this._box.visible = false;
			this.add(this._box);
		}
		return this._box;
	}

	/** @internal */
	protected dispose() {
		this._box?.removeFromParent();
		this._box = null;
	}
}
