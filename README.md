# Folio

A notes app for Windows that looks like an old Mac OS X app. Dark translucent
sidebar, beveled buttons, a white page to type on. Notes are plain markdown
files in a folder you choose.

![Folio](docs/preview.png)

## Running it

You need [bun](https://bun.sh).

```
bun install
bun start
```

An installer is `bun run dist`. That path has not been tested yet.

For design work there is a browser preview, which needs nothing installed:

```
python -m http.server 4174 --directory src
```

Open http://127.0.0.1:4174. Without Electron the app keeps its notes in memory,
so clicking around won't touch any files.

## Tests

```
bun tools/markdown.test.js
```

73 checks on the markdown converter. Besides the obvious cases, it reads a
document back and writes it again, and expects the same text both times.

## What's where

```
src/                  the app: index.html, js/markdown.js, assets
electron/main.js      window, IPC, caption buttons
electron/preload.js   the bridge the page uses instead of window.__TAURI__
electron/vault.js     notes, folders and settings on disk
electron/material.js  the Windows blur behind the sidebar
electron/icons/       app icon and its source
tools/                icon and font generation, tests
```

The page was written for Tauri first and still calls `window.__TAURI__`.
`electron/preload.js` provides that, so the frontend did not change when the
app moved to Electron.

## Where the notes are

They live in `Documents/Notes` unless you pick another folder from the gear
menu. Subfolders are real subfolders, so the tree is just the folder.

Deleting moves a note or folder into `.trash/` instead of removing it. Saving
writes a temp file and renames it, so an interrupted save can't leave half a
note behind.

Settings are in `%APPDATA%\com.nick.notes\settings.json`. The Tauri build used
the same file, so moving to Electron did not need a migration.

Pictures are stored inside the note as data URIs, and their frame position goes
in the image title (`![alt](photo.png "300x212+12+0")`). The note stays valid
markdown and the frames come back where you left them.

The blur behind the sidebar is the Windows one. Electron only does acrylic on
Windows 11, so Windows 10 is handled directly in `electron/material.js`. If the
call fails the window uses a solid colour instead.

## Status

Works on Windows: notes on disk, autosave, rename, pin, search, read mode,
photo frames, per-note font and spacing, undo. Not built as an installer yet.
