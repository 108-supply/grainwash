export interface GrainWashParams {
  blur: {
    intensity: number;    // 0–100
    type: 'gaussian' | 'tilt-shift';
    tiltSpread: number;   // 0–100 (how wide the sharp band is)
  };
  grain: {
    intensity: number;    // 0–100
  };
}

export const defaultParams: GrainWashParams = {
  blur: { intensity: 80, type: 'gaussian', tiltSpread: 50 },
  grain: { intensity: 18 },
};
