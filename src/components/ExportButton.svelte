<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { AspectRatio } from '../engine/renderer';

  type ImageFormat = 'png' | 'jpeg' | 'webp';

  const dispatch = createEventDispatcher<{
    export: { format: ImageFormat };
    aspectChange: AspectRatio;
  }>();

  export let activeAspect: AspectRatio = 'original';

  let format: ImageFormat = 'png';
  let exporting = false;

  const aspects: { id: AspectRatio; label: string }[] = [
    { id: 'original', label: 'Original' },
    { id: '1:1', label: '1:1' },
    { id: '3:4', label: '3:4' },
    { id: '4:3', label: '4:3' },
    { id: '9:16', label: '9:16' },
    { id: '16:9', label: '16:9' },
  ];

  function setAspect(ratio: AspectRatio) {
    activeAspect = ratio;
    dispatch('aspectChange', ratio);
  }

  async function handleExport() {
    exporting = true;
    dispatch('export', { format });
    setTimeout(() => (exporting = false), 1200);
  }
</script>

<div class="export">
  <div class="export-line">
    <div class="line-header">
      <span>Aspect Ratio</span>
      <svg viewBox="0 0 24 24" fill="none"><path d="m7 14 5-5 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="aspect-grid">
      {#each aspects as aspect}
        <button class="choice-btn" class:active={activeAspect === aspect.id} on:click={() => setAspect(aspect.id)}>{aspect.label}</button>
      {/each}
    </div>
  </div>

  <div class="export-line export-line--format">
    <div class="line-header">
      <span>Format</span>
      <svg viewBox="0 0 24 24" fill="none"><path d="m7 10 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="format-row">
      <button class="choice-btn" class:active={format === 'png'} on:click={() => (format = 'png')}>PNG</button>
      <button class="choice-btn" class:active={format === 'jpeg'} on:click={() => (format = 'jpeg')}>JPG</button>
      <button class="choice-btn" class:active={format === 'webp'} on:click={() => (format = 'webp')}>WebP</button>
    </div>
  </div>

  <button class="export-btn" on:click={handleExport} disabled={exporting}>
    {exporting ? 'Exporting…' : 'Download'}
  </button>
</div>

<style>
  .export { display: flex; flex-direction: column; }

  .export-line {
    border-bottom: 1px solid rgba(239, 241, 240, 0.08);
    padding-bottom: 24px;
  }
  .export-line--format { padding: 16px 0; }

  .line-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: rgba(239, 241, 240, 1);
    font-size: 16px;
    line-height: 24px;
    letter-spacing: -0.02em;
    margin-bottom: 16px;
  }
  .line-header svg { width: 18px; height: 18px; color: rgba(239, 241, 240, 0.64); }

  .aspect-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .format-row {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .choice-btn {
    min-height: 48px;
    border: 0;
    border-radius: 8px;
    background: rgba(239, 241, 240, 0.52);
    color: rgba(10, 10, 12, 0.92);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 20px;
    letter-spacing: -0.02em;
    transition: background 160ms ease, color 160ms ease;
  }
  .choice-btn:hover { background: rgba(239, 241, 240, 0.72); }
  .choice-btn.active { background: rgba(239, 241, 240, 1); color: #0A0A0C; }

  .export-btn {
    margin-top: auto;
    min-height: 48px;
    border: 0;
    border-radius: 8px;
    background: rgba(239, 241, 240, 1);
    color: #0A0A0C;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 20px;
    letter-spacing: -0.02em;
    transition: background 160ms ease, transform 160ms ease, opacity 160ms ease;
  }
  .export-btn:hover { background: #fff; transform: translateY(-1px); }
  .export-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  @media (max-width: 767px) {
    .choice-btn { min-height: 44px; font-size: 14px; }
  }
</style>
