/* Markdown <-> editor HTML.
 *
 * A deliberately small converter: it covers exactly what the toolbar can
 * produce and nothing more. Underline has no markdown syntax, so it survives
 * as inline <u> — which every common markdown flavour accepts — and the
 * yellow highlight uses the ==mark== extension.
 *
 * Loaded as a classic script (not a module) so index.html keeps working when
 * opened straight from disk, with a CommonJS tail so `bun tools/markdown.test.js`
 * can exercise it without a DOM.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NotesMarkdown = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Every character escapeText may prefix, and so every character the loader
  // must un-prefix.
  var ESCAPABLE = /([\\`*_\[\]])/g;

  // Inline elements that mean nothing once they hold no text or image; writing
  // them out produces "****", "<u></u>" and similar debris in the note.
  var EMPTY_WITHOUT_TEXT = (function () {
    var tags = ['span', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'strike', 'code', 'a', 'font', 'mark'];
    var table = {};
    for (var i = 0; i < tags.length; i++) table[tags[i]] = true;
    return table;
  })();

  /* Anything worth writing inside a node: text, an image, a line break. Walked
     rather than queried, because the test harness carries a very small DOM. */
  function hasContent(node) {
    if (!node) return false;
    if (node.nodeType === 3) {
      var text = node.nodeValue != null ? node.nodeValue : node.textContent;
      return !!String(text || '').trim();
    }
    var tag = String(node.tagName || '').toLowerCase();
    if (tag === 'img' || tag === 'br') return true;
    var kids = node.childNodes || [];
    for (var i = 0; i < kids.length; i++) if (hasContent(kids[i])) return true;
    return false;
  }

  function escapeText(s) {
    return String(s).replace(ESCAPABLE, '\\$1');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ---------------------------------------------------------------- md -> html

  /* A markdown URL is either bare or wrapped in <> when it contains spaces or
     parentheses (our data: URIs do). Both forms are captured here, plus the
     optional "title" — which we use to carry a photo's frame geometry. */
  var IMAGE = /!\[([^\]]*)\]\(\s*(?:<([^>]*)>|([^)\s]*))\s*(?:"([^"]*)")?\s*\)/g;
  var LINK = /\[([^\]]*)\]\(\s*(?:<([^>]*)>|([^)\s]*))\s*\)/g;

  /* One image alone on a line becomes a draggable frame; consecutive image
     lines share one frame group. */
  var IMAGE_LINE = /^!\[([^\]]*)\]\(\s*(?:<([^>]*)>|([^)\s]*))\s*(?:"([^"]*)")?\s*\)$/;

  /* `300x212+12+0` — width x height + x + y, optionally `@R` for rotation. */
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

  /* Finds the `</span>` closing the span whose body starts at `start`, honouring
     nesting. Regexes cannot do this, which is exactly how nested styled spans
     used to leak into notes as literal text. */
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
     nested spans — and markdown inside them — convert correctly.

     Span opens and closes are also balanced as we go: a closer with nothing open
     is debris from a save made by the old broken writer, and is dropped rather
     than shown to the reader as text. Genuine raw HTML that a user typed stays
     counted, so it is still escaped and displayed verbatim. */
  function styledSpans(s, stash) {
    var out = '', i = 0, balance = 0;
    for (;;) {
      var open = s.indexOf('<span', i);
      var closer = s.indexOf('</span>', i);

      if (closer !== -1 && (open === -1 || closer < open)) {
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

      var style = s.slice(open + 13, tagEnd - 1);
      var end = /font-(size|family)/.test(style) ? spanEnd(s, tagEnd + 1) : -1;
      if (end === -1) { out += s.slice(i, tagEnd + 1); i = tagEnd + 1; continue; }

      out += s.slice(i, open);
      out += stash('<span style="' + style + '">' + inline(s.slice(tagEnd + 1, end)) + '</span>');
      i = end + 7;
    }
  }

  function inline(md) {
    // Anything whose contents must not be reinterpreted (URLs, code, <u>) is
    // swapped for a placeholder, then restored once the text is escaped.
    var keep = [];
    function stash(html) {
      keep.push(html);
      return '\u0000' + (keep.length - 1) + '\u0000';
    }

    var s = styledSpans(String(md), stash)
      // Escaped punctuation is lifted out first, so a literal \* can never be
      // mistaken for an emphasis marker further down.
      .replace(/\\([^\n])/g, function (m, ch) {
        return stash(escapeHtml(ch));
      })
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
      .replace(/`([^`]+)`/g, function (m, code) {
        return stash('<code>' + escapeHtml(code) + '</code>');
      });

    s = escapeHtml(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/==([^=]+)==/g, '<span class="mark">$1</span>'); // highlight

    return s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return keep[+i]; });
  }

  function listAt(lines, start, marker, tag) {
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
    return { html: '<' + tag + '>' + items.join('') + '</' + tag + '>', next: i };
  }

  function toHtml(md) {
    if (!md || !md.trim()) return '<p><br></p>';

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

      // A run of image-only lines becomes one frame group.
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

  /* A URL only needs <> wrapping when it contains something markdown would
     otherwise stop at — spaces, parentheses, angle brackets — and a <>-wrapped
     URL cannot itself contain ">", so data: URIs are percent-encoded instead.
     Browsers percent-decode data URIs, so the image still loads. */
  /* Reads an inline style property whether the DOM normalised it to camelCase
     or the test fixture left it kebab-case. */
  function readStyle(node, camel, kebab) {
    var style = node.style;
    if (!style) return '';
    return style[camel] || style[kebab] || '';
  }

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
    return '![' + (img.getAttribute('alt') || '') + '](' + mdUrl(img.getAttribute('src')) +
      (title ? ' "' + title + '"' : '') + ')';
  }

  /* Frame geometry rides in the image's markdown title, so notes stay plain
     markdown: ![alt](url "300x212+12+0") */
  function frameTitle(figure) {
    var style = figure.style;
    if (!style || !style.width || !style.height) return '';
    var n = function (v) { return parseInt(v, 10) || 0; };
    var rot = /rotate\(\s*(-?[\d.]+)deg\s*\)/.exec(style.transform || '');
    return n(style.width) + 'x' + n(style.height) + '+' + n(style.left) + '+' + n(style.top) +
      (rot ? '@' + Math.round(+rot[1]) : '');
  }

  function inlineMd(nodes) {
    var s = '';
    var list = nodes || [];
    for (var i = 0; i < list.length; i++) {
      var node = list[i];
      if (node.nodeType === 3) { s += escapeText(node.textContent); continue; }
      if (!isElement(node)) continue;

      var tag = String(node.tagName).toLowerCase();

      /* An element left holding nothing — an emptied <strong>, a span that lost
         its text — has nothing to write, and writing it anyway produces "****"
         and other debris that parses back as literal characters. */
      if (EMPTY_WITHOUT_TEXT[tag] && !hasContent(node)) break;

      switch (tag) {
        case 'br': s += '  \n'; break;
        case 'strong': case 'b': s += '**' + inlineMd(node.childNodes) + '**'; break;
        case 'em': case 'i': s += '*' + inlineMd(node.childNodes) + '*'; break;
        case 'u': s += '<u>' + inlineMd(node.childNodes) + '</u>'; break;
        case 'del': case 's': case 'strike': s += '~~' + inlineMd(node.childNodes) + '~~'; break;
        case 'code': s += '`' + (node.textContent || '') + '`'; break;
        case 'a': s += '[' + inlineMd(node.childNodes) + '](' + mdUrl(node.getAttribute('href')) + ')'; break;
        case 'img': s += '![' + (node.getAttribute('alt') || '') + '](' + mdUrl(node.getAttribute('src')) + ')'; break;
        case 'span': {
          var cls = node.getAttribute('class') || '';
          var fam = readStyle(node, 'fontFamily', 'font-family');
          var size = readStyle(node, 'fontSize', 'font-size');

          // A span wrapping nothing but another styled span is redundant —
          // applying a font and then a size used to produce exactly that, and
          // nesting is what broke the parser. Merge them into one.
          var only = (node.childNodes && node.childNodes.length === 1) ? node.childNodes[0] : null;
          if (only && isElement(only) && String(only.tagName).toLowerCase() === 'span') {
            var innerFam = readStyle(only, 'fontFamily', 'font-family');
            var innerSize = readStyle(only, 'fontSize', 'font-size');
            if (innerFam || innerSize) {
              fam = innerFam || fam;
              size = innerSize || size;
              node = only;
            }
          }

          var inner = inlineMd(node.childNodes);
          var decls = [];
          if (fam) decls.push('font-family:' + fam);
          if (size) decls.push('font-size:' + (parseInt(size, 10) || 0) + 'px');

          if (decls.length) {
            s += '<span style="' + decls.join(';') + '">' + inner + '</span>';
          } else if (/(^|\s)mark(\s|$)/.test(cls)) {
            s += '==' + inner + '==';
          } else {
            s += inner;
          }
          break;
        }
        default: s += inlineMd(node.childNodes);
      }
    }
    return s;
  }

  function blockMd(node) {
    if (node.nodeType === 3) {
      var text = String(node.textContent).replace(/\s+/g, ' ').trim();
      return text ? escapeText(text) : '';
    }
    if (!isElement(node)) return '';

    var tag = String(node.tagName).toLowerCase();
    switch (tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        return new Array(+tag[1] + 1).join('#') + ' ' + inlineMd(node.childNodes).trim();

      case 'p':
        return inlineMd(node.childNodes).trim();

      case 'ul': case 'ol': {
        var items = node.children || [];
        var lines = [];
        for (var n = 0; n < items.length; n++) {
          var marker = tag === 'ol' ? (n + 1) + '. ' : '- ';
          lines.push(marker + inlineMd(items[n].childNodes).trim()
            .replace(/\n/g, '\n' + new Array(marker.length + 1).join(' ')));
        }
        return lines.join('\n');
      }

      case 'blockquote':
        return blocksMd(node.childNodes).split('\n').map(function (l) { return '> ' + l; }).join('\n');

      case 'pre':
        return '```\n' + String(node.textContent || '').replace(/\n$/, '') + '\n```';

      case 'figure': {
        // The picture is a direct child; walk to it rather than relying on
        // querySelector, which keeps this code testable off-DOM.
        var framed = null;
        var kidsF = node.childNodes || [];
        for (var f = 0; f < kidsF.length && !framed; f++) {
          if (!isElement(kidsF[f])) continue;
          if (String(kidsF[f].tagName).toLowerCase() === 'img') framed = kidsF[f];
          else if (kidsF[f].querySelector) framed = kidsF[f].querySelector('img');
        }
        return framed ? imageMd(framed, frameTitle(node)) : blocksMd(node.childNodes);
      }

      case 'div': case 'section': {
        // A frame group is a contenteditable=false wrapper. Save one image line
        // per frame so the group rebuilds on load.
        var frames = [];
        var kids = node.childNodes || [];
        for (var k = 0; k < kids.length; k++) {
          if (!isElement(kids[k])) continue;
          var child = String(kids[k].tagName).toLowerCase();
          if (child === 'figure' || child === 'img') frames.push(blockMd(kids[k]));
        }
        if (frames.length && !String(node.textContent || '').trim()) {
          return frames.join('\n');
        }
        return blocksMd(node.childNodes);
      }

      case 'img':
        return imageMd(node, '');

      default:
        return blocksMd(node.childNodes);
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
    var body = blocksMd(rootEl.childNodes).replace(/\n{3,}/g, '\n\n').trim();
    return body ? body + '\n' : '';
  }

  return { toHtml: toHtml, toMd: toMd };
});
