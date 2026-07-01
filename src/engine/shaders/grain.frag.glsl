precision highp float;

varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uIntensity;  // 0-1
uniform float uSize;       // 0 = fine (1px), 1 = coarse
uniform float uMono;       // 1 = monochrome, 0 = chromatic
uniform float uSeed;       // static seed (constant) or frame number (animated)
uniform vec2 uResolution;

// High quality hash — no sliding, completely different pattern per seed
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float seededNoise(vec2 cell, float seed) {
  // Mix seed into BOTH coordinates so pattern changes completely per seed
  return hash(cell + seed * vec2(127.1, 311.7));
}

void main() {
  vec4 color = texture2D(uTexture, vUv);

  if (uIntensity < 0.001) {
    gl_FragColor = color;
    return;
  }

  vec2 pixelCoord = vUv * uResolution;
  float cellSize = mix(1.0, 4.0, uSize);
  vec2 cell = floor(pixelCoord / cellSize);

  // Noise centered around 0 — seed changes pattern, not position
  float n = seededNoise(cell, uSeed) - 0.5;

  float grainStrength = uIntensity * 0.5;

  vec3 result;
  if (uMono > 0.5) {
    result = color.rgb + n * grainStrength;
  } else {
    float nr = seededNoise(cell + vec2(17.0, 0.0), uSeed) - 0.5;
    float ng = seededNoise(cell + vec2(0.0, 31.0), uSeed) - 0.5;
    float nb = seededNoise(cell + vec2(53.0, 7.0), uSeed) - 0.5;
    result = color.rgb + vec3(nr, ng, nb) * grainStrength;
  }

  gl_FragColor = vec4(clamp(result, 0.0, 1.0), color.a);
}
