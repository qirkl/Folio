/* Folio's markdown <-> editor HTML.
 *
 *   Rewritten for stability. The previous engine is kept, untouched, at
 *   tools/markdown-v1.js — to go back, copy it over this file:
 *
 *       Copy-Item tools\markdown-v1.js src\js\markdown.js
 *
 *   tools/compare-engines.html runs both over your notes without writing
 *   anything, if you want to see the difference before (or after) switching.
 *
 * The dialect, and the *single* spelling each construct is written in:
 *
 *   # heading 1 .. ###### heading 6      - list         1. numbered list
 *   > quote                             ``` code fence
 *   **bold**   *italic*   ~~strike~~    ==highlight==   <u>underline</u>
 *   `code`     [text](url)              ![alt](url "title")
 *   <span style="font-family:X;font-size:Npx">run</span>
 *
 * Rules that keep the file and the page agreeing:
 *
 *   1. One spelling per construct. <b> reads as <strong>, <i> as <em>, <s> and
 *      <strike> as <del>; on the way out there is only ever <strong>, <em>,
 *      <del>. A document written by this engine is a fixed point: reading it
 *      and writing it back produces the same bytes.
 *   2. A style attribute is written in one order, without spaces: font-family
 *      first, then font-size. Reading accepts whatever a browser writes.
 *   3. Nested runs of the same kind are merged (outer + inner styles, inner
 *      wins), and an inline element with no text is never written — that is
 *      where "****" and "<u></u>" debris used to come from.
 *   4. Anything that is not part of the dialect is text: escaped, shown as
 *      written, never passed through as markup.
 *   5. No construct is represented twice. Underline is the one markdown has no
 *      syntax for, so it is always inline <u>, and every flavour accepts it.
 *
 * The editor's HTML is deliberately plain: paragraphs and headings, <strong>,
 * <em>, <del>, <u>, <code>, <a>, <img>, span[style] for a run's typeface and
 * size, span.mark for the highlighter, and div.photos for framed pictures.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NotesMarkdown = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ------------------------------------------------------------------ text

  // The characters markdown would otherwise treat as syntax.
  var ESCAPABLE = /([\\`*_\[\]])/g;

  function escapeText(s) {
    return String(s).replace(ESCAPABLE, '\\$1');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ---------------------------------------------------------------- styles

  /* "font-size: 20px;" and "font-size:20px" mean the same thing; both are read
     into the same shape, and only the canonical spelling is ever written. */
  function readStyle(style) {
    var out = { family: '', size: 0 };
    String(style || '').split(';').forEach(function (decl) {
      var colon = decl.indexOf(':');
      if (colon < 0) return;
      var name = decl.slice(0, colon).trim().toLowerCase();
      var value = decl.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
      if (name === 'font-family') out.family = value;
      else if (name === 'font-size') {
        var n = parseInt(value, 10);
        if (n > 0) out.size = n;
      }
    });
    return out;
  }

  function styleText(style) {
    var parts = [];
    if (style.family) parts.push('font-family:' + style.family);
    if (style.size) parts.push('font-size:' + style.size + 'px');
    return parts.join(';');
  }

  function hasStyle(style) {
    return !!(style && (style.family || style.size));
  }

  /* Inner declarations win, because that is what the page showed. */
  function mergeStyle(outer, inner) {
    return {
      family: inner.family || outer.family,
      size: inner.size || outer.size
    };
  }

  // ---------------------------------------------------------------- md -> html

  /* A URL is bare, or wrapped in <> when it contains spaces or parentheses
     (our data: URIs do). The optional title carries a photo's frame geometry. */
  var IMAGE = /!\[([^\]]*)\]\(\s*(?:<([^>]*)>|([^)\s]*))\s*(?:"([^"]*)")?\s*\)/g;
  var IMAGE_LINE = /^!\[([^\]]*)\]\(\s*(?:<([^>]*)>|([^)\s]*))\s*(?:"([^"]*)")?\s*\)$/;
  var LINK = /\[([^\]]*)\]\(\s*(?:<([^>]*)>|([^)\s]*))\s*\)/g;

  /* `300x212+12+0`, optionally `@R` for rotation. */
  function parseLayout(title) {
    var m = /^(\d+)x(\d+)\+(-?\d+)\+(-?\d+)(?:@(-?\d+))?$/.exec(title || '');
    return m
      ? { w: +m[1], h: +m[2], x: +m[3], y: +m[4], r: m[5] ? +m[5] : 0 }
      : null;
  }

  function figureHtml(alt, src, title) {
    var box = parseLayout(title);
    var style = '';
    if (box) {
      style = ' style="left:' + box.x + 'px;top:' + box.y + 'px;width:' + box.w +
        'px;height:' + box.h + 'px' +
        (box.r ? ';transform:rotate(' + box.r + 'deg)' : '') + '"';
    }
    return '<figure class="photo"' + style + '>' +
      '<img alt="' + escapeHtml(alt) + '" src="' + escapeHtml(src) + '">' +
      '<span class="photo-rotate"></span><span class="photo-handle"></span></figure>';
  }

  /* The index just past the </span> that closes the span whose body starts at
     `start`, counting nesting. A regex cannot do this, which is how nested
     spans used to leak into notes as literal text. */
  function spanEnd(s, start) {
    var depth = 0, i = start;
    while (i < s.length) {
      var open = s.indexOf('<span', i);
      var close = s.indexOf('</span>', i);
      if (close === -1) return -1;
      if (open !== -1 && open < close) { depth++; i = open + 5; continue; }
      if (depth === 0) return close;
      depth--; i = close + 7;
    }
    return -1;
  }

  /* Replaces our own styled spans with placeholders, recursing into the body so
     nested spans and markdown inside them convert correctly. Stray closers left
     by an older writer are dropped rather than shown to the reader. */
  function styledSpans(s, stash) {
    var out = '', i = 0, balance = 0;
    for (;;) {
      var open = s.indexOf('<span', i);
      var closer = s.indexOf('</span>', i);

      if (closer !== -1 && (open === -1 || closer < open)) {
        // Inside a genuine tag, the closer is part of the nesting; outside one
        // it has nothing to close, and showing it as text would be worse.
        out += balance === 0 ? s.slice(i, closer) : s.slice(i, closer + 7);
        if (balance > 0) balance--;
        i = closer + 7;
        continue;
      }
      if (open === -1) { out += s.slice(i); return out; }

      var tagEnd = s.indexOf('>', open);
      if (tagEnd === -1) { out += s.slice(i); return out; }

      if (s.slice(open, open + 13) !== '<span style="') {
        balance++;                                  // someone else's tag: keep it
        out += s.slice(i, tagEnd + 1);
        i = tagEnd + 1;
        continue;
      }

      var style = s.slice(open + 13, tagEnd).replace(/"$/, '');
      var end = hasStyle(readStyle(style)) ? spanEnd(s, tagEnd + 1) : -1;
      if (end === -1) { out += s.slice(i, tagEnd + 1); i = tagEnd + 1; continue; }

      var body = s.slice(tagEnd + 1, end);
      var merged = readStyle(style);
      /* A run that wraps exactly one run is one run: merging here is what stops
         a note accumulating a stack of spans as it is opened and saved. */
      if (/^<span style="[^"]*">[\s\S]*<\/span>$/.test(body)) {
        var innerStart = body.indexOf('>') + 1;
        var innerEnd = spanEnd(body, innerStart);
        if (innerEnd === body.length - 7) {
          var innerStyle = body.slice(13, body.indexOf('>')).replace(/"$/, '');
          if (hasStyle(readStyle(innerStyle))) {
            merged = mergeStyle(merged, readStyle(innerStyle));
            body = body.slice(innerStart, innerEnd);
          }
        }
      }

      out += s.slice(i, open);
      out += stash('<span style="' + styleText(merged) + '">' + inline(body) + '</span>');
      i = end + 7;
    }
  }

  function inline(md) {
    // Whatever must not be reinterpreted (URLs, code, <u>, styled runs) is
    // swapped for a placeholder, then put back after the text is escaped.
    var keep = [];
    function stash(html) {
      keep.push(html);
      return '\u0000' + (keep.length - 1) + '\u0000';
    }

    var s = styledSpans(String(md), stash)
      .replace(/\\([^\n])/g, function (m, ch) { return stash(escapeHtml(ch)); })
      .replace(/<u>([\s\S]*?)<\/u>/g, function (m, inner) {
        return stash('<u>' + escapeHtml(inner) + '</u>');
      })
      .replace(IMAGE, function (m, alt, angled, plain) {
        return stash('<img alt="' + escapeHtml(alt) + '" src="' +
          escapeHtml(angled !== undefined ? angled : plain) + '">');
      })
      .replace(LINK, function (m, label, angled, plain) {
        return stash('<a href="' + escapeHtml(angled !== undefined ? angled : plain) + '">' +
          escapeHtml(label) + '</a>');
      })
      .replace(/``([\s\S]+?)``/g, function (m, code) {
        return stash('<code>' + escapeHtml(code) + '</code>');
      })
      .replace(/`([^`]+)`/g, function (m, code) {
        return stash('<code>' + escapeHtml(code) + '</code>');
      });

    s = escapeHtml(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/==([^=]+)==/g, '<span class="mark">$1</span>');

    return s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return keep[+i]; });
  }

  function listAt(lines, start, marker, tagName) {
    if (!marker.test(lines[start])) return null;
    var items = [];
    var i = start;
    while (i < lines.length && marker.test(lines[i])) {
      var text = lines[i].replace(marker, '');
      i++;
      while (i < lines.length && /^\s+\S/.test(lines[i]) && !marker.test(lines[i])) {
        text += '\n' + lines[i].trim();
        i++;
      }
      items.push('<li>' + inline(text).replace(/\n/g, '<br>') + '</li>');
    }
    return { html: '<' + tagName + '>' + items.join('') + '</' + tagName + '>', next: i };
  }

  function toHtml(md) {
    if (md == null || !String(md).trim()) return '<p><br></p>';

    var lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var para = [];
    var i = 0;

    function flush() {
      if (!para.length) return;
      out.push('<p>' + inline(para.join('\n')).replace(/\n/g, '<br>') + '</p>');
      para = [];
    }

    while (i < lines.length) {
      var line = lines[i];

      if (/^```/.test(line)) {
        flush();
        var body = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
        i++;
        out.push('<pre><code>' + escapeHtml(body.join('\n')) + '</code></pre>');
        continue;
      }

      if (/^\s*$/.test(line)) { flush(); i++; continue; }

      // A run of picture-only lines becomes one frame group.
      if (IMAGE_LINE.test(line)) {
        flush();
        var frames = [];
        while (i < lines.length) {
          var pic = IMAGE_LINE.exec(lines[i]);
          if (!pic) break;
          frames.push(figureHtml(pic[1], pic[2] !== undefined ? pic[2] : pic[3], pic[4]));
          i++;
        }
        out.push('<div class="photos" contenteditable="false">' + frames.join('') + '</div>');
        continue;
      }

      var heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        flush();
        var level = heading[1].length;
        out.push('<h' + level + '>' + inline(heading[2]) + '</h' + level + '>');
        i++;
        continue;
      }

      if (/^>\s?/.test(line)) {
        flush();
        var quoted = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          quoted.push(lines[i++].replace(/^>\s?/, ''));
        }
        out.push('<blockquote><p>' + inline(quoted.join('\n')).replace(/\n/g, '<br>') + '</p></blockquote>');
        continue;
      }

      var bullets = listAt(lines, i, /^\s*[-*+]\s+/, 'ul');
      if (bullets) { flush(); out.push(bullets.html); i = bullets.next; continue; }

      var numbered = listAt(lines, i, /^\s*\d+[.)]\s+/, 'ol');
      if (numbered) { flush(); out.push(numbered.html); i = numbered.next; continue; }

      para.push(line);
      i++;
    }

    flush();
    return out.join('\n');
  }

  // ---------------------------------------------------------------- html -> md

  function isElement(n) {
    return !!n && n.nodeType === 1;
  }

  function tagOf(n) {
    return String(n.tagName || '').toLowerCase();
  }

  function attr(n, name) {
    return n.getAttribute ? n.getAttribute(name) : null;
  }

  function childNodes(n) {
    return (n && n.childNodes) || [];
  }

  /* A URL only needs <> wrapping when it holds something markdown would stop
     at. A <>-wrapped URL cannot contain ">", so a data: URI is percent-encoded
     instead; browsers percent-decode them, so the picture still loads. */
  function mdUrl(url) {
    url = url || '';
    if (/^data:/i.test(url)) {
      return url.replace(/[\s<>()"#]/g, function (c) {
        return '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
      });
    }
    return /[\s()<>]/.test(url) ? '<' + url + '>' : url;
  }

  function imageMd(img, title) {
    return '![' + (attr(img, 'alt') || '') + '](' + mdUrl(attr(img, 'src')) +
      (title ? ' "' + title + '"' : '') + ')';
  }

  /* The frame geometry lives in the figure's style; the markdown title carries
     it back, so a dragged picture returns where it was. */
  function frameTitle(fig) {
    var style = attr(fig, 'style') || '';
    var w = /width:\s*(-?\d+(?:\.\d+)?)px/.exec(style);
    var h = /height:\s*(-?\d+(?:\.\d+)?)px/.exec(style);
    if (!w || !h) return '';
    var x = /left:\s*(-?\d+(?:\.\d+)?)px/.exec(style);
    var y = /top:\s*(-?\d+(?:\.\d+)?)px/.exec(style);
    var rot = /rotate\(\s*(-?[\d.]+)deg\s*\)/.exec(style);
    return Math.round(+w[1]) + 'x' + Math.round(+h[1]) +
      '+' + (x ? Math.round(+x[1]) : 0) + '+' + (y ? Math.round(+y[1]) : 0) +
      (rot ? '@' + Math.round(+rot[1]) : '');
  }

  /* An inline element that holds nothing worth writing. Text, a picture or a
     line break all count; whitespace alone does not. */
  function hasContent(node) {
    if (!node) return false;
    if (node.nodeType === 3) {
      var text = node.nodeValue != null ? node.nodeValue : node.textContent;
      return !!String(text || '').trim();
    }
    var tag = tagOf(node);
    if (tag === 'img' || tag === 'br') return true;
    var kids = childNodes(node);
    for (var i = 0; i < kids.length; i++) if (hasContent(kids[i])) return true;
    return false;
  }

  function inlineMd(nodes) {
    var s = '';
    var list = nodes || [];
    for (var i = 0; i < list.length; i++) {
      var node = list[i];
      if (node.nodeType === 3) {
        var text = node.nodeValue != null ? node.nodeValue : node.textContent;
        s += escapeText(text);
        continue;
      }
      if (!isElement(node)) continue;

      var tag = tagOf(node);
      var inner;

      switch (tag) {
        case 'br':
          // The break carries its own two spaces; anything already trailing the
          // line would simply add more on every save.
          s = s.replace(/[ \t]+$/, '') + '  \n';
          break;

        case 'strong': case 'b':
          inner = inlineMd(childNodes(node));
          if (inner.trim()) s += '**' + inner + '**';
          break;

        case 'em': case 'i':
          inner = inlineMd(childNodes(node));
          if (inner.trim()) s += '*' + inner + '*';
          break;

        case 'del': case 's': case 'strike':
          inner = inlineMd(childNodes(node));
          if (inner.trim()) s += '~~' + inner + '~~';
          break;

        case 'u':
          inner = inlineMd(childNodes(node));
          if (inner.trim()) s += '<u>' + inner + '</u>';
          break;

        case 'code':
          inner = String(node.textContent != null ? node.textContent : '');
          if (inner.trim()) {
            // A backtick inside the run needs the longer fence.
            s += inner.indexOf('`') >= 0 ? '``' + inner + '``' : '`' + inner + '`';
          }
          break;

        case 'a':
          inner = inlineMd(childNodes(node));
          if (inner.trim()) s += '[' + inner + '](' + mdUrl(attr(node, 'href')) + ')';
          break;

        case 'img':
          s += imageMd(node, attr(node, 'title') || '');
          break;

        case 'span': {
          var style = readStyle(attr(node, 'style'));
          var isMark = /(^|\s)mark(\s|$)/.test(attr(node, 'class') || '');
          inner = inlineMd(childNodes(node));

          if (!inner.trim()) break;

          if (hasStyle(style)) {
            /* A run that wraps exactly one run of the same kind merges into it,
               so repeated styling can never build a stack. */
            var only = childNodes(node).length === 1 ? childNodes(node)[0] : null;
            if (only && isElement(only) && tagOf(only) === 'span' && hasStyle(readStyle(attr(only, 'style')))) {
              style = mergeStyle(style, readStyle(attr(only, 'style')));
              inner = inlineMd(childNodes(only));
            }
            s += '<span style="' + styleText(style) + '">' + inner + '</span>';
          } else if (isMark) {
            s += '==' + inner + '==';
          } else {
            s += inner;              // a bare span is not a construct
          }
          break;
        }

        default:
          s += inlineMd(childNodes(node));   // unknown inline: keep the words
      }
    }
    return s;
  }

  function blockMd(node) {
    if (node.nodeType === 3) {
      var text = String(node.nodeValue != null ? node.nodeValue : node.textContent).replace(/\s+/g, ' ').trim();
      return text ? escapeText(text) : '';
    }
    if (!isElement(node)) return '';

    var tag = tagOf(node);

    switch (tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        return new Array(+tag[1] + 1).join('#') + ' ' + inlineMd(childNodes(node)).trim();

      case 'p':
        return inlineMd(childNodes(node)).trim();

      case 'ul': case 'ol': {
        var items = childNodes(node);
        var lines = [];
        var n = 0;
        for (var k = 0; k < items.length; k++) {
          if (!isElement(items[k])) continue;
          if (tagOf(items[k]) !== 'li') continue;
          n++;
          var marker = tag === 'ol' ? n + '. ' : '- ';
          lines.push(marker + inlineMd(childNodes(items[k])).trim());
        }
        return lines.join('\n');
      }

      case 'li':
        return inlineMd(childNodes(node)).trim();

      case 'blockquote': {
        var quoted = blocksMd(childNodes(node)).split('\n');
        return quoted.map(function (line) { return '> ' + line; }).join('\n');
      }

      case 'pre': {
        var code = String(node.textContent != null ? node.textContent : '').replace(/\n$/, '');
        return '```\n' + code + '\n```';
      }

      case 'figure': {
        var framed = null;
        var kids = childNodes(node);
        for (var f = 0; f < kids.length && !framed; f++) {
          if (!isElement(kids[f])) continue;
          if (tagOf(kids[f]) === 'img') framed = kids[f];
          else if (kids[f].querySelector) framed = kids[f].querySelector('img');
        }
        return framed ? imageMd(framed, frameTitle(node)) : blocksMd(childNodes(node));
      }

      case 'div': case 'section': {
        var frames = [];
        var children = childNodes(node);
        for (var c = 0; c < children.length; c++) {
          if (!isElement(children[c])) continue;
          var child = tagOf(children[c]);
          if (child === 'figure' || child === 'img') frames.push(blockMd(children[c]));
        }
        if (frames.length && !String(node.textContent || '').trim()) return frames.join('\n');
        return blocksMd(childNodes(node));
      }

      case 'img':
        return imageMd(node, attr(node, 'title') || '');

      default:
        return blocksMd(childNodes(node));
    }
  }

  function blocksMd(nodes) {
    var out = [];
    var list = nodes || [];
    for (var i = 0; i < list.length; i++) {
      var block = blockMd(list[i]);
      if (block && block.trim()) out.push(block.replace(/\s+$/, ''));
    }
    return out.join('\n\n');
  }

  /* The editor root in, a markdown document out. */
  function toMd(rootEl) {
    var body = blocksMd(childNodes(rootEl)).replace(/\n{3,}/g, '\n\n').trim();
    return body ? body + '\n' : '';
  }

  return { toHtml: toHtml, toMd: toMd };
});
