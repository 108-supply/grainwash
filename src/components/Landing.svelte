<script lang="ts">
  import { onMount } from 'svelte';
  import { init3DCardsTornado } from '../scripts/cardsTornado';
  import '../styles/cards-tornado.css';

  export let onUpload: () => void;
  export let isDragging = false;

  let tornadoRoot: HTMLElement;

  onMount(() => {
    init3DCardsTornado(tornadoRoot);
  });

  const cardImages = [
    '/grainwash-demo-original.png',
    '/grainwash-demo-processed.png',
    'https://cdn.prod.website-files.com/6a29211ed53fb474353e0c9f/6a2c07aef8bb2296c518b0ec_Shadowed_Silhouette_on_Rugged_Terrain.avif',
    'https://cdn.prod.website-files.com/6a29211ed53fb474353e0c9f/6a2c07ae21453cfd94dcabd0_Focused_Cyclist_Portrait_in_Golden_Hour_Light.avif',
    'https://cdn.prod.website-files.com/6a29211ed53fb474353e0c9f/6a2c07ae7f564388635a4c0e_Serene_Portrait_of_a_Woman_in_Warm_Tones.avif',
    'https://cdn.prod.website-files.com/6a29211ed53fb474353e0c9f/6a2c07ae8a875732ce5ccecf_Sailboat_on_Tranquil_Ocean_Under_Clear_Sky.avif',
    'https://cdn.prod.website-files.com/6a29211ed53fb474353e0c9f/6a2c07af2d72b691e62b852e_Elegant_Reflection_in_Soft_Natural_Light.avif',
    'https://cdn.prod.website-files.com/6a29211ed53fb474353e0c9f/6a2c07af2b69b6a3c677c7ff_Delicate_Green_Stem_with_Buds.avif',
    'https://cdn.prod.website-files.com/6a29211ed53fb474353e0c9f/6a2c07aed011c9c2e7613daa_Close-up_of_Lush_Green_Leaves_with_Textured_Patterns.avif',
    'https://cdn.prod.website-files.com/6a29211ed53fb474353e0c9f/6a2c08c8d011c9c2e761b40b_Minimalist_Tennis_Court_with_Yellow_Balls.avif',
  ];
</script>

<section class="landing" class:landing--dragging={isDragging}>
  <div class="landing__panel landing__panel--copy">
    <header class="landing__bar">
      <span>Grain Wash</span>
      <span>Private by default</span>
      <span>108™</span>
    </header>

    <div class="landing__body">
      <h1>Turn digital photos into timeless images.</h1>
      <p>Add cinematic blur, realistic grain and nostalgic texture in just a few clicks.</p>

      <button class="landing__dropzone" type="button" on:click={onUpload}>
        <svg class="landing__upload-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 15V3m0 0 4 4m-4-4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M5 15v3.5A2.5 2.5 0 0 0 7.5 21h9A2.5 2.5 0 0 0 19 18.5V15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
        <span>Drop your image here</span>
        <small>or click to browse · paste from clipboard</small>
      </button>

      <p class="landing__note">Your files never leave your browser.</p>
    </div>
  </div>

  <div class="landing__panel landing__panel--visual" bind:this={tornadoRoot}>
    <header class="landing__bar landing__bar--dim">
      <span>Motion</span>
      <span>Your favorites</span>
      <span>Grain Wash</span>
    </header>

    <div data-3d-tornado-init data-3d-tornado-always class="cards-tornado">
      <div class="cards-tornado__collection">
        <div data-3d-tornado-list class="cards-tornado__list">
          {#each cardImages as src}
            <div data-3d-tornado-item class="cards-tornado__item">
              <div draggable="false" class="demo-card">
                <div class="demo-card__face demo-card__face--front">
                  <img {src} loading="lazy" alt="" class="cover-image" />
                </div>
                <div class="demo-card__face demo-card__face--back" aria-hidden="true"></div>
                <div class="demo-card__face demo-card__face--edge demo-card__face--right" aria-hidden="true"></div>
                <div class="demo-card__face demo-card__face--edge demo-card__face--left" aria-hidden="true"></div>
                <div class="demo-card__face demo-card__face--edge demo-card__face--top" aria-hidden="true"></div>
                <div class="demo-card__face demo-card__face--edge demo-card__face--bottom" aria-hidden="true"></div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .landing {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px;
    height: 100vh;
    padding: 8px;
    background: #000;
  }

  .landing__panel {
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .landing__panel--copy {
    background: #f5f5f3;
    color: #0a0a0c;
  }

  .landing__panel--visual {
    background: #0a0a0c;
    color: rgba(239, 241, 240, 0.48);
    position: relative;
  }

  .landing__bar {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    padding: 20px 28px 0;
    font-family: var(--font-label);
    font-size: 11px;
    line-height: 12px;
    letter-spacing: 0.075em;
    text-transform: uppercase;
    color: rgba(10, 10, 12, 0.48);
  }

  .landing__bar span:nth-child(2) { text-align: center; }
  .landing__bar span:nth-child(3) { text-align: right; }

  .landing__bar--dim {
    position: absolute;
    inset: 0 0 auto;
    z-index: 2;
    pointer-events: none;
    color: rgba(239, 241, 240, 0.28);
  }

  .landing__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px clamp(32px, 6vw, 72px);
    max-width: 640px;
  }

  .landing__body h1 {
    font-family: var(--font-heading);
    font-size: clamp(40px, 5.5vw, 72px);
    line-height: 0.92;
    letter-spacing: -0.045em;
    font-weight: 500;
    margin: 0;
  }

  .landing__body p {
    margin: 20px 0 0;
    max-width: 420px;
    font-size: 16px;
    line-height: 24px;
    color: rgba(10, 10, 12, 0.56);
  }

  .landing__dropzone {
    margin-top: 40px;
    width: 100%;
    max-width: 420px;
    min-height: 160px;
    border: 1px dashed rgba(10, 10, 12, 0.16);
    border-radius: 18px;
    background: rgba(10, 10, 12, 0.02);
    color: #0a0a0c;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
  }

  .landing--dragging .landing__dropzone,
  .landing__dropzone:hover {
    border-color: rgba(10, 10, 12, 0.36);
    background: rgba(10, 10, 12, 0.04);
    transform: translateY(-1px);
  }

  .landing__upload-icon {
    width: 24px;
    height: 24px;
    margin-bottom: 16px;
    color: rgba(10, 10, 12, 0.72);
  }

  .landing__dropzone span {
    font-size: 18px;
    line-height: 26px;
    letter-spacing: -0.02em;
  }

  .landing__dropzone small {
    margin-top: 4px;
    font-size: 13px;
    line-height: 18px;
    color: rgba(10, 10, 12, 0.4);
  }

  .landing__note {
    margin-top: 18px;
    font-family: var(--font-label);
    font-size: 11px;
    line-height: 12px;
    letter-spacing: 0.075em;
    text-transform: uppercase;
    color: rgba(10, 10, 12, 0.36);
  }

  .cards-tornado {
    flex: 1;
    min-height: 0;
  }

  @media (max-width: 960px) {
    .landing {
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(320px, 42vh);
      overflow-y: auto;
    }

    .landing__body {
      padding: 32px 24px 40px;
    }

    .landing__body h1 { font-size: 40px; }
  }
</style>
