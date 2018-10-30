module.exports = /* glsl */`
#if NUM_SPOT_LIGHTS > 0

struct SpotLight {
    vec3 position;
    vec3 direction;
    vec4 color;
    float angle;
    float range;
};

uniform SpotLight uSpotLights[NUM_SPOT_LIGHTS];

void EvaluateSpotLight(inout PBRData data, SpotLight light, int i) {
  float illuminated = 1.0; // no shadows yet
  if (illuminated > 0.0) {
    data.lightWorld = light.position - data.positionWorld;
    float dist = length(data.lightWorld);
    data.lightWorld /= dist;

    vec3 N = data.normalWorld;
    vec3 V = data.viewWorld;
    vec3 L = data.lightWorld;
    vec3 H = normalize(V + L);
    float NdotV = max(0.0, dot(N, V));

    data.NdotL = clamp(dot(N, L), 0.001, 1.0);
    data.HdotV = max(0.0, dot(H, V));
    data.NdotH = max(0.0, dot(N, H));
    data.LdotH = max(0.0, dot(L, H));

    vec3 F = SpecularReflection(data);
    float D = MicrofacetDistribution(data);
    float G = GeometricOcclusion(data);

    vec3 nominator = F * G * D;
    float denominator = 4.0 * data.NdotV * data.NdotL + 0.001;
    vec3 specularBrdf = nominator / denominator;

    vec3 lightColor = decode(light.color, 3).rgb;
    lightColor *= light.color.a; // intensity

    float distanceRatio = clamp(1.0 - pow(dist/light.range, 4.0), 0.0, 1.0);
    float distanceFalloff = (distanceRatio * distanceRatio) / (max(dist * dist, 0.01));

    float fCosine = max(0.0, dot(light.direction, -L));
    float cutOff = cos(light.angle);

    float fDif = 1.0 - cutOff;
    float falloff = clamp((fCosine - cutOff)/fDif, 0.0, 1.0);
    falloff = pow(falloff, 2.0) * distanceFalloff;

    //TODO: (1 - F) comes from glTF spec, three.js doesn't have it? Schlick BRDF
    vec3 irradiance = data.NdotL * lightColor * illuminated;
    irradiance *= falloff;
    data.directDiffuse += (1.0 - F) * DiffuseLambert(data.diffuseColor) * irradiance;
    data.directSpecular += specularBrdf * irradiance;
  }
}
#endif
`
