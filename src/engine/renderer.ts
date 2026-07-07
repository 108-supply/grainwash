import * as twgl from 'twgl.js';
import vertexShader from './shaders/quad.vert.glsl';
import blurFrag from './shaders/blur.frag.glsl';
import grainFrag from './shaders/grain.frag.glsl';
import copyFrag from './shaders/copy.frag.glsl';
import type { AspectRatio } from './outputSize';
import {
  createRenderConfig,
  computeBlurRadius,
  BLUR_SAMPLE_CAP,
  DEFAULT_GRAIN_SEED,
  type RenderConfig,
} from './renderConfig';
import { type GrainWashParams } from './types';
import { EXPORT_QUALITY, flipWebGLPixels } from './export';
import { encodeImageDataToWebp } from './webpExport';

export type { AspectRatio } from './outputSize';
export { getOutputSize, calculateCropRegion } from './outputSize';
export { createRenderConfig, computeBlurRadius } from './renderConfig';
export { defaultParams, type GrainWashParams } from './types';

/**
 * Single render path at full output resolution.
 * Blur runs at half resolution (visually equivalent) then upsamples before grain.
 */
export class GrainWashRenderer {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private bufferInfo: twgl.BufferInfo;

  private copyProgram: twgl.ProgramInfo;
  private blurProgram: twgl.ProgramInfo;
  private grainProgram: twgl.ProgramInfo;

  private fbA: twgl.FramebufferInfo | null = null;
  private fbB: twgl.FramebufferInfo | null = null;
  private fbHalfA: twgl.FramebufferInfo | null = null;
  private fbHalfB: twgl.FramebufferInfo | null = null;

  private sourceTexture: WebGLTexture | null = null;
  private sourceImage: HTMLImageElement | null = null;

  private sourceWidth = 0;
  private sourceHeight = 0;
  private activeAspect: AspectRatio = 'original';
  private grainSeed = DEFAULT_GRAIN_SEED;

  private normalizedCanvas: HTMLCanvasElement | null = null;
  private normalizedCtx: CanvasRenderingContext2D | null = null;
  private normalizedCacheKey = '';

