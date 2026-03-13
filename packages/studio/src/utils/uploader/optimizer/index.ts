import { OOAsset } from "@oncyberio/asset-optimizer";
import { OptimizedFiles } from "../../../types/optimized-files";
import { optimizeAssetAction, optimizeVRMAction } from "../../../actions/optimize";

type OptimiseAssetResult = {
  hash: string;
  raw: string;
  optimized: OptimizedFiles;
  propertyId: string;
};

export class OptimizerServices {
  //
  static cache: Record<string, Promise<OptimiseAssetResult>> = {};

  static async optimizeAsset(opts: {
    asset: OOAsset;
    token?: string;
    compressionOptions?: {
      useWeld?: boolean;
      useDraco?: boolean;
      useMeshOpt?: boolean;
    };
  }): Promise<OptimiseAssetResult> {
    const key = opts.asset.url + JSON.stringify(opts.compressionOptions);

    if (this.cache[key] == null) {
      this.cache[key] = this.optimizeAssetImpl(opts);
    }

    return this.cache[key];
  }

  static async optimizeAvatar(opts: {
    id: string;
    url: string;
  }): Promise<string> {
    const { id, url } = opts;

    const file = await fetch(url).then((r) => r.blob());
    
    const formData = new FormData();

    formData.append("vrm", file, id);
    formData.append("id", id);

    const result = await optimizeVRMAction(formData);

    if (!result) {
      throw new Error("Issue encountered during avatar optimization");
    }

    return result;
  }

  private static async optimizeAssetImpl(opts: {
    asset: OOAsset;
    token?: string;
    compressionOptions?: {
      useWeld?: boolean;
      useDraco?: boolean;
      useMeshOpt?: boolean;
    };
  }): Promise<OptimiseAssetResult> {
    const { asset } = opts;

    if (asset.type !== "model") {
      throw new Error("Only models can be optimized for now.");
    }

    const data = await optimizeAssetAction(asset, opts.compressionOptions);

    return data;
  }
}
