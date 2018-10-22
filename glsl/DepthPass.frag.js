module.exports = `
#ifdef GL_ES
precision highp float;
#endif
varying vec3 vNormalView;
varying vec2 vTexCoord0;
varying vec3 vPositionView;

struct PBRData {
  vec2 texCoord0;
  vec3 baseColor;
  float opacity;
};

#ifdef USE_BASE_COLOR_MAP
uniform vec4 uBaseColor; // TODO: gltf assumes sRGB color, not linear
uniform sampler2D uBaseColorMap; //assumes sRGB color, not linear
void getBaseColor (inout PBRData data) {
  vec4 texelColor = texture2D(uBaseColorMap, data.texCoord0);
  data.opacity = uBaseColor.a * texelColor.a;
}
#else
uniform vec4 uBaseColor; // TODO: gltf assumes sRGB color, not linear
void getBaseColor (inout PBRData data) {
  data.opacity = uBaseColor.a;
}
#endif

#ifdef USE_ALPHA_MAP
uniform sampler2D uAlphaMap;
#endif

#ifdef USE_ALPHA_TEST
  uniform float uAlphaTest; //assumes sRGB color, not linear
  void AlphaTest(inout PBRData data) {
    if (data.opacity < uAlphaTest) discard;
  }
#endif

//from http://spidergl.org/example.php?id=6
vec4 packDepth(const in float depth) {
  const vec4 bit_shift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
  const vec4 bit_mask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
  vec4 res = fract(depth * bit_shift);
  res -= res.xxyz * bit_mask;
  return res;
}

void main() {
  PBRData data;
  data.texCoord0 = vTexCoord0;
  getBaseColor(data);
  #ifdef USE_ALPHA_MAP
  data.opacity *= texture2D(uAlphaMap, data.texCoord0).r;
  #endif
  #ifdef USE_ALPHA_TEST
    AlphaTest(data);
  #endif
  float far = 10.0; // TODO: hardcoded far for depth pass
  gl_FragColor = packDepth(length(vPositionView) / far);
}
`
