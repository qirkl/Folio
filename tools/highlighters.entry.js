/* Bundle entry for @highlighters/core.
 *
 * The app has no bundler: the page is plain HTML loaded from disk by the
 * webview, so the highlighter engine is bundled once here and vendored as
 * src/js/highlighters.js. Rebuild with:
 *
 *   bun build tools/highlighters.entry.js --format=iife --outfile src/js/highlighters.js
 */
import * as Highlighters from "@highlighters/core";

window.Highlighters = Highlighters;
