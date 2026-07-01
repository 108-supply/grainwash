export type AspectRatio = '4:3' | '16:9' | '9:16' | '3:4' | '1:1' | 'original';

export const OUTPUT_MAX_LONG_EDGE = 5760;

export interface Size {
  width: number;
  height: number;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FIXED_SIZES: Record<Exclude<AspectRatio, 'original'>, Size> = {
  '1:1': { width: 4096, height: 4096 },
  '3:4': { width: 4096, height: 5461 },
  '4:3': { width: 5461, height: 4096 },
  '9:16': { width: 3240, height: 5760 },
  '16:9': { width: 5760, height: 3240 },
};

const ASPECT_VALUES: Record<Exclude<AspectRatio, 'original'>, number> = {
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '3:4': 3 / 4,
  '1:1': 1,
};

/** Fixed export canvas size for the selected aspect ratio. */
export function getOutputSize(
  aspect: AspectRatio,
  sourceWidth = 0,
  sourceHeight = 0,
): Size {
  if (aspect !== 'original') {
    return { ...FIXED_SIZES[aspect] };
  }

  if (!sourceWidth || !sourceHeight) {
    return { width: OUTPUT_MAX_LONG_EDGE, height: OUTPUT_MAX_LONG_EDGE };
  }

  if (sourceWidth >= sourceHeight) {
    return {
      width: OUTPUT_MAX_LONG_EDGE,
      height: Math.round((OUTPUT_MAX_LONG_EDGE * sourceHeight) / sourceWidth),
    };
  }

  return {
    width: Math.round((OUTPUT_MAX_LONG_EDGE * sourceWidth) / sourceHeight),
    height: OUTPUT_MAX_LONG_EDGE,
  };
}

/** Center-crop region in source-image coordinates (cover fit). */
export function calculateCropRegion(
  sourceWidth: number,
  sourceHeight: number,
  aspect: AspectRatio,
): CropRegion {
  if (aspect === 'original') {
    return { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  }

  const targetRatio = ASPECT_VALUES[aspect];
  const imgRatio = sourceWidth / sourceHeight;

  if (imgRatio > targetRatio) {
    const height = sourceHeight;
    const width = Math.round(sourceHeight * targetRatio);
    return {
      x: Math.round((sourceWidth - width) / 2),
      y: 0,
      width,
      height,
    };
  }

  const width = sourceWidth;
  const height = Math.round(sourceWidth / targetRatio);
  return {
    x: 0,
    y: Math.round((sourceHeight - height) / 2),
    width,
    height,
  };
}
