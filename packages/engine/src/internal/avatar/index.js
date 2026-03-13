import { Group, Mesh, Object3D } from "three";

import { VRMFactory } from './vrm/index';

import { PictureFactory } from './picture/index';

import Scene from "../scene";

import { AtlasFactory } from "../atlas";

import AvatarWrapper from './wrapper';

import UserNameGenerator from './username/generator';

// import { UserNameFactory } from "./username";

const DEFAULT_OPTS = {
    awaitAvatarLoading: true,
    awaitPictureLoading: true,
    awaitLoaderThrottle: 0,
    ignoreLOD: false,
    text: "anonymous",
    name: "",
    nameDisplayWithPicture: false,
    useCpuAnimation: false,
    plugins: [],
};

import MeshFontFactory from "../font";

export class AvatarFactory extends Object3D {
    constructor() {
        super();

        this.main = null;

        this.container = new Group();

        this.container.autoUpdateMatrixWorld = false;

        this.atlasFactory = new AtlasFactory();

        this.atlasAvatar = this.atlasFactory.get({ debug: false });

        // this.atlasUserName = this.atlasFactory.get({
        //     debug: false,
        //     distance: true,
        //     elementSize: UserNameGenerator.CANVAS_SIZE,
        // });

        // this.userNameFactory = new UserNameFactory()

        // this.userNameFactory.setAtlas(this.atlasUserName);

        this.pictureFactory = new PictureFactory();

        this.pictureFactory.setAtlas(this.atlasAvatar);

        this.vrmFactory = new VRMFactory({ avatarFactory: this });

        this.vrmFactory.setAtlas(this.atlasAvatar);

        this.container.add(this.vrmFactory);

        this.add(this.container);

        this._init = false;

        this._isInit = false;

        globalThis.AvatarFactory = this;
    }

    preload() {
        return new Promise((resolve) => {
            let ps = [];

            ps.push(this.vrmFactory.preload());

            ps.push(PictureFactory.preload());

            Promise.all(ps).then(() => {
                this._isInit = false;

                resolve();
            });
        });
    }

    async get(url, op = {}) {
        // console.log( op )

        // op.avatarScale = 2
        // op.scale.x = 2
        // op.scale.y = 2
        // op.scale.z = 2

        // debugger

        // debugger;

        if (this._isInit) {
            await this.initialisation;
        }

        let picture = null;

        let nameBlock = null;

        if (this._init == false) {
            this._init = true;

            this._isInit = true;

            this.initialisation = this.preload();

            await this.initialisation;
        }

        //console.log( url )

        var opts = Object.assign({}, DEFAULT_OPTS, op);

        // default picture scheme

        picture = this.pictureFactory.get();

        // honoring awaitPictureLoading
        // if true, we wait for the picture to load
        // before returning the avatar

        // awaitAvatarLoading
        // awaitPictureLoading

        const vrm = await this.vrmFactory.get(url, opts, picture);

        if (opts.picture) {
            if (opts.awaitPictureLoading == true) {
                await picture.load(opts.picture);
            } else {
                setTimeout(() => {
                    picture.load(opts.picture).then(() => {
                        vrm.url = picture.url;
                    });
                }, opts.awaitLoaderThrottle);
            }
        }

        nameBlock = await MeshFontFactory.get({
            instanced: true,

            text: op.text,

            align: "center",

            textColor: 0xffffff,

            opacity: 1,

            position: {
                x: 0,
                y: 5,
                z: 0,
            },

            scale: {
                x: 0.5,

                y: 0.5,

                z: 0.5,
            },
        });

        // nameBlock.visible = false

        const wrapper = new AvatarWrapper({
            vrm: vrm,

            picture: picture,

            text: nameBlock,

            data: opts,

            // userNameFactory: this.userNameFactory,
        });

        if (op.main) {
            this.main = wrapper;
        }

        return wrapper;
    }

    dispose() {
        this.atlasAvatar.dispose();

        this.atlasAvatar = null;

        this.atlasFactory = null;

        this.pictureFactory.dispose();

        this.pictureFactory = null;

        // dispose all to kill all vrms contained

        this.vrmFactory.disposeAll();

        this.vrmFactory = null;
    }
}
