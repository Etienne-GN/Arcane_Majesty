// Controls delivery mode.
//   launcher: the LauncherControls deck is the sole on-screen controls (APK build,
//             set via VITE_AMO_CONTROLS=launcher). The deck always renders.
//   builtin:  default browser mode; the deck renders only on touch devices and the
//             game's own keyboard/mouse/gamepad remain the primary inputs.
const MODE = import.meta.env?.VITE_AMO_CONTROLS ?? 'builtin';
export const controlsMode = MODE === 'launcher' ? 'launcher' : 'builtin';
export const isLauncherMode = controlsMode === 'launcher';
