import { Color, Matrix3 } from "three";

/**
 * Emissive light for the unlit (MeshBasicMaterial) copy of a model material.
 *
 * Models get an unlit copy of every material, used whenever the world's
 * Lighting is off. three's MeshBasicMaterial has no emissive, so copying a
 * material into it keeps only base colour x base map. Light-baked materials
 * (black base colour, the bake in the emissive texture, as Blender exports
 * them) then render black. These helpers add the emissive term back:
 * colour x map + emissive x emissiveMap, the same result the lit material
 * gives for them.
 *
 * Usage: build the material with `withUnlitEmissive(opts, source)` (shader
 * and program cache key are fixed in the constructor), then call
 * `applyUnlitEmissive(material, source)` after `material.copy(source)`.
 */

/** True when the material emits light: an emissive texture or a non-black emissive colour. */
export function hasEmissive(material) {
    if (!material) return false;

    if (material.emissiveMap != null) return true;

    const e = material.emissive;

    return (
        e != null &&
        e.r + e.g + e.b > 0 &&
        (material.emissiveIntensity ?? 1) > 0
    );
}

// Declarations, next to the basic shader's other map declarations.
const PARS_FRAGMENT = /* glsl */ `
#include <map_pars_fragment>
#ifdef UNLIT_EMISSIVE
	uniform vec3 emissive;
	#include <emissivemap_pars_fragment>
#endif
`;

// Added to the unlit colour just before it is written out.
const EMISSIVE_FRAGMENT = /* glsl */ `
#ifdef UNLIT_EMISSIVE
	vec3 totalEmissiveRadiance = emissive;
	#include <emissivemap_fragment>
	outgoingLight += totalEmissiveRadiance;
#endif
#include <opaque_fragment>
`;

/** Constructor options for an unlit material copied from `source` ({} when it emits nothing). */
export function unlitEmissiveOptions(source) {
    if (!hasEmissive(source)) return {};

    return {
        defines: { UNLIT_EMISSIVE: "" },
        // three fills these each frame from material.emissive / emissiveMap
        // (WebGLMaterials.refreshUniformsCommon), for any material type.
        uniforms: {
            emissive: { value: new Color(0x000000) },
            emissiveMap: { value: null },
            emissiveMapTransform: { value: new Matrix3() },
        },
        chunks: {
            fragment: {
                map_pars_fragment: PARS_FRAGMENT,
                opaque_fragment: EMISSIVE_FRAGMENT,
            },
        },
    };
}

/**
 * `opts` plus the unlit emissive options for `source`, merged into any
 * defines / uniforms / chunks already in `opts` (those are kept).
 */
export function withUnlitEmissive(opts, source) {
    const extra = unlitEmissiveOptions(source);

    if (!extra.defines) return opts;

    return {
        ...opts,
        defines: { ...extra.defines, ...(opts.defines ?? {}) },
        uniforms: { ...extra.uniforms, ...(opts.uniforms ?? {}) },
        chunks: {
            ...(opts.chunks ?? {}),
            fragment: { ...extra.chunks.fragment, ...(opts.chunks?.fragment ?? {}) },
        },
    };
}

/** Copy the emissive settings of `source` onto an unlit material built with `unlitEmissiveOptions(source)`. */
export function applyUnlitEmissive(target, source) {
    if (!hasEmissive(source)) return;

    target.emissive = source.emissive ? source.emissive.clone() : new Color(0xffffff);

    target.emissiveIntensity = source.emissiveIntensity ?? 1;

    // Setting the map also makes three add its UV set (texCoord 0, 1 or 2).
    target.emissiveMap = source.emissiveMap ?? null;
}
