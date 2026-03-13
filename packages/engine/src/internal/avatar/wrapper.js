import { Euler, Object3D, Vector3 } from "three";

export default class AvatarWrapper {
    constructor(opts = {}) {
        /**
         * @type {import("./vrm/wrapper").default}
         */
        this.vrm = opts.vrm;

        // this.userNameFactory = opts.userNameFactory;

        this.picture = opts.picture;

        this._text = opts.text;

        this._position = new Vector3(-0.00001, -0.00001, -0.00001);

        this.data = opts.data;

        this.scale = new Vector3(1, 1, 1);

        if (this.data.scale) {
            this.scale.x = this.data.scale.x;
            this.scale.y = this.data.scale.y;
            this.scale.z = this.data.scale.z;
        }

        this._visible = true;

        this.__objectSource = null;
    }

    attachTo(source) {
        this.__objectSource = source;
    }

    _tmpEuler = new Euler(0, 0, 0, "YXZ");

    updateFromSource(source = null) {
        source ??= this.__objectSource;

        if (source == null || source.__DISABLE_UPDATE_FROM_SOURCE == true)
            return;

        this.position = source.positionWorld ?? source.position;

        const quaternion = source.quaternionWorld ?? source.quaternion;

        if (
            source.rotation.order === "YXZ" &&
            quaternion.equals(source.quaternion)
        ) {
            this.rotation = source.rotation.y;
        } else {
            this._tmpEuler.setFromQuaternion(quaternion, "YXZ");

            this.rotation = this._tmpEuler.y;
        }

        const scale = source.scaleWorld ?? source.scale;

        if (scale != null) {
            this.scale.x = scale.x;
            this.scale.y = scale.y;
            this.scale.z = scale.z;

            this.vrm.setScale(scale.x);
        }
    }

    set position(op) {
        if (
            op.x == this._position.x &&
            op.y == this._position.y &&
            op.z == this._position.z
        )
            return;

        this._position.set(op.x, op.y, op.z);

        this.vrm.position.copy(this._position);

        this.setTextPosition();
    }

    setTextPosition() {
        if (this._text) {
            this._text.position = {
                x: this.position.x,
                y: this.position.y + this.vrm.headPosition.y + 0.3,
                z: this.position.z,
            };
        }
    }

    set rotation(val) {
        this.vrm.rotation = val;
    }

    get rotation() {
        return this.vrm.rotation;
    }

    get position() {
        return this._position;
    }

    loadPicture(val) {
        if (this.picture == null) return Promise.resolve();

        return new Promise((resolve) => {
            this.picture.load(val).then(() => {
                resolve();
            });
        });
    }

    set text(val) {
        if (this._text == null) return;

        this._text.update(val);

        this.reset();

        this.setTextPosition();
    }

    get text() {
        return this._text;
    }

    reset() {
        this.position = this._position;
    }

    set nameDisplayWithPicture(val) {
        this.data.nameDisplayWithPicture = val;

        this.name = this._text?.url;
    }

    get nameDisplayWithPicture() {
        return this.data.nameDisplayWithPicture;
    }

    set visible(val) {
        this._visible = val;

        this.vrm.visible = val;
    }

    get visible() {
        return this._visible;
    }

    async updateVRM(url, data = {}) {
        this.data = Object.assign(this.data, data);

        await this.vrm.update(url, this.data);
    }

    dispose() {
        this.vrm.dispose();

        this.picture?.dispose();

        this._text?.dispose();

        // this.vrm.dispose()

        // this.factory.dispose( this )

        // console.log(" need implement dispose here ");
    }
}
