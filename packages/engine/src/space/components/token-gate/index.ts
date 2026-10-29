import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { TokenGateComponent } from "./token-gate-component";

/** @internal */
export class TokenGateComponentFactory extends DefaultComponentFactory<TokenGateComponent> {

	Type = TokenGateComponent;

	static info = {
		type: "token-gate",
		title: "Token Gate",
		image: "https://raw.githubusercontent.com/Gh0sTtD3v/awe/refs/heads/main/assets/token-gated.png",
		description: "An area only holders of a CFT-20 token or inscription can enter",
		draggable: true,
		transform: true,
		studioTab: "worldSettings",
	};

	static {
		const defaultData = {
			kit: "cyber",
			name: "",
			type: "token-gate",
			position: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 4, y: 3, z: 4 },
			chain: "cosmos",
			requirementType: "cft20",
			ticker: "",
			collection: "",
			contract: "",
			tokenId: "",
			minAmount: "1",
			exitOffset: { x: 0, y: 0, z: 4 },
			doorTag: "",
			label: "",
			collider: {
				enabled: true,
				rigidbodyType: "fixed",
				colliderType: "cube",
				isSensor: true,
			},
		};

		this.setDataConfig({
			defaultData,
		});
	}

	static getTitle(data: any) {
		return data.name || data.label || "Token Gate";
	}
}
