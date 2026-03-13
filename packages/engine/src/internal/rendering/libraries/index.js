
import DissolvePlugin           from './visuals/dissolve'
import RainbowPlugin            from './visuals/rainbow'
import RotateAndDissolvePlugin  from './visuals/rotateanddissolve'
import InstanceOpacityPlugin    from './visuals/instanceopacity'
import ShrinkPlugin             from './visuals/shrink'
import DamagePlugin             from './visuals/damage'
import GrassPlugin              from './visuals/grass'

import BalancerPhysics          from './physics/balancer'

import ScreenMaterial           from './materials/screen'

import BladeFactory             from './generative/blades'  
import QuadFactory              from './generative/quads'  

import OctreeSorter             from './sorters/octree/'

export const Plugins = {

    VISUALS :{
        DissolvePlugin,
        RainbowPlugin,
        RotateAndDissolvePlugin,
        ShrinkPlugin,
        DamagePlugin,
        GrassPlugin,
        InstanceOpacityPlugin
    },

    PHYSICS : {
        BalancerPhysics
    },

    MATERIALS: {

        ScreenMaterial
    },

    GENERATIVE : {

        BladeFactory,
        QuadFactory
    },

    SORTERS : {

        OctreeSorter
    }
};

export const getPluginFromName =( name )=>{

    let plugin = null

    for( let key in Plugins ){

        if( Plugins[key][name] != null ){

            plugin = Plugins[key][name]
        }
    }

    return plugin
}