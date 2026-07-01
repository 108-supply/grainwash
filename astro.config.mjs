import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  integrations: [svelte()],
  vite: {
    plugins: [glsl()],
  }
});
