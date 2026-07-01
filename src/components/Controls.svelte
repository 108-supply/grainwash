<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { GrainWashParams } from '../engine/renderer';
  import { grainLevels, type GrainLevel } from '../presets';

  export let params: GrainWashParams;

  const dispatch = createEventDispatcher<{ change: GrainWashParams }>();

  let grainLevel: GrainLevel = 'low';

  $: {
    if (params.grain.intensity === grainLevels.low) grainLevel = 'low';
    else if (params.grain.intensity === grainLevels.medium) grainLevel = 'medium';
    else if (params.grain.intensity === grainLevels.hard) grainLevel = 'hard';
    else grainLevel = 'custom';
  }

  function update() {
    dispatch('change', JSON.parse(JSON.stringify(params)));
  }

  function setBlurType(type: 'gaussian' | 'tilt-shift') {
    params.blur.type = type;
    update();
  }

  function setGrainLevel(level: GrainLevel) {
    grainLevel = level;
    if (level !== 'custom') {
      params.grain.intensity = grainLevels[level];
      update();
    }
  }
</script>

<div class="controls">
  <!-- BLUR -->
  <div class="accordion-line">
    <div class="line-header">
      <span>Blur</span>
      <svg viewBox="0 0 24 24" fill="none"><path d="m7 10 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="control-body">
      <div class="slider-row">
        <input type="range" min="0" max="100" bind:value={params.blur.intensity} on:input={update} class="slider" />
        <span class="value">{params.blur.intensity}</span>
      </div>
      <div class="toggle-row two">
        <button class="toggle-btn" class:active={params.blur.type === 'gaussian'} on:click={() => setBlurType('gaussian')}>Gaussian</button>
        <button class="toggle-btn" class:active={params.blur.type === 'tilt-shift'} on:click={() => setBlurType('tilt-shift')}>Tilt-shift</button>
      </div>
      {#if params.blur.type === 'tilt-shift'}
        <div class="sub-control">
          <span class="sub-label">Focus Range</span>
          <div class="slider-row">
            <input type="range" min="0" max="100" bind:value={params.blur.tiltSpread} on:input={update} class="slider" />
            <span class="value">{params.blur.tiltSpread}</span>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- GRAIN -->
  <div class="accordion-line">
    <div class="line-header">
      <span>Grain</span>
      <svg viewBox="0 0 24 24" fill="none"><path d="m7 10 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="control-body">
      <div class="toggle-row four">
        <button class="toggle-btn" class:active={grainLevel === 'low'} on:click={() => setGrainLevel('low')}>Low</button>
        <button class="toggle-btn" class:active={grainLevel === 'medium'} on:click={() => setGrainLevel('medium')}>Medium</button>
        <button class="toggle-btn" class:active={grainLevel === 'hard'} on:click={() => setGrainLevel('hard')}>Hard</button>
        <button class="toggle-btn" class:active={grainLevel === 'custom'} on:click={() => setGrainLevel('custom')}>Custom</button>
      </div>
      {#if grainLevel === 'custom'}
        <div class="slider-row">
          <input type="range" min="0" max="100" bind:value={params.grain.intensity} on:input={update} class="slider" />
          <span class="value">{params.grain.intensity}</span>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .controls { display: flex; flex-direction: column; }

  .accordion-line {
    border-bottom: 1px solid rgba(239, 241, 240, 0.08);
    padding: 16px 0;
  }

  .line-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: rgba(239, 241, 240, 0.64);
    font-size: 16px;
    line-height: 24px;
    letter-spacing: -0.02em;
  }

  .line-header svg { width: 18px; height: 18px; color: rgba(239, 241, 240, 0.64); }

  .control-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 12px;
  }

  .sub-control {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 4px;
  }

  .sub-label {
    font-family: var(--font-label);
    font-size: 11px;
    line-height: 12px;
    letter-spacing: 0.075em;
    text-transform: uppercase;
    color: rgba(239, 241, 240, 0.32);
  }

  .slider-row {
    display: grid;
    grid-template-columns: 1fr 30px;
    align-items: center;
    gap: 10px;
  }

  .value {
    font-family: var(--font-label);
    font-size: 11px;
    line-height: 12px;
    color: rgba(239, 241, 240, 0.32);
    text-align: right;
  }

  .slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 2px;
    background: rgba(239, 241, 240, 0.12);
    border-radius: 999px;
    outline: none;
    cursor: pointer;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px; height: 14px;
    border-radius: 999px;
    background: rgba(239, 241, 240, 1);
    border: 0;
  }
  .slider::-moz-range-thumb {
    width: 14px; height: 14px;
    border-radius: 999px;
    background: rgba(239, 241, 240, 1);
    border: 0;
  }

  .toggle-row { display: grid; gap: 8px; }
  .toggle-row.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .toggle-row.four { grid-template-columns: repeat(4, minmax(0, 1fr)); }

  .toggle-btn {
    min-height: 32px;
    border: 0;
    border-radius: 7px;
    background: rgba(239, 241, 240, 0.08);
    color: rgba(239, 241, 240, 0.64);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 13px;
    line-height: 16px;
    transition: background 160ms ease, color 160ms ease;
  }
  .toggle-btn:hover { background: rgba(239, 241, 240, 0.14); color: rgba(239, 241, 240, 0.88); }
  .toggle-btn.active { background: rgba(239, 241, 240, 1); color: #0A0A0C; }

  @media (max-width: 767px) {
    .toggle-row.four { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
</style>