  private blurCacheKey = '';
  private blurCacheTexture: WebGLTexture | null = null;
  private sourceTextureKey = '';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      antialias: false,
    });
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    this.bufferInfo = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 2, data: [-1, -1, 1, -1, -1, 1, 1, 1] },
    });

    this.copyProgram = twgl.createProgramInfo(gl, [vertexShader, copyFrag]);
    this.blurProgram = twgl.createProgramInfo(gl, [vertexShader, blurFrag]);
    this.grainProgram = twgl.createProgramInfo(gl, [vertexShader, grainFrag]);
  }

  private invalidateCaches() {
    this.normalizedCacheKey = '';
    this.sourceTextureKey = '';
    this.blurCacheKey = '';
    this.blurCacheTexture = null;
  }

  private deleteFramebuffer(fb: twgl.FramebufferInfo | null) {
    if (!fb) return;
    const gl = this.gl;
    gl.deleteTexture(fb.attachments[0]);
    gl.deleteFramebuffer(fb.framebuffer);
  }

  private createFramebuffer(width: number, height: number) {
    const gl = this.gl;
    return twgl.createFramebufferInfo(gl, [{
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
      min: gl.LINEAR,
      mag: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
    }], width, height);
  }

  private createFramebuffers(width: number, height: number) {
    this.deleteFramebuffer(this.fbA);
    this.deleteFramebuffer(this.fbB);
    this.deleteFramebuffer(this.fbHalfA);
    this.deleteFramebuffer(this.fbHalfB);

    this.fbA = this.createFramebuffer(width, height);
    this.fbB = this.createFramebuffer(width, height);

    const hw = Math.max(1, Math.round(width / 2));
    const hh = Math.max(1, Math.round(height / 2));
    this.fbHalfA = this.createFramebuffer(hw, hh);
    this.fbHalfB = this.createFramebuffer(hw, hh);

    this.blurCacheKey = '';
    this.blurCacheTexture = null;
  }

  private ensureCanvasSize(width: number, height: number) {
    const cw = Math.max(1, Math.round(width));
    const ch = Math.max(1, Math.round(height));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
      this.createFramebuffers(cw, ch);
    }
  }

  private updateTextureFrom(source: HTMLImageElement | HTMLCanvasElement) {
    const gl = this.gl;
    if (!this.sourceTexture) {
      this.sourceTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  private normalizedSourceKey(cfg: RenderConfig): string {
    const { outputSize, cropRegion, aspect } = cfg;
    return [
      aspect,
      this.sourceWidth,
      this.sourceHeight,
      outputSize.width,
      outputSize.height,
      cropRegion.x,
      cropRegion.y,
      cropRegion.width,
      cropRegion.height,
    ].join(':');
  }

  private buildNormalizedSource(cfg: RenderConfig): HTMLCanvasElement | null {
    if (!this.sourceImage) return null;

    const key = this.normalizedSourceKey(cfg);
    if (key === this.normalizedCacheKey && this.normalizedCanvas) {
      return this.normalizedCanvas;
    }

    const { outputSize, cropRegion } = cfg;
    const { width: ow, height: oh } = outputSize;

    if (!this.normalizedCanvas) {
      this.normalizedCanvas = document.createElement('canvas');
      this.normalizedCtx = this.normalizedCanvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
      });
    }
    if (!this.normalizedCtx) return null;

    if (this.normalizedCanvas.width !== ow || this.normalizedCanvas.height !== oh) {
      this.normalizedCanvas.width = ow;
      this.normalizedCanvas.height = oh;
    }
    this.normalizedCtx.drawImage(
      this.sourceImage,
      cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height,
      0, 0, ow, oh,
    );
    this.normalizedCacheKey = key;
    return this.normalizedCanvas;
  }

  private blurCacheKeyFor(params: GrainWashParams, w: number, h: number): string {
    return [
      w, h,
      params.blur.intensity,
      params.blur.type,
      params.blur.tiltSpread,
    ].join(':');
  }

  loadImage(img: HTMLImageElement) {
    this.sourceImage = img;
    this.sourceWidth = img.naturalWidth;
    this.sourceHeight = img.naturalHeight;
    this.activeAspect = 'original';
    this.invalidateCaches();
  }

  setAspectRatio(ratio: AspectRatio) {
    if (!this.sourceImage) return;
    this.activeAspect = ratio;
    this.invalidateCaches();
  }

  getRenderConfig(params: GrainWashParams): RenderConfig | null {
    if (!this.sourceImage) return null;
    return createRenderConfig(
      params,
      this.activeAspect,
      this.sourceWidth,
      this.sourceHeight,
      this.grainSeed,
    );
  }

  private renderPass(
    program: twgl.ProgramInfo,
    inputTexture: WebGLTexture,
    outputFB: twgl.FramebufferInfo | null,
    uniforms: Record<string, unknown> = {},
  ) {
    const gl = this.gl;
    gl.useProgram(program.program);
    twgl.setBuffersAndAttributes(gl, program, this.bufferInfo);
    twgl.setUniforms(program, { uTexture: inputTexture, ...uniforms });

    if (outputFB) {
      twgl.bindFramebufferInfo(gl, outputFB);
      gl.viewport(0, 0, outputFB.width, outputFB.height);
    } else {
      twgl.bindFramebufferInfo(gl, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private runBlurAtResolution(
    params: GrainWashParams,
    inputTexture: WebGLTexture,
    w: number,
    h: number,
    writeFB: twgl.FramebufferInfo,
    readFB: twgl.FramebufferInfo,
  ): WebGLTexture {
    let currentTexture = inputTexture;
    let write = writeFB;
    let read = readFB;

    const swap = () => {
      currentTexture = write.attachments[0] as WebGLTexture;
      const tmp = write;
      write = read;
      read = tmp;
    };

    const totalRadius = computeBlurRadius(params.blur.intensity, w, h);
    const isTiltShift = params.blur.type === 'tilt-shift' ? 1.0 : 0.0;
    const tiltSpreadValue = 0.05 + (params.blur.tiltSpread / 100) * 0.45;

    if (totalRadius < 0.5) return inputTexture;

    const MAX_PER_PASS = 135;
    const numRounds = Math.max(1, Math.ceil(totalRadius / MAX_PER_PASS));
    const perRoundRadius = totalRadius / Math.sqrt(numRounds);

    const blurUniforms = {
      uResolution: [w, h],
      uRadius: perRoundRadius,
      uBlurType: isTiltShift,
      uTiltCenter: 0.5,
      uTiltSpread: tiltSpreadValue,
      uSampleCap: BLUR_SAMPLE_CAP,
    };

    for (let r = 0; r < numRounds; r++) {
      this.renderPass(this.blurProgram, currentTexture, write, {
        ...blurUniforms,
        uDirection: [1.0, 0.0],
      });
      swap();

      this.renderPass(this.blurProgram, currentTexture, write, {
        ...blurUniforms,
        uDirection: [0.0, 1.0],
      });
      swap();
    }

    return currentTexture;
  }

  private runBlurPasses(
    params: GrainWashParams,
    inputTexture: WebGLTexture,
    w: number,
    h: number,
  ): WebGLTexture {
    const cacheKey = this.blurCacheKeyFor(params, w, h);
    if (cacheKey === this.blurCacheKey && this.blurCacheTexture) {
      return this.blurCacheTexture;
    }

    const totalRadius = computeBlurRadius(params.blur.intensity, w, h);
    if (totalRadius < 0.5) {
      this.blurCacheKey = cacheKey;
      this.blurCacheTexture = inputTexture;
      return inputTexture;
    }

    const hw = this.fbHalfA!.width;
    const hh = this.fbHalfA!.height;

    this.renderPass(this.copyProgram, inputTexture, this.fbHalfA!);

    const halfRadius = computeBlurRadius(params.blur.intensity, hw, hh);
    const blurredHalf = halfRadius < 0.5
      ? (this.fbHalfA!.attachments[0] as WebGLTexture)
      : this.runBlurAtResolution(
          params,
          this.fbHalfA!.attachments[0] as WebGLTexture,
          hw,
          hh,
          this.fbHalfB!,
          this.fbHalfA!,
        );

    this.renderPass(this.copyProgram, blurredHalf, this.fbA!);
    const fullResBlurred = this.fbA!.attachments[0] as WebGLTexture;

    this.blurCacheKey = cacheKey;
    this.blurCacheTexture = fullResBlurred;
    return fullResBlurred;
  }

  renderToCanvas(params: GrainWashParams, config?: RenderConfig) {
    const cfg = config ?? this.getRenderConfig(params);
    if (!cfg || !this.sourceImage) return;

    const { outputSize } = cfg;
    const w = outputSize.width;
    const h = outputSize.height;

    this.ensureCanvasSize(w, h);

    const blurKey = this.blurCacheKeyFor(params, w, h);
    const canReuseBlur = blurKey === this.blurCacheKey && this.blurCacheTexture !== null;

    if (!canReuseBlur) {
      const normalized = this.buildNormalizedSource(cfg);
      if (!normalized) return;

      const srcKey = this.normalizedCacheKey;
      if (srcKey !== this.sourceTextureKey) {
        this.updateTextureFrom(normalized);
        this.sourceTextureKey = srcKey;
        this.blurCacheKey = '';
        this.blurCacheTexture = null;
      }
    }

    if (!this.sourceTexture || !this.fbA || !this.fbB || !this.fbHalfA || !this.fbHalfB) return;

    const currentTexture = canReuseBlur
      ? this.blurCacheTexture!
      : this.runBlurPasses(params, this.sourceTexture, w, h);

    this.renderPass(this.grainProgram, currentTexture, null, {
      uIntensity: params.grain.intensity / 100,
      uSize: 0.0,
      uMono: 1.0,
      uSeed: cfg.grainSeed,
      uResolution: [w, h],
    });
  }

  render(params: GrainWashParams) {
    this.renderToCanvas(params);
  }

  private readImageData(): ImageData {
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const raw = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, raw);
    return new ImageData(flipWebGLPixels(raw, w, h), w, h);
  }

  private exportViaToBlob(
    format: 'png' | 'jpeg',
    quality?: number,
  ): Promise<Blob> {
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error('Export failed')); },
        mime,
        format === 'jpeg' ? quality : undefined,
      );
    });
  }

  private exportViaToBlobWebp(quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error('Export failed')); },
        'image/webp',
        quality,
      );
    });
  }

  private async exportWebp(quality = EXPORT_QUALITY.webp): Promise<Blob> {
    try {
      const imageData = this.readImageData();
      return await encodeImageDataToWebp(imageData, quality);
    } catch (err) {
      console.warn('WebP encoder failed, using browser fallback:', err);
      return this.exportViaToBlobWebp(quality / 100);
    }
  }

  export(
    format: 'png' | 'jpeg' | 'webp' = 'png',
    quality?: number,
  ): Promise<Blob> {
    if (format === 'webp') {
      return this.exportWebp(quality ?? EXPORT_QUALITY.webp);
    }
    return this.exportViaToBlob(
      format,
      quality ?? (format === 'jpeg' ? EXPORT_QUALITY.jpeg : undefined),
    );
  }

  destroy() {
    const gl = this.gl;
    if (this.sourceTexture) gl.deleteTexture(this.sourceTexture);
    this.deleteFramebuffer(this.fbA);
    this.deleteFramebuffer(this.fbB);
    this.deleteFramebuffer(this.fbHalfA);
    this.deleteFramebuffer(this.fbHalfB);
  }
}
