<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Preset } from '../presets';

  export let presets: Preset[];
  export let activePreset: string | null;

  const dispatch = createEventDispatcher<{ select: string }>();
</script>

<div class="presets">
  <div class="panel-row">
    <span class="panel-title">Presets</span>
    <svg class="chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m7 14 5-5 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>
  <div class="presets-row">
    {#each presets as preset}
      <button class="preset-btn" class:active={activePreset === preset.id} on:click={() => dispatch('select', preset.id)}>
        {preset.name}
      </button>
    {/each}
  </div>
</div>

<style>
  .presets {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;
    border-bottom: 1px solid rgba(239, 241, 240, 0.08);
  }

  .panel-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .panel-title {
    font-size: 16px;
    line-height: 24px;
    letter-spacing: -0.02em;
    color: rgba(239, 241, 240, 1);
  }

  .chevron {
    width: 18px;
    height: 18px;
    color: rgba(239, 241, 240, 0.64);
  }

  .presets-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .preset-btn {
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
    transition: background 160ms ease, color 160ms ease, transform 160ms ease;
  }

  .preset-btn:hover {
    background: rgba(239, 241, 240, 0.72);
  }

  .preset-btn.active {
    background: rgba(239, 241, 240, 1);
    color: #0A0A0C;
  }

  @media (max-width: 767px) {
    .preset-btn {
      min-height: 44px;
      font-size: 14px;
    }
  }
</style>
