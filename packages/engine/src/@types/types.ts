/**
 * Represents a 3D coordinate or vector with x, y, and z components.
 *
 * @remarks
 * This is a shared interface used to represent various 3D values in component data
 * such as position, rotation (in radians), and scale.
 * 
 * @public
 */
export interface XYZ {
    x: number;
    y: number;
    z: number;
}

/**
 * Represents a quaternion with x, y, z, and w components.
 *
 * @public
 */
export interface XYZW {
    x: number;
    y: number;
    z: number;
    w: number;
}

/**
 * Visual rendering style applied to avatars & models.
 *
 * @remarks
 * - `"default"` - Standard rendering with full materials and lighting
 * - `"toon"` - Cel-shaded/cartoon style rendering
 * - `"glitch"` - Distorted glitch effect
 * - `"ghost"` - Semi-transparent ghostly appearance
 * - `"error"` - Error state visual indicator
 *
 * @public
 */
export type RenderMode = "default" | "toon" | "glitch" | "ghost" | "error";
