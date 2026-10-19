# Folio — plan

A notes app with the look of Mac OS X Tiger. Electron for the window and files,
plain HTML and CSS for the interface, no bundler.

## How it fits together

- `src/index.html` is the whole interface. One file, no imports besides
  `js/markdown.js`.
- `js/markdown.js` converts between markdown and the editor's HTML.
- `electron/preload.js` gives the page the small `window.__TAURI__` surface it
  was written against: `invoke`, `dialog.open`, window controls, file drops.
- `electron/vault.js` does everything on disk: the tree, note files, folders,
  settings.
- `electron/material.js` asks Windows for the blur behind the sidebar.

Settings and notes are stored the same way they were in the Tauri version, so
the two builds can share them.

## Done

- Frameless, transparent window with Windows caption buttons and a drag strip.
- Sidebar: tree from disk, expand/collapse, selection, drag rows to reorder,
  drag a note onto a folder to move it, pin notes and folders, search.
- Notes: markdown files, subfolders, autosave, rename, delete to `.trash/`,
  resume the last note on launch.
- Editor: headings, bold, italic, underline, strikethrough, highlight, links,
  lists, quotes, code, images.
- Photo frames: drag, resize, rotate, with the geometry kept in the note.
- Per note: typeface, base size, line spacing, and the note name either in its
  own bar or in the page above the text.
- Read mode, which locks the note and the frames.
- Undo and redo, including for menu actions.
- Settings: theme, app icon, notes folder, sidebar width.
- Tests for the markdown converter.

## Next

- Build and try the installer (`bun run dist`).
- Split `src/index.html` into a few files. It is long and getting longer.
- Watch the notes folder, so a file changed in another editor shows up without
  a restart or a manual refresh.
- Move pictures out of the note and into `.attachments/`, stored by hash, so a
  vault stays small when it syncs.
- A native menu, and keyboard shortcuts for the common actions.
- Windows code signing, and a Linux build if anyone wants one.

## Known issues

- The editor uses `execCommand`, which is deprecated. Most of its quirks are
  worked around, but a proper document model would be less trouble in the long
  run. That is a big change, so it waits.
- Notes with many inline pictures take a moment to open, because every picture
  is text inside the markdown file.
- The screenshots in `docs/` are old and will keep going stale.
- The acrylic call is Windows 10 only. Windows 11 would need `backgroundMaterial`
  instead, and a fallback for machines that refuse both.

## Not planned

Backlinks, plugins, a mobile version, collaboration, encryption.
