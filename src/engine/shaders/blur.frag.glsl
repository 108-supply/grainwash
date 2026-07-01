precision highp float;

varying vec2 vUv;
uniform sampler2D uTexture;
uniform vec2 uDirection;
uniform vec2 uResolution;
uniform float uRadius;
uniform float uBlurType;
uniform float uTiltCenter;
uniform float uTiltSpread;

float gaussian(float x, float sigma) {
  return exp(-(x * x) / (2.0 * sigma * sigma));
}

void main() {
  if (uRadius < 0.5) {
    gl_FragColor = texture2D(uTexture, vUv);
    return;
  }

  float effectiveRadius = uRadius;
  if (uBlurType > 0.5) {
    float dist = abs(vUv.y - uTiltCenter);
    float mask = smoothstep(0.0, uTiltSpread, dist);
    effectiveRadius = uRadius * mask;
  }

  if (effectiveRadius < 0.5) {
    gl_FragColor = texture2D(uTexture, vUv);
    return;
  }

  float sigma = max(effectiveRadius * 0.5, 1.0);
  vec2 texelSize = 1.0 / uResolution;
  int samples = int(min(effectiveRadius, 100.0));

  vec4 color = vec4(0.0);
  float weightSum = 0.0;

  // Loop supports up to radius 100
  for (int i = -100; i <= 100; i++) {
    if (i > samples || i < -samples) continue;
    float fi = float(i);
    float weight = gaussian(fi, sigma);
    vec2 offset = uDirection * texelSize * fi;
    color += texture2D(uTexture, vUv + offset) * weight;
    weightSum += weight;
  }

  gl_FragColor = color / weightSum;
}
