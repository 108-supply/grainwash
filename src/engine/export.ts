/** Default encode quality per format (0–1 for JPEG, 0–100 for WebP via jsquash). */
export const EXPORT_QUALITY = {
  jpeg: 0.85,
  webp: 82,
} as const;

export function flipWebGLPixels(
  raw: Uint8Array,
  width: number,
  height: number,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(raw.length);
  const stride = width * 4;
  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y) * stride;
    pixels.set(raw.subarray(srcRow, srcRow + stride), y * stride);
  }
  return pixels;
}
