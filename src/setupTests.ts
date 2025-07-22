import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Mock IndexedDB is automatically setup by fake-indexeddb/auto

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => {},
	}),
});

// Mock navigator.vibrate for haptic feedback tests
Object.defineProperty(navigator, 'vibrate', {
	writable: true,
	value: () => true,
}); 
