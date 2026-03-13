import { Vector3 } from "three";

export default class UserNameWrapper {
    constructor(atlas, name) {
        this.atlas = atlas;

        this._name = null;

        this._paused = 0;

        this._opacity = 1;

        // this._speaking = 0

        this.position = new Vector3(1000, 1000, 1000);

        this.visible = true;

        this.loading = false;

        this.distance = 1000000;

        this._name = name;
    }

    reset() {
        this.position = this._position;

        this.atlas = this._atlas;

        this.opacity = this._opacity;

        this.paused = this._paused;

        this.visible = this._visible;
    }

    set position(val) {
        this._position = val;
    }

    get position() {
        return this._position;
    }

    set atlas(val) {
        if (val == null) {
            return;
        }

        this._atlas = val;
    }

    set paused(val) {
        this._paused = val == false ? 0 : 1;
    }

    get paused() {
        return this._paused;
    }

    set opacity(val) {
        this._opacity = val;
    }

    get opacity() {
        return this._opacity;
    }

    get atlas() {
        return this._atlas;
    }

    get url() {
        return this.img.src;
    }

    set visible(val) {

        if(this._name == '' || this._name == null ){

            this._visible = false;
        }
        else {

            this._visible = val;
        }
        
    }

    get visible() {
        return this._visible;
    }

    remove() {}

    dispose() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }

        if (this.geometry != null) {
            this.geometry.dispose();

            this.geometry = null;
        }

        if (this.mesh && this.mesh.material != null) {
            this.mesh.material.dispose();

            this.mesh.material = null;

            this.mesh = null;
        }
    }
}
