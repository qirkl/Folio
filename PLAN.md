# Folio — build plan

A desktop notes app with the skeuomorphic soul of Mac OS X Tiger, running on
Tauri 2. This plan is derived from the working preview in `src/index.html`.

---

## 1. Where we are

`src/index.html` is a single self-contained file (no bundler, no dependencies)
that already establishes the visual language:

| Piece | State |
| --- | --- |
| Window chrome, grain, Windows caption bar | Done — min/max/close are wired to the real window |
| Blurred dark linen sidebar, tree, selection | Done — rendered from the notes folder in the app |
| White typing field + beveled toolbar | Done (works, `execCommand`) |
| Two-photo layout, footer word/char count | Done |
| Notes saved as markdown in a real folder | Done — see §3, verified by `bun tools/markdown.test.js` |
| Windows 10 acrylic (real desktop blur) | Done — `window-vibrancy`, with an Aero-blur fallback |
| Native window drag / close / min / max | Done — builds with the GNU toolchain, runs |

Everything below turns that prototype into a real app without changing its look.

---

## 2. Design system (freeze this first)

Locking these down now means the rest of the work is plumbing, not taste.

**Materials**

- *Window glass* — the OS provides the material: **Aero blur** via
  `window-vibrancy`'s `apply_blur`, tinted `(26,18,14,150)`. Deliberately **not**
  acrylic: Windows 10's `ACCENT_ENABLE_ACRYLICBLURBEHIND` recomputes a noise
  layer every frame while the window is dragged, which makes moving the window
  crawl. Aero blur is the same idea without the per-frame cost.
- *Exactly one blur, ever* — the CSS carries **no** `backdrop-filter` on the
  window in the app. A CSS blur stacked on the OS blur is both redundant and
  slow, and it was the cause of a real drag-lag bug.
- *The app is the default, the preview is the exception* — `body` has **no
  background** and `.window` has **no frame** (no size, no shadow, no radius)
  unless `html.preview` is set. That class is added by a tiny `<head>` script
  only when `window.__TAURI__` is absent, i.e. in a browser. Dependency is
  inverted deliberately: a JavaScript failure used to leave the app looking
  like a web page with a fake desktop behind it, and now it simply looks like
  the app.
- *One material, not two* — the window is a **single material block that wraps
  the whole frame**. The sidebar therefore paints nothing at all: no tint, no
  divider, no texture, no background. Anything drawn there would read as a
  second panel sitting on the glass.
- *Paper* — the white note panel is a rounded card (5px, matching the sidebar
  buttons) inset 12px from the right and bottom, sitting below the 38px caption
  strip. The window's own corners are not ours to draw.
- *Metric rhythm* — **12px everywhere**: the panel's gutter, the sidebar's
  padding, the note header, the toolbar band, the editor and the dock. The only
  non-12 numbers are structural, not padding: the 38px caption strip and the
  30px dock buttons.
- *Photo frames* — pictures sit in draggable frames: drag the frame to move it,
  the corner grip to resize. Geometry is stored in the image's markdown title
  (`![alt](url "300x212+12+0")`), so notes stay plain markdown and a frame keeps
  its position across reloads. Consecutive image lines regroup into one group.
- *Caption strip* — one 38px dark band across the top holds everything: the
  collapse chevron at the note's left edge, the drag region, and the window
  buttons at the right, all in white because the strip is glass.

**Control language**

- Buttons are beveled: `linear-gradient(#fff,#efeff1)` + 1px border +
  `inset 0 1px 0 #fff` + `0 1px 1px rgba(0,0,0,.1)`, and invert to an inset
  shadow on `:active`. Related buttons (alignment) join into a segmented
  control sharing 1px dividers.
- The toolbar is a full-width **band** with hairline top and bottom borders,
  not a floating rounded card, and the white typing field fills the panel.

**Control language (typography)**

- Text on dark is embossed with `text-shadow: 0 -1px 0 rgba(0,0,0,.35)`.
- Sidebar rows: 26px tall, 5px radius, hover `rgba(255,255,255,.10)`,
  selected a white scrim gradient with a 1px inner light ring.

