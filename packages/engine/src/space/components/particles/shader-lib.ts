
export const billboardShader = `

    #ifndef SHADOW 

        vec3 objectPosition = (modelMatrix * vec4(particlePosition, 1.0)).xyz;

        // Calculate view direction
        vec3 viewDir = normalize(objectPosition - cameraPosition);

        // Create billboard basis
        vec3 up = vec3(0.0, 1.0, 0.0);
        vec3 right = normalize(cross(up, viewDir));
        up = cross(viewDir, right);

        // Apply rotation
        vec2 rotatedPosition = originalPosition.xy ;

        #ifdef USE_TRIANGLE 

            rotatedPosition *= 0.5;

        #endif

        #ifndef POINT
            float rr = pluginTimer * rotationSpeed + rotationY;
            rotatedPosition.x = cos(rr) * originalPosition.x - sin(rr) * originalPosition.y;
            rotatedPosition.y = sin(rr) * originalPosition.x + cos(rr) * originalPosition.y;
        #endif

        // Transform the rotated quad vertices
        vec3 billboardPos = right * rotatedPosition.x * -vScale.x + up * rotatedPosition.y * vScale.y;

        // Apply the billboard offset
        vec3 worldPos = objectPosition + billboardPos;

        // Calculate view-space position
        vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);

        gl_Position = projectionMatrix * mvPosition;

    #else 

        vec4 mvPosition = modelViewMatrix * vec4( particlePosition, 1.0 );

        vec2 alignedPosition = ( originalPosition.xy ) * vScale.xy;

        #ifdef USE_TRIANGLE 

            alignedPosition = ( originalPosition.xy * 0.5 ) * vScale.xy;
            
        #endif

        vec2 rotatedPosition = alignedPosition;

        #ifndef POINT

            float rr = pluginTimer * rotationSpeed;
            rotatedPosition.x = cos( rr ) * alignedPosition.x - sin( rr ) * alignedPosition.y;
            rotatedPosition.y = sin( rr ) * alignedPosition.x + cos( rr ) * alignedPosition.y;
        #endif

        mvPosition.xy += rotatedPosition;

        gl_Position = projectionMatrix * mvPosition;

    #endif


`

  


