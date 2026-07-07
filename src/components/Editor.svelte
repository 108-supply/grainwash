<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { GrainWashRenderer, defaultParams, type GrainWashParams, type AspectRatio } from '../engine/renderer';
  import { presets, DEFAULT_PRESET_ID } from '../presets';
  import Controls from './Controls.svelte';
  import PresetPanel from './PresetPanel.svelte';
  import ExportButton from './ExportButton.svelte';
  import Landing from './Landing.svelte';

  let canvas: HTMLCanvasElement;
  let fileInput: HTMLInputElement;
  let replaceInput: HTMLInputElement;
  let renderer: GrainWashRenderer | null = null;
  let params: GrainWashParams = JSON.parse(JSON.stringify(defaultParams));
  let imageLoaded = false;
  let isDragging = false;
  let activePreset: string | null = DEFAULT_PRESET_ID;
  let activeAspect: AspectRatio = 'original';
  let fileName = 'Untitled image';

  let renderFrame: number | null = null;
  let pendingParams: GrainWashParams | null = null;
  let sourceObjectUrl: string | null = null;

  onMount(() => {
    renderer = new GrainWashRenderer(canvas);
    window.addEventListener('paste', onPaste);
  });

  onDestroy(() => {
    window.removeEventListener('paste', onPaste);
    if (renderFrame !== null) cancelAnimationFrame(renderFrame);
    revokeSourceUrl();
    renderer?.destroy();
  });

  function revokeSourceUrl() {
    if (sourceObjectUrl) {
      URL.revokeObjectURL(sourceObjectUrl);
      sourceObjectUrl = null;
    }
  }

  function renderNow(p: GrainWashParams = params) {
    renderer?.render(p);
  }

  function scheduleRender(p: GrainWashParams = params) {
    pendingParams = p;
    if (renderFrame !== null) return;
    renderFrame = requestAnimationFrame(() => {
      renderFrame = null;
      const next = pendingParams;
      pendingParams = null;
      if (next) renderNow(next);
      if (pendingParams) scheduleRender();
    });
  }

  function flushRender(p: GrainWashParams = params) {
    if (renderFrame !== null) {
      cancelAnimationFrame(renderFrame);
      renderFrame = null;
    }
    pendingParams = null;
    renderNow(p);
  }

  function handleFile(file: File, name?: string) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const img = new Image();
    img.onload = async () => {
      renderer?.loadImage(img);
      if (activeAspect !== 'original') renderer?.setAspectRatio(activeAspect);
      flushRender(params);
      fileName = name ?? file.name;
      imageLoaded = true;
      await tick();
    };
    revokeSourceUrl();
    sourceObjectUrl = URL.createObjectURL(file);
    img.src = sourceObjectUrl;
  }

  function onPaste(e: ClipboardEvent) {
    const target = e.target as HTMLElement | null;
    if (
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.isContentEditable
    ) {
      return;
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (!item.type.startsWith('image/')) continue;
      const file = item.getAsFile();
      if (!file) continue;
      e.preventDefault();
      handleFile(file, 'Pasted image');
      return;
    }
  }

  function onFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) handleFile(input.files[0]);
    input.value = '';
  }

  function openFilePicker() { fileInput?.click(); }
  function openReplacePicker() { replaceInput?.click(); }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }

  function onDragOver(e: DragEvent) { e.preventDefault(); isDragging = true; }
  function onDragLeave() { isDragging = false; }

  function onParamsChange(newParams: GrainWashParams) {
    params = newParams;
    activePreset = null;
    scheduleRender(params);
  }

  function onPresetSelect(presetId: string) {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      params = JSON.parse(JSON.stringify(preset.params));
      activePreset = presetId;
      flushRender(params);
    }
  }

  function onAspectChange(ratio: AspectRatio) {
    activeAspect = ratio;
    renderer?.setAspectRatio(ratio);
    flushRender(params);
  }

  function downloadBlob(blob: Blob, extension: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = fileName.replace(/\.[^/.]+$/, '') || 'grainwash';
    a.download = `${baseName}-grainwash.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onExport(detail: { format: 'png' | 'jpeg' | 'webp' }) {
    if (!renderer) return;
    try {
      flushRender(params);
      const blob = await renderer.export(detail.format);
      const ext = detail.format === 'jpeg' ? 'jpg' : detail.format;
      downloadBlob(blob, ext);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Try PNG or JPG, or use a smaller aspect ratio.');
    }
  }

  function removeImage() {
    revokeSourceUrl();
    imageLoaded = false;
    activePreset = DEFAULT_PRESET_ID;
    activeAspect = 'original';
    fileName = 'Untitled image';
    params = JSON.parse(JSON.stringify(defaultParams));
  }
</script>

<div class="gw-shell" class:gw-shell--dragging={isDragging} on:drop={onDrop} on:dragover={onDragOver} on:dragleave={onDragLeave}>
  <input bind:this={fileInput} type="file" accept="image/*" class="gw-file-input" on:change={onFileInput} />
  <input bind:this={replaceInput} type="file" accept="image/*" class="gw-file-input" on:change={onFileInput} />

  <div class="gw-landing-wrap" class:gw-start--hidden={imageLoaded}>
    <Landing onUpload={openFilePicker} {isDragging} />
  </div>

  <section class="gw-workspace" class:gw-workspace--hidden={!imageLoaded}>
    <div class="gw-preview-card">
      <div class="gw-image-actions">
        <button class="gw-icon-btn gw-replace" type="button" on:click={openReplacePicker} aria-label="Replace image">
          <svg viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 0 1-15.2 6.5M3 12A9 9 0 0 1 18.2 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M21 5v6h-6M3 19v-6h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>Replace</span>
        </button>
        <button class="gw-icon-btn" type="button" on:click={removeImage} aria-label="Remove image">
          <svg viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>
      <canvas bind:this={canvas} class="gw-canvas"></canvas>
    </div>

    <aside class="gw-sidebar">
      <div class="gw-sidebar-scroll">
        <div class="gw-panel-section">
          <span class="gw-kicker">Asset looks</span>
          <PresetPanel {presets} {activePreset} on:select={(e) => onPresetSelect(e.detail)} />
          <Controls {params} on:change={(e) => onParamsChange(e.detail)} />
        </div>

        <div class="gw-panel-section gw-panel-section--download">
          <span class="gw-kicker">Downloading</span>
          <ExportButton {activeAspect} on:export={(e) => onExport(e.detail)} on:aspectChange={(e) => onAspectChange(e.detail)} />
        </div>
      </div>
    </aside>
  </section>
</div>

<style>
  .gw-shell {
    height: 100vh;
    background: #000;
    color: rgba(239, 241, 240, 1);
    font-family: var(--font-body);
    overflow: hidden;
  }

  .gw-file-input { display: none; }

  .gw-landing-wrap {
    height: 100vh;
    transition: opacity 240ms ease;
  }

  .gw-start--hidden,
  .gw-workspace--hidden {
    opacity: 0;
    pointer-events: none;
    position: absolute;
    inset: 0;
  }

  .gw-workspace {
    height: 100vh;
    transition: opacity 240ms ease;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 420px;
    gap: 8px;
    padding: 8px;
    overflow: hidden;
    box-sizing: border-box;
  }

  .gw-preview-card {
    position: relative;
    border-radius: 20px;
    overflow: hidden;
    background: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .gw-canvas {
    display: block;
    max-width: 70%;
    max-height: calc((100vh - 16px) * 0.7);
    width: auto;
    height: auto;
    border-radius: 20px;
  }

  .gw-image-actions {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 3;
    display: flex;
    gap: 8px;
  }

  .gw-icon-btn {
    height: 36px;
    min-width: 36px;
    border: 1px solid rgba(239, 241, 240, 0.12);
    border-radius: 999px;
    background: rgba(10, 10, 12, 0.72);
    color: rgba(239, 241, 240, 0.8);
    backdrop-filter: blur(12px);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 10px;
    transition: background 180ms ease, color 180ms ease, border-color 180ms ease;
  }
  .gw-icon-btn svg { width: 18px; height: 18px; flex: 0 0 auto; }
  .gw-icon-btn span {
    max-width: 0; opacity: 0; overflow: hidden; white-space: nowrap;
    font-size: 13px; line-height: 16px;
    transition: max-width 180ms ease, opacity 160ms ease;
  }
  .gw-icon-btn:hover { background: rgba(10, 10, 12, 0.9); border-color: rgba(239, 241, 240, 0.32); color: rgba(239, 241, 240, 1); }
  .gw-replace:hover span { max-width: 110px; opacity: 1; }

  .gw-sidebar {
    height: calc(100vh - 16px);
    border-radius: 20px;
    background: #232323;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .gw-sidebar-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 48px 48px 32px;
    display: flex;
    flex-direction: column;
    gap: 36px;
  }

  .gw-panel-section {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .gw-panel-section--download { margin-top: 4px; }

  .gw-kicker {
    font-family: var(--font-label);
    font-size: 11px;
    line-height: 12px;
    letter-spacing: 0.075em;
    text-transform: uppercase;
    color: rgba(239, 241, 240, 0.32);
  }

  @media (max-width: 1100px) {
    .gw-workspace {
      grid-template-columns: 1fr;
      height: auto;
      min-height: 100vh;
      overflow-y: auto;
    }
    .gw-preview-card { height: 50vh; min-height: 300px; }
    .gw-canvas { max-width: 70%; max-height: calc(50vh * 0.7); }
    .gw-sidebar { height: auto; }
    .gw-sidebar-scroll { padding: 32px; }
  }

  @media (max-width: 767px) {
    .gw-workspace { padding: 8px; gap: 8px; }
    .gw-preview-card { height: 45vh; border-radius: 18px; }
    .gw-canvas { border-radius: 18px; max-width: 70%; max-height: calc(45vh * 0.7); }
    .gw-sidebar-scroll { padding: 24px; }
  }
</style>
