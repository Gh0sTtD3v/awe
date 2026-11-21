import { BoxGeometry, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial } from "three";
import { Component3D } from "../../abstract/component-3d";
import { SeatComponentData } from "./seat-data";
import { IS_EDIT_MODE } from "../../../internal/constants";

export type { SeatComponentData } from "./seat-data";

let _plate: BoxGeometry | null = null;
let _arrow: BufferGeometry | null = null;
let _plateMaterial: MeshBasicMaterial | null = null;
let _arrowMaterial: MeshBasicMaterial | null = null;

/** A thin square, 1 x 1, lying flat: the seat surface. */
function getPlate(): BoxGeometry {
	if (!_plate) _plate = new BoxGeometry(1, 0.02, 1);
	return _plate;
}

/** A flat triangle on top of the square, pointing -Z: the way a seated avatar faces. */
function getArrow(): BufferGeometry {
	if (!_arrow) {
		_arrow = new BufferGeometry();
		_arrow.setAttribute(
			"position",
			new Float32BufferAttribute([-0.25, 0.012, 0, 0.25, 0.012, 0, 0, 0.012, -0.45], 3),
		);
		_arrow.computeVertexNormals();
	}
	return _arrow;
}

function getPlateMaterial(): MeshBasicMaterial {
	if (!_plateMaterial) {
		_plateMaterial = new MeshBasicMaterial({
			color: new Color("#ffb13f"),
			transparent: true,
			opacity: 0.35,
			depthWrite: false,
		});
	}
	return _plateMaterial;
}

function getArrowMaterial(): MeshBasicMaterial {
	if (!_arrowMaterial) {
		_arrowMaterial = new MeshBasicMaterial({ color: new Color("#ffffff"), side: DoubleSide });
	}
	return _arrowMaterial;
}

/**
 * @public
 *
 * A place to sit: a flat square marking the seat surface, with an arrow for
 * the direction the seated avatar faces. A player who walks up to it gets a
 * "sit" prompt.
 *
 * The component only marks the seat. Showing the prompt and posing the player
 * is the host game's job.
 *
 * Visible in the studio, invisible during play.
 */
export class SeatComponent extends Component3D<SeatComponentData> {

	private _plate: Mesh = null;

	/** @internal */
	protected async init() {
		this.getCollisionMesh().visible = IS_EDIT_MODE;
	}

	/** @internal */
	getCollisionMesh() {
		if (this._plate == null) {
			this._plate = new Mesh(getPlate(), getPlateMaterial());
			this._plate.add(new Mesh(getArrow(), getArrowMaterial()));
			this._plate.visible = false;
			this.add(this._plate);
		}
		return this._plate;
	}

	/** @internal */
	protected dispose() {
		this._plate?.removeFromParent();
		this._plate = null;
	}
}