export const curl_noise = `
void FAST32_hash_3D( 	vec3 gridcell,
                        vec3 v1_mask,		//	user definable v1 and v2.  ( 0's and 1's )
                        vec3 v2_mask,
                        out vec4 hash_0,
                        out vec4 hash_1,
                        out vec4 hash_2	)		//	generates 3 random numbers for each of the 4 3D cell corners.  cell corners:  v0=0,0,0  v3=1,1,1  the other two are user definable
{
    //    gridcell is assumed to be an integer coordinate

    //	TODO: 	these constants need tweaked to find the best possible noise.
    //			probably requires some kind of brute force computational searching or something....
    const vec2 OFFSET = vec2( 50.0, 161.0 );
    const float DOMAIN = 69.0;
    const vec3 SOMELARGEFLOATS = vec3( 635.298681, 682.357502, 668.926525 );
    const vec3 ZINC = vec3( 48.500388, 65.294118, 63.934599 );

    //	truncate the domain
    gridcell.xyz = gridcell.xyz - floor(gridcell.xyz * ( 1.0 / DOMAIN )) * DOMAIN;
    vec3 gridcell_inc1 = step( gridcell, vec3( DOMAIN - 1.5 ) ) * ( gridcell + 1.0 );

    //	compute x*x*y*y for the 4 corners
    vec4 P = vec4( gridcell.xy, gridcell_inc1.xy ) + OFFSET.xyxy;
    P *= P;
    vec4 V1xy_V2xy = mix( P.xyxy, P.zwzw, vec4( v1_mask.xy, v2_mask.xy ) );		//	apply mask for v1 and v2
    P = vec4( P.x, V1xy_V2xy.xz, P.z ) * vec4( P.y, V1xy_V2xy.yw, P.w );

    //	get the lowz and highz mods
    vec3 lowz_mods = vec3( 1.0 / ( SOMELARGEFLOATS.xyz + gridcell.zzz * ZINC.xyz ) );
    vec3 highz_mods = vec3( 1.0 / ( SOMELARGEFLOATS.xyz + gridcell_inc1.zzz * ZINC.xyz ) );

    //	apply mask for v1 and v2 mod values
    v1_mask = ( v1_mask.z < 0.5 ) ? lowz_mods : highz_mods;
    v2_mask = ( v2_mask.z < 0.5 ) ? lowz_mods : highz_mods;

    //	compute the final hash
    hash_0 = fract( P * vec4( lowz_mods.x, v1_mask.x, v2_mask.x, highz_mods.x ) );
    hash_1 = fract( P * vec4( lowz_mods.y, v1_mask.y, v2_mask.y, highz_mods.y ) );
    hash_2 = fract( P * vec4( lowz_mods.z, v1_mask.z, v2_mask.z, highz_mods.z ) );
}
void Simplex3D_GetCornerVectors( 	vec3 P,					//	input point
                                    out vec3 Pi,			//	integer grid index for the origin
                                    out vec3 Pi_1,			//	offsets for the 2nd and 3rd corners.  ( the 4th = Pi + 1.0 )
                                    out vec3 Pi_2,
                                    out vec4 v1234_x,		//	vectors from the 4 corners to the intput point
                                    out vec4 v1234_y,
                                    out vec4 v1234_z )
{
    //
    //	Simplex math from Stefan Gustavson's and Ian McEwan's work at...
    //	http://github.com/ashima/webgl-noise
    //

    //	simplex math constants
    const float SKEWFACTOR = 1.0/3.0;
    const float UNSKEWFACTOR = 1.0/6.0;
    const float SIMPLEX_CORNER_POS = 0.5;
    const float SIMPLEX_PYRAMID_HEIGHT = 0.70710678118654752440084436210485;	// sqrt( 0.5 )	height of simplex pyramid.

    P *= SIMPLEX_PYRAMID_HEIGHT;		// scale space so we can have an approx feature size of 1.0  ( optional )

    //	Find the vectors to the corners of our simplex pyramid
    Pi = floor( P + dot( P, vec3( SKEWFACTOR) ) );
    vec3 x0 = P - Pi + dot(Pi, vec3( UNSKEWFACTOR ) );
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    Pi_1 = min( g.xyz, l.zxy );
    Pi_2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - Pi_1 + UNSKEWFACTOR;
    vec3 x2 = x0 - Pi_2 + SKEWFACTOR;
    vec3 x3 = x0 - SIMPLEX_CORNER_POS;

    //	pack them into a parallel-friendly arrangement
    v1234_x = vec4( x0.x, x1.x, x2.x, x3.x );
    v1234_y = vec4( x0.y, x1.y, x2.y, x3.y );
    v1234_z = vec4( x0.z, x1.z, x2.z, x3.z );
}


vec3 SimplexPerlin3D_Deriv(vec3 P)
{
    //	calculate the simplex vector and index math
    vec3 Pi;
    vec3 Pi_1;
    vec3 Pi_2;
    vec4 v1234_x;
    vec4 v1234_y;
    vec4 v1234_z;
    Simplex3D_GetCornerVectors( P, Pi, Pi_1, Pi_2, v1234_x, v1234_y, v1234_z );

    //	generate the random vectors
    //	( various hashing methods listed in order of speed )
    vec4 hash_0;
    vec4 hash_1;
    vec4 hash_2;
    FAST32_hash_3D( Pi, Pi_1, Pi_2, hash_0, hash_1, hash_2 );
    //SGPP_hash_3D( Pi, Pi_1, Pi_2, hash_0, hash_1, hash_2 );
    hash_0 -= 0.49999;
    hash_1 -= 0.49999;
    hash_2 -= 0.49999;

    //	normalize random gradient vectors
    vec4 norm = inversesqrt( hash_0 * hash_0 + hash_1 * hash_1 + hash_2 * hash_2 );
    hash_0 *= norm;
    hash_1 *= norm;
    hash_2 *= norm;

    //	evaluate gradients
    vec4 grad_results = hash_0 * v1234_x + hash_1 * v1234_y + hash_2 * v1234_z;

    //	evaluate the surflet f(x)=(0.5-x*x)^3
    vec4 m = v1234_x * v1234_x + v1234_y * v1234_y + v1234_z * v1234_z;
    m = max(0.5 - m, 0.0);		//	The 0.5 here is SIMPLEX_PYRAMID_HEIGHT^2
    vec4 m2 = m*m;
    vec4 m3 = m*m2;

    //	calc the deriv
    vec4 temp = -6.0 * m2 * grad_results;
    float xderiv = dot( temp, v1234_x ) + dot( m3, hash_0 );
    float yderiv = dot( temp, v1234_y ) + dot( m3, hash_1 );
    float zderiv = dot( temp, v1234_z ) + dot( m3, hash_2 );

    const float FINAL_NORMALIZATION = 37.837227241611314102871574478976;	//	scales the final result to a strict 1.0->-1.0 range

    //	sum with the surflet and return
   //return vec4( dot( m3, grad_results ), xderiv, yderiv, zderiv ) * FINAL_NORMALIZATION;
    return vec3( xderiv, yderiv, zderiv ) * FINAL_NORMALIZATION;
}
`




