import * as twgl from 'twgl.js';
import vertexShader from './shaders/quad.vert.glsl';
import blurFrag from './shaders/blur.frag.glsl';
import grainFrag from './shaders/grain.frag.glsl';

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

export type AspectRatio = '4:3' | '16:9' | '9:16' | '3:4' | '1:1' | 'original';

export const defaultParams: GrainWashParams = {
  blur: { intensity: 50, type: 'gaussian', tiltSpread: 50 },
  grain: { intensity: 35 },
};

export class GrainWashRenderer {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private bufferInfo: twgl.BufferInfo;

  private blurProgram: twgl.ProgramInfo;
  private grainProgram: twgl.ProgramInfo;

  private fbA: twgl.FramebufferInfo | null = null;
  private fbB: twgl.FramebufferInfo | null = null;

  private sourceTexture: WebGLTexture | null = null;
  private sourceImage: HTMLImageElement | null = null;

  private sourceWidth = 0;
  private sourceHeight = 0;
  private cropWidth = 0;
  private cropHeight = 0;
  private cropOffsetX = 0;
  private cropOffsetY = 0;
  private activeAspect: AspectRatio = 'original';
  private cropCanvas: HTMLCanvasElement | null = null;
  private cropCtx: CanvasRenderingContext2D | null = null;