**Metric scale** — 4px base. Row 26, button 24, search 26, inner radius 4/5/7,
sidebar 300, window 1180×780 (min 940×620). The **window's own corners are not
ours to draw**: Windows 10 gives square ones and Windows 11 rounds them, so the
CSS deliberately sets no radius on the outer frame.

---

## 3. Architecture

```
Notes/
├─ src/                     frontend, served straight to the webview
│  ├─ index.html            markup + the shell
│  ├─ styles/               split out as it grows: base, sidebar, editor, print
│  └─ js/                   split by concern (see below)
├─ src-tauri/               Rust
│  ├─ src/lib.rs            commands: list/read/write/delete notes
│  ├─ capabilities/         window + fs permissions
│  └─ tauri.conf.json       borderless, transparent, 1180×780
├─ tools/make_icons.ps1      the whole icon set from one source PNG
└─ PLAN.md
```

**No bundler, deliberately.** `frontendDist: "../src"` serves the folder
directly and `withGlobalTauri: true` exposes `window.__TAURI__`, so we get a
buildable desktop app with zero JavaScript toolchain. If the frontend ever
outgrows plain modules we can add Vite later without touching Rust.

**Frontend modules** (each a plain ES module, imported from `index.html`):

- `vault.js` — the only place that talks to the backend; wraps `invoke` and
  falls back to an in-memory store when `__TAURI__` is absent, which keeps the
  browser preview usable for design work.
- `tree.js` — sidebar rendering, expansion state, selection.
- `editor.js` — rich text, formatting commands, autosave debounce.
- `stats.js` — word/character count, created/modified dates.
- `window.js` — drag region, traffic lights, window state persistence.

**Data model.** Notes are plain markdown in a folder the user chooses —
defaulting to `Documents/Notes` — so the vault stays portable, greppable and
syncable. Subfolders are real subfolders, and the sidebar tree is a direct
render of the directory listing. The chosen path is remembered in
`<app-config>/settings.json`.

Markdown is the storage format, so the editor converts both ways in
`src/js/markdown.js`: `toHtml` on open, `toMd` on save. It covers what the
toolbar can produce — headings, emphasis, strikethrough, highlight, links,
lists, quotes, fences, inline code and images — plus three deliberate
compromises:

- Underline has no markdown syntax, so it is written as inline `<u>`.
- Highlight uses the `==mark==` extension.
- Images live inline as data URIs, percent-encoded so the parentheses and
  angle brackets of an SVG payload cannot end the `(…)` early. Attachments
  move to `vault/.attachments/` in M2.

That converter is the one piece of frontend logic with real edge cases, so it
has tests (`bun tools/markdown.test.js`, 35 checks) including a full
markdown → HTML → parse → markdown round trip.

Writes are atomic (sibling `.tmp` then rename) so a crash mid-save cannot
truncate a note, and deletes move to `vault/.trash/` rather than unlinking.
Hidden entries (`.trash`, `.attachments`, in-flight `.tmp`) are kept out of the
tree.

---

## 4. Milestones

### M1 — Real notes (next)
- [x] Notes saved as markdown in a user-chosen folder, with subfolders.
- [x] Tree rendered from the folder listing; open, create, rename, autosave.
- [x] Atomic writes, trash instead of unlink, markdown round trip + tests.
- [x] Collapse the sidebar from the caption chevron to focus on the note.
- [x] Profile picture in the dock, chosen from a file picker.
- [x] Create note or folder from one menu, in the selected folder.
- [x] Rename / trash notes and folders; drag rows to set a manual order.
- [x] Insert images, drag/resize/rotate the frame; geometry and text sizes
      survive a reload through the markdown.
- [x] Resume the last open note on launch, falling back if it has since gone.
- [x] Pin notes to the top, with a Pinned / All Notes split and live search.
- [x] Notepad files: drop a `.txt` in and it is a note, with its own icon.
- [x] Settings sheet: Neo (acrylic) and Classic (solid) themes, app icon variants
      (window/taskbar only), note fonts, resizable sidebar, and the folder.
- [x] Right-click formatting in the note, and bundled fonts via
      `assets/fonts/` + `tools/make_fonts.ps1`.
- [ ] Split `index.html` into modules; it is getting long.
- [ ] Move a note into another folder by dragging it onto a folder row.

