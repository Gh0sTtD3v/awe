import { BoxGeometry, Mesh, MeshBasicMaterial, Color } from "three";
import { Component3D } from "../../abstract/component-3d";
import { TokenGateComponentData } from "./token-gate-data";
import { IS_EDIT_MODE } from "../../../internal/constants";
import emitter from "../../../internal/engine-emitter";
import { GameEvents } from "../../../internal/game-events";

export type { TokenGateComponentData, TokenGateRequirementType } from "./token-gate-data";

let _geometry: BoxGeometry | null = null;
let _material: MeshBasicMaterial | null = null;

function getGeometry(): BoxGeometry {
	if (!_geometry) _geometry = new BoxGeometry(1, 1, 1);
	return _geometry;
}

function getMaterial(): MeshBasicMaterial {
	if (!_material) {
		_material = new MeshBasicMaterial({
			color: new Color("#ffb020"),
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
 * A box-shaped area gated on a CFT-20 balance or inscription ownership.
 *
 * The component itself only *detects* entry: a sensor collider emits
 * `TOKEN_GATE_ENTER`. Deciding who may stay — and sending everyone else to
 * `exitOffset` — is the host game's job, and must be enforced by its server;
 * anything decided in the browser alone can be bypassed.
 *
 * Visible as a translucent box in the studio, invisible during play.
 */
export class TokenGateComponent extends Component3D<TokenGateComponentData> {

	private _box: Mesh = null;

	/** @internal */
	protected async init() {
		this.getCollisionMesh().visible = IS_EDIT_MODE;
	}

	/** @internal */
	async _onReady() {
		if (IS_EDIT_MODE) return;

		this.onSensorEnter((event) => {
			emitter.emit(GameEvents.TOKEN_GATE_ENTER, {
				gateId: this.data.id,
				avatar: event.other,
			});
		});
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
