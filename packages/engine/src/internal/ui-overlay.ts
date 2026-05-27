import { CANVAS } from "./constants";

/**
 * Global UI overlay system that renders HTML on top of the 3D canvas.
 * Components can create named layers to show/hide UI elements.
 */
class UIOverlay {

	private _container: HTMLDivElement | null = null;
	private _layers: Map<string, HTMLDivElement> = new Map();

	private _ensureContainer() {
		if (this._container) return;

		const existing = document.getElementById("oo-ui-root");
		if (existing) {
			this._container = existing as HTMLDivElement;
			return;
		}

		this._container = document.createElement("div");
		this._container.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;";

		const parent = CANVAS?.parentElement ?? document.body;
		parent.style.position = parent.style.position || "relative";
		parent.appendChild(this._container);
	}

	/**
	 * Create or get a named overlay layer. Returns a div positioned over the canvas.
	 * Set pointer-events on children that need interaction.
	 */
	createLayer(id: string): HTMLDivElement {
		this._ensureContainer();

		let layer = this._layers.get(id);
		if (layer) return layer;

		layer = document.createElement("div");
		layer.dataset.overlay = id;
		layer.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";
		this._container.appendChild(layer);
		this._layers.set(id, layer);

		return layer;
	}

	/**
	 * Set the HTML content of a layer.
	 */
	setContent(id: string, html: string) {
		const layer = this.createLayer(id);
		layer.innerHTML = html;
	}

	/**
	 * Remove a layer.
	 */
	removeLayer(id: string) {
		const layer = this._layers.get(id);
		if (layer) {
			layer.remove();
			this._layers.delete(id);
		}
	}

	/**
	 * Hide a layer without removing it.
	 */
	hideLayer(id: string) {
		const layer = this._layers.get(id);
		if (layer) layer.style.display = "none";
	}

	/**
	 * Show a previously hidden layer.
	 */
	showLayer(id: string) {
		const layer = this._layers.get(id);
		if (layer) layer.style.display = "";
	}

	/**
	 * Remove all layers and the container.
	 */
	dispose() {
		this._layers.forEach(layer => layer.remove());
		this._layers.clear();
		this._container?.remove();
		this._container = null;
	}
}

export default new UIOverlay();
