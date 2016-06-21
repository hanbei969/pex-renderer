//Based on Article - Physically Based Rendering by Marco Alamia
//http://www.codinglabs.net/article_physically_based_rendering.aspx

#ifdef GL_ES
precision highp float;
#define GLSLIFY 1
#endif

float random(vec2 co)
{
   return fract(sin(dot(co.xy,vec2(12.9898,78.233))) * 43758.5453);
}

//if < 0 return -1, otherwise 1
vec2 signed(vec2 v) {
    return step(0.0, v) * 2.0 - 1.0;
}

vec3 octUvToDir(vec2 uv) {
    uv = uv * 2.0 - 1.0;

    vec2 auv = abs(uv);
    float len = dot(auv, vec2(1.0));

    if (len > 1.0) {
        //y < 0 case
        uv = (auv.yx - 1.0) * -1.0 * signed(uv);
    }

    return normalize(vec3(uv.x, 1.0 - len, uv.y));
}


varying vec2 vTexCoord0;

uniform sampler2D uOctMap;
uniform sampler2D uHammersleyPointSetMap;
uniform float uRoughness;
uniform int uNumSamples;

const float PI = 3.1415926536;

float saturate(float f) {
    return clamp(f, 0.0, 1.0);
}

vec3 saturate(vec3 v) {
    return clamp(v, vec3(0.0), vec3(1.0));
}

//Sampled from a texture generated by code based on
//http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
vec2 Hammersley(int i, int N) {
    return texture2D(uHammersleyPointSetMap, vec2(0.5, (float(i) + 0.5)/float(N))).rg;
}

//Based on Real Shading in Unreal Engine 4
vec3 ImportanceSampleGGX(vec2 Xi, float Roughness, vec3 N) {
    //this is mapping 2d point to a hemisphere but additionally we add spread by roughness
    float a = Roughness * Roughness;
    float Phi = 2.0 * PI * Xi.x + random(N.xz) * 0.1;
    float CosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a*a - 1.0) * Xi.y));
    float SinTheta = sqrt(1.0 - CosTheta * CosTheta);
    vec3 H;
    H.x = SinTheta * cos(Phi);
    H.y = SinTheta * sin(Phi);
    H.z = CosTheta;

    //Tangent space vectors
    vec3 UpVector = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 TangentX = normalize(cross(UpVector, N));
    vec3 TangentY = normalize(cross(N, TangentX));

    //Tangent to World Space
    return TangentX * H.x + TangentY * H.y + N * H.z;

    //
    //vec3 n = N;
    //float aa = 1.0 / (1.0 + n.z);
    //float b = -n.x * n.y * aa;
    //vec3 b1 = vec3(1.0 - n.x * n.x * aa, b, -n.x);
    //vec3 b2 = vec3(b, 1.0 - n.y * n.y * aa, -n.y);
    //mat3 vecSpace = mat3(b1, b2, n);
    //return normalize(mix(vecSpace * H, N, 1.0 - Roughness));
}

//TODO: optimize this using sign()
//Source: http://webglinsights.github.io/downloads/WebGL-Insights-Chapter-16.pdf
vec2 octahedralProjection(vec3 dir) {
    dir/= dot(vec3(1.0), abs(dir));
    vec2 rev = abs(dir.zx) - vec2(1.0,1.0);
    vec2 neg = vec2(
        dir.x < 0.0 ? rev.x : -rev.x,
        dir.z < 0.0 ? rev.y : -rev.y
    );
    vec2 uv = dir.y < 0.0 ? neg : dir.xz;
    return 0.5 * uv + vec2(0.5, 0.5);
}

vec3 PrefilterEnvMap( float Roughness, vec3 R ) {
    vec3 N = R;
    vec3 V = R;
    vec3 PrefilteredColor = vec3(0.0);
    const int NumSamples = 1024;
    float TotalWeight = 0.0;
    for( int i = 0; i < NumSamples; i++ ) {
        if (i > uNumSamples) {
            break;
        }
        vec2 Xi = Hammersley( i, uNumSamples );
        vec3 H = ImportanceSampleGGX( Xi, Roughness, N );
        vec3 L = 2.0 * dot( V, H ) * H - V;
        float NoL = saturate( dot( N, L ) );
        if( NoL > 0.0 ) {
            PrefilteredColor += texture2D( uOctMap, octahedralProjection(L)).rgb * NoL;
            TotalWeight += NoL;
        }
    }
    return PrefilteredColor / TotalWeight;
}

void main() {
    vec3 normal = octUvToDir(vTexCoord0);

    gl_FragColor.rgb = PrefilterEnvMap(uRoughness, normal);
    // gl_FragColor.rgb = 0.5 + 0.5 * normal;
    gl_FragColor.a = 1.0;
}