export const normalParticleShader = `

float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;

#ifdef FLAT_SHADED

	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );

#else

	vec3 normal = sphereCalc;
	#ifdef DOUBLE_SIDED

		normal *= faceDirection;

	#endif

#endif

#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )

	#ifdef USE_TANGENT

		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );

	#else

		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);

	#endif

	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )

		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;

	#endif

#endif

#ifdef USE_CLEARCOAT_NORMALMAP

	#ifdef USE_TANGENT

		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );

	#else

		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );

	#endif

	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )

		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;

	#endif

#endif

// non perturbed normal for clearcoat among others

vec3 nonPerturbedNormal = normal;

`

export const perlin4D = `

    vec4 testSimplexPerlin3D_Deriv(vec3 P)
{
    //  https://github.com/BrianSharpe/Wombat/blob/master/SimplexPerlin3D_Deriv.glsl

    //  simplex math constants
    const float SKEWFACTOR = 1.0/3.0;
    const float UNSKEWFACTOR = 1.0/6.0;
    const float SIMPLEX_CORNER_POS = 0.5;
    const float SIMPLEX_TETRAHEDRON_HEIGHT = 0.70710678118654752440084436210485;    // sqrt( 0.5 )

    //  establish our grid cell.
    P *= SIMPLEX_TETRAHEDRON_HEIGHT;    // scale space so we can have an approx feature size of 1.0
    vec3 Pi = floor( P + dot( P, vec3( SKEWFACTOR) ) );

    //  Find the vectors to the corners of our simplex tetrahedron
    vec3 x0 = P - Pi + dot(Pi, vec3( UNSKEWFACTOR ) );
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 Pi_1 = min( g.xyz, l.zxy );
    vec3 Pi_2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - Pi_1 + UNSKEWFACTOR;
    vec3 x2 = x0 - Pi_2 + SKEWFACTOR;
    vec3 x3 = x0 - SIMPLEX_CORNER_POS;

    //  pack them into a parallel-friendly arrangement
    vec4 v1234_x = vec4( x0.x, x1.x, x2.x, x3.x );
    vec4 v1234_y = vec4( x0.y, x1.y, x2.y, x3.y );
    vec4 v1234_z = vec4( x0.z, x1.z, x2.z, x3.z );

    // clamp the domain of our grid cell
    Pi.xyz = Pi.xyz - floor(Pi.xyz * ( 1.0 / 69.0 )) * 69.0;
    vec3 Pi_inc1 = step( Pi, vec3( 69.0 - 1.5 ) ) * ( Pi + 1.0 );

    //	generate the random vectors
    vec4 Pt = vec4( Pi.xy, Pi_inc1.xy ) + vec2( 50.0, 161.0 ).xyxy;
    Pt *= Pt;
    vec4 V1xy_V2xy = mix( Pt.xyxy, Pt.zwzw, vec4( Pi_1.xy, Pi_2.xy ) );
    Pt = vec4( Pt.x, V1xy_V2xy.xz, Pt.z ) * vec4( Pt.y, V1xy_V2xy.yw, Pt.w );
    const vec3 SOMELARGEFLOATS = vec3( 635.298681, 682.357502, 668.926525 );
    const vec3 ZINC = vec3( 48.500388, 65.294118, 63.934599 );
    vec3 lowz_mods = vec3( 1.0 / ( SOMELARGEFLOATS.xyz + Pi.zzz * ZINC.xyz ) );
    vec3 highz_mods = vec3( 1.0 / ( SOMELARGEFLOATS.xyz + Pi_inc1.zzz * ZINC.xyz ) );
    Pi_1 = ( Pi_1.z < 0.5 ) ? lowz_mods : highz_mods;
    Pi_2 = ( Pi_2.z < 0.5 ) ? lowz_mods : highz_mods;
    vec4 hash_0 = fract( Pt * vec4( lowz_mods.x, Pi_1.x, Pi_2.x, highz_mods.x ) ) - 0.49999;
    vec4 hash_1 = fract( Pt * vec4( lowz_mods.y, Pi_1.y, Pi_2.y, highz_mods.y ) ) - 0.49999;
    vec4 hash_2 = fract( Pt * vec4( lowz_mods.z, Pi_1.z, Pi_2.z, highz_mods.z ) ) - 0.49999;

    //	normalize random gradient vectors
    vec4 norm = inversesqrt( hash_0 * hash_0 + hash_1 * hash_1 + hash_2 * hash_2 );
    hash_0 *= norm;
    hash_1 *= norm;
    hash_2 *= norm;

    //	evaluate gradients
    vec4 grad_results = hash_0 * v1234_x + hash_1 * v1234_y + hash_2 * v1234_z;

    //  evaulate the kernel weights ( use (0.5-x*x)^3 instead of (0.6-x*x)^4 to fix discontinuities )
    vec4 m = v1234_x * v1234_x + v1234_y * v1234_y + v1234_z * v1234_z;
    m = max(0.5 - m, 0.0);
    vec4 m2 = m*m;
    vec4 m3 = m*m2;

    //  calc the derivatives
    vec4 temp = -6.0 * m2 * grad_results;
    float xderiv = dot( temp, v1234_x ) + dot( m3, hash_0 );
    float yderiv = dot( temp, v1234_y ) + dot( m3, hash_1 );
    float zderiv = dot( temp, v1234_z ) + dot( m3, hash_2 );

    //	Normalization factor to scale the final result to a strict 1.0->-1.0 range
    //	http://briansharpe.wordpress.com/2012/01/13/simplex-noise/#comment-36
    const float FINAL_NORMALIZATION = 37.837227241611314102871574478976;

    //  sum and return all results as a vec3
    return vec4( dot( m3, grad_results ), xderiv, yderiv, zderiv ) * FINAL_NORMALIZATION;
}
    
`

