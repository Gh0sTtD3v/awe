import { DefaultLoadingManager, LoadingManager } from "three";
import { AssetResolver } from "./asset-resolver";
import type { AssetType } from "../../@types/asset-resolver-config";

/**
 * Configure the Three.js DefaultLoadingManager to automatically resolve URLs
 * through the AssetResolver.
 *
 * This provides a safety net for any Three.js loader that doesn't explicitly
 * use AssetResolver - all URLs will be intercepted and resolved.
 *
 * @internal
 */
export function configureDefaultLoadingManager(): void {
  DefaultLoadingManager.setURLModifier((url: string) => {
    // Skip absolute URLs - they don't need resolution
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("blob:") ||
      url.startsWith("data:")
    ) {
      return url;
    }
    return AssetResolver.resolve(url, { type: "other" });
  });
}

/**
 * Create a LoadingManager that resolves URLs with a specific asset type context.
 *
 * Use this for Three.js loaders that need type-aware URL resolution, which
 * enables customResolver callbacks to receive the correct asset type.
 *
 * @param type - The asset type for URL resolution context
 * @returns A LoadingManager configured with type-aware URL modification
 *
 * @example
 * ```ts
 * const modelManager = createTypedLoadingManager("model");
 * const gltfLoader = new GLTFLoader(modelManager);
 * ```
 *
 * @internal
 */
export function createTypedLoadingManager(type: AssetType): LoadingManager {
  const manager = new LoadingManager();
  manager.setURLModifier((url: string) => {
    // Skip absolute URLs - they don't need resolution
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("blob:") ||
      url.startsWith("data:")
    ) {
      return url;
    }
    return AssetResolver.resolve(url, { type });
  });
  return manager;
}
