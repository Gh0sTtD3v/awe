import { MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from "three";

import Wrapper from './wrapper';

import MeshFontFactory from '../font'
import PipeLineMesh from "../pipeline/pipeline-mesh";




var DEFAULT_OPTS ={

    position : {

        x:0,
        y:0,
        z:0
    },

    align: 'center',

    width: 800,

    color: 0xffffff,

    backgroundOpacity: 0.5,
    
    backgroundColor: 0x0052ff,

    text: 'hello world',
}

export class DialogFactory {
    
    constructor() {
        this.isInit = false;

        this._init = false;

        this._instances = [];

    }

    async preload() {
       
    }

    async get(parent, data = {}) {

        var opts = Object.assign({}, DEFAULT_OPTS, data);
        // 

        var textBlock =  await MeshFontFactory.get({

            instanced: true,

            instancedBillBoard: data.billboard,
            
            text: data.text,

            align: data.align,

            textColor: opts.color,

            width : opts.width,

            opacity: 1,

            position: {
                x: 0,
                y: 5, 
                z: 0
            },

            scale: {

                x: 1,
                y: 1,
                z: 1
            },

            parent: data.parent
        })

        opts.textBlock = textBlock
  
        const wrapper = new Wrapper(opts);
        
        parent.add( wrapper )

        return wrapper

    }

    disposeAll() {
       
    }
}

