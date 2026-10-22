/* Bundle entry for @scritto/core.
 *
 * The page is plain HTML loaded from disk, with no bundler, so the rolling-text
 * web components are bundled once and vendored as src/js/scritto.js. Importing
 * the package registers <scritto-text> and <scritto-flow>. Rebuild with:
 *
 *   bun build tools/scritto.entry.js --format=iife --outfile src/js/scritto.js
 */
import "@scritto/core";
