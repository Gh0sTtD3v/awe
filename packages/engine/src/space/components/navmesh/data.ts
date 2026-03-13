export const defaultParams = {
    /*
        http://recastnav.com/structrcConfig.html#a2483649686584b9d696ac00b968dedaa

        Minimum floor to 'ceiling' height that will still allow the floor area to be considered walkable. 
        [Limit: >= 3] [Units: vx].

        This is used to filter out areas of the mesh that are likely to be under bridges,
        alcoves, and other overhangs that would not be considered navigable by a real person.

        The value is usually set to the maximum agent height.
    */
    walkableHeight: {
        default: 2,
        label: "Agent Height",
        min: 0.1,
        max: 5,
        step: 0.1,
        group: "",
    },

    /*
            http://recastnav.com/structrcConfig.html#a57a961a919d76559d6124d60ddf73864
    
            The distance to erode/shrink the walkable area of the heightfield away from obstructions.
    
            This is useful in removing walkable areas at ledges, to keep agents from walking off edges.
        */
    walkableRadius: {
        default: 0.6,
        label: "Agent Radius",
        min: 0,
        max: 5,
        step: 0.1,
        group: "",
    },

    /*
            http://recastnav.com/structrcConfig.html#a9b6bbabb4857e3f4bf4428af86ee7673
    
            Maximum ledge height that is considered to still be traversable.
    
            This parameter is used to prevent minor deviations in height from improperly showing as obstructions.
        */
    walkableClimb: {
        default: 0.5,
        label: "Max Climb",
        min: 0.1,
        max: 5,
        step: 0.1,
        group: "",
    },

    /*
            http://recastnav.com/structrcConfig.html#a689373b55bb5fab1d3284b716e972fe0
    
            The maximum slope that is considered walkable. [Units: Degrees].
    
        */
    walkableSlopeAngle: {
        default: 45,
        label: "Max Slope Angle",
        min: 0,
        max: 90,
        step: 1,
        group: "",
    },

    /*
        http://recastnav.com/structrcConfig.html#ac011c6166e1c722dd07427a7c301a601

        The width and depth size of tile's on the xz-plane.

        this field is only used when building tile based navmeshes.
    */
    tileSize: {
        default: 32,
        label: "Tile Size",
        min: 0,
        max: 1024,
        step: 1,
        group: "",
    },

    /*
        http://recastnav.com/structrcConfig.html#ae74c4bd2b0477f29a65a53ca9c59196d
        
        The xz-plane cell size to use for fields.

        This value is usually derived from the character radius r. 
        A recommended starting value for cs is either r/2 or r/3
    */
    cs: {
        default: 0.2,
        label: "Cell Size",
        min: 0.1,
        max: 1,
        step: 0.01,
        group: "Voxel precision",
    },

    /*
        http://recastnav.com/structrcConfig.html#acdde0dfdbb39611966ece78ef473d861

        The y-axis cell size to use for fields.
        
        A good starting point for ch is half the cs value
        Smaller ch values ensure that the navmesh properly connects areas that are 
        only separated by a small curb or ditch. 

        If small holes are generated in your navmesh around where there are discontinuities 
        in height (for example, stairs or curbs), you may want to decrease the cell height 
        value to increase the vertical rasterization precision of Recast.
        
    */
    ch: {
        default: 0.2,
        label: "Cell Height",
        min: 0.1,
        max: 1,
        step: 0.01,
        group: "Voxel precision",
    },

    /*
        http://recastnav.com/structrcConfig.html#af91c92dd5bb5ebf51a85b194917062ec

        The minimum number of cells allowed to form isolated island areas.

        Any regions that are smaller than this area will be marked as unwalkable. 
        This is useful in removing useless regions that can sometimes form on geometry such as 
        table tops, box tops, etc.
    */
    minRegionArea: {
        default: 8,
        label: "Min Cells Per Region",
        min: 0,
        max: 150,
        step: 1,
        group: "Region",
    },

    /*
        http://recastnav.com/structrcConfig.html#ac2385e0a316304cd7b1c563cf9f7dd59

        Any regions with a span count smaller than this value will, if possible, be merged with 
        larger regions.
    */
    mergeRegionArea: {
        default: 20,
        label: "Merge Region Below This Size",
        min: 0,
        max: 150,
        step: 1,
        group: "Region",
    },

    /*
        http://recastnav.com/structrcConfig.html#a2149036442bf38b9ec9615549aa48fd4

        The maximum allowed length for contour edges along the border of the mesh.

        In certain cases, long outer edges may decrease the quality of the resulting triangulation, 
        creating very long thin triangles. This can sometimes be remedied by limiting the maximum 
        edge length, causing the problematic long edges to be broken up into smaller segments.

        The parameter maxEdgeLen defines the maximum edge length and is defined in terms of voxels. 
        A good value for maxEdgeLen is something like walkableRadius * 8.
    */
    maxEdgeLen: {
        default: 20,
        label: "Max Edge Length",
        min: 0,
        max: 100,
        step: 1,
        group: "Polygonization",
    },

    /*
        
        http://recastnav.com/structrcConfig.html#a3421826332c0acfbbdfa34ee6c7183d1

        The maximum distance a simplified contour's border edges should deviate the original 
        raw contour.

        Good values for maxSimplificationError are in the range [1.1, 1.5].
        A value of 1.3 is a good starting point and usually yields good results. 
        If the value is less than 1.1, some sawtoothing starts to appear at the generated edges. 
        If the value is more than 1.5, the mesh simplification starts to cut some corners it shouldn't.
    */
    maxSimplificationError: {
        default: 1.3,
        label: "Max Simplification Error",
        min: 0.1,
        max: 3,
        step: 0.1,
        group: "Polygonization",
    },

    /*
        http://recastnav.com/structrcConfig.html#a055d0ed71c79c9af29424de5d0cf3d2d

        The maximum number of vertices allowed for polygons generated during the contour to polygon 
        conversion process. [Limit: >= 3].
    */
    maxVertsPerPoly: {
        default: 6,
        label: "Max Verts Per Poly",
        min: 3,
        max: 6,
        step: 1,
        group: "Polygonization",
    },

    /*
        http://recastnav.com/structrcConfig.html#abdc131d1c8f5e4c1f09a68702efba604

        Sets the sampling distance to use when generating the detail mesh. [Limits: 0 or >= 0.9] [Units: wu].
    */
    detailSampleDist: {
        default: 6,
        label: "Detail Sample Dist",
        min: 0,
        max: 10,
        step: 0.1,
        group: "Detail Mesh",
    },

    /*
        http://recastnav.com/structrcConfig.html#abdc131d1c8f5e4c1f09a68702efba604

        The maximum distance the detail mesh surface should deviate from heightfield data. [Limit: >=0] [Units: wu].
    */
    detailSampleMaxError: {
        default: 1,
        label: "Detail Sample Max Error",
        min: 0,
        max: 10,
        step: 0.1,
        group: "Detail Mesh",
    },
};

export function getDefaultParams() {
    //
    let data = {};

    for (let key in defaultParams) {
        //
        data[key] = defaultParams[key].default;
    }

    return data;
}

