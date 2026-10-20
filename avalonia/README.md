# Folio on Avalonia

This branch is the Avalonia port of Folio. The first stage is a hybrid: the
existing `src/` HTML/CSS/JS UI runs inside Avalonia's `NativeWebView`, and the
Tauri commands are implemented in C#. The frontend is unchanged; a small
`window.__TAURI__` shim and a command bridge are injected before the page
scripts run.

## Requirements

- .NET SDK 10 (the projects target `net8.0`, but the Avalonia 12 source
  generators need the newer Roslyn compiler).
- WebView2 runtime on Windows.
- Windows 11 for the rounded corners and acrylic. Windows 10 runs with square
  corners, and the other platforms use their own window decorations.

## Build and run

```powershell
dotnet build avalonia/Folio.sln
dotnet run --project avalonia/Folio.Desktop
```

The `Folio.Desktop` project copies `src/` into `web/` in the output directory,
so the webview loads the same files the Tauri app serves. `__host.html` is
written next to them at startup to bootstrap the bridge.

## What is ported

- Vault discovery and tree (`VaultService`), note read/write, create, rename,
  delete and move, folders, import, reveal and avatar storage.
- Settings: appearance (light, dark or follow the system, which is the default),
  editor theme (synced with the app by default, or pinned light/dark), window
  material (neo glass or solid classic), per-note font/size/spacing, pinned
  notes, order, sidebar width, inline title and app icon.
- Appearance is applied in two places that agree: the page swaps a light/dark
  palette for the chrome and a separate editor palette for the note paper
  (toolbar, footer and editor), and the shell brings its own theme variant
  along. Under "system" the shell listens to the OS colour changes and the page
  repaints, so switching Windows between light and dark updates the running
  window. The editor theme follows the app by default; pinning it lets a dark
  window keep a light page, or the reverse.
- Native file dialogs for picking the vault, avatar, icon and imports.
- Window controls: minimize, close, maximize/restore, caption drag and edge /
  corner resizing, including on the transparent extended client area.
- Windows 11 window chrome: the native DWM frame and accent border are kept.
  The content, acrylic backdrop and the DWM window share the same 8px corner
  radius; the radius becomes 0 when maximized and on Windows 10.
- The WebView's browser context menu is suppressed. The page's own note,
  folder and editor menus still work.

## Known gaps

- Drag-and-drop from Explorer is wired through the Avalonia drop events but has
  not been exercised over the composited webview.
- Caption dragging on macOS/Linux is not implemented yet. Resize roles and the
  rest of the window chrome are cross-platform.
- `__host.html` is written into the output folder. A read-only install
  location (e.g. Program Files) will need a per-user cache directory.
- Packaging, signing and a native (non-webview) UI are follow-up work.

The Tauri app on `main` is unchanged and still builds with `tools/tauri.ps1`.