  private previewMaxDim: number | null = null;
  private grainSeed = 42.0; // static seed — grain doesn't move

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    this.bufferInfo = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 2, data: [-1, -1, 1, -1, -1, 1, 1, 1] },
    });

    this.blurProgram = twgl.createProgramInfo(gl, [vertexShader, blurFrag]);
    this.grainProgram = twgl.createProgramInfo(gl, [vertexShader, grainFrag]);
  }

  private createFramebuffers(width: number, height: number) {
    const gl = this.gl;
    if (this.fbA) {
      gl.deleteTexture(this.fbA.attachments[0]);
      gl.deleteFramebuffer(this.fbA.framebuffer);
    }
    if (this.fbB) {
      gl.deleteTexture(this.fbB.attachments[0]);
      gl.deleteFramebuffer(this.fbB.framebuffer);
    }

    const createFB = () =>
      twgl.createFramebufferInfo(gl, [{
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
        min: gl.LINEAR,
        mag: gl.LINEAR,
        wrap: gl.CLAMP_TO_EDGE,
      }], width, height);

    this.fbA = createFB();
    this.fbB = createFB();
  }

  private calculateCrop(ratio: AspectRatio) {
    const imgW = this.sourceWidth;
    const imgH = this.sourceHeight;

    if (ratio === 'original') {
      this.cropWidth = imgW;
      this.cropHeight = imgH;
      this.cropOffsetX = 0;
      this.cropOffsetY = 0;
      return;
    }

    const ratioMap: Record<string, number> = {
      '4:3': 4 / 3, '16:9': 16 / 9, '9:16': 9 / 16,
      '3:4': 3 / 4, '1:1': 1,
    };

    const targetRatio = ratioMap[ratio];
    const imgRatio = imgW / imgH;

    if (imgRatio > targetRatio) {
      this.cropHeight = imgH;
      this.cropWidth = Math.round(imgH * targetRatio);
      this.cropOffsetX = Math.round((imgW - this.cropWidth) / 2);
      this.cropOffsetY = 0;
    } else {
      this.cropWidth = imgW;
      this.cropHeight = Math.round(imgW / targetRatio);
      this.cropOffsetX = 0;
      this.cropOffsetY = Math.round((imgH - this.cropHeight) / 2);
    }
  }

  private setCanvasToCurrentOutputSize() {
    if (!this.cropWidth || !this.cropHeight) return;

    let w = this.cropWidth;
    let h = this.cropHeight;

    if (this.previewMaxDim) {
      const aspect = this.cropWidth / this.cropHeight;
      if (this.cropWidth > this.cropHeight) {
        w = Math.min(this.cropWidth, this.previewMaxDim);
        h = w / aspect;
      } else {
        h = Math.min(this.cropHeight, this.previewMaxDim);
        w = h * aspect;
      }
    }

    const cw = Math.max(1, Math.round(w));
    const ch = Math.max(1, Math.round(h));
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

  private getCroppedSource(): HTMLImageElement | HTMLCanvasElement | null {
    if (!this.sourceImage) return null;
    if (this.activeAspect === 'original') return this.sourceImage;

    if (!this.cropCanvas) {
      this.cropCanvas = document.createElement('canvas');
      this.cropCtx = this.cropCanvas.getContext('2d');
    }
    if (!this.cropCtx) return this.sourceImage;

    this.cropCanvas.width = this.cropWidth;
    this.cropCanvas.height = this.cropHeight;
    this.cropCtx.drawImage(
      this.sourceImage,
      this.cropOffsetX, this.cropOffsetY, this.cropWidth, this.cropHeight,
      0, 0, this.cropWidth, this.cropHeight,
    );
    return this.cropCanvas;
  }

  loadImage(img: HTMLImageElement) {
    this.sourceImage = img;
    this.sourceWidth = img.naturalWidth;
    this.sourceHeight = img.naturalHeight;
    this.activeAspect = 'original';
    this.calculateCrop('original');
    this.setCanvasToCurrentOutputSize();
    const source = this.getCroppedSource();
    if (source) this.updateTextureFrom(source);
  }

  setAspectRatio(ratio: AspectRatio) {
    if (!this.sourceImage) return;
    this.activeAspect = ratio;
    this.calculateCrop(ratio);
    this.setCanvasToCurrentOutputSize();
    const source = this.getCroppedSource();
    if (source) this.updateTextureFrom(source);
  }

  private renderPass(
    program: twgl.ProgramInfo,
    inputTexture: WebGLTexture,
    outputFB: twgl.FramebufferInfo | null,
    uniforms: Record<string, any>
  ) {
    const gl = this.gl;
    gl.useProgram(program.program);
    twgl.setBuffersAndAttributes(gl, program, this.bufferInfo);
    twgl.setUniforms(program, { uTexture: inputTexture, ...uniforms });

    if (outputFB) {
      twgl.bindFramebufferInfo(gl, outputFB);
    } else {
      twgl.bindFramebufferInfo(gl, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  render(params: GrainWashParams) {
    if (!this.sourceImage || !this.fbA || !this.fbB) return;

    const source = this.getCroppedSource();
    if (source) this.updateTextureFrom(source);
    if (!this.sourceTexture) return;

    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    gl.viewport(0, 0, w, h);

    let currentTexture: WebGLTexture = this.sourceTexture;
    let writeFB = this.fbA;
    let readFB = this.fbB;

    const swap = () => {
      currentTexture = writeFB!.attachments[0] as WebGLTexture;
      const tmp = writeFB;
      writeFB = readFB;
      readFB = tmp;
    };

    // --- BLUR ---
    const totalRadius = (params.blur.intensity / 100) * 150;
    const isTiltShift = params.blur.type === 'tilt-shift' ? 1.0 : 0.0;
    // Map tiltSpread 0-100 to shader value 0.05-0.5
    // Low spread = narrow sharp band, high spread = wide sharp band
    const tiltSpreadValue = 0.05 + (params.blur.tiltSpread / 100) * 0.45;

    if (totalRadius >= 0.5) {
      const MAX_PER_PASS = 90;
      const numRounds = Math.max(1, Math.ceil(totalRadius / MAX_PER_PASS));
      const perRoundRadius = totalRadius / Math.sqrt(numRounds);

      for (let r = 0; r < numRounds; r++) {
        this.renderPass(this.blurProgram, currentTexture, writeFB, {
          uDirection: [1.0, 0.0],
          uResolution: [w, h],
          uRadius: perRoundRadius,
          uBlurType: isTiltShift,
          uTiltCenter: 0.5,
          uTiltSpread: tiltSpreadValue,
        });
        swap();

        this.renderPass(this.blurProgram, currentTexture, writeFB, {
          uDirection: [0.0, 1.0],
          uResolution: [w, h],
          uRadius: perRoundRadius,
          uBlurType: isTiltShift,
          uTiltCenter: 0.5,
          uTiltSpread: tiltSpreadValue,
        });
        swap();
      }
    }

    // --- GRAIN (final → screen) ---
    this.renderPass(this.grainProgram, currentTexture, null, {
      uIntensity: params.grain.intensity / 100,
      uSize: 0.0,
      uMono: 1.0,
      uSeed: this.grainSeed,
      uResolution: [w, h],
    });
  }

  async export(
    params: GrainWashParams,
    format: 'png' | 'jpeg' | 'webp' = 'png',
    quality = 0.92
  ): Promise<Blob> {
    this.render(params);
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error('Export failed')); },
        `image/${format}`,
        quality
      );
    });
  }

  setPreviewSize(maxDim: number) {
    this.previewMaxDim = maxDim;
    this.setCanvasToCurrentOutputSize();
  }

  setFullResolution() {
    this.previewMaxDim = null;
    this.setCanvasToCurrentOutputSize();
  }

  destroy() {
    const gl = this.gl;
    if (this.sourceTexture) gl.deleteTexture(this.sourceTexture);
    if (this.fbA) {
      gl.deleteTexture(this.fbA.attachments[0]);
      gl.deleteFramebuffer(this.fbA.framebuffer);
    }
    if (this.fbB) {
      gl.deleteTexture(this.fbB.attachments[0]);
      gl.deleteFramebuffer(this.fbB.framebuffer);
    }
  }
}
