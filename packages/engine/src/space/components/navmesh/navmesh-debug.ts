// @ts-check

import Camera from "../../../camera";
import emitter from "../../../internal/engine-emitter";
import { EngineEvents } from "../../../internal/engine-events";
import { LineMaterial2 } from "../../../internal/utils/lines/line-material-2";
import {
    BufferGeometry,
    CapsuleGeometry,
    CylinderGeometry,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    Object3D,
    PlaneGeometry,
    Raycaster,
    SphereGeometry,
    Vector2,
    Vector3,
} from "three";
import { Detour, NavMesh, NavMeshQuery } from "recast-navigation";
import { CrowdHelper, DebugDrawer } from "@recast-navigation/three";
import { disposeObject3D } from "../../../internal/utils/dispose";
import { ComponentManager } from "..";
import { AgentParams, NavmeshAgent, NavmeshCrowd } from "./navmesh-crowd";
import conf from "../../../internal/utils/params";

import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { SoloNavMeshGeneratorIntermediates } from "./__generatesolo";
import { NavmeshComponent } from "./navmesh-component";

export const debugNavmesh = conf.debugnavmesh;

const gltfExporter = new GLTFExporter();
const objectExporter = new OBJExporter();

function createPointMesh(position, type = "sphere") {
    const geometry =
        type === "sphere"
            ? new SphereGeometry(0.1, 8, 8)
            : new CapsuleGeometry(2, 2, 8, 12);

    const material = new MeshBasicMaterial({
        color: type === "sphere" ? 0x00ffff : 0x00ff00,
    });

    const mesh = new Mesh(geometry, material);

    mesh.position.copy(position);

    return mesh;
}

const DebugDrawTypes = {
    NAVMESH: "NAVMESH",
    NAVMESH_NODES: "NAVMESH_NODES",
    NAVMESH_BV_TREE: "NAVMESH_BV_TREE",
    POLY_MESH: "POLY_MESH",
    POLY_MESH_DETAIL: "POLY_MESH_DETAIL",
    RAW_CONTOURS: "RAW_CONTOURS",
    CONTOURS: "CONTOURS",
    // REGIONS_CONNECTIONS: "REGIONS_CONNECTIONS",
    HEIGHTFIELD_SOLID: "Solid",
    HEIGHTFIELD_WALKABLE: "HEIGHTFIELD_WALKABLE",
    COMPACT_HEIGHTFIELD_SOLID: "COMPACT_HEIGHTFIELD_SOLID",
    COMPACT_HEIGHTFIELD_REGIONS: "COMPACT_HEIGHTFIELD_REGIONS",
    COMPACT_HEIGHTFIELD_DISTANCE: "COMPACT_HEIGHTFIELD_DISTANCE",
};

export class NavmeshDebug extends Group {
    //

    _curIntermediate = null;

    raycaster: Raycaster;
    helpers: {
        crowd: Mesh;
        targetMesh: Mesh;
    };
    helperParams: {
        visible: boolean;
        color: string;
        opacity: number;
        wireframe: boolean;
    };
    showAgent: boolean;
    agentParams: AgentParams;

    ui: any;
    agent: NavmeshAgent;

    _navQuery: NavMeshQuery = null;

    navmesh: NavMesh;
    intermediates: SoloNavMeshGeneratorIntermediates;
    drawer: DebugDrawer;

