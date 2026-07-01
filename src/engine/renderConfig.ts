import type { GrainWashParams } from './types';
import {
  calculateCropRegion,
  getOutputSize,
  type AspectRatio,
  type CropRegion,
  type Size,
} from './outputSize';

/** Calibrates slider values — blur 100 ≈ 450px radius at this long edge. */
export const EFFECT_REFERENCE_LONG_EDGE = 1400;
export const BLUR_MAX_RADIUS_AT_REFERENCE = 450;
export const BLUR_SAMPLE_CAP = 72;
export const DEFAULT_GRAIN_SEED = 42;

export interface RenderConfig {
  params: GrainWashParams;
  aspect: AspectRatio;
  sourceWidth: number;
  sourceHeight: number;
  outputSize: Size;
  cropRegion: CropRegion;
  grainSeed: number;
}

export function createRenderConfig(
  params: GrainWashParams,
  aspect: AspectRatio,
  sourceWidth: number,
  sourceHeight: number,
  grainSeed = DEFAULT_GRAIN_SEED,
): RenderConfig {
  return {
    params,
    aspect,
    sourceWidth,
    sourceHeight,
    outputSize: getOutputSize(aspect, sourceWidth, sourceHeight),
    cropRegion: calculateCropRegion(sourceWidth, sourceHeight, aspect),
    grainSeed,
  };
}

/** Blur radius in output-canvas pixels. */
export function computeBlurRadius(
  intensity: number,
  outputWidth: number,
  outputHeight: number,
): number {
  const longEdge = Math.max(outputWidth, outputHeight);
  return (intensity / 100) * BLUR_MAX_RADIUS_AT_REFERENCE * (longEdge / EFFECT_REFERENCE_LONG_EDGE);
}
