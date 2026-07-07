precision highp float;

varying vec2 vUv;
uniform sampler2D uTexture;
uniform vec2 uDirection;
uniform vec2 uResolution;
uniform float uRadius;
uniform float uBlurType;
uniform float uTiltCenter;
uniform float uTiltSpread;
uniform float uSampleCap;

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
  int samples = int(min(uSampleCap, effectiveRadius));

  float weightSum = gaussian(0.0, sigma);
  vec4 color = texture2D(uTexture, vUv) * weightSum;

  // Pair taps with bilinear offsets — half the texture fetches, same kernel.
  for (int i = 0; i < 54; i++) {
    int tap = i * 2 + 1;
    if (tap > samples) continue;

    float fi = float(tap);
    float w0 = gaussian(fi - 1.0, sigma);
    float w1 = gaussian(fi, sigma);
    float pairWeight = w0 + w1;
    float offset = fi - 1.0 + w1 / pairWeight;
    vec2 off = uDirection * texelSize * offset;

    color += texture2D(uTexture, vUv + off) * pairWeight;
    color += texture2D(uTexture, vUv - off) * pairWeight;
    weightSum += 2.0 * pairWeight;
  }

  gl_FragColor = color / weightSum;
}
