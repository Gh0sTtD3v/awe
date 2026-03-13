import type {
  AssetResolverConfig,
  AssetContext,
} from "../../@types/asset-resolver-config";

/**
 * Default CDN base URL for built-in engine assets.
 */
const DEFAULT_ENGINE_ASSETS_BASE = "https://cdn.oncyber.xyz/engine-assets";

/**
 * Centralized asset URL resolver for the engine.
 *
 * @remarks
 * All asset loading should go through this resolver to enable:
 * - Base URL configuration for different environments
 * - Custom resolution logic for advanced use cases
 * - Consistent URL handling across all asset types
 *
 * @example
 * ```ts
 * // Configure for development
 * AssetResolver.configure({ baseUrl: 'http://localhost:3001' });
 *
 * // Resolve a relative URL
 * const url = AssetResolver.resolve('/assets/model.glb', { type: 'model' });
 * // Returns: 'http://localhost:3001/assets/model.glb'
 * ```
 *
 * @internal
 */
class AssetResolverImpl {
  private config: AssetResolverConfig = {};

  /**
   * Configure the asset resolver.
   *
   * @param config - Configuration options
   */
  configure(config: AssetResolverConfig): void {
    this.config = { ...config };
  }

  /**
   * Get the current configuration.
   */
  getConfig(): Readonly<AssetResolverConfig> {
    return this.config;
  }

  /**
   * Reset the resolver to default state.
   */
  reset(): void {
    this.config = {};
  }

  /**
   * Resolve an asset URL based on current configuration.
   *
   * @param url - The original URL to resolve
   * @param context - Optional context about the asset
   * @returns The resolved URL
   */
  resolve(url: string, context?: AssetContext): string {
    if (!url) {
      return url;
    }

    const ctx: AssetContext = context ?? { type: "other" };

    // 1. If custom resolver is configured, use it
    if (this.config.customResolver) {
      return this.config.customResolver(url, ctx);
    }

    // 2. If already an absolute URL, return as-is
    if (this.isAbsoluteUrl(url)) {
      return url;
    }

    // 3. If relative path and baseUrl configured, prepend it
    // Skip if URL already starts with baseUrl (avoid double resolution)
    if (this.config.baseUrl && url.startsWith("/")) {
      if (url.startsWith(this.config.baseUrl)) {
        return url;
      }
      return this.config.baseUrl + url;
    }

    // 4. Return original
    return url;
  }

  /**
   * Check if a URL is absolute (has a protocol).
   */
  private isAbsoluteUrl(url: string): boolean {
    return (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("blob:") ||
      url.startsWith("data:")
    );
  }

  fetch(
    url: string,
    context?: AssetContext,
    options?: RequestInit
  ): Promise<Response> {
    return fetch(this.resolve(url, context), options);
  }

  /**
   * Resolve a built-in engine asset URL.
   *
   * If `engineAssetsBase` is configured, URLs starting with the default
   * CDN base will be remapped to the configured base URL.
   *
   * @param url - The engine asset URL (typically from assets.json)
   * @returns The resolved URL
   */
  resolveEngineAsset(url: string): string {
    if (!url) {
      return url;
    }

    // If engineAssetsBase is configured and URL starts with default CDN
    if (this.config.engineAssetsBase && url.startsWith(DEFAULT_ENGINE_ASSETS_BASE)) {
      return url.replace(DEFAULT_ENGINE_ASSETS_BASE, this.config.engineAssetsBase);
    }

    return url;
  }
}

/**
 * Singleton instance of the asset resolver.
 *
 * @internal
 */
export const AssetResolver = new AssetResolverImpl();
