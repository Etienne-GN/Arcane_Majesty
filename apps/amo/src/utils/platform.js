// True on phones/tablets (touch-primary); false on mouse-driven desktops.
// Uses pointer media query rather than UA sniffing — more reliable across devices.
export const isMobile = window.matchMedia('(pointer: coarse)').matches;
