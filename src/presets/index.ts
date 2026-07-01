import type { GrainWashParams } from '../engine/renderer';

export interface Preset {
  id: string;
  name: string;
  params: GrainWashParams;
}

export const grainLevels = {
  low: 18,
  medium: 38,
  hard: 65,
} as const;

export type GrainLevel = keyof typeof grainLevels | 'custom';

export const presets: Preset[] = [
  {
    id: 'haze',
    name: 'Haze',
    params: {
      blur: { intensity: 85, type: 'gaussian', tiltSpread: 50 },
      grain: { intensity: grainLevels.low },
    },
  },
  {
    id: 'memory',
    name: 'Memory',
    params: {
      blur: { intensity: 45, type: 'gaussian', tiltSpread: 50 },
      grain: { intensity: grainLevels.medium },
    },
  },
  {
    id: 'texture',
    name: 'Texture',
    params: {
      blur: { intensity: 0, type: 'gaussian', tiltSpread: 50 },
      grain: { intensity: grainLevels.hard },
    },
  },
  {
    id: 'tilt',
    name: 'Tilt',
    params: {
      blur: { intensity: 75, type: 'tilt-shift', tiltSpread: 65 },
      grain: { intensity: grainLevels.medium },
    },
  },
];
