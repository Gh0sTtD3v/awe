import {

	Scene,

	WebGLRenderer,

	Mesh,

	PerspectiveCamera,

	CatmullRomCurve3,

	Vector3,

	PlaneGeometry,

	Texture,

	PointLight,

	RepeatWrapping,

	LinearFilter,

	Clock,

	Vector2,

	SRGBColorSpace

} from 'three/src/Three.js'

import { Assets } from "../../../../assets";

import Material from './material'

import Smoothstep from "../../../../../utils/math/smoothstep";

var points = [];

var length = 30

var dist = 5
// Define points along Z axis to create a curve
for (var i = 0; i < length; i += 1) {
  points.push(new Vector3(0, 0, dist * i ));
}
// Set custom Y position for the last point
// points[4].y = -0.06;

// Create a curve based on the points
let path = new CatmullRomCurve3(points);

var cameraRatioPosition = 0.5

var speed = 0.4

import CreateTween from '../tween'

import OfflineGrad from './offline-grad'

export default class OffscreenStars {
	constructor( workerScope, data, callbackInit ){

		this.workerScope = workerScope
	

		this.clock = new Clock()

		this.isPlaying = false

		this.renderer = new WebGLRenderer({
		    canvas: data.canvas,
		    antialias: false,
		    alpha: true,
		    powerPreference: "high-performance"
		})
		this.renderer.outputColorSpace = SRGBColorSpace;

		this.renderer.setClearColor(0x000000, 0)

		this.offlineGrad = new OfflineGrad(this.renderer)
		this.scene  = new Scene()

		this.camera = new PerspectiveCamera(90, 1, 0.01, 1000)

		this.camera.up.set(-1,-1,0)

		this.camera.position.z = 40

		this.transitionValue = 0
		var geometry = new PlaneGeometry( 100, 100, 200, 200 );
		// const map = Textures['galaxy']

		// Create an ImageBitmap from the Blob using createImageBitmap

		const normalMap = new Texture()

		normalMap.wrapS = RepeatWrapping;
		normalMap.wrapT = RepeatWrapping;
		normalMap.generateMipmaps = false
		normalMap.minFilter = LinearFilter
		normalMap.magFilter = LinearFilter
		normalMap.repeat.set(4, 4);
		

		fetch(Assets.textures.tunnelStars)
			.then(response => response.blob())
			.then(blob => createImageBitmap(blob))
			.then(function(bitmap) {
				normalMap.needsUpdate = true;
				normalMap.image = bitmap;
				callbackInit();
			});

		var material = new Material({

			normalMap: normalMap,

			gradMap : this.offlineGrad,

			length: length * dist,

			radius: 4,

			ratioPosition : cameraRatioPosition,

			speed: speed

		})
		this.percent = 0
		this.percent2 = 0.9
		this.percent3 = 0.75
		
		this.mouse = new Vector2(0, 0)
		

		// Create a mesh based on tubeGeometry and tubeMaterial
		var tube = new Mesh(geometry, material);

		tube.frustumCulled = false

		// Add the tube into the scene
		this.scene.add(tube);

		this.tube = tube

		this.currentState = null
        this.pointLight = new PointLight( 0xffffff, Math.PI, 60 )
        this.pointLight2 = new PointLight( 0x34C1FF, Math.PI, 60 )
        // this.pointLight3 = new PointLight( 0x02EEF2, Math.PI, 60 )
        // this.almb = new AmbientLight(0xffffff, 0.0)

        this.scene.add(  this.pointLight )
        this.scene.add(  this.pointLight2 )

        this.renderOnTop = false
	}

	play(){

		this.isPlaying = true

        this.animate()

	}

	animate =()=> {
	
		const delta = this.clock.getDelta()

		const total = this.clock.getElapsedTime() 

		this.tube.material.uniforms.desactivated.value = Math.max( this.transitionValue, 0.001 ) 
		this.mouse.x = Math.sin(total * speed) * this.transitionValue * 0.5
		this.mouse.y = Math.cos(total * speed) * this.transitionValue * 0.5

		this.tube.material.update( this.mouse )

		this.pointLight.intensity = (Smoothstep(-1, 1, Math.sin(total * speed) ) * 0.5 + 0.5) * Math.PI 

		const lightSpeed = 0.05

		this.percent  += delta * 1.0 * lightSpeed;
		this.percent2 += delta * 2.0 * lightSpeed;
		this.percent3 += delta * 2.0 * lightSpeed;

		var p1 = path.getPointAt(0);
		var p2 = path.getPointAt((cameraRatioPosition + 0.2 )%1);

		var p4 = path.getPointAt(0.1);
		const pLightBlue = this.percent2%1

		this.pointLight2.intensity = this.smoothstep(0.0, 0.04, pLightBlue) * 2 * Math.PI
		var p3 =  path.getPointAt(pLightBlue);
		var p5 =  path.getPointAt(this.percent3%1);

		p2.z *= -1
		this.camera.position.copy(p1);

		this.camera.lookAt(p2);

		this.camera.rotation.z = this.mouse.y;
		this.camera.rotation.y = Math.PI - this.mouse.x * 0.06 ;

		this.camera.position.x = this.mouse.x * 0.015;
		this.camera.position.y = -this.mouse.y * 0.015;

		this.pointLight.position.copy(p4)
		this.pointLight2.position.copy(p3)

		this.tube.material.uniforms.timer.value += delta

		this.renderer.render( this.scene, this.camera );
		if( this.isPlaying ){

			this.workerScope.requestAnimationFrame( this.animate )
		}
	}

	
	activate(){

		return new Promise((resolve, reject)=>{

			this.tween = CreateTween(
			  this.workerScope,
			  this,
			  'transitionValue',
			  {
			    from: this.transitionValue,
			    to: 1,
			    duration: 4.5,
			    tweenFunction: this.easeOut,
			    update: (newValue) => {

			    },
			    onComplete: () => {
			      console.log('Tween completed!');
			    }
			  }
			)

			this.tween.start()

		})
	}

	desactivate( cb ){

		// return

		if( this.tween ) {

			this.tween.stop()

			this.tween = null 
		}

		this.tween = CreateTween(
		  this.workerScope,
		  this,
		  'transitionValue',
		  {
		    from: this.transitionValue,
		    to: 0,
		    duration: 2.7,
		    tweenFunction: this.easeOut,
		    update: (newValue) => {

		    },
		    onComplete: () => {

		    	this.tween.stop()

		    	cb()
		    }
		  }
		)

		this.tween.start()
	}

	calculateTweenValue(time) {

		if( this.easeStartTime == null ) {

			this.easeStartTime = this.clock.getElapsedTime()
		}
	    const currentTime = time; // Current time in seconds
	    const elapsed = Math.min(currentTime - this.easeStartTime, this.easeDuration); // Elapsed time capped at duration

	    if( elapsed < 0 ) {
	    	return 0
	    }

	    const progress = elapsed / this.easeDuration; // Normalize progress from 0 to 1
	    const easedProgress = this.easeFunction(progress); // Apply easing function
	    return easedProgress;
	}

	easeOut(t) {
	    return 1 - Math.pow(1 - t, 1);
	}

	resize( size ){

		this.renderer.setSize( size.w, size.h, false)

		this.renderer.setPixelRatio(size.dpi)

		this.camera.aspect = size.w / size.h

		this.camera.updateProjectionMatrix()
	}

	smoothstep (min, max, value) {
	  var x = Math.max(0, Math.min(1, (value-min)/(max-min)));
	  return x*x*(3 - 2*x);
	}
}
