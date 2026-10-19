/* Windows window material.
 *
 * Tauri drove DWM directly from Rust. Electron has no equivalent for Windows
 * 10 (backgroundMaterial is Windows 11 only), so this calls the same
 * SetWindowCompositionAttribute that the Rust build used, through koffi.
 *
 * If koffi is unavailable the app still works: it falls back to the solid
 * Classic look rather than a sharp, unblurred desktop showing through the
 * sidebar.
 */
let koffi = null;
try { koffi = require('koffi'); } catch (_) { koffi = null; }

let api = null;          // { set, ACCENT_POLICY, WCAD, sizeOf, as }
let current = 'neo';     // 'neo' = acrylic, 'classic' = solid
let lastMove = 0;
let restore = null;

if (koffi && process.platform === 'win32') {
  try {
    const user32 = koffi.load('user32.dll');
    const ACCENT_POLICY = koffi.struct('ACCENT_POLICY', {
      AccentState: 'uint32',
      AccentFlags: 'uint32',
      GradientColor: 'uint32',
      AnimationId: 'uint32'
    });
    const WCAD = koffi.struct('WINDOWCOMPOSITIONATTRIBDATA', {
      Attribute: 'int',
      Data: 'void *',
      Size: 'size_t'
    });
    const set = user32.func('bool __stdcall SetWindowCompositionAttribute(intptr_t hwnd, WINDOWCOMPOSITIONATTRIBDATA *data)');
    api = { set, ACCENT_POLICY, WCAD };
  } catch (_) {
    api = null;
  }
}

const ACCENT_DISABLED = 0;
const ACCENT_BLURBEHIND = 3;        // cheap Aero blur, used while moving
const ACCENT_ACRYLIC = 4;           // the real material

const ATTR_ACCENT = 19;

function hwndOf(win) {
  if (!win || win.isDestroyed()) return null;
  try {
    const buf = win.getNativeWindowHandle();
    return buf.readBigUInt64LE(0);
  } catch (_) {
    return null;
  }
}

function accent(win, state) {
  if (!api) return false;
  const hwnd = hwndOf(win);
  if (!hwnd) return false;

  // ABGR. A dark tint at ~60% so the app's own translucent sidebar reads the
  // same as it did under Tauri.
  const policy = {
    AccentState: state,
    AccentFlags: state === ACCENT_DISABLED ? 0 : 2,
    GradientColor: state === ACCENT_DISABLED ? 0 : 0x991C1C1C,
    AnimationId: 0
  };
  const data = {
    Attribute: ATTR_ACCENT,
    Data: koffi.as(policy, 'ACCENT_POLICY *'),
    Size: koffi.sizeof(api.ACCENT_POLICY)
  };
  try {
    return !!api.set(hwnd, data);
  } catch (_) {
    return false;
  }
}

function apply(win) {
  if (!win || win.isDestroyed()) return;
  if (current === 'classic') {
    accent(win, ACCENT_DISABLED);
    return;
  }
  // If the call is refused, hide the problem instead of showing a sharp desktop
  // through the panel.
  if (!accent(win, ACCENT_ACRYLIC)) {
    win.setBackgroundColor('#2b2b2f');
  }
}

/* Moving a window is where acrylic is expensive: every frame re-composites the
   noise layer. Swap to the cheaper blur while it moves, and back once it stops,
   which is what the Tauri build did too. */
function moved(win) {
  if (!api || current !== 'neo' || !win || win.isDestroyed()) return;
  if (!accent(win, ACCENT_BLURBEHIND)) return;
  clearTimeout(restore);
  restore = setTimeout(() => {
    if (current === 'neo') accent(win, ACCENT_ACRYLIC);
  }, 160);
}

module.exports = { apply, moved, setTheme };

function setTheme(win, theme) {
  current = theme === 'classic' ? 'classic' : 'neo';
  apply(win);
}
