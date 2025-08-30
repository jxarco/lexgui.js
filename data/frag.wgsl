@fragment
fn frag_main(@location(0) fragUV : vec2f) -> @location(0) vec4f {
    let texUv = floor(fragUV * 128.0) / 128.0;
    let texColor: vec4f = textureSample(iChannel0, texSampler, texUv);
    return vec4f(sin(iTime * 0.001) * 0.5 + 0.5);
}