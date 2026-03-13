import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import { Box3, BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { Subsystems } from "../../../internal/subsystems";
import { Assets } from "../../../internal/resources/assets";
import { computeVrmBBox } from "../../../internal/avatar/vrm-bbox";
import { AvatarComponentData } from "./avatar-data";

export interface AvatarBBoxCache {
  vrmSize: Vector3;
  absoluteScale: number;
  vrmBBox: Box3;
}

/** @internal */
export class AvatarComponentHeadless extends Component3D<AvatarComponentData> {
  private _vrmSize: Vector3 = null;
  private _absoluteScale: number = 1;
  private _vrmBBox: Box3 = null;
  _collisionMesh: Mesh = null;

  private _bboxCache: Map<string, AvatarBBoxCache>;

  /** @internal */
  constructor(opts: any & { bboxCache: Map<string, AvatarBBoxCache> }) {
    super(opts);
    this._bboxCache = opts.bboxCache;
  }

  /** @internal */
  protected async init() {
    const url = this._getUrl();
    await this._loadAndComputeBBox(url);
  }

  private _getUrl(): string {
    return this.data.url || Assets.vrms.sunshine;
  }

  private async _loadAndComputeBBox(url: string) {
    const cached = this._bboxCache.get(url);
    if (cached) {
      this._vrmSize = cached.vrmSize.clone();
      this._absoluteScale = cached.absoluteScale;
      this._vrmBBox = cached.vrmBBox.clone();
      return;
    }

    const gltf = await Subsystems.gltf.loadGLTF(url);
    const { vrmSize, baseScaleRatio, vrmBBox } = computeVrmBBox(gltf.scene);

    this._vrmSize = vrmSize;
    this._absoluteScale = baseScaleRatio;
    this._vrmBBox = vrmBBox;

    this._bboxCache.set(url, {
      vrmSize: vrmSize.clone(),
      absoluteScale: baseScaleRatio,
      vrmBBox: vrmBBox.clone(),
    });
  }

  /** @internal */
  onDataChange(opts: DataChangeOpts<AvatarComponentData>): void {
    if (opts.isProgress) return;

    const prevUrl = opts.prev.url || Assets.vrms.sunshine;
    const newUrl = this._getUrl();

    if (prevUrl !== newUrl) {
      this._loadAndComputeBBox(newUrl).then(() => {
        if (this._collisionMesh != null) {
          const dims = this.getDimensions();
          dims.divide(this.scale);
          this._collisionMesh.scale.copy(dims);
        }
      });
    }
  }

  getDimensions() {
    if (!this._vrmSize) {
      return new Vector3(0.5, 2.7, 0.5);
    }

    const height = this._vrmSize.y * this._absoluteScale;
    const diameter = this._vrmSize.x * this._absoluteScale * 0.5;

    return new Vector3(diameter, height, diameter);
  }

  protected _getBBoxImp(target: Box3) {
    if (!this._vrmBBox) {
      return target;
    }

    target.copy(this._vrmBBox);
    target.min.add(this.positionWorld);
    target.max.add(this.positionWorld);

    return target;
  }

  protected _onCreateCollisionMesh() {
    const geometry = new BoxGeometry(1, 1, 1);
    geometry.translate(0, 0.5, 0);

    const mesh = new Mesh(
      geometry,
      new MeshBasicMaterial({ wireframe: true }),
    );

    const dims = this.getDimensions();
    dims.divide(this.scale);
    mesh.scale.copy(dims);

    mesh.name = "PLAYER";
    mesh.visible = false;

    this.add(mesh);
    this._collisionMesh = mesh;

    return mesh;
  }

  /** @internal */
  protected dispose() {
    this._vrmSize = null;
    this._vrmBBox = null;
    this._collisionMesh = null;
  }
}
