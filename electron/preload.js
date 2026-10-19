/* The renderer's window.__TAURI__ surface, backed by Electron.
 *
 * src/index.html was written against Tauri 2 and is kept as it is; this shim
 * gives it the same shape:
 *
 *   __TAURI__.core.invoke(cmd, args)      -> ipc 'folio'
 *   __TAURI__.dialog.open({ type, ... })  -> native open dialog
 *   __TAURI__.window.getCurrentWindow()   -> close / minimize / maximize
 *   __TAURI__.event.listen(name, cb)      -> drag-drop, translated from the DOM
 *
 * File drops are the one place where the shape differs: Tauri hands over file
 * paths, a browser hands over File objects. Electron's webUtils turns the
 * latter into the former, so the renderer's `e.payload.paths` still works.
 */
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const invoke = async (cmd, args) => {
  try {
    return await ipcRenderer.invoke('folio', cmd, args || {});
  } catch (err) {
    // Electron wraps handler errors; keep just the message the app wrote.
    const message = String(err && err.message ? err.message : err)
      .replace(/^Error invoking remote method 'folio': (Error: )?/, '');
    throw new Error(message);
  }
};

function listenTauri(name, cb) {
  if (name === 'tauri://drag-drop') {
    const onDrop = (e) => {
      e.preventDefault();
      document.documentElement.classList.remove('dropping');
      const files = e.dataTransfer ? Array.from(e.dataTransfer.files || []) : [];
      const paths = files.map((f) => {
        try { return webUtils.getPathForFile(f); } catch (_) { return ''; }
      }).filter(Boolean);
      if (paths.length) cb({ payload: { paths } });
    };
    window.addEventListener('drop', onDrop);
    return () => window.removeEventListener('drop', onDrop);
  }

  if (name === 'tauri://drag-enter') {
    const onOver = (e) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
        e.preventDefault();
        cb({});
      }
    };
    window.addEventListener('dragover', onOver);
    return () => window.removeEventListener('dragover', onOver);
  }

  if (name === 'tauri://drag-leave') {
    const onLeave = (e) => {
      if (e.relatedTarget === null) cb({});
    };
    window.addEventListener('dragleave', onLeave);
    return () => window.removeEventListener('dragleave', onLeave);
  }

  return () => {};
}

/* Dropping a file anywhere else would make the window navigate to it — which
   looks like the app has closed. Swallow it. */
window.addEventListener('dragover', (e) => { e.preventDefault(); });
window.addEventListener('drop', (e) => { e.preventDefault(); });

contextBridge.exposeInMainWorld('__TAURI__', {
  core: { invoke },

  dialog: {
    open: (options) => ipcRenderer.invoke('dialog:open', options || {})
  },

  window: {
    getCurrentWindow: () => ({
      close: () => ipcRenderer.send('win:close'),
      minimize: () => ipcRenderer.send('win:minimize'),
      toggleMaximize: () => ipcRenderer.send('win:toggle-maximize'),
      isMaximized: () => ipcRenderer.invoke('win:is-maximized'),
      onResized: (cb) => {
        ipcRenderer.on('win:resized', () => cb({ payload: {} }));
      },
      setIcon: () => { /* icons go through the set_app_icon command */ }
    })
  },

  event: { listen: listenTauri }
});
