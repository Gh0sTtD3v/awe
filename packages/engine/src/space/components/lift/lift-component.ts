import { BoxGeometry, Mesh, MeshBasicMaterial, Color } from "three";
import { Component3D } from "../../abstract/component-3d";
import { LiftComponentData } from "./lift-data";
import { IS_EDIT_MODE } from "../../../internal/constants";

export type { LiftComponentData } from "./lift-data";

let _geometry: BoxGeometry | null = null;
let _material: MeshBasicMaterial | null = null;

function getGeometry(): BoxGeometry {
	if (!_geometry) _geometry = new BoxGeometry(1, 1, 1);
	return _geometry;
}

function getMaterial(): MeshBasicMaterial {
	if (!_material) {
		_material = new MeshBasicMaterial({
			color: new Color("#3fdc8a"),
			transparent: true,
			opacity: 0.15,
			depthWrite: false,
		});
	}
	return _material;
}

/**
 * @public
 *
 * One floor of a lift: a box-shaped stop. Boxes sharing a lift name are that
 * lift's floors; a player standing in one can travel to any of the others.
 *
 * The component only marks the stop. Showing the floors and moving the player
 * is the host game's job.
 *
 * Visible as a translucent box in the studio, invisible during play.
 */
export class LiftComponent extends Component3D<LiftComponentData> {

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
