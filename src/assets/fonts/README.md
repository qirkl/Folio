# Bundled fonts

Drop font files in this folder and run:

```powershell
pwsh -File tools/make_fonts.ps1
```

That writes `src/assets/fonts.css`, one `@font-face` rule per file, and the app
loads it on start. Anything declared there also appears in the note font picker
automatically — the picker merges the system fonts with whatever `document.fonts`
reports, so there is no second list to keep in sync.

## Why bundle instead of install

Fonts installed into Windows are global: they appear in every application and
the machine stays the source of truth. A font bundled here belongs to Folio
alone, travels with the app, and still works on a machine that has never seen it.
The trade-off is that it only exists inside the app.

Both are supported. Pick whichever suits:

- **Install for the whole system** — right-click a `.ttf` in Explorer → *Install
  for all users*, then restart Folio. Nothing to do here.
- **Bundle for the app only** — drop the file in this folder and run the script.
  `.ttf`, `.otf` and `.woff2` all work.

## Naming

The family name comes from the file name, with the last two dash-separated
segments treated as weight and style:

| File | Family | Weight | Style |
| --- | --- | --- | --- |
| `Inter-Regular.ttf` | Inter | 400 | normal |
| `Inter-Bold.ttf` | Inter | 700 | normal |
| `Crimson-Italic.ttf` | Crimson | 400 | italic |

So `EBGaramond-SemiBold.ttf` registers as the family `EB Garamond` at weight 600,
which is what the note headings ask for. Rename the source file if a font ships
with names that do not follow that pattern.
