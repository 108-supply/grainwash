<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { GrainWashRenderer, defaultParams, type GrainWashParams, type AspectRatio } from '../engine/renderer';
  import { presets, DEFAULT_PRESET_ID } from '../presets';
  import Controls from './Controls.svelte';
  import PresetPanel from './PresetPanel.svelte';
  import ExportButton from './ExportButton.svelte';

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

  onMount(() => {
    renderer = new GrainWashRenderer(canvas);
    window.addEventListener('paste', onPaste);
  });

  onDestroy(() => {
    window.removeEventListener('paste', onPaste);
    if (renderFrame !== null) cancelAnimationFrame(renderFrame);
    renderer?.destroy();
  });

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
    if (!file.type.startsWith('image/')) return;

    const img = new Image();
    img.onload = async () => {
      renderer?.loadImage(img);
      if (activeAspect !== 'original') renderer?.setAspectRatio(activeAspect);
      flushRender(params);
      fileName = name ?? file.name;
      imageLoaded = true;
      await tick();
    };
    img.src = URL.createObjectURL(file);
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
    flushRender(params);
    const blob = await renderer.export(detail.format);
    const ext = detail.format === 'jpeg' ? 'jpg' : detail.format;
    downloadBlob(blob, ext);
  }

  function removeImage() {
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

  <!-- ===== LANDING ===== -->
  <section class="gw-start" class:gw-start--hidden={imageLoaded}>
    <div class="gw-demo-strip" aria-hidden="true">
      <div class="gw-demo-card gw-demo-card--left">
        <img src="/grainwash-demo-original.png" alt="" />
      </div>
      <svg class="gw-demo-arrow" viewBox="0 0 524 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 98C118 18 203 18 256 86C302 145 207 156 205 87C203 18 341 9 508 96" stroke="currentColor" stroke-width="2" stroke-dasharray="10 10"/>
        <path d="M500 78L510 97L491 108" stroke="currentColor" stroke-width="2"/>
        <path d="M34 82L16 99L38 106" stroke="currentColor" stroke-width="2"/>
      </svg>
      <div class="gw-demo-card gw-demo-card--right">
        <img src="/grainwash-demo-processed.png" alt="" />
      </div>
    </div>

    <div class="gw-start-copy">
      <h1>Turn digital photos into timeless images.</h1>
      <p>Add cinematic blur, realistic grain and nostalgic texture in just a few clicks.</p>
    </div>

    <button class="gw-dropzone" type="button" on:click={openFilePicker}>
      <svg class="gw-upload-icon" viewBox="0 0 24 24" fill="none">
        <path d="M12 15V3m0 0 4 4m-4-4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5 15v3.5A2.5 2.5 0 0 0 7.5 21h9A2.5 2.5 0 0 0 19 18.5V15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <span>Drop your image here</span>
      <small>or click to browse · paste from clipboard</small>
    </button>

    <div class="gw-privacy">
      <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 10.5V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 7.5h.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
      <span>Private by default.</span>
      <span>Your images never leave your browser.</span>
    </div>
  </section>

  <!-- ===== EDITOR ===== -->
  <section class="gw-workspace" class:gw-workspace--hidden={!imageLoaded}>
    <div class="gw-preview-card">
      <div class="gw-image-actions">
        <button class="gw-icon-btn gw-replace" type="button" on:click={openReplacePicker} aria-label="Replace image">
          <svg viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 0 1-15.2 6.5M3 12A9 9 0 0 1 18.2 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M21 5v6h-6M3 19v-6h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>Replace image</span>
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
    background: #0A0A0C;
    color: rgba(239, 241, 240, 1);
    font-family: var(--font-body);
    overflow: hidden;
  }

  .gw-file-input { display: none; }

  .gw-start,
  .gw-workspace {
    height: 100vh;
    transition: opacity 240ms ease, transform 240ms ease;
  }

  .gw-start--hidden,
  .gw-workspace--hidden {
    opacity: 0;
    pointer-events: none;
    position: absolute;
    inset: 0;
  }

  /* ===== LANDING ===== */
  .gw-start {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 24px 56px;
    gap: 42px;
  }

  .gw-demo-strip {
    position: relative;
    width: min(760px, 82vw);
    height: 170px;
  }

  .gw-demo-card {
    position: absolute;
    width: 144px;
    height: 144px;
    border-radius: 18px;
    overflow: hidden;
    border: 1px solid rgba(239, 241, 240, 0.08);
    box-shadow: 0 22px 60px rgba(0, 0, 0, 0.42);
  }
  .gw-demo-card img { width: 100%; height: 100%; object-fit: cover; }
  .gw-demo-card--left { left: 28px; bottom: 2px; transform: rotate(-8deg); }
  .gw-demo-card--right { right: 24px; top: 4px; transform: rotate(7deg); }

  .gw-demo-arrow {
    position: absolute;
    inset: 0 105px auto;
    width: calc(100% - 210px);
    height: 152px;
    color: #9EB718;
    opacity: 0.9;
  }

  .gw-start-copy {
    max-width: 780px;
    text-align: center;
    margin-top: -22px;
  }
  .gw-start-copy h1 {
    font-family: var(--font-heading);
    font-size: clamp(48px, 7vw, 96px);
    line-height: 0.9;
    letter-spacing: -0.045em;
    font-weight: 500;
    max-width: 780px;
    margin: 0;
  }
  .gw-start-copy p {
    margin: 20px auto 0;
    max-width: 520px;
    font-size: 16px;
    line-height: 24px;
    letter-spacing: 0.012em;
    color: rgba(239, 241, 240, 0.64);
  }

  .gw-dropzone {
    width: min(520px, calc(100vw - 48px));
    height: 190px;
    border: 1px dashed rgba(239, 241, 240, 0.08);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.01);
    color: rgba(239, 241, 240, 1);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
  }
  .gw-shell--dragging .gw-dropzone,
  .gw-dropzone:hover {
    border-color: rgba(239, 241, 240, 0.32);
    background: rgba(239, 241, 240, 0.035);
    transform: translateY(-1px);
  }
  .gw-upload-icon { width: 24px; height: 24px; margin-bottom: 20px; color: rgba(239, 241, 240, 0.92); }
  .gw-dropzone span { font-size: 20px; line-height: 28px; letter-spacing: -0.02em; }
  .gw-dropzone small { margin-top: 2px; font-size: 14px; line-height: 20px; color: rgba(239, 241, 240, 0.32); }

  .gw-privacy {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-family: var(--font-label);
    font-size: 11px;
    line-height: 12px;
    text-transform: uppercase;
    letter-spacing: 0.075em;
    color: rgba(239, 241, 240, 0.32);
  }
  .gw-privacy svg { width: 17px; height: 17px; margin-bottom: 12px; color: rgba(239, 241, 240, 0.64); }

  /* ===== EDITOR (fullscreen, no scroll) ===== */
  .gw-workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 420px;
    gap: 12px;
    padding: 20px;
    overflow: hidden;
  }

  .gw-preview-card {
    position: relative;
    border-radius: 24px;
    overflow: hidden;
    background: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .gw-canvas {
    display: block;
    max-width: 70%;
    max-height: calc((100vh - 40px) * 0.7);
    width: auto;
    height: auto;
    border-radius: 24px;
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

  /* Sidebar — fixed height, internal scroll */
  .gw-sidebar {
    height: calc(100vh - 40px);
    border-radius: 24px;
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

  /* ===== RESPONSIVE ===== */
  @media (max-width: 1100px) {
    .gw-workspace {
      grid-template-columns: 1fr;
      padding: 12px;
      gap: 12px;
      height: auto;
      min-height: 100vh;
      overflow-y: auto;
    }
    .gw-preview-card { height: 50vh; min-height: 300px; background: #000000; }
    .gw-canvas { max-width: 70%; max-height: calc(50vh * 0.7); }
    .gw-sidebar { height: auto; }
    .gw-sidebar-scroll { padding: 32px; }
  }

  @media (max-width: 767px) {
    .gw-start { padding: 32px 20px; gap: 32px; }
    .gw-demo-strip { width: 100%; height: 128px; }
    .gw-demo-card { width: 98px; height: 98px; border-radius: 14px; }
    .gw-demo-arrow { inset: 0 76px auto; width: calc(100% - 152px); height: 112px; }
    .gw-start-copy h1 { font-size: 48px; line-height: 0.94; letter-spacing: -0.045em; }
    .gw-workspace { padding: 8px; gap: 8px; }
    .gw-preview-card { height: 45vh; border-radius: 18px; background: #000000; }
    .gw-canvas { border-radius: 18px; max-width: 70%; max-height: calc(45vh * 0.7); }
    .gw-sidebar-scroll { padding: 24px; }
  }
</style>
