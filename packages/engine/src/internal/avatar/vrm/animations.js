import Augmented from "../../events/augmented";
import {
  IDLE,
  WALK,
  JUMP,
  RUN,
  FLY,
  SITTING,
} from "../constants";

import { Assets } from "../../resources/assets";
import { FRONT_END } from "../../constants";
import { AssetResolver } from "../../assets";

const defaultActions = {
  idle: IDLE,
  walk: WALK,
  jump: JUMP,
  run: RUN,
  fly: FLY,
  sitting: SITTING,
};

class VRMAnimation extends Augmented {
  constructor() {
    super();
    // globalThis.$vrmjson = this
    this._anims = null;
    this._animMap = {};
    this._version = 0;

    globalThis.$vrmjson = this;
  }

  setAnimationJSON(anims) {
    //
    this._animMap = anims;

    this._anims = Object.values(anims);

    this._version++;

    this.emit("setAnimationJSON", this._anims);
  }

  get hasAnimations() {
    return this._anims != null;
  }

  get version() {
    return this._version;
  }

  get animations() {
    if (this._anims == null) {
      debugger;
      throw new Error("VRMAnimation: JSON not set");
    }

    return this._anims;
  }

  _jsonCache = {};

  invalidateJSONCache(urls = null) {
    if (urls == null) {
      this._jsonCache = {};
      return;
    }

    if (!Array.isArray(urls)) {
      urls = [urls];
    }

    for (let i = 0; i < urls.length; i++) {
      delete this._jsonCache[urls[i]];
    }
  }

  _getJSON(url) {
    //
    let json = this._jsonCache[url];

    if (json == null) {
      json = AssetResolver.fetch(url, { type: "animation" }).then((it) => it.json());

      this._jsonCache[url] = json;
    }

    return json;
  }

  loadDefault() {
    return this.loadPacked(Assets.jsons.defaultAnims, defaultActions);
  }

  async loadPacked(url, actions) {
    //
    const json = await this._getJSON(url);

    let anims = {};

    Object.keys(json).forEach((key) => {
      //
      if (actions[key]) {
        //
        let anim = this.getAction(json[key], actions[key]);

        anims[anim.name] = anim;
      } else {
        // issue https://linear.app/oncyber/issue/OO-722/examined-and-reproduce-jules-animation-issue
        // Some vrm-anims's json keys hold the actual anim data
        const it = json[key];

        if (it.clip && it.emote) {
          anims[key] = it;
        }
      }
    });

    return { json, anims };
  }

  async loadUnpacked(actions) {
    //
    let anims = {};

    let promises = [];

    Object.keys(actions).forEach((key) => {
      //
      let action = actions[key];

      let url = action.url;

      if (url == null) return;

      promises.push(
        this._getJSON(url)
          .then((json) => {
            //
            action.name ??= key;

            let anim = this.getAction(json, action);

            anims[anim.name] = anim;
          })
          .catch((error) => {
            console.error(`Error loading animation ${url}:`, error);
          })
      );
    });

    await Promise.all(promises);

    return { anims };
  }

  getAction(anim, params) {
    //
    anim.name = params.name;

    const name = params.name.toUpperCase();

    return {
      name,
      clip: anim,
      emote: {
        name,
        loop: params.loop,
        timeScale: params.timeScale,
      },
    };
  }

  getByName(name) {
    return this._animMap[name?.toUpperCase?.()];
  }
}

export default new VRMAnimation();
