/**
 * Asset type context for resolution.
 *
 * @public
 */
export type AssetType =
  | "model"
  | "texture"
  | "audio"
  | "animation"
  | "envmap"
  | "video"
  | "other";

/**
 * Context information passed to the asset resolver.
 *
 * @public
 */
export interface AssetContext {
  /** The type of asset being resolved */
  type: AssetType;
  /** The component type requesting the asset (optional) */
  component?: string;
  /** Requested quality level (optional) */
  quality?: "high" | "low" | "compressed";
}

/**
 * Custom resolver function signature.
 *
 * @public
 */
export type CustomAssetResolver = (
  url: string,
  context: AssetContext
) => string;

/**
 * Configuration options for the AssetResolver.
 *
 * @remarks
 * Controls how asset URLs are resolved throughout the engine. This enables:
 * - Development proxying to different servers
 * - Production CDN configuration
 * - Custom resolution logic for advanced use cases
 *
 * @example
 * ```ts
 * // Development: proxy to studio server
 * const config: AssetResolverConfig = {
 *   baseUrl: 'http://localhost:3001'
 * };
 *
 * // Production: use CDN
 * const config: AssetResolverConfig = {
 *   baseUrl: 'https://cdn.mygame.com'
 * };
 *
 * // Custom resolver
 * const config: AssetResolverConfig = {
 *   customResolver: (url, ctx) => {
 *     if (url.startsWith('/assets/')) {
 *       return `https://my-cdn.com${url}`;
 *     }
 *     return url;
 *   }
 * };
 * ```
 *
 * @public
 */
export interface AssetResolverConfig {
  /**
   * Base URL prepended to relative paths.
   * @example "http://localhost:3001" for development
   * @example "https://cdn.mygame.com" for production
   */
  baseUrl?: string;

  /**
   * Custom resolver function for advanced use cases.
   * When provided, this function is called first and can handle
   * any URL transformation logic.
   */
  customResolver?: CustomAssetResolver;

  /**
   * Base URL for built-in engine assets.
   * Defaults to the standard CDN location.
   */
  engineAssetsBase?: string;
}