    constructor(public _component: NavmeshComponent) {
        //
        super();

        this.visible = false;

        this.raycaster = new Raycaster();

        this.helpers = {
            crowd: null,
            targetMesh: null,
        };

        this.helperParams = {
            visible: true,
            color: "#00ff00",
            opacity: 0.5,
            wireframe: false,
        };

        this.showAgent = false;

        this.agentParams = {
            radius: 0.6,
            height: 2.0,
            maxAcceleration: 20.0,
            maxSpeed: 8.0,
        };

        const ranges = {
            radius: [0.1, 1],
            height: [0.1, 2],
            maxAcceleration: [0, 100],
            maxSpeed: [0, 20],
        };

        const agentUI = {};

        for (let key in this.agentParams) {
            agentUI[key] = {
                type: "number",
                label: key,
                value: [this, "agentParams", key],
                min: ranges[key][0],
                max: ranges[key][1],
                step: 0.1,
                onChange: (val, progress) => {
                    if (this.agent == null || progress) return;
                    this.updateAgentParams();
                },
            };
        }

        this.ui = {
            visible: () => this.navmesh != null && this.enabled,
            collapsed: true,
            type: "folder",
            label: "Debug",
            children: {
                show: {
                    type: "checkbox",
                    label: "Show",
                    value: [this, "visible"],
                },
                agent: {
                    visible: () => this.helpers.crowd != null,
                    collapsed: true,
                    type: "folder",
                    label: "Test Agent",
                    children: {
                        showAgent: {
                            type: "checkbox",
                            label: "Test Agent",
                            value: [this, "showAgent"],
                            onChange: this.updateAgent,
                        },
                        agentUI: {
                            type: "group",
                            visible: () => this.showAgent,
                            children: agentUI,
                        },
                    },
                },
                navmesh: {
                    type: "checkbox",
                    visible: () => this.intermediates == null,
                    label: "Show Navmesh",
                    value: [this, "intermediate"],
                    format: {
                        format: (v) => v === DebugDrawTypes.NAVMESH,
                        parse: (v) => (v ? DebugDrawTypes.NAVMESH : null),
                    },
                },
                intermediates: {
                    type: "select",
                    visible: () => this.intermediates != null,
                    label: "Intermediates",
                    nullable: true,
                    value: [this, "intermediate"],
                    options: Object.keys(DebugDrawTypes),
                },

                showScene: {
                    type: "checkbox",
                    label: "Show Scene",
                    value: [this, "sceneVisible"],
                },
                prune: {
                    type: "button",
                    noLabel: true,
                    label: "Flood fill",
                    onAction: async () => {
                        //
                        this._component._prune(new Vector3(0, 0, 0));
                    },
                },
                export: {
                    type: "group",

                    visible: debugNavmesh,
                    children: {
                        exportGlb: {
                            type: "button",
                            noLabel: true,
                            label: "Export Scene GLB",
                            onAction: async () => {
                                //
                                this.exportColliders("glb");
                            },
                        },
                        exportObj: {
                            type: "button",
                            noLabel: true,
                            label: "Export Scene OBJ",
                            onAction: async () => {
                                //
                                this.exportColliders("obj");
                            },
                        },
                    },
                },
            },
        };

        this._component.subscribe((navMesh) => {
            //
            this._disposeDebug();

            this._createDebug(navMesh);
        });
    }

    get crowd() {
        return this._component.crowd;
    }

    get scene() {
        return this._component.container;
    }

    _createDebug(navmesh: NavMesh) {
        //
        this.navmesh = navmesh;
        this.intermediates = this._component._intermediates;

        if (this.navmesh == null) return;

        if (this.enabled) {
            this.createHelpers();
        }
    }

    _disposeDebug() {
        //
        this.navmesh = null;
        this.intermediates = null;

        this.diposeHelpers();
    }

    get intermediate() {
        return this._curIntermediate;
    }

    set intermediate(type) {
        //
        const debugDrawer = this.drawer;
        const navMesh = this.navmesh;
        const intermediates = this.intermediates;

        this._curIntermediate = type;

        debugDrawer.clear();

        if (
            type === DebugDrawTypes.HEIGHTFIELD_SOLID &&
            intermediates?.heightfield
        ) {
            //
            debugDrawer.drawHeightfieldSolid(intermediates.heightfield);
            //
        } else if (
            type === DebugDrawTypes.HEIGHTFIELD_WALKABLE &&
            intermediates?.heightfield
        ) {
            //
            debugDrawer.drawHeightfieldWalkable(intermediates.heightfield);
            //
        } else if (
            type === DebugDrawTypes.COMPACT_HEIGHTFIELD_SOLID &&
            intermediates?.compactHeightfield
        ) {
            //
            debugDrawer.drawCompactHeightfieldSolid(
                intermediates.compactHeightfield
            );
            //
        } else if (
            type === DebugDrawTypes.COMPACT_HEIGHTFIELD_REGIONS &&
            intermediates?.compactHeightfield
        ) {
            //
            debugDrawer.drawCompactHeightfieldRegions(
                intermediates.compactHeightfield
            );
            //
        } else if (
            type === DebugDrawTypes.COMPACT_HEIGHTFIELD_DISTANCE &&
            intermediates?.compactHeightfield
        ) {
            //
            debugDrawer.drawCompactHeightfieldDistance(
                intermediates.compactHeightfield
            );
            //
        } else if (
            type === DebugDrawTypes.RAW_CONTOURS &&
            intermediates?.contourSet
        ) {
            //
            debugDrawer.drawRawContours(intermediates.contourSet, 0.3);
            //
        } else if (
            type === DebugDrawTypes.CONTOURS &&
            intermediates?.contourSet
        ) {
            //
            debugDrawer.drawContours(intermediates.contourSet, 0.3);
            //
        } else if (
            type === DebugDrawTypes.POLY_MESH &&
            intermediates?.polyMesh
        ) {
            //
            debugDrawer.drawPolyMesh(intermediates.polyMesh);
            //
        } else if (
            type === DebugDrawTypes.POLY_MESH_DETAIL &&
            intermediates?.polyMeshDetail
        ) {
            //
            debugDrawer.drawPolyMeshDetail(intermediates.polyMeshDetail);
            //
        } else if (type === DebugDrawTypes.NAVMESH && navMesh) {
            //
            debugDrawer.drawNavMesh(navMesh);
            //
        } else if (type === DebugDrawTypes.NAVMESH && navMesh) {
            //
            debugDrawer.drawNavMesh(navMesh);
            //
        } else if (type === DebugDrawTypes.NAVMESH_BV_TREE && navMesh) {
            //
            debugDrawer.drawNavMeshBVTree(navMesh);
        }

        this._fixDrawerLineMat(debugDrawer);
    }