### M2 — The editor earns its keep
- [ ] Replace `execCommand` (deprecated) with an explicit document model and
      its own undo stack; keep `contenteditable` for the caret and IME.
- [ ] Real font and size dropdowns populated from system fonts.
- [ ] Working color well, with the swatch grid from the era.
- [ ] Drag-to-reorder and delete for the photo strip; image import via a
      native file dialog that copies into `vault/.attachments/`.
- [ ] Markdown round-trip: render `.md` on open, serialize on save.

### M3 — Make it feel like an app
- [ ] Window state (size, position, maximized) persisted between launches.
- [ ] Search field filters the tree live, with find-in-note highlighting.
- [ ] Context menus (right-click a row: rename, pin, trash).
- [ ] Keyboard: ⌘N new, ⌘⇧F search, ⌘B/I/U, ⌘⌫ trash.
- [ ] Native menu bar on macOS, app menu elsewhere.

### M4 — Native materials
- [x] Windows 10 acrylic via `window-vibrancy` (`apply_acrylic`), with Aero
      blur as the fallback when the OS refuses it. This is the only true
      translucency: CSS can blur the page, never the desktop behind it.
- [ ] Windows 11: `apply_mica` when the user is on 11, since acrylic's drag
      lag is a known 22H2 problem.
- [ ] macOS: `apply_vibrancy` with `NSVisualEffectMaterial::HudWindow`, which
      needs tauri's `macos-private-api` feature.
- [ ] Undecorated-window drop shadow (native shadow is not drawn for
      `decorations: false`), likely a 1px ring plus a soft outer glow.
- [ ] Print / export to PDF with the toolbar and chrome hidden.

### M5 — Ship
- [x] Builds and runs on Windows (GNU toolchain, `tools/tauri.ps1`).
- [x] NSIS installer configured as the bundle target.
- [ ] Tighten CSP away from `csp: null`; the only needs are `data:` images and
      inline styles.
- [ ] Sign for Windows and macOS, and a Linux AppImage.
- [ ] Auto-update channel; vault backup and import/export.

---

## 5. Risks and open questions

- **The toolchain is the fragile part, not the code.** Two environment traps
  cost real time and will bite anyone else who clones this onto Windows:
  1. Tauri officially supports only the MSVC target; this machine has no
     Build Tools, so we build with `stable-x86_64-pc-windows-gnu` plus mingw's
     binutils. Unofficial, worked, but treat it as borrowed time.
  2. **The build directory must not contain a space.** `embed-resource` passes
     `$OUT_DIR` to `windres` as `--include-dir`, which forwards it to `cc1`
     unquoted, so `...\Documents\Default Project\...` truncates at the space
     and dies with `cc1.exe: fatal error: Project\...: No such file or
     directory`. Hence `CARGO_TARGET_DIR=~\notes-target`. A project under a
     spaced path will fail on any machine using the GNU toolchain.

- **Windows 10 acrylic drag lag.** Confirmed on this machine: acrylic made
  dragging the window crawl, because it recomputes a noise layer every frame.
  We use Aero blur instead (`apply_blur`). If a future Windows version makes
  acrylic cheap, it can come back — but not while CSS blur is also present.
- **`execCommand` is deprecated** but still the shortest path to a working
  caret. M2 replaces it; until then treat the toolbar as a prototype.
- **Markdown is lossy for rich text.** Underline and highlight survive as
  `<u>`/`==…==`, but font size, colour and alignment have nowhere to go and are
  dropped on save. Either accept that or move to a sidecar format in M2.
- **Attachments and sync.** Images live inline as data URIs today, so a vault
  in Dropbox syncs every picture with every keystroke of history. Content
  addressed attachments in `.attachments/` are the M2 fix.
- **Transparent windows have sharp corners** at the OS level; our 12px radius
  is drawn in CSS. Needs a real desktop to judge.
- **Open question:** should folders become a two-way mirror of the disk (move a
  file in Explorer, see it move in the sidebar)? Today the tree refreshes on
  demand, not on a filesystem watch.

## 6. Non-goals

Wiki-style backlinks, plugins, a mobile build, collaborative editing, and
encryption at rest. The markdown vault makes all of these *possible* later
without committing to them now.

