
import GeometryInstancer from "../../../pipeline/instanced-geometry";

import {
    Vector3,
    Object3D,
    Sphere,
    AnimationMixer,
    LoopOnce,
    Texture

} from "three";

import { MAX_INSTANCES, CAMERA_LAYERS, FBO_DEBUG } from "../../../constants";

import FBOHelper from "../../../utils/globals/fbo-helper";

const tempv3 = new Vector3();

const levels = [2, 10, 50, 200, MAX_INSTANCES + 3];

import Builder from '../builder/abstract';

import VRMAnimations from "../animations";

import Pipeline from '../../../pipeline'

import VRMBuilder from "../builder/index"

class VRMMesh {

    // setup same gltfmanager as the vrmfactory

    setGLTFManager( gltfManager){

        this.gltfManager = gltfManager
    }
    

    setVRMFactory( vrmfactory ){

        this.vrmfactory = vrmfactory
    }

    async get(sourceGLTF, url, opts = {}) {

        const gltf = await VRMBuilder.build(sourceGLTF, url)

        const vrmName = gltf.userData.name;

        var currentVRM;

        try {
            currentVRM = gltf.userData.vrm;
        } catch (e) {
            debugger;
        }

        let plugins = opts?.plugins ?? [];

        let renderMode = opts?.renderMode ?? 'default'

        let meshes = new Object3D();

        meshes.name = vrmName + opts.pluginString;

        let nb = 0;

        let pfpOptions = null;

        let globalMeta = gltf.userData.vrm.globalMeta;

        const boundingSphere = this.computeBoundingSphere(currentVRM.scene);

        if( FBO_DEBUG ) {

            FBOHelper.attach(globalMeta.texture, 'global meta'+Math.random())
        }

        // console.log( currentVRM.scene )
        currentVRM.scene.traverse((child) => {

            if (child.type == "SkinnedMesh") {

                let dummy = child;

                const _scale = dummy.scale.clone();

                dummy.getWorldScale(_scale);

                dummy.getWorldPosition(tempv3);

                var mesh;
                
                // to do crawl first in case pfp is the first mesh to copy attributes
                
                if (child.name.toLowerCase().includes("_pfp") || child.material.name.toLowerCase().includes("_pfp")) {

                    mesh = {
                        geometry: dummy.geometry,
                        materialOptions: {
                            atlas: true,
                            base: dummy,
                            animationTexture: globalMeta.texture,
                            metadata: globalMeta.metadata,
                            scale: _scale,
                            additionalMetas: globalMeta.additionalMeta,
                            plugins : plugins,
                            isVRM: true,
                            renderMode: renderMode,
                            isPFP: true,
                            instance: true
                        },

                        vrmName: vrmName,

                        boundingSphere: boundingSphere,
                    };


                    pfpOptions = mesh;

                } else {

                    const options = {
                        boundingSphere: boundingSphere,
                        base: dummy,
                        animationTexture: globalMeta.texture,
                        metadata: globalMeta.metadata,
                        scale: _scale,
                        additionalMetas: globalMeta.additionalMeta,
                        plugins : plugins,
                        instance: true,
                        isVRM: true,
                        renderMode: renderMode
                    }
                    
                    // dummy.material.depthTest  = true 

                    mesh = Pipeline.get(
                        dummy, 
                        new GeometryInstancer(
                            dummy.geometry, 
                            {
                                transparencySorting: true,
                                boundingSphere: boundingSphere,
                                vrmName: vrmName,
                                vrmScale: true,
                                rotationY: true,
                                useSkin: true,
                                animations: true,
                                max: levels[0],
                                sorting: false,
                                useNormal: true,                            
                                opacity: true,
                                copyBuffer:
                                    nb > 0 ? meshes.children[0].geometry : null,
                                scale: true,
                            }
                        ),
                        dummy.material,
                        options
                    )

                    mesh.position.copy(tempv3);

                    meshes.add(mesh);
                  
                }

                if( mesh == null ) {

                    debugger;
                }

                mesh.name = child.name;


                mesh.gltf = gltf;

                mesh.bakeMeta = globalMeta;

                nb++;
            }
        });

        if (pfpOptions != null) {
            meshes.pfpOptions = pfpOptions;
        }

        // storing the animation channel for each mesh into metaIds
        // each mesh got a separate animation channel depending on animation size and bone length

        let i = 0

        const metaIds = [];

        while (i < meshes.children.length) {
                
            metaIds.push(meshes.children[i].bakeMeta.ids);

            i++;
        }

        meshes.metaIds = metaIds

        // Tracks which global animation set version this baked mesh was built with.
        meshes.animationsVersion = VRMAnimations.version;

        return meshes;
    }

    getVRMAtlasMesh(opts, texture, textureID) {


        const geo = new GeometryInstancer(opts.geometry, {
            boundingSphere: opts.boundingSphere,
            transparencySorting: true,
            vrmScale: true,
            useNormal: true,
            animations: true,
            scale: true,
            textureID: textureID,
            atlas: true,
            useSkin: true,
            vrmName: opts.vrmName,
            rotationY: true,
            max: 16,
            sorting: false,
            opacity: true,
           
        });

        var material = opts.materialOptions.base.material 

        if( material.map == null ){
            material = material.clone();
            material.map = texture;
        }

        const mesh = Pipeline.get(opts.materialOptions.base, geo, material, opts.materialOptions);

        mesh.isPFP = true;

        mesh.name = opts.vrmName;

        mesh.matrixWorldAutoUpdate = false;

        return mesh;
    }