    get collisions() {
        return this._component.collisions;
    }

    private _fixDrawerLineMat(debugDrawer: DebugDrawer) {
        debugDrawer.children.forEach((c) => {
            if (!(c instanceof Mesh)) return;

            if (c.type === "LineSegments2") {
                let origmat = c.material;
                const newmat = new LineMaterial2();
                newmat.linewidth = origmat.linewidth;
                (newmat as any).color = origmat.color;
                c.material = newmat;
            }
        });
    }

    _hasEvents = false;
    addEvents() {
        if (this._hasEvents) {
            return;
        }
        this._hasEvents = true;
        emitter.on(EngineEvents.CLICK, this.onClick);
    }

    removeEvents() {
        if (!this._hasEvents) {
            return;
        }
        this._hasEvents = false;
        emitter.off(EngineEvents.CLICK, this.onClick);
    }

    _enabled = false;

    get enabled() {
        return this._enabled;
    }

    set enabled(val) {
        //
        if (this._enabled === val) return;

        this._enabled = val;

        // this.visible = val;

        if (val) {
            this.createHelpers();
        } else {
            this.diposeHelpers();
        }
    }

    _sceneVisible = true;

    get sceneVisible() {
        return this._sceneVisible;
    }

    set sceneVisible(val) {
        if (this._sceneVisible === val) return;

        this._sceneVisible = val;

        this.scene.forEach((c) => {
            c.visible = val;
        });
    }

