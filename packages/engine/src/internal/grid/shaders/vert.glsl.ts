export default `
precision highp float;

// Uniforms
uniform float u_majorGridDiv;
uniform float u_gridDiv;

uniform int mode;

out vec2 v_uv; // Passed to the fragment shader
out vec2 v_worldPos;
void main() {
    vec4 transformed = vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * transformed;

    vec3 worldPosition = (modelMatrix * transformed).xyz;


    float div = max(2.0, round(u_majorGridDiv));

    // Use local position for grid calculations
    vec3 localPos = transformed.xyz;
    vec3 cameraCenteringOffset = floor(cameraPosition / div) * div;
    // vec3 cameraSnappedWorldPos = worldPosition.xyz - cameraCenteringOffset;
    vec3 cameraSnappedWorldPos = worldPosition.xyz - cameraCenteringOffset;

    // XZ
    if(mode == 0){
        v_worldPos = worldPosition.xz;
        v_uv = cameraSnappedWorldPos.xz * u_gridDiv;
    }
    //XY
    if( mode == 1){
         v_worldPos = worldPosition.xy;
        v_uv = cameraSnappedWorldPos.xy * u_gridDiv;
    }
    // YZ
    if( mode == 2){
        v_worldPos = worldPosition.yz;
        v_uv = cameraSnappedWorldPos.yz * u_gridDiv;
    }

}`;