    getHigh(gltf, opts = {}) {

        if (gltf == null) {
            debugger
        }

        const currentVRM = gltf.userData.vrm;

        if (currentVRM == null) {
            debugger
        }

        // debugger
        this.replaceMeshes(currentVRM.scene, opts);

        currentVRM.scene.isHighQuality = true;

        currentVRM.scene.name = gltf.userData.VRM;

        currentVRM.scene.vrm = currentVRM;

        const boundingSphere = this.computeBoundingSphere(currentVRM.scene);

        currentVRM.scene.boundingSphere = boundingSphere;

        const currentMixer = new AnimationMixer(currentVRM.scene);

        currentVRM.scene.mixer = currentMixer;

        this.setupPossibleActions(currentVRM, currentMixer);

        return gltf;
    }

    setupPossibleActions(currentVRM, currentMixer ) {
        
        // re-compute

        if(  currentVRM.scene.possibleClips != null ) {

            currentMixer.stopAllAction()

            let i = 0
            
            while(i < currentVRM.scene.possibleClips.length) {

                currentMixer.uncacheClip(currentVRM.scene.possibleClips[i])

                i++
            }

            for (var key in  currentVRM.scene.possibleActions){
                
                var action = currentVRM.scene.possibleActions[key]

                action.stop()

                action.reset()

                currentMixer.uncacheAction(action)
            }
    
            currentVRM.update(0)
        }

        const baker = new Builder();

        baker.setAnimationJson(VRMAnimations.animations);

        const possibleClips = baker.prepareAnimations(currentVRM);

        currentVRM.scene.possibleClips = possibleClips;

        let possibleActions = {};

        let c = 0;

        while (c < possibleClips.length) {
            possibleActions[possibleClips[c].name] = currentMixer.clipAction(
                possibleClips[c],
            );

            if (possibleClips[c].loop == false) {
                possibleActions[possibleClips[c].name].setLoop(LoopOnce);

                possibleActions[possibleClips[c].name].clampWhenFinished = true;
            }

            c++;
        }

        currentVRM.scene.possibleActions = possibleActions;
        currentVRM.scene.animationsVersion = VRMAnimations.version;
    }

    async setupGPUPossibleActions( sourceGLTF, data ) {

        const originalURL = sourceGLTF.originalURL;

        const name = sourceGLTF.name;

        const gltf = await this.gltfManager.load({ url: originalURL, name: name })

        const newMeshes = await this.get(gltf, originalURL, data);

        // remove from source (array is live, always pop from the end)
        while (sourceGLTF.children.length > 0) {
            sourceGLTF.remove(sourceGLTF.children[sourceGLTF.children.length - 1]);
        }

        // add from new and replace meshes (re-parenting mutates newMeshes.children)
        while (newMeshes.children.length > 0) {
            sourceGLTF.add(newMeshes.children[0]);
        }

        // update metaIDS

        sourceGLTF.metaIds = newMeshes.metaIds
        sourceGLTF.animationsVersion = VRMAnimations.version;
    }

    replaceMeshes( scene,opts ) {

        let plugins = opts.plugins ?? [];

        let renderMode = opts.renderMode ?? 'default'

        const transformed = [];

        var skeletonCache = {};
        
        var meshes = []
        scene.traverse((object) => {
            if( object.isMesh ) {
                meshes.push(object)
            }
        })


        let g = 0

        while( g < meshes.length ){

            var object = meshes[g]
            
            if (object.isMesh) {
                
                // Check if the current mesh has skinning data

                if (object.skeleton !== undefined) {

                    var newMesh = Pipeline.get(
                        object,
                        object.geometry.clone(),
                        object.material, 
                        { 
                            skinning: true,
                            isVRM: true,
                            renderMode: renderMode,
                            plugins: plugins,
                            instance: false,
                            pipelineOptions: {
                                visibleOnOcclusion: true,
                                visibleOnMirror: true
                            }
                        }
                    )

                    var skeleton;


                    if( skeletonCache[object.skeleton.uuid] != null ) {

                        skeleton = skeletonCache[object.skeleton.uuid];
                    }
                    else{

                        skeleton = object.skeleton.clone();
                        skeletonCache[object.skeleton.uuid] = skeleton;
                    }
                    
                    newMesh.skeleton = skeleton

                    newMesh.bindMatrix.copy( object.bindMatrix )
                    
                    newMesh.bindMatrixInverse.copy(
                        object.bindMatrixInverse,
                    );

                } else {

                    // If the mesh doesn't have skinning data, create a new Mesh object

                    var newMesh = Pipeline.get(
                        object,
                        object.geometry.clone(),
                        object.material, 
                        { 
                            skinning: false,
                            isVRM: true,
                            renderMode: renderMode,
                            plugins: plugins,
                            instance: false,
                            pipelineOptions: {
                                visibleOnOcclusion: true,
                                visibleOnMirror: true
                            }
                        }
                    )
                }

                newMesh.position.copy(object.position)

                newMesh.rotation.copy(object.rotation)

                newMesh.scale.copy(object.scale)

                newMesh.name = object.name;

                newMesh.receiveShadow = true;

                newMesh.castShadow = true;


                newMesh.layers.disableAll()

                newMesh.layers.enable( CAMERA_LAYERS.DYNAMIC )

                transformed.push({
                    new: newMesh,
                    old: object,
                });



                while(object.children.length > 0) {
                        
                    newMesh.add(object.children[0]);
                }

                object.parent.add(newMesh);

                object.parent.remove(object);

            }
            
            g++
        }
    }

    computeBoundingSphere(object) {
        const sphere = new Sphere();

        object.traverse((child) => {
            if (child.geometry) {
                child.geometry.computeBoundingSphere();

                sphere.union(child.geometry.boundingSphere);
            }
        });

        return sphere;
    }
}

export default new VRMMesh();
