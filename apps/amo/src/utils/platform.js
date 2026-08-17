// True on phones/tablets; false on mouse-driven desktops.
// maxTouchPoints is the most reliable signal — pointer:coarse can miss inside WebGL.
export const isMobile = navigator.maxTouchPoints > 0 || ('ontouchstart' in window);

// True inside a Capacitor native WebView (Android/iOS shell).
export const isNative = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
