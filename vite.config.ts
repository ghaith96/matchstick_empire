import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	root: '.',
	base: process.env.BASE_PATH || '/',
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			strategies: 'generateSW',
			manifest: {
				name: 'Matchstick Empire',
				short_name: 'Matchstick Empire',
				description: 'Build your matchstick empire from manual production to global automation',
				theme_color: '#8B4513',
				background_color: '#FFFFFF',
				display: 'standalone',
				start_url: process.env.BASE_PATH || '/',
				icons: [
					{
						src: 'icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}']
			}
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		setupFiles: ['src/setupTests.ts']
	}
});
