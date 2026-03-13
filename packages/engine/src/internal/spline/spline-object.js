import {
  Vector3,
  CatmullRomCurve3,
  MeshBasicMaterial,
  Mesh,
  Quaternion,
  BoxGeometry,
  Group,
} from "three";

import { CAMERA_LAYERS, IS_EDIT_MODE } from "../constants";
import PipeLineLines from "../pipeline/pipeline-lines";
import { LineMaterial2 } from "../utils/lines/line-material-2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import PipeLineMesh from "../pipeline/pipeline-mesh";

const helperGeo = new BoxGeometry(2, 2, 2);

const tempPos = new Vector3();

const defaultQuat = new Quaternion();

const helperMaterial = new MeshBasicMaterial({
  color: 0xff0000,
  transparent: true,
  depthTest: false,
  depthWrite: false,
});

export default class Splines extends Group {
  constructor(data = {}) {
    //
    super();

    this._color = data.color;

    let points = data.points;

    if (points == null) {
      //
      points = [];

      console.log("building default spline data");

      // no points
      // make default
      let i = 0;

      while (i < 4) {
        //
        if (i == 0) {
          //
          points.push(0, 0, 0);
          //
        } else {
          //
          points.push(i * 5, 0, Math.random() * 5);
        }

        i++;
      }
    }

    this.definition = data.definition || 250;

    this._closed = data.closed || false;

    // transform 1d array to vector3 array

    this.dataPositions = this.dataPointToVector3(points);

    this.closed = data.closed || false;

    this.sectorHelpers = [];

    if (IS_EDIT_MODE || data.display == true) {
      let geometry = new LineGeometry();

      const material = new LineMaterial2({
        color: this._color,
        linewidth: data.lineWidth,
        opacity: data.opacity,
        side: 2,
        fog: true,
        transparent: true,
      });

      const occlusionMaterial = new LineMaterial2({
        color: 0x000000,
        linewidth: data.lineWidth,
        opacity: data.opacity,
        side: 2,
        fog: true,
        transparent: true,
      });

      this.meshLine = new PipeLineLines(geometry, material, {
        visibleOnOcclusion: true,
        occlusionMaterial: occlusionMaterial,
        visibleOnMirror: false,
        raycastLineWidth: 20,
      });

      if (IS_EDIT_MODE) {
        this.meshLine.layers.disableAll();

        this.meshLine.layers.enable(CAMERA_LAYERS.EDITOR);
      } else {
        this.displaySectors();
      }

      this.add(this.meshLine);
    }

    this.visible = IS_EDIT_MODE;
  }

  syncPoints(points) {
    //
    this.dataPositions = this.dataPointToVector3(points);

    this.updateCurve();

    this.updateLines();

    if (this.sectorHelpers.length > 0) {
      this.removeSectors();

      this.displaySectors();
    }
  }

  dataPointToVector3(points) {
    let res = [];

    let i = 0;

    while (i < points.length) {
      res.push(new Vector3(points[i], points[i + 1], points[i + 2]));

      i += 3;
    }

    return res;
  }

  getDataPoints() {
    //
    let res = [];

    this.dataPositions.forEach((v) => {
      res.push(v.x, v.y, v.z);
    });

    return res;
  }

  getBakedPointAt(val) {
    let t = Math.min(Math.max(val, 0.0), 1.0);

    const point =
      this.spacedPoints[Math.floor(t * (this.spacedPoints.length - 1))].clone();

    point.applyMatrix4(this.matrixWorld);

    return point;
  }

  getPointAt(val) {
    let t = Math.min(Math.max(val, 0.0), 1.0);

    var point = this.curve.getPointAt(val).clone();

    point.applyMatrix4(this.matrixWorld);

    return point;
  }

  getUtoTmapping(g) {
    return this.curve.getUtoTmapping(g);
  }

  getPoint(u) {
    const point = this.curve.getPoint(u);

    return point.clone().applyMatrix4(this.matrixWorld);
  }

  getPointAtIndex(index) {
    return this.dataPositions[index].clone().applyMatrix4(this.matrixWorld);
  }

  setPointAtIndex(index, val) {
    this.dataPositions[index].copy(val);

    this.updateCurve();

    this.updateLines();
  }

  // catmull

  updateCurve() {
    this.curve = new CatmullRomCurve3(
      this.dataPositions,
      this.closed,
      "chordal"
    );

    this.curve.arcLengthDivisions = this.definition;

    this.curve.updateArcLengths();

    this.spacedPoints = this.curve.getSpacedPoints(this.definition);
  }

  updateLines() {
    if (this.meshLine != null) {
      let geometry = new LineGeometry();

      const positions = new Float32Array(this.spacedPoints.length * 3);

      this.spacedPoints.forEach((p, i) => {
        // vec3
        if (p.x != null) {
          positions[i * 3] = p.x;
          positions[i * 3 + 1] = p.y;
          positions[i * 3 + 2] = p.z;
        }
        // array
        else {
          positions[i * 3] = p[0];
          positions[i * 3 + 1] = p[1];
          positions[i * 3 + 2] = p[2];
        }
      });

      geometry.setPositions(positions);

      this.meshLine.geometry.dispose();

      this.meshLine.geometry = geometry;
    }
  }

