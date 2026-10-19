/* The electron main process:
 *
 *   - one frameless, transparent window, so the app's own chrome is the window
 *   - the same config directory the Tauri build used, so notes, fonts, pins and
 *     settings carry over untouched (see the app.setPath below)
 *   - a single IPC channel, 'folio', matching the renderer's invoke(cmd, args)
 *   - window controls over IPC, for the caption buttons the page draws
 *
 * The renderer is the Tauri renderer: src/index.html and src/js/markdown.js are
 * unchanged. electron/preload.js provides the small window.__TAURI__ surface it
 * expects, so the frontend port is a shim rather than a rewrite.
 */
const path = require('path');
const { app, BrowserWindow, ipcMain, dialog, nativeImage, shell } = require('electron');

const vault = require('./vault');
const material = require('./material');

// The Tauri app's config dir is %APPDATA%\com.nick.notes. Reusing it means the
// notes folder, per-note fonts/sizes/spacing, pins and order all come across.
app.setPath('userData', path.join(app.getPath('appData'), 'com.nick.notes'));

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 760,
    minHeight: 460,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true
    }
  });

  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
    material.apply(win);
    win.webContents.send('win:resized');
  });

  const resized = () => {
    if (win && !win.isDestroyed()) win.webContents.send('win:resized');
    material.moved(win);
  };
  win.on('resize', resized);
  win.on('maximize', resized);
  win.on('unmaximize', resized);
  win.on('move', () => material.moved(win));

  win.on('closed', () => { win = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------------------------------------------------------------- commands

ipcMain.handle('folio', async (_event, cmd, args) => {
  const result = await vault.command(cmd, args || {}, {
    win,
    shell,
    nativeImage,
    dialog,
    setIcon: (buffer, size) => {
      if (!win || win.isDestroyed()) return;
      // The renderer hands over RGBA; Electron's bitmap API wants BGRA.
      const bgra = Buffer.from(buffer);
      for (let i = 0; i < bgra.length; i += 4) {
        const r = bgra[i], b = bgra[i + 2];
        bgra[i] = b;
        bgra[i + 2] = r;
      }
      win.setIcon(nativeImage.createFromBitmap(bgra, { width: size, height: size }));
    }
  });
  return result;
});

ipcMain.handle('dialog:open', async (_event, opts) => {
  const result = await dialog.showOpenDialog(win, {
    title: opts && opts.title ? opts.title : undefined,
    properties: opts && opts.directory ? ['openDirectory'] : ['openFile']
  });
  return result.canceled || !result.filePaths.length ? null : result.filePaths[0];
});

ipcMain.on('win:close', () => { if (win) win.close(); });
ipcMain.on('win:minimize', () => { if (win) win.minimize(); });
ipcMain.on('win:toggle-maximize', () => {
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.handle('win:is-maximized', () => !!(win && win.isMaximized()));