export const uv_pars_vertex_impostor =  `

    #if defined( USE_UV ) || defined( USE_ANISOTROPY )

	varying vec2 vUv;

    #endif
    #ifdef USE_MAP

        uniform mat3 mapTransform;
        //varying vec2 vMapUv;

    #endif
    #ifdef USE_ALPHAMAP

        uniform mat3 alphaMapTransform;
        varying vec2 vAlphaMapUv;

    #endif
    #ifdef USE_LIGHTMAP

        uniform mat3 lightMapTransform;
        varying vec2 vLightMapUv;

    #endif
    #ifdef USE_AOMAP

        uniform mat3 aoMapTransform;
        varying vec2 vAoMapUv;

    #endif
    #ifdef USE_BUMPMAP

        uniform mat3 bumpMapTransform;
        varying vec2 vBumpMapUv;

    #endif
    #ifdef USE_NORMALMAP

        uniform mat3 normalMapTransform;
        //varying vec2 vNormalMapUv;

    #endif
    #ifdef USE_DISPLACEMENTMAP

        uniform mat3 displacementMapTransform;
        varying vec2 vDisplacementMapUv;

    #endif
    #ifdef USE_EMISSIVEMAP

        uniform mat3 emissiveMapTransform;
        varying vec2 vEmissiveMapUv;

    #endif
    #ifdef USE_METALNESSMAP

        uniform mat3 metalnessMapTransform;
        varying vec2 vMetalnessMapUv;

    #endif
    #ifdef USE_ROUGHNESSMAP

        uniform mat3 roughnessMapTransform;
        varying vec2 vRoughnessMapUv;

    #endif
    #ifdef USE_ANISOTROPYMAP

        uniform mat3 anisotropyMapTransform;
        varying vec2 vAnisotropyMapUv;

    #endif
    #ifdef USE_CLEARCOATMAP

        uniform mat3 clearcoatMapTransform;
        varying vec2 vClearcoatMapUv;

    #endif
    #ifdef USE_CLEARCOAT_NORMALMAP

        uniform mat3 clearcoatNormalMapTransform;
        varying vec2 vClearcoatNormalMapUv;

    #endif
    #ifdef USE_CLEARCOAT_ROUGHNESSMAP

        uniform mat3 clearcoatRoughnessMapTransform;
        varying vec2 vClearcoatRoughnessMapUv;

    #endif
    #ifdef USE_SHEEN_COLORMAP

        uniform mat3 sheenColorMapTransform;
        varying vec2 vSheenColorMapUv;

    #endif
    #ifdef USE_SHEEN_ROUGHNESSMAP

        uniform mat3 sheenRoughnessMapTransform;
        varying vec2 vSheenRoughnessMapUv;

    #endif
    #ifdef USE_IRIDESCENCEMAP

        uniform mat3 iridescenceMapTransform;
        varying vec2 vIridescenceMapUv;

    #endif
    #ifdef USE_IRIDESCENCE_THICKNESSMAP

        uniform mat3 iridescenceThicknessMapTransform;
        varying vec2 vIridescenceThicknessMapUv;

    #endif
    #ifdef USE_SPECULARMAP

        uniform mat3 specularMapTransform;
        varying vec2 vSpecularMapUv;

    #endif
    #ifdef USE_SPECULAR_COLORMAP

        uniform mat3 specularColorMapTransform;
        varying vec2 vSpecularColorMapUv;

    #endif
    #ifdef USE_SPECULAR_INTENSITYMAP

        uniform mat3 specularIntensityMapTransform;
        varying vec2 vSpecularIntensityMapUv;

    #endif
    #ifdef USE_TRANSMISSIONMAP

        uniform mat3 transmissionMapTransform;
        varying vec2 vTransmissionMapUv;

    #endif
    #ifdef USE_THICKNESSMAP

        uniform mat3 thicknessMapTransform;
        varying vec2 vThicknessMapUv;

    #endif

`

export const alphatest_fragment_shadow = `

    #ifdef USE_ALPHATEST   

        #ifdef SHADOW 

            if ( diffuseColor.a < alphaTestShadow ) discard;

        #else 

            if ( diffuseColor.a < alphaTest ) discard;

        #endif
    #endif
`