  displaySectors() {
    let i = 0;

    while (i < this.dataPositions.length) {
      this.showSector(this.dataPositions[i]);

      i++;
    }
  }

  showSector(p) {
    helperMaterial.depthTest = IS_EDIT_MODE != true;

    const m = new PipeLineMesh(helperGeo, helperMaterial.clone(), {
      visibleOnMirror: false,
      visibleOnOcclusion: true,
      occlusionMaterial: new MeshBasicMaterial({ color: 0x000000 }),
    });

    m.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
      tempPos.setFromMatrixPosition(m.matrixWorld);

      m.matrixWorld.compose(tempPos, defaultQuat, m.scale);
    };

    this.sectorHelpers.push(m);

    m.renderOrder = 1000000000;

    m.position.copy(p);

    if (IS_EDIT_MODE == true) {
      m.layers.disableAll();

      m.layers.enable(CAMERA_LAYERS.EDITOR);
    }

    this.add(m);
  }

  updateFromSectors() {
    //
    this.dataPositions = this.sectorHelpers.map((s) => s.position.clone());

    this.updateCurve();

    this.updateLines();
  }

  addPointAtIndex(index) {
    const data = this.dataPositions[index].clone();

    data.x += 3;

    data.y += 3;

    this.dataPositions.splice(index + 1, 0, data);

    if (
      this.sectorHelpers.length != 0 &&
      this.sectorHelpers.length != this.dataPositions.length
    ) {
      this.showSector(data);
    }

    this.updateCurve();

    this.updateLines();
  }

  addPoint(data) {
    //
    if (data == null) {
      data = this.dataPositions[this.dataPositions.length - 1].clone();
      data.x += 3;
      data.y += 3;
    }

    this.dataPositions.push(data);

    if (
      this.sectorHelpers.length != 0 &&
      this.sectorHelpers.length != this.dataPositions.length
    ) {
      this.showSector(data);
    }

    this.updateCurve();

    this.updateLines();
  }

  deletePointAtIndex(index) {
    if (this.dataPositions[index] != null && this.dataPositions.length > 4) {
      this.dataPositions.splice(index, 1);

      this.updateCurve();

      this.updateLines();

      // this.remove(this.sectorHelpers[index]);

      // this.sectorHelpers.splice(index, 1);
    }
    //
  }

  deletePoint(point) {
    //
    if (this.dataPositions.length <= 4) {
      console.log("cannot delete point, less than 4 points");

      return;
    }

    const index = this.sectorHelpers.indexOf(point);

    if (index != -1) {
      this.dataPositions.splice(index, 1);

      this.remove(this.sectorHelpers[index]);

      this.sectorHelpers.splice(index, 1);

      this.updateCurve();

      this.updateLines();
    }
  }

  getPoints() {
    return this.dataPositions;
  }

  getSectors() {
    return this.sectorHelpers;
  }

  removeSectors() {
    let i = 0;

    while (i < this.sectorHelpers.length) {
      this.remove(this.sectorHelpers[i]);

      i++;
    }

    this.sectorHelpers = [];
  }

  set color(val) {
    if (this.meshLine) {
      this._color = val;
      this.meshLine.material.color.set(val);
    }
  }

  get color() {
    return this.meshLine.material.color;
  }

  set closed(val) {
    this._closed = val;

    if (this.curve) {
      this.curve.closed = val;

      this.updateCurve();

      this.updateLines();
    }
  }

  get closed() {
    return this._closed;
  }

  set smoothness(val) {
    if (val != this.definition) {
      this.definition = val;

      this.updateCurve();

      this.updateLines();
    }
  }

  get smoothness() {
    return this.definition;
  }

  set lineWidth(val) {
    if (this.meshLine) {
      this.meshLine.material.linewidth = val;
    }
  }

  get lineWidth() {
    return this.meshLine?.material?.linewidth || 0;
  }

  set opacity(val) {
    if (this.meshLine) {
      this.meshLine.material.opacity = val;

      this.meshLine.diffuseMaterials.occlusionMaterial.opacity = val;

      if (this.meshLine.lightingMaterials?.occlusionMaterial) {
        this.meshLine.lightingMaterials.occlusionMaterial.opacity = val;
      }

      this.meshLine.visible = val > 0.01;
    }

    this.sectorHelpers.forEach((s) => {
      s.material.opacity = val;

      if (s?.lightingMaterials?.occlusionMaterial) {
        s.lightingMaterials.occlusionMaterial.opacity = val;
      }

      s.visible = val > 0.01;
    });
  }

  get opacity() {
    return this.meshLine?.material?.opacity || 0;
  }

  destroy() {
    this.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();

        child.material.dispose();
      }
    });
  }
}
