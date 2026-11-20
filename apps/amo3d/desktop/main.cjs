// Arcane Majesty — the desktop app (Electron): the same web build as the phone's, in its own window.
// F11 full screen · the game's own menus do the rest. Saves live in the app's own storage (as in a browser).
// Test hook: AMO_SHOT=<file> loads, waits, saves a screenshot there and quits (CI / headless checks).
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280, height: 720, minWidth: 800, minHeight: 450, backgroundColor: '#0a0610', title: 'Arcane Majesty',
        autoHideMenuBar: true,
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    Menu.setApplicationMenu(null);
    // Links out of the game open in the browser, never in the game's window.
    win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
    win.webContents.on('before-input-event', (e, input) => {
        if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    });
    win.loadFile(path.join(__dirname, 'app', 'index.html'));
    if (process.env.AMO_SHOT) {
        win.webContents.on('console-message', (_e, level, msg) => { if (level >= 2) console.log('[page]', msg); });
        setTimeout(async () => {
            const img = await win.webContents.capturePage();
            require('fs').writeFileSync(process.env.AMO_SHOT, img.toPNG());
            app.quit();
        }, 9000);
    }
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
