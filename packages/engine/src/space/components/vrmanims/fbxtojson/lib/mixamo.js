// @ts-check

import * as THREE from 'three'

import mixamoVRMRigMap from './rigmap'

import MixamoRigJSON from './mixamorig.json' assert {type: 'json'}

import { boneStruct } from './bone-struct'


const objLoader = new THREE.ObjectLoader()

const MIXAMO_SKELETON = objLoader.parse( MixamoRigJSON )

function normalizeMixamoRigName( name ) {

	const match = /^mixamorig\d+([A-Z].*)$/.exec( name );

	if ( match ) {

		return `mixamorig${ match[ 1 ] }`;

	}

	return name;
}


function bakeProcess( clip ) {

	const tracks = []; // KeyframeTracks compatible with VRM will be added here

	const restRotationInverse = new THREE.Quaternion();
	const parentRestWorldRotation = new THREE.Quaternion();
	const _quatA = new THREE.Quaternion();

	clip.tracks.forEach( ( track ) => {

		// Convert each tracks for VRM use, and push to `tracks`
		const trackSplitted = track.name.split( '.' );
		const propertyName = trackSplitted[ 1 ];
		const mixamoRigName = normalizeMixamoRigName( trackSplitted[ 0 ] );
		const vrmBoneName = mixamoVRMRigMap[ mixamoRigName ];
		// const vrmNodeName = vrm.userData.vrm.humanoid?.getNormalizedBoneNode( vrmBoneName )?.name;
		const vrmNodeName = boneStruct[ vrmBoneName ]
		const mixamoRigNode = MIXAMO_SKELETON.getObjectByName( mixamoRigName );

		if ( vrmNodeName != null && mixamoRigNode != null && mixamoRigNode.parent != null && propertyName != null ) {

			// console.log("vrm node name", vrmNodeName)

			// Store rotations of rest-pose.
			mixamoRigNode.getWorldQuaternion( restRotationInverse ).invert();
			mixamoRigNode.parent.getWorldQuaternion( parentRestWorldRotation );


			if ( track instanceof THREE.QuaternionKeyframeTrack ) {

				// Retarget rotation of mixamoRig to NormalizedBone.
				for ( let i = 0; i < track.values.length; i += 4 ) {

					const flatQuaternion = track.values.slice( i, i + 4 );

					_quatA.fromArray( flatQuaternion );

					// 親のレスト時ワールド回転 * トラックの回転 * レスト時ワールド回転の逆
					_quatA
						.premultiply( parentRestWorldRotation )
						.multiply( restRotationInverse );

					_quatA.toArray( flatQuaternion );

					flatQuaternion.forEach( ( v, index ) => {

						track.values[ index + i ] = v;

					} );

				}

				tracks.push(
					new THREE.QuaternionKeyframeTrack(
						`${ mixamoRigName }.${ propertyName }`,
						track.times,
						track.values,
					),
				);

			} else if ( track instanceof THREE.VectorKeyframeTrack ) {

				tracks.push( new THREE.VectorKeyframeTrack( `${ mixamoRigName }.${ propertyName }`, track.times, track.values ) );

			}
		}

	} );

	// @ts-ignore
	return new THREE.AnimationClip( 'vrmAnimation', clip.duration, tracks ).toJSON();
}




// async function getVRM(){

// 	const loader = new GLTFLoader()

// 	loader.register( ( parser ) => {

// 		return new VRM.VRMLoaderPlugin( parser, { helperRoot: false, autoUpdateHumanBones: true } );

// 	} )

// 	return new Promise((resolve )=>{

// 		const file = loader.parse( fs.readFileSync('./lib/sunshine.glb').buffer , '', ( res )=>{

// 			resolve( res )
// 		})
// 	})
// }

function optimiseJSON( anim ){

	let g = 0;

    while (g < anim.tracks.length) {

        const val = anim.tracks[g].values;

        // console.log( val )

        let h = 0;

        while (h < val.length) {
            val[h] = parseFloat(val[h].toFixed(3));

            h++;
        }

        const times = anim.tracks[g].times;

        h = 0;

        while (h < times.length) {
            times[h] = parseFloat(times[h].toFixed(2));

            h++
        }

        g++
    }
}


export function loadMixamoAnimation(  fbxAsset ) {

	// const loader = new FBXLoader(); // A loader which loads FBX

	// const clip = asset.animations[0]

	const copyclip = THREE.AnimationClip.parse( JSON.parse(JSON.stringify(fbxAsset.animations[0])) )

	// console.log( copyclip )

	// const vrm = await getVRM()

	const bake = bakeProcess( copyclip )

	optimiseJSON( bake )

	return bake
}
