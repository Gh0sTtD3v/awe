// @ts-check

import {
    WebGLRenderer,
    PCFSoftShadowMap,
    SRGBColorSpace,
    WebGLShadowMap,
    BasicShadowMap,
    Camera,
    Scene,
    BufferGeometry,
    Material,
    Object3D,
} from "three";

import { DPI, DEBUG, CANVAS } from "./constants";


////////////////////////////////////////////////////////////
// Custom renderer code
////////////////////////////////////////////////////////////

/*
# Fix: https://github.com/mrdoob/three.js/issues/30156 (still not fixed for WebGLRenderer)

## Issue: Three.js Shadow Rendering Ignores shadow.camera.layers

The lighting wrapper tries to filter objects by setting `shadow.camera.layers`:
```javascript
this.directionalLight.shadow.camera.layers.enableAll();
this.directionalLight.shadow.camera.layers.disable(CAMERA_LAYERS.DYNAMIC);
```

However, Three.js WebGLShadowMap.js uses the MAIN camera's layers in renderObject, not the shadow camera's:

```javascript
const visible = object.layers.test( camera.layers ); // camera = main camera, NOT shadowCamera
```

Since the main camera has `layers.enableAll()`, ALL objects (including DYNAMIC layer avatars) are rendered to ALL shadow maps. 
The `shadow.camera.layers` configuration has no effect.

Only Hack I found without forking Three.js is to monkey patch the renderBufferDirect method to retest layers against the shadow camera's layers.
Then bailout if object layers do not match shadow camera layers.
*/

function monkeyPatchRenderer() {
    const originalRenderBufferDirect = renderer.renderBufferDirect;


    /**
     * @param {Camera} camera
     * @param {Scene} scene
     * @param {BufferGeometry} geometry
     * @param {Material} material
     * @param {Object3D} object
     * @param {any} group
     */
    function _fixedRenderBufferDirect( camera, scene, geometry, material, object, group )  {
        // test camera layer
        if(camera.userData._IS_SHADOW_CAMERA && !object.layers.test( camera.layers )) {
            return;
        }
        originalRenderBufferDirect.call(this, camera, scene, geometry, material, object, group);
    }

    renderer.renderBufferDirect = _fixedRenderBufferDirect;
}

////////////////////////////////////////////////////////////
// End of custom renderer code
////////////////////////////////////////////////////////////

/**
 * @type {WebGLRenderer}
 */
let renderer = null;

if (CANVAS != null) {
    renderer = new WebGLRenderer({
        canvas: CANVAS,

        antialias: true,

        alpha: false,

        stencil: false,

        powerPreference: "high-performance",
    });

    monkeyPatchRenderer();

    // We'll manage clearing manually because of the portals

    // custom flag

    // @ts-ignore
    renderer.renderRealTimeShadow = false;

    renderer.autoClear = false;

    renderer.setPixelRatio(DPI);

    renderer.outputColorSpace = SRGBColorSpace;

    renderer.info.autoReset = false;

    renderer.setClearColor(0x000000, 1);

    renderer.debug.checkShaderErrors =
        process.env.NODE_ENV == "development" || DEBUG;

    renderer.shadowMap.type = PCFSoftShadowMap;

    renderer.shadowMap.autoUpdate = false;

    renderer.localClippingEnabled = false;

    renderer.setTransparentSort((a, b) => {
        if (a.object._closestDistance != null) {
            a.z = a.object._closestDistance;
        }

        if (b.object._closestDistance != null) {
            b.z = b.object._closestDistance;
        }

        if (a.groupOrder !== b.groupOrder) {
            return a.groupOrder - b.groupOrder;
        }
        if (a.renderOrder !== b.renderOrder) {
            return a.renderOrder - b.renderOrder;
        }

        return a.z !== b.z ? b.z - a.z : a.id - b.id;
    });

    renderer.setOpaqueSort((a, b) => {
        var aZ = a.z;

        var bZ = b.z;

        if (a.object._closestDistance != null) {
            aZ = a.object._closestDistance;
        }

        if (b.object._closestDistance != null) {
            bZ = b.object._closestDistance;
        }

        if (a.groupOrder !== b.groupOrder) {
            return a.groupOrder - b.groupOrder;
        } else if (a.renderOrder !== b.renderOrder) {
            return a.renderOrder - b.renderOrder;
        } else if (a.material.id !== b.material.id) {
            return a.material.id - b.material.id;
        } else if (aZ !== bZ) {
            return aZ - bZ;
        } else {
            return a.id - b.id;
        }
    });

    if (DEBUG) {
        // @ts-ignore

        globalThis.renderer = renderer;
    }

    globalThis.renderer = renderer;
}

export default renderer;
