import encodeWebp, { init as initWebpEncode } from '@jsquash/webp/encode';
import { simd } from 'wasm-feature-detect';
import webpWasmUrl from '@jsquash/webp/codec/enc/webp_enc.wasm?url';
import webpSimdWasmUrl from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url';
import { EXPORT_QUALITY } from './export';

let initPromise: Promise<void> | null = null;

async function ensureWebpEncoder(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const wasmUrl = (await simd()) ? webpSimdWasmUrl : webpWasmUrl;
    const wasmBuffer = await fetch(wasmUrl).then((r) => {
      if (!r.ok) throw new Error(`Failed to load WebP encoder (${r.status})`);
      return r.arrayBuffer();
    });
    await initWebpEncode(wasmBuffer);
  })();

  return initPromise;
}

export async function encodeImageDataToWebp(
  imageData: ImageData,
  quality = EXPORT_QUALITY.webp,
): Promise<Blob> {
  await ensureWebpEncoder();
  const buffer = await encodeWebp(imageData, {
    quality,
    lossless: 0,
    method: 4,
  });
  return new Blob([buffer], { type: 'image/webp' });
}