    createHelpers() {
        //
        if (this.navmesh == null) return;

        this.helpers.crowd = new Mesh(
            new CylinderGeometry(1, 1, 1),
            new MeshLambertMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.5,
            })
        );

        this.helpers.crowd.geometry.translate(0, 0.5, 0);

        this.helpers.crowd.position.copy(this.startPoint);
        this.add(this.helpers.crowd);
        this.updateAgentParams();
        this.updateAgent();

        this.drawer = new DebugDrawer();
        this.add(this.drawer);
        this.intermediate = DebugDrawTypes.NAVMESH;

        this.addEvents();
    }

    updateAgent = () => {
        const showAgent = this.showAgent && this.enabled;

        this.helpers.crowd.visible = showAgent;

        if (showAgent == (this.agent != null)) return;

        if (showAgent) {
            this.agent = this.crowd.addAgent(this.helpers.crowd, {
                ...this.agentParams,
            });
            (this.agent as any).showDebugPath = true;

            this.helpers.targetMesh = createPointMesh(this.endPoint, "sphere");

            this.add(this.helpers.targetMesh);
        } else {
            this.disposeAgent();
        }
    };

    updateAgentParams() {
        //
        const params = this.agentParams;

        this.agent?.updateParameters(params);

        this.helpers.crowd.scale.set(
            params.radius,
            params.height,
            params.radius
        );
    }

    disposeAgent() {
        if (this.agent == null) return;

        this.crowd?.removeAgent(this.agent);

        this.agent = null;

        this.remove(this.helpers.targetMesh);
        disposeObject3D(this.helpers.targetMesh);

        this.helpers.targetMesh = null;
    }

    diposeHelpers() {
        // this.removeEvents();
        this.disposeAgent();

        if (this.drawer) {
            this.drawer.clear();
            this.remove(this.drawer);
        }

        this._markpolyDrawer?.clear();

        this.remove(this.helpers.crowd);
        disposeObject3D(this.helpers.crowd);
        this.helpers.crowd = null;
    }

    startPoint = new Vector3();
    endPoint = new Vector3();
    mousevec = new Vector2();

    onClick = (e) => {
        //
        if (
            !this.visible ||
            e.raw.button !== 0 ||
            (!e.raw.ctrlKey && !e.raw.metaKey)
        )
            return;
        if (this.agent == null) return;

        this.mousevec.x = e.normalized.x;
        this.mousevec.y = -e.normalized.y;
        this.raycaster.setFromCamera(this.mousevec, Camera.current);

        const intersects = this.raycaster.intersectObjects(this.collisions);

        console.log("NavmeshDebug: onClick", intersects);

        if (intersects.length === 0) return;

        const item = intersects[0];

        if (e.raw.shiftKey && e.raw.ctrlKey) {
            this._markConnectedPolys(item.point);
        } else if (e.raw.metaKey) {
            if (e.raw.shiftKey) {
                this.startPoint.copy(item.point);
                this.endPoint.copy(item.point);
                this.agent.teleport(this.endPoint);
            } else {
                this.endPoint.copy(item.point);
                this.agent.moveTo(this.endPoint);
            }

            this.helpers.targetMesh.position.copy(this.endPoint);
        }
    };

    _markpolyDrawer: DebugDrawer;
    _adjPolysDrawer: DebugDrawer;

    _wall: Mesh;

    _markConnectedPolys(point: Vector3) {
        //
        const res = this.crowd._recastCrowd.navMeshQuery.findNearestPoly(point);

        if (!res.success) {
            console.error("failed to find nearest poly");
            return;
        }

        this._markPoly(res.nearestRef, 1 << 5);

        const { tile, poly } = this.navmesh.getTileAndPolyByRefUnsafe(
            res.nearestRef
        );

        for (
            let i = poly.firstLink();
            // https://github.com/emscripten-core/emscripten/issues/22134
            i !== Detour.DT_NULL_LINK;
            i = tile.links(i).next()
        ) {
            const neiRef = tile.links(i).ref();

            // skip invalid and already visited
            if (!neiRef) continue;

            this._markPoly(neiRef, 1 << 6);
        }

        if (this._markpolyDrawer == null) {
            this._markpolyDrawer = new DebugDrawer();
            this.add(this._markpolyDrawer);
        }

        if (this._adjPolysDrawer == null) {
            this._adjPolysDrawer = new DebugDrawer();
            this.add(this._adjPolysDrawer);
        }

        if (this._wall == null) {
            this._wall = new Mesh(
                new CylinderGeometry(0.1, 0.1, 1),
                new MeshBasicMaterial({
                    color: 0x0000ff,
                    transparent: true,
                    opacity: 0.3,
                })
            );
            this._wall.geometry.translate(0, 0.5, 0);
            this.add(this._wall);
        }

        this._wall.position.copy(res.nearestPoint as any);
        const step = tile.header().walkableClimb();
        console.log("tile walkable climb", step);
        this._wall.scale.y = step;

        this._markpolyDrawer.clear();
        this._adjPolysDrawer.clear();

        this._markpolyDrawer.drawNavMeshPolysWithFlags(
            this.navmesh,
            1 << 5,
            0xff0000
        );

        this._adjPolysDrawer.drawNavMeshPolysWithFlags(
            this.navmesh,
            1 << 6,
            0x00ff00
        );
    }

    _markPoly(ref: number, flag: number) {
        const rf = this.navmesh.getPolyFlags(ref);

        if (rf.flags & flag) {
            this.navmesh.setPolyFlags(ref, rf.flags & ~flag);
        } else {
            this.navmesh.setPolyFlags(ref, rf.flags | flag);
        }
    }

    dispose() {
        //
        this._sceneVisible = true;
        this.diposeHelpers();
    }

    async exportColliders(format: "glb" | "obj") {
        //
        const cols = this.collisions;

        const group = new Group();

        let meshes = cols.map((it) => {
            return it.parent ?? it;
        });

        let parentMap = new WeakMap();

        meshes.forEach((it) => {
            parentMap.set(it, it.parent);
        });

        group.add(...meshes);

        if (format === "obj") {
            await this._exportObj(group);
        } else {
            await this._exportGLTF(group);
        }

        group.remove(...meshes);

        meshes.forEach((it) => {
            parentMap.get(it)?.add(it);
        });
    }

    async _exportObj(group) {
        //
        const result = objectExporter.parse(group);

        const a = document.createElement("a");

        a.download = "scene.obj";

        a.href = URL.createObjectURL(
            new Blob([result], { type: "application/octet-stream" })
        );

        a.click();

        return result;
    }

    _exportGLTF(group) {
        //
        return new Promise((resolve, reject) => {
            //
            gltfExporter.parse(
                group,
                (result) => {
                    let blob;

                    if (result instanceof ArrayBuffer) {
                        blob = new Blob([result], {
                            type: "application/octet-stream",
                        });
                    } else {
                        blob = new Blob([JSON.stringify(result)], {
                            type: "application/json",
                        });
                    }

                    const a = document.createElement("a");

                    a.download = "scene.glb";

                    a.href = URL.createObjectURL(blob);

                    a.click();

                    resolve(null);
                },
                (err) => {
                    console.error(err);

                    reject(err);
                },
                { binary: true }
            );
        });
    }
}